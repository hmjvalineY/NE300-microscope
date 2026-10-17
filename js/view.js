/* 目鏡視野模擬：倒像、對焦模糊（景深）、亮度、光圈對比、目鏡測微器
   幾何一律以「主畫布 900×900」座標計算；放大鏡用同一套光學、以 g = {z, mx, my} 重新成像 */
(function (NE) {
  const N0 = 900, cx = N0 / 2, cy = N0 / 2, R = N0 * 0.46;
  NE.View = function (canvas, opt = {}) {
    const N = opt.size || N0;
    canvas.width = canvas.height = N;
    const ctx = canvas.getContext('2d');
    const mk = (n = N) => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
    const base = mk(), bctx = base.getContext('2d');
    const tmp = mk(), tctx = tmp.getContext('2d');
    const out = mk(), octx = out.getContext('2d');
    const samp = mk(64), sctx = samp.getContext('2d', { willReadFrequently: true });
    const FILTER = (() => { try { tctx.filter = 'blur(2px)'; const ok = tctx.filter === 'blur(2px)'; tctx.filter = 'none'; return ok; } catch (e) { return false; } })();

    // 主畫布座標下的轉換參數
    function params(O) {
      const S = NE.S, pl = S.place;
      const s = 2 * R / O.fovUm;
      const so = NE.slideOff();
      let Tx = (S.stageX + so.x) * 1000, Ty = (S.stageY + so.y) * 1000;
      const sp = NE.spec();
      if (sp && sp.drift) { Tx += 28 * Math.sin(S.time * 0.33); Ty += 20 * Math.sin(S.time * 0.21 + 1); }
      const rot = pl.rot * Math.PI / 180, c = Math.cos(rot), sn = Math.sin(rot);
      const M = [-s * c, s * sn, s * sn, s * c, cx - s * Tx, cy + s * Ty];
      return { s, M, Tx, Ty, c, sn };
    }
    function toSlide(px, py, V) {
      V = V || params(NE.optics());
      const qx = (cx - px) / V.s, qy = (py - cy) / V.s;
      const dx = qx - V.Tx, dy = qy - V.Ty;
      return { x: V.c * dx + V.sn * dy, y: -V.sn * dx + V.c * dy };
    }
    function toScreen(x, y) {
      const V = params(NE.optics());
      return { x: V.M[0] * x + V.M[2] * y + V.M[4], y: V.M[1] * x + V.M[3] * y + V.M[5] };
    }
    function drawReticle(c) {
      const S = NE.S;
      c.save(); c.translate(cx, cy); c.rotate(S.eyeRot * Math.PI / 180);
      const mm = R / 10, div = mm / 10;
      c.strokeStyle = 'rgba(8,8,10,0.92)'; c.fillStyle = 'rgba(8,8,10,0.92)'; c.lineWidth = 1.15;
      c.beginPath(); c.moveTo(-5 * mm, 0); c.lineTo(5 * mm, 0);
      for (let i = 0; i <= 100; i++) {
        const x = -5 * mm + i * div;
        const h = i % 10 === 0 ? 0.62 * mm : i % 5 === 0 ? 0.44 * mm : 0.28 * mm;
        c.moveTo(x, 0); c.lineTo(x, -h);
      }
      c.stroke();
      c.font = `${Math.round(mm * 0.42)}px Arial`; c.textAlign = 'center'; c.textBaseline = 'bottom';
      for (let i = 0; i <= 10; i++) c.fillText(String(i), -5 * mm + i * mm, -0.68 * mm);
      c.restore();
    }

    function render(g) {
      g = g || { z: N / N0, mx: cx, my: cy };
      const z = g.z, main = !opt.lens;
      const G = [z, 0, 0, z, N / 2 - z * g.mx, N / 2 - z * g.my];   // 主座標 → 本畫布
      const setG = c => c.setTransform(G[0], 0, 0, G[3], G[4], G[5]);
      const S = NE.S, O = NE.optics();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, N, N);
      const info = { mean: 0, contrast: 0, msg: '' };
      if (!S.power) { info.msg = '（電源未開啟，視野一片黑）'; return info; }
      if (NE.nosepieceMoving) { info.msg = '物鏡轉換中…'; return info; }
      const P = params(O);
      // 本畫布用的轉換
      const M = [z * P.M[0], z * P.M[1], z * P.M[2], z * P.M[3], z * P.M[4] + G[4], z * P.M[5] + G[5]];
      const sEff = P.s * z;
      const cen = toSlide(g.mx, g.my, P), Ru = (N * 0.5) / sEff * 1.02;
      const V = { s: sEff, M, rect: { x0: cen.x - Ru, x1: cen.x + Ru, y0: cen.y - Ru, y1: cen.y + Ru } };
      bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalCompositeOperation = 'source-over'; bctx.globalAlpha = 1; bctx.filter = 'none';
      bctx.fillStyle = '#fff'; bctx.fillRect(0, 0, N, N);
      const sp = NE.spec();
      if (sp) {
        const layers = sp.layers(V);
        for (const L of layers) {
          const dz = L.z - S.focusZ;
          const eff = Math.max(0, Math.abs(dz) - (L.depth || 0) / 2 - O.DOF / 2);
          const diam = eff * 2 * O.NAe;
          const sig = Math.hypot(diam * sEff / 2.5, O.res * sEff * 0.45, O.extraBlur * z);
          const sig0 = sig / z;                                // 以主畫布像素計的模糊（決定淡化程度）
          if (sig0 > 240) continue;
          const fade = 1 / (1 + Math.pow(sig0 / 42, 2));
          let a = (L.alpha == null ? 1 : L.alpha) * fade;
          if (L.phase) a *= Math.min(1, O.phaseVis * (1 + 0.9 * Math.min(1, Math.abs(dz) / (O.DOF * 1.5 + (L.depth || 0) / 2))));
          if (a < 0.01) continue;
          const k = sig > 2.5 ? Math.min(8, sig / 2.5) : 1;
          const w = Math.ceil(N / k), f = 1 / k;
          tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalAlpha = 1; tctx.globalCompositeOperation = 'source-over';
          tctx.clearRect(0, 0, w + 2, w + 2);
          tctx.setTransform(M[0] * f, M[1] * f, M[2] * f, M[3] * f, M[4] * f, M[5] * f);
          V.ks = f;
          L.draw(tctx, V);
          bctx.globalCompositeOperation = 'multiply'; bctx.globalAlpha = a;
          const rem = Math.max(0, sig - k * 0.55);
          if (FILTER && rem > 0.4) bctx.filter = `blur(${rem.toFixed(1)}px)`;
          bctx.imageSmoothingEnabled = true;
          bctx.drawImage(tmp, 0, 0, w, w, 0, 0, w * k, w * k);
          bctx.filter = 'none';
        }
        if (S.cracked) {
          bctx.globalCompositeOperation = 'multiply'; bctx.globalAlpha = 0.85; setG(bctx);
          const r = NE.rng(5); bctx.strokeStyle = 'rgb(40,40,40)'; bctx.lineWidth = 2.2;
          for (let i = 0; i < 7; i++) {
            let x = cx + (r() - 0.5) * 120, y = cy + (r() - 0.5) * 120, a = r() * Math.PI * 2;
            bctx.beginPath(); bctx.moveTo(x, y);
            for (let j = 0; j < 9; j++) { a += (r() - 0.5) * 0.7; x += Math.cos(a) * 60; y += Math.sin(a) * 60; bctx.lineTo(x, y); }
            bctx.stroke();
          }
          bctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
      // 曝光
      ctx.drawImage(base, 0, 0);
      const E = O.E;
      if (E < 1) {
        const gv = Math.round(NE.clamp(E, 0, 1) * 255);
        ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${gv},${gv},${gv})`; ctx.fillRect(0, 0, N, N);
      } else {
        octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalCompositeOperation = 'copy'; octx.drawImage(canvas, 0, 0); octx.globalCompositeOperation = 'source-over';
        let rem = E - 1;
        ctx.globalCompositeOperation = 'lighter';
        while (rem > 0.005) { ctx.globalAlpha = Math.min(1, rem); ctx.drawImage(out, 0, 0); rem -= 1; }
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(255,251,244)'; ctx.fillRect(0, 0, N, N);
      if (O.oilBad || (S.oilOn40 && S.obj === 2)) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,255,255,${0.22 * Math.min(1, E)})`; ctx.fillRect(0, 0, N, N); }
      setG(ctx);
      // 暈影
      ctx.globalCompositeOperation = 'multiply';
      const vg = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
      vg.addColorStop(0, '#fff'); vg.addColorStop(1, 'rgb(205,205,205)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, N0, N0);
      // 目鏡上的灰塵（跟著目鏡轉）
      if (S.eyeDust !== false) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(S.eyeRot * Math.PI / 180);
        ctx.fillStyle = 'rgba(120,120,120,0.55)'; if (FILTER) ctx.filter = `blur(${2.5 * z}px)`;
        ctx.beginPath(); ctx.arc(-R * 0.62, R * 0.48, 6, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(R * 0.55, -R * 0.6, 9, 4, 0.7, 0, 7); ctx.fill();
        ctx.filter = 'none'; ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
      // 測量目標框
      if (S.target && sp && S.target.slide === S.slide && S.target.outline) {
        ctx.save(); ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
        S.target.outline(ctx);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.strokeStyle = 'rgba(0,200,90,0.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore(); setG(ctx);
      }
      if (S.reticle) drawReticle(ctx);
      // 視野光闌（圓形視野）
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.rect(-N0, -N0, 3 * N0, 3 * N0); ctx.arc(cx, cy, R, 0, Math.PI * 2, true); ctx.fill('evenodd');
      const eg = ctx.createRadialGradient(cx, cy, R - 10, cx, cy, R);
      eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (!main) return info;
      // 亮度、對比取樣
      sctx.clearRect(0, 0, 64, 64); sctx.drawImage(canvas, cx - R * 0.7, cy - R * 0.7, R * 1.4, R * 1.4, 0, 0, 64, 64);
      const d = sctx.getImageData(0, 0, 64, 64).data;
      let sum = 0, sum2 = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255; sum += l; sum2 += l * l; n++; }
      info.mean = sum / n; const sd = Math.sqrt(Math.max(0, sum2 / n - info.mean * info.mean));
      info.contrast = info.mean > 0.02 ? Math.min(1, sd / Math.max(0.15, info.mean) * 2.2) : 0;
      // 瞳距不符 → 兩個視野圓
      const dpx = (S.ipd - NE.USER_IPD) * 8;
      if (Math.abs(dpx) > 7) {
        octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalCompositeOperation = 'copy'; octx.drawImage(canvas, 0, 0); octx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, N, N);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55;
        ctx.drawImage(out, -dpx / 2, 0); ctx.drawImage(out, dpx / 2, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        info.msg = '看到兩個圓：請調整雙眼目鏡的視距（瞳距），直到兩個圓合成一個';
      }
      if (!info.msg) {
        if (!sp) info.msg = '載物台上沒有玻片';
        else if (info.mean > 0.97 && E > 1.6) info.msg = '太亮了！請調低亮度（或縮小光圈）';
        else if (info.mean < 0.18) info.msg = '太暗了：請調高亮度或開大光圈';
        else if (O.oilBad) info.msg = '100X 油鏡沒有滴浸潤油：影像模糊又暗';
      }
      return info;
    }
    return { render, toSlide: (x, y) => toSlide(x, y), toScreen, canvas, N: N0, R, cx, cy };
  };
})(window.NE);
