/* 標本（玻片）：以「玻片座標」(µm，y 向上＝遠離學生) 程序化繪製，每個標本分成不同深度 z 的圖層 */
(function (NE) {
  const TAU = Math.PI * 2;
  const lw = (V, um, minPx = 0.8) => Math.max(um, minPx / V.s);

  function tiles(V, size, seed, fn) {
    const r = V.rect;
    const i0 = Math.floor(r.x0 / size), i1 = Math.floor(r.x1 / size);
    const j0 = Math.floor(r.y0 / size), j1 = Math.floor(r.y1 / size);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 40000) return;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) fn(i, j, NE.rng(NE.hash2(i, j, seed)));
  }
  function visible(V, x, y, rad) {
    const r = V.rect; return x + rad > r.x0 && x - rad < r.x1 && y + rad > r.y0 && y - rad < r.y1;
  }
  function textUp(ctx, str, x, y, size, align = 'center', weight = '') {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, -1);
    ctx.font = `${weight} ${size}px "Arial",sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(str, 0, 0); ctx.restore();
  }
  NE.textUp = textUp;
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;

  // 圖案快取（低倍時以紋理代替上千個細胞）
  const patCache = {};
  function patternFill(ctx, V, key, tileUm, drawTile, region) {
    const px = NE.clamp(Math.round(tileUm * V.s * (V.ks || 1)), 8, 512);
    const ck = key + '_' + px;
    let cv = patCache[ck];
    if (!cv) {
      for (const k in patCache) if (k.startsWith(key + '_')) delete patCache[k];
      cv = document.createElement('canvas'); cv.width = cv.height = px;
      const c = cv.getContext('2d'); c.scale(px / tileUm, px / tileUm);
      drawTile(c, tileUm); patCache[ck] = cv;
    }
    const pat = ctx.createPattern(cv, 'repeat');
    if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(tileUm / px));
    ctx.fillStyle = pat;
    const r = V.rect;
    ctx.save();
    if (region) { ctx.beginPath(); region(ctx); ctx.clip(); }
    ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    ctx.restore();
  }

  // ---------- 灰塵（在蓋玻片上表面，可協助找焦距） ----------
  function dustLayer(seed, z, amount = 0.35) {
    return {
      z, depth: 2, alpha: 0.75, draw(ctx, V) {
        tiles(V, 700, seed, (i, j, r) => {
          if (r() > amount) return;
          const x = (i + r()) * 700, y = (j + r()) * 700;
          ctx.fillStyle = 'rgb(95,90,85)'; ctx.strokeStyle = 'rgb(120,115,110)';
          if (r() < 0.65) {
            const rad = 2 + r() * 10;
            ctx.beginPath(); ctx.ellipse(x, y, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, TAU); ctx.fill();
          } else {
            ctx.lineWidth = lw(V, 1.5 + r() * 2); ctx.beginPath(); ctx.moveTo(x, y);
            const L = 40 + r() * 160, a = r() * TAU;
            ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * L * 0.6, y + Math.sin(a + 0.6) * L * 0.6, x + Math.cos(a) * L, y + Math.sin(a) * L);
            ctx.stroke();
          }
        });
      }
    };
  }

  // ---------- 氣泡 ----------
  function bubbleLayer(bubbles, z) {
    return {
      z, depth: 30, draw(ctx, V) {
        for (const b of bubbles) {
          if (!visible(V, b.x, b.y, b.r)) continue;
          const t = Math.max(b.r * 0.16, 5);
          ctx.fillStyle = 'rgb(28,28,30)';
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.arc(b.x, b.y, b.r - t, 0, TAU, true); ctx.fill();
          ctx.strokeStyle = 'rgba(70,70,75,0.6)'; ctx.lineWidth = lw(V, t * 0.25);
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r - t * 1.9, 0, TAU); ctx.stroke();
        }
      }
    };
  }

  // ---------- 洋蔥表皮 ----------
  function makeOnion(p) {
    const seed = p.seed || 11;
    const H = 64;
    const stainAt = p.stainAt || (() => p.stain ? 1 : 0);
    const inside = (x, y) => {
      const a = Math.atan2(y, x);
      const rr = 1 + 0.07 * Math.sin(3 * a + seed) + 0.05 * Math.sin(7 * a + seed * 2);
      return (x / 4200) ** 2 + (y / 2900) ** 2 < rr * rr;
    };
    const rowY = (j, x) => j * H + 6 * Math.sin(x / 420 + j * 1.7) + 3 * Math.sin(x / 130 + j);
    const cellX = (k, j) => k * 300 + (NE.rng(NE.hash2(k, j, seed))() - 0.5) * 170 + ((j * 97) % 300);
    const slant = (k, j) => (NE.rng(NE.hash2(k, j, seed + 5))() - 0.5) * 50;
    function eachCell(V, fn) {
      const r = V.rect;
      const j0 = Math.floor(r.y0 / H) - 1, j1 = Math.floor(r.y1 / H) + 1;
      if (j1 - j0 > 400) return;
      for (let j = j0; j <= j1; j++) {
        const off = (j * 97) % 300;
        const k0 = Math.floor((r.x0 - off) / 300) - 2, k1 = Math.floor((r.x1 - off) / 300) + 2;
        for (let k = k0; k <= k1; k++) {
          const xa = cellX(k, j), xb = cellX(k + 1, j);
          const cx = (xa + xb) / 2, cy = j * H + H / 2;
          if (!inside(cx, cy)) continue;
          fn({ k, j, xa, xb, sa: slant(k, j), sb: slant(k + 1, j), cx, cy, r: NE.rng(NE.hash2(k, j, seed + 9)) });
        }
      }
    }
    function cellPath(ctx, c) {
      const { j, xa, xb, sa, sb } = c;
      ctx.moveTo(xa - sa / 2, rowY(j, xa));
      const n = 4;
      for (let i = 1; i <= n; i++) { const x = xa + (xb - xa) * i / n; ctx.lineTo(x - (i === n ? sb / 2 : 0), rowY(j, x)); }
      for (let i = n; i >= 0; i--) { const x = xa + (xb - xa) * i / n; ctx.lineTo(x + (i === n ? sb / 2 : i === 0 ? sa / 2 : 0), rowY(j + 1, x)); }
      ctx.closePath();
    }
    function nucleus(c) {
      const r = c.r;
      const has = r() < 0.88;
      const fx = 0.15 + r() * 0.7, fy = 0.25 + r() * 0.5;
      return { has, x: c.xa + (c.xb - c.xa) * fx, y: c.j * H + H * fy, rx: 9 + r() * 3.5, ry: 6.5 + r() * 2.5, a: (r() - 0.5) * 0.5, n1: r() };
    }
    function wallsDraw(color, alphaFn) {
      return (ctx, V) => {
        ctx.lineWidth = lw(V, 2.6, 0.9); ctx.lineJoin = 'round';
        eachCell(V, c => {
          const a = alphaFn(c.cx); if (a < 0.02) return;
          ctx.globalAlpha = a; ctx.strokeStyle = color;
          ctx.beginPath(); cellPath(ctx, c); ctx.stroke();
        });
        ctx.globalAlpha = 1;
      };
    }
    const layers = [];
    // 未染色（透明）部分：相位物體
    layers.push({ z: 18, depth: 34, phase: true, draw: wallsDraw('rgb(60,62,66)', x => 1 - stainAt(x)) });
    layers.push({
      z: 22, depth: 14, phase: true, draw(ctx, V) {
        eachCell(V, c => {
          const a = 1 - stainAt(c.cx); if (a < 0.02) return;
          const n = nucleus(c); if (!n.has) return;
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgb(150,152,158)'; ctx.strokeStyle = 'rgb(70,72,78)'; ctx.lineWidth = lw(V, 1.2);
          ctx.beginPath(); ctx.ellipse(n.x, n.y, n.rx, n.ry, n.a, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgb(90,90,95)'; ctx.beginPath(); ctx.arc(n.x + n.rx * 0.3 * (n.n1 - 0.5), n.y, 1.8, 0, TAU); ctx.fill();
          // 細胞質顆粒
          ctx.fillStyle = 'rgb(130,132,138)';
          const r = NE.rng(NE.hash2(c.k, c.j, 77));
          for (let g = 0; g < 7; g++) { ctx.beginPath(); ctx.arc(c.xa + (c.xb - c.xa) * r(), c.j * H + H * (0.15 + r() * 0.7), 0.8 + r(), 0, TAU); ctx.fill(); }
        });
        ctx.globalAlpha = 1;
      }
    });
    // 碘液染色部分
    if (p.stain) {
      layers.push({
        z: 18, depth: 34, alpha: 0.9, draw(ctx, V) {
          eachCell(V, c => {
            const a = stainAt(c.cx); if (a < 0.02) return;
            ctx.globalAlpha = a * 0.28; ctx.fillStyle = 'rgb(236,196,110)';
            ctx.beginPath(); cellPath(ctx, c); ctx.fill();
          });
          ctx.globalAlpha = 1;
          wallsDraw('rgb(176,118,48)', x => stainAt(x))(ctx, V);
        }
      });
      layers.push({
        z: 22, depth: 14, alpha: 0.95, draw(ctx, V) {
          eachCell(V, c => {
            const a = stainAt(c.cx); if (a < 0.02) return;
            const n = nucleus(c); if (!n.has) return;
            ctx.globalAlpha = a;
            ctx.fillStyle = 'rgb(150,88,28)';
            ctx.beginPath(); ctx.ellipse(n.x, n.y, n.rx, n.ry, n.a, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgb(90,45,10)'; ctx.beginPath(); ctx.arc(n.x + n.rx * 0.3 * (n.n1 - 0.5), n.y, 2.2, 0, TAU); ctx.fill();
          });
          ctx.globalAlpha = 1;
        }
      });
    }
    // 摺疊（未攤平）
    if (p.fold) {
      const band = (ctx) => { ctx.rect(-6000, p.fold.y, 12000, p.fold.h); };
      layers.push({
        z: 58, depth: 30, phase: !p.stain, alpha: p.stain ? 0.9 : 1, draw(ctx, V) {
          ctx.save(); ctx.beginPath(); band(ctx); ctx.clip();
          ctx.translate(41, 27); ctx.rotate(0.03);
          wallsDraw(p.stain ? 'rgb(170,110,45)' : 'rgb(60,62,66)', () => 1)(ctx, V);
          ctx.restore();
          ctx.strokeStyle = p.stain ? 'rgb(150,95,40)' : 'rgb(80,80,85)'; ctx.lineWidth = lw(V, 6);
          ctx.beginPath(); ctx.moveTo(-6000, p.fold.y); ctx.bezierCurveTo(-2000, p.fold.y + 40, 2000, p.fold.y - 40, 6000, p.fold.y); ctx.stroke();
        }
      });
    }
    // 組織邊緣（撕裂的不規則邊）
    layers.push({
      z: 18, depth: 34, phase: !p.stain, draw(ctx, V) {
        ctx.strokeStyle = p.stain ? 'rgb(170,115,50)' : 'rgb(70,70,74)'; ctx.lineWidth = lw(V, 4);
        ctx.beginPath();
        for (let i = 0; i <= 240; i++) {
          const a = i / 240 * TAU;
          const rr = 1 + 0.07 * Math.sin(3 * a + seed) + 0.05 * Math.sin(7 * a + seed * 2);
          const x = Math.cos(a) * 4200 * rr, y = Math.sin(a) * 2900 * rr;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    });
    if (p.bubbles && p.bubbles.length) layers.push(bubbleLayer(p.bubbles, 60));
    return {
      layers: () => layers, mainZ: 20, mainDepth: 30,
      pick(x, y) {
        const j = Math.floor(y / H);
        for (let jj = j - 1; jj <= j + 1; jj++) {
          const off = (jj * 97) % 300;
          const k0 = Math.floor((x - off) / 300) - 2;
          for (let k = k0; k <= k0 + 4; k++) {
            const xa = cellX(k, jj), xb = cellX(k + 1, jj);
            if (x >= xa && x <= xb && y >= rowY(jj, x) && y <= rowY(jj + 1, x) && inside((xa + xb) / 2, jj * H + H / 2)) {
              const c = { k, j: jj, xa, xb, sa: slant(k, jj), sb: slant(k + 1, jj) };
              const len = Math.round(xb - xa), wid = Math.round(rowY(jj + 1, (xa + xb) / 2) - rowY(jj, (xa + xb) / 2));
              return {
                id: 'on' + k + '_' + jj, label: '洋蔥表皮細胞', dims: { '長度（長軸）': len, '寬度（短軸）': wid }, main: '長度（長軸）',
                outline(ctx) { ctx.beginPath(); cellPath(ctx, c); }
              };
            }
          }
        }
        return null;
      }
    };
  }

  // ---------- 口腔皮膜細胞 ----------
  function makeCheek(p) {
    const seed = p.seed || 23;
    const stainAt = p.stainAt || (() => p.stain ? 1 : 0);
    const T = 170;
    function cellsIn(i, j) {
      const r = NE.rng(NE.hash2(i, j, seed));
      const cx = (i + 0.5) * T, cy = (j + 0.5) * T;
      const d = Math.hypot(cx, cy * 1.4);
      const dens = d < 3200 ? 1 - d / 4200 : 0;
      const n = Math.floor(r() * 3.4 * dens + (r() < dens * 0.4 ? 1 : 0));
      const out = [];
      for (let q = 0; q < n; q++) {
        const R = 23 + r() * 12;
        const x = (i + 0.15 + r() * 0.7) * T, y = (j + 0.15 + r() * 0.7) * T;
        const nv = 8 + Math.floor(r() * 3), rot = r() * TAU;
        const pts = [];
        for (let v = 0; v < nv; v++) { const a = rot + v / nv * TAU; const rr = R * (0.82 + r() * 0.3); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
        const na = r() * TAU, nd = r() * R * 0.3;
        out.push({ id: `ck${i}_${j}_${q}`, x, y, R, pts, nx: x + Math.cos(na) * nd, ny: y + Math.sin(na) * nd, nr: 3.6 + r() * 1.2, ne: 0.75 + r() * 0.25, na: r() * 3, fold: r() < 0.5 ? [r() * TAU, (r() - 0.5) * R] : null, bac: Math.floor(r() * 6) });
      }
      return out;
    }
    function polyPath(ctx, pts) {
      const n = pts.length;
      ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
      ctx.closePath();
    }
    function each(V, fn) { tiles(V, T, 0, (i, j) => { for (const c of cellsIn(i, j)) if (visible(V, c.x, c.y, c.R * 1.3)) fn(c); }); }
    const layers = [
      {
        z: 4, depth: 6, phase: true, draw(ctx, V) {
          ctx.lineWidth = lw(V, 1.1);
          each(V, c => {
            const a = 1 - stainAt(c.x); if (a < 0.02) return;
            ctx.globalAlpha = a; ctx.fillStyle = 'rgb(215,216,220)'; ctx.strokeStyle = 'rgb(80,82,88)';
            ctx.beginPath(); polyPath(ctx, c.pts); ctx.fill(); ctx.stroke();
            if (c.fold) { ctx.strokeStyle = 'rgb(140,142,148)'; ctx.beginPath(); const [fa, fo] = c.fold; ctx.moveTo(c.x + Math.cos(fa) * c.R * 0.8 + fo * 0.2, c.y + Math.sin(fa) * c.R * 0.8); ctx.quadraticCurveTo(c.x + fo * 0.3, c.y - fo * 0.3, c.x - Math.cos(fa) * c.R * 0.7, c.y - Math.sin(fa) * c.R * 0.7); ctx.stroke(); }
            ctx.fillStyle = 'rgb(165,166,172)'; ctx.strokeStyle = 'rgb(85,85,92)';
            ctx.beginPath(); ctx.ellipse(c.nx, c.ny, c.nr, c.nr * c.ne, c.na, 0, TAU); ctx.fill(); ctx.stroke();
          });
          ctx.globalAlpha = 1;
        }
      }
    ];
    if (p.stain) layers.push({
      z: 4, depth: 6, alpha: 0.95, draw(ctx, V) {
        ctx.lineWidth = lw(V, 1.3);
        each(V, c => {
          const a = stainAt(c.x); if (a < 0.02) return;
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgb(196,214,240)'; ctx.strokeStyle = 'rgb(90,120,190)';
          ctx.beginPath(); polyPath(ctx, c.pts); ctx.fill(); ctx.stroke();
          if (c.fold) { ctx.strokeStyle = 'rgb(130,155,210)'; ctx.beginPath(); const [fa, fo] = c.fold; ctx.moveTo(c.x + Math.cos(fa) * c.R * 0.8 + fo * 0.2, c.y + Math.sin(fa) * c.R * 0.8); ctx.quadraticCurveTo(c.x + fo * 0.3, c.y - fo * 0.3, c.x - Math.cos(fa) * c.R * 0.7, c.y - Math.sin(fa) * c.R * 0.7); ctx.stroke(); }
          ctx.fillStyle = 'rgb(40,62,160)';
          ctx.beginPath(); ctx.ellipse(c.nx, c.ny, c.nr, c.nr * c.ne, c.na, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgb(50,70,150)';
          const r = NE.rng(NE.hash2(c.x | 0, c.y | 0, 3));
          for (let b = 0; b < c.bac; b++) { ctx.beginPath(); ctx.arc(c.x + (r() - 0.5) * c.R * 1.6, c.y + (r() - 0.5) * c.R * 1.6, 0.7, 0, TAU); ctx.fill(); }
        });
        ctx.globalAlpha = 1;
      }
    });
    if (p.bubbles && p.bubbles.length) layers.push(bubbleLayer(p.bubbles, 40));
    return {
      layers: () => layers, mainZ: 4, mainDepth: 6,
      pick(x, y) {
        const i = Math.floor(x / T), j = Math.floor(y / T);
        let best = null;
        for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++)
          for (const c of cellsIn(a, b)) {
            const d = Math.hypot(x - c.x, y - c.y);
            if (d < c.R * 0.95 && (!best || d < best.d)) best = { d, c };
          }
        if (!best) return null;
        const c = best.c;
        let rs = 0; for (const p of c.pts) rs += Math.hypot(p[0] - c.x, p[1] - c.y);
        const D = Math.round(2 * rs / c.pts.length);
        return {
          id: c.id, label: '口腔皮膜細胞', dims: { '細胞直徑': D, '細胞核直徑': Math.round(c.nr * (1 + c.ne)) }, main: '細胞直徑',
          outline(ctx) { ctx.beginPath(); polyPath(ctx, c.pts); }
        };
      }
    };
  }

  // ---------- 血液抹片（瑞氏染色） ----------
  function makeBlood() {
    const T = 60, seed = 31;
    function cellsIn(i, j) {
      const r = NE.rng(NE.hash2(i, j, seed));
      const out = [];
      for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
        if (r() > 0.6) { r(); r(); r(); continue; }
        out.push({ x: i * T + a * 10 + 5 + (r() - 0.5) * 5, y: j * T + b * 10 + 5 + (r() - 0.5) * 5, R: 3.55 + r() * 0.55 });
      }
      const extra = r();
      const w = extra < 0.012 ? { x: i * T + 30, y: j * T + 30, type: r() < 0.6 ? 'n' : 'l', a: r() * TAU } : null;
      const pl = []; const np = Math.floor(r() * 2.3);
      for (let q = 0; q < np; q++) pl.push({ x: i * T + r() * T, y: j * T + r() * T, R: 0.9 + r() * 0.7 });
      return { rbc: w ? out.filter(c => Math.hypot(c.x - w.x, c.y - w.y) > 9) : out, w, pl };
    }
    const inSmear = (x, y) => Math.abs(x) < 14000 && Math.abs(y) < 8500;
    function drawRBC(ctx, c, V) {
      ctx.fillStyle = 'rgb(236,160,164)';
      ctx.beginPath(); ctx.arc(c.x, c.y, c.R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgb(214,108,118)'; ctx.lineWidth = c.R * 0.42;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.R * 0.77, 0, TAU); ctx.stroke();
    }
    const layer = {
      z: 2, depth: 4, alpha: 0.85, draw(ctx, V) {
        if (V.s < 0.75) {
          patternFill(ctx, V, 'blood', 120, (c, t) => {
            const r = NE.rng(99);
            for (let n = 0; n < 220; n++) {
              const x = r() * t, y = r() * t;
              c.fillStyle = 'rgba(214,118,126,0.55)'; c.beginPath(); c.arc(x, y, 3.9, 0, TAU); c.fill();
            }
            c.fillStyle = 'rgba(120,60,150,0.9)'; c.beginPath(); c.arc(r() * t, r() * t, 5.5, 0, TAU); c.fill();
          }, ctx2 => ctx2.rect(-14000, -8500, 28000, 17000));
          return;
        }
        tiles(V, T, 0, (i, j) => {
          if (!inSmear(i * T, j * T)) return;
          const g = cellsIn(i, j);
          for (const c of g.rbc) drawRBC(ctx, c, V);
          ctx.fillStyle = 'rgb(140,90,170)';
          for (const p of g.pl) { ctx.beginPath(); ctx.arc(p.x, p.y, p.R, 0, TAU); ctx.fill(); }
          if (g.w) {
            const w = g.w;
            ctx.fillStyle = 'rgb(222,206,232)';
            ctx.beginPath(); ctx.arc(w.x, w.y, w.type === 'n' ? 6.2 : 4.4, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgb(92,40,140)';
            if (w.type === 'n') {
              for (let q = 0; q < 3; q++) { const a = w.a + q * 1.9; ctx.beginPath(); ctx.ellipse(w.x + Math.cos(a) * 2.6, w.y + Math.sin(a) * 2.6, 2.1, 1.5, a, 0, TAU); ctx.fill(); }
              ctx.strokeStyle = 'rgb(92,40,140)'; ctx.lineWidth = 0.8; ctx.beginPath();
              for (let q = 0; q < 3; q++) { const a = w.a + q * 1.9; q ? ctx.lineTo(w.x + Math.cos(a) * 2.6, w.y + Math.sin(a) * 2.6) : ctx.moveTo(w.x + Math.cos(a) * 2.6, w.y + Math.sin(a) * 2.6); }
              ctx.stroke();
            } else { ctx.beginPath(); ctx.arc(w.x + 0.4, w.y, 3.7, 0, TAU); ctx.fill(); }
          }
        });
      }
    };
    return {
      layers: () => [layer], mainZ: 2, mainDepth: 4,
      pick(x, y) {
        const i = Math.floor(x / T), j = Math.floor(y / T);
        for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) {
          const g = cellsIn(a, b);
          if (g.w && Math.hypot(x - g.w.x, y - g.w.y) < 6) { const w = g.w; const R = w.type === 'n' ? 6.2 : 4.4; return { id: 'w' + a + '_' + b, label: w.type === 'n' ? '白血球（嗜中性球）' : '白血球（淋巴球）', dims: { '細胞直徑': +(2 * R).toFixed(1) }, main: '細胞直徑', outline(ctx) { ctx.beginPath(); ctx.arc(w.x, w.y, R, 0, TAU); } }; }
          for (const c of g.rbc) if (Math.hypot(x - c.x, y - c.y) < c.R) {
            return { id: 'r' + a + '_' + b + '_' + c.x.toFixed(1), label: '紅血球', dims: { '細胞直徑': +(2 * c.R).toFixed(1) }, main: '細胞直徑', outline(ctx) { ctx.beginPath(); ctx.arc(c.x, c.y, c.R, 0, TAU); } };
          }
        }
        return null;
      }
    };
  }

  // ---------- 馬鈴薯澱粉粒 ----------
  function makePotato(p) {
    const T = 150, seed = p.seed || 41;
    const stainAt = p.stainAt || (() => p.stain ? 1 : 0);
    function grains(i, j) {
      const r = NE.rng(NE.hash2(i, j, seed));
      const cx = (i + 0.5) * T, cy = (j + 0.5) * T;
      if (Math.hypot(cx, cy * 1.3) > 3800) return [];
      const n = Math.floor(r() * 4.2), out = [];
      for (let q = 0; q < n; q++) {
        const a = 6 + 30 * Math.pow(r(), 1.7);
        out.push({ id: `pt${i}_${j}_${q}`, x: (i + 0.15 + r() * 0.7) * T, y: (j + 0.15 + r() * 0.7) * T, a, b: a * (0.68 + r() * 0.25), rot: r() * TAU, rings: 3 + Math.floor(r() * 4) });
      }
      return out;
    }
    function grainDraw(ctx, V, g, stained) {
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot);
      ctx.beginPath(); ctx.ellipse(0, 0, g.a, g.b, 0, 0, TAU);
      if (stained) { ctx.fillStyle = 'rgb(70,50,125)'; ctx.fill(); ctx.strokeStyle = 'rgb(35,25,70)'; }
      else { ctx.fillStyle = 'rgb(225,226,230)'; ctx.fill(); ctx.strokeStyle = 'rgb(70,72,78)'; }
      ctx.lineWidth = lw(V, 1.5); ctx.stroke();
      ctx.lineWidth = lw(V, 0.6, 0.5);
      ctx.strokeStyle = stained ? 'rgb(40,28,80)' : 'rgb(150,152,158)';
      const hx = g.a * 0.55;
      for (let k = 1; k <= g.rings; k++) {
        const f = k / (g.rings + 1);
        ctx.beginPath(); ctx.ellipse(hx * (1 - f), 0, g.a * f, g.b * f, 0, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = stained ? 'rgb(30,20,60)' : 'rgb(110,110,115)';
      ctx.beginPath(); ctx.arc(hx, 0, Math.max(1, g.a * 0.06), 0, TAU); ctx.fill();
      ctx.restore();
    }
    const bins = [[0, 14, 10], [14, 24, 19], [24, 99, 30]];
    const layers = [];
    bins.forEach(([lo, hi, z]) => {
      layers.push({
        z, depth: z * 1.1, phase: true, draw(ctx, V) {
          tiles(V, T, 0, (i, j) => grains(i, j).forEach(g => {
            if (g.a < lo || g.a >= hi || !visible(V, g.x, g.y, g.a)) return;
            const a = 1 - stainAt(g.x); if (a < 0.02) return;
            ctx.globalAlpha = a; grainDraw(ctx, V, g, false);
          }));
          ctx.globalAlpha = 1;
        }
      });
      if (p.stain) layers.push({
        z, depth: z * 1.1, alpha: 0.9, draw(ctx, V) {
          tiles(V, T, 0, (i, j) => grains(i, j).forEach(g => {
            if (g.a < lo || g.a >= hi || !visible(V, g.x, g.y, g.a)) return;
            const a = stainAt(g.x); if (a < 0.02) return;
            ctx.globalAlpha = a; grainDraw(ctx, V, g, true);
          }));
          ctx.globalAlpha = 1;
        }
      });
    });
    if (p.bubbles && p.bubbles.length) layers.push(bubbleLayer(p.bubbles, 50));
    return {
      layers: () => layers, mainZ: 18, mainDepth: 24,
      pick(x, y) {
        const i = Math.floor(x / T), j = Math.floor(y / T);
        for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++)
          for (const g of grains(a, b)) {
            const dx = x - g.x, dy = y - g.y, c = Math.cos(-g.rot), s = Math.sin(-g.rot);
            const u = dx * c - dy * s, v = dx * s + dy * c;
            if ((u / g.a) ** 2 + (v / g.b) ** 2 < 1) return { id: g.id, label: '澱粉粒', dims: { '長徑': Math.round(2 * g.a), '短徑': Math.round(2 * g.b) }, main: '長徑', outline(ctx) { ctx.beginPath(); ctx.ellipse(g.x, g.y, g.a, g.b, g.rot, 0, TAU); } };
          }
        return null;
      }
    };
  }

  // ---------- 字母 e（剪報） ----------
  let eCanvas = null;
  function eBitmap() {
    if (eCanvas) return eCanvas;
    const N = 1000; eCanvas = document.createElement('canvas'); eCanvas.width = eCanvas.height = N;
    const c = eCanvas.getContext('2d');
    c.fillStyle = '#000'; c.font = 'bold 820px "Times New Roman",serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText('e', N / 2, N * 0.72);
    const r = NE.rng(7);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 2600; i++) { c.beginPath(); c.arc(r() * N, r() * N, 0.6 + r() * 2.2, 0, TAU); c.fill(); }
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#000';
    for (let i = 0; i < 900; i++) { c.beginPath(); c.arc(r() * N, r() * N, 0.5 + r() * 1.6, 0, TAU); c.globalAlpha = 0.25 + r() * 0.4; c.fill(); }
    c.globalAlpha = 1;
    return eCanvas;
  }
  function makeLetterE() {
    const SZ = 3000; // bitmap 覆蓋 3 mm
    return {
      layers: () => [
        {
          z: 0, depth: 50, alpha: 0.6, draw(ctx, V) {
            // 報紙纖維
            ctx.fillStyle = 'rgb(236,232,220)';
            ctx.fillRect(-2600, -2200, 5200, 4400);
            tiles(V, 250, 5, (i, j, r) => {
              if (Math.abs(i * 250) > 2600 || Math.abs(j * 250) > 2200) return;
              for (let q = 0; q < 3; q++) {
                ctx.strokeStyle = r() < 0.5 ? 'rgb(200,195,180)' : 'rgb(215,210,198)';
                ctx.lineWidth = lw(V, 6 + r() * 12);
                const x = (i + r()) * 250, y = (j + r()) * 250, a = r() * TAU, L = 150 + r() * 500;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * L / 2, y + Math.sin(a + 0.4) * L / 2, x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
              }
            });
            ctx.strokeStyle = 'rgb(190,185,170)'; ctx.lineWidth = lw(V, 8); ctx.strokeRect(-2600, -2200, 5200, 4400);
          }
        },
        {
          z: 12, depth: 12, alpha: 0.88, draw(ctx, V) {
            ctx.save(); ctx.scale(1, -1); ctx.imageSmoothingEnabled = true;
            ctx.drawImage(eBitmap(), -SZ / 2, -SZ / 2, SZ, SZ);
            ctx.restore();
          }
        },
        dustLayer(3, 175)
      ],
      mainZ: 8, mainDepth: 30, pick: () => null
    };
  }

  // ---------- 三色絲線（景深） ----------
  const THREAD_COL = [['紅', 'rgb(214,40,46)'], ['黃', 'rgb(232,186,20)'], ['藍', 'rgb(40,74,200)']];
  NE.THREAD_COL = THREAD_COL;
  NE.THREAD_Z = [45, 135, 225];
  function makeThreads() {
    const angles = [0.35, -0.55, 1.45];
    const layers = [];
    for (let lev = 0; lev < 3; lev++) {
      const col = NE.threadOrder[lev];
      const ang = angles[col];
      const zc = NE.THREAD_Z[lev];
      for (let sub = 0; sub < 3; sub++) {
        layers.push({
          z: zc + (sub - 1) * 24, depth: 22, alpha: 0.8, draw(ctx, V) {
            const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
            const r = V.rect, cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, half = (r.x1 - r.x0) * 0.75;
            const t0 = (cx * dx + cy * dy) - half, t1 = t0 + 2 * half;
            const step = Math.max(8, 5 / V.s);
            ctx.strokeStyle = THREAD_COL[col][1]; ctx.lineCap = 'round';
            for (let f = 0; f < 9; f++) {
              if (f % 3 !== sub) continue;
              const fr = NE.rng(col * 100 + f);
              const off = (f - 4) * 10 + (fr() - 0.5) * 6, amp = 3 + fr() * 5, wl = 300 + fr() * 300, ph = fr() * TAU;
              ctx.lineWidth = lw(V, 9 + fr() * 4); ctx.globalAlpha = 0.55;
              ctx.beginPath();
              for (let t = Math.max(t0, -7000); t <= Math.min(t1, 7000); t += step) {
                const o = off + amp * Math.sin(t / wl * TAU + ph);
                const x = dx * t + nx * o, y = dy * t + ny * o;
                t === Math.max(t0, -7000) ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
              }
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
        });
      }
    }
    layers.push(dustLayer(8, 305));
    return { layers: () => layers, mainZ: 135, mainDepth: 220, pick: () => null };
  }

  // ---------- 載物臺測微器 1 mm / 100 格 ----------
  function micrometerLayer(z) {
    return {
      z, depth: 2, alpha: 0.95, draw(ctx, V) {
        ctx.fillStyle = 'rgb(20,20,22)'; ctx.strokeStyle = 'rgb(20,20,22)';
        // 外圈（低倍時協助找到刻度）
        ctx.lineWidth = lw(V, 25); ctx.beginPath(); ctx.arc(0, 0, 1350, 0, TAU); ctx.stroke();
        const w = lw(V, 1.6, 0.85);
        ctx.fillRect(-500, -w / 2, 1000, w);
        for (let i = 0; i <= 100; i++) {
          const x = -500 + i * 10;
          const h = i % 10 === 0 ? 80 : i % 5 === 0 ? 58 : 38;
          ctx.fillRect(x - w / 2, 0, w, h);
        }
        for (let i = 0; i <= 10; i++) textUp(ctx, String(i * 10), -500 + i * 100, 112, 34);
        textUp(ctx, '1 DIV = 0.01 mm', 0, -110, 46, 'center', 'bold');
        textUp(ctx, 'TEKFAR', 0, -950, 120, 'center', 'bold');
      }
    };
  }
  function makeMicrometer() {
    return { layers: () => [micrometerLayer(0), dustLayer(13, 175, 0.25)], mainZ: 0, mainDepth: 2, rotJitter: 4, pick: () => null };
  }
  function makeStack() {
    const cheek = makeCheek({ stain: 'mb', seed: 57 });
    const UP = 1180;
    const cl = cheek.layers().map(L => Object.assign({}, L, { z: L.z + UP }));
    return {
      layers: () => [micrometerLayer(0)].concat(cl, [dustLayer(19, UP + 175, 0.25)]),
      mainZ: 0, mainDepth: 2, coverTop: UP + 175, rotJitter: 2, pick: cheek.pick && ((x, y) => null)
    };
  }

  // ---------- 玻片盒 ----------
  NE.SLIDE_INFO = {
    letter_e: { name: '字母「e」玻片', desc: '報紙上剪下的字母 e，水埋。觀察倒像、練習移動玻片', dot: '#222' },
    threads: { name: '三色絲線玻片', desc: '紅、黃、藍三條絲線交疊。判斷上下順序、體會景深', dot: 'conic-gradient(#d22 0 33%,#e8b915 0 66%,#2a4ac8 0)' },
    onion_raw: { name: '洋蔥表皮（未染色）', desc: '洋蔥鱗葉內表皮水埋玻片，透明、對比低', dot: '#cfd3d8' },
    onion_iodine: { name: '洋蔥表皮（碘液染色）', desc: '細胞核染成黃褐色', dot: '#b97a2e' },
    onion_bubbles: { name: '有氣泡的洋蔥水埋玻片', desc: '蓋蓋玻片太快產生了氣泡。練習分辨氣泡與細胞', dot: '#9aa' },
    cheek_mb: { name: '口腔皮膜細胞（亞甲藍）', desc: '細胞核染成深藍色', dot: '#3b5bc4' },
    cheek_raw: { name: '口腔皮膜細胞（未染色）', desc: '生理食鹽水封片，未染色', dot: '#ccd' },
    potato_iodine: { name: '馬鈴薯澱粉粒（碘液）', desc: '澱粉遇碘呈藍紫色，可見同心輪紋', dot: '#46327a' },
    blood: { name: '人類血液抹片（瑞氏染色）', desc: '永久玻片。紅血球、白血球、血小板', dot: '#d77' },
    micrometer: { name: '載物臺測微器', desc: '1 mm 分成 100 格，每格 0.01 mm = 10 µm', dot: '#555' },
    stack: { name: '口腔細胞玻片疊在載物臺測微器上', desc: '示範：為什麼不能直接用載物臺測微器測量', dot: 'linear-gradient(#3b5bc4,#555)' }
  };
  const cache = {};
  NE.userSlides = {};
  NE.getSlide = function (id) {
    if (cache[id]) return cache[id];
    let sp;
    if (NE.userSlides[id]) sp = NE.userSlides[id];
    else switch (id) {
      case 'letter_e': sp = makeLetterE(); break;
      case 'threads': sp = makeThreads(); sp.coverTop = 305; break;
      case 'onion_raw': sp = makeOnion({}); break;
      case 'onion_iodine': sp = makeOnion({ stain: 'iodine', seed: 17 }); break;
      case 'onion_bubbles': sp = makeOnion({ seed: 19, bubbles: [{ x: 300, y: 200, r: 420 }, { x: -900, y: -500, r: 160 }, { x: -200, y: -260, r: 70 }, { x: 1300, y: -700, r: 260 }, { x: 650, y: 950, r: 110 }] }); break;
      case 'cheek_mb': sp = makeCheek({ stain: 'mb' }); break;
      case 'cheek_raw': sp = makeCheek({ seed: 29 }); break;
      case 'potato_iodine': sp = makePotato({ stain: 'iodine' }); break;
      case 'blood': sp = makeBlood(); break;
      case 'micrometer': sp = makeMicrometer(); break;
      case 'stack': sp = makeStack(); break;
      default: return null;
    }
    sp.id = id;
    if (sp.coverTop == null) sp.coverTop = 175;
    if (!NE.userSlides[id] && !['letter_e', 'threads', 'micrometer', 'stack'].includes(id)) {
      const L = sp.layers(); L.push(dustLayer(NE.hash2(id.length, 3, 1) % 1000, sp.coverTop, 0.3));
      sp.layers = () => L;
    }
    cache[id] = sp;
    return sp;
  };
  // 學生自製玻片（水埋、染色後）
  NE.makeUserSlide = function (id, p) {
    delete cache[id];
    const front = p.stainFront; // 染液由滴液側往對側推進的前緣位置（以 dir 方向計）
    const dir = p.stainDir || 1;
    const stainAt = p.stain ? (x => NE.clamp((dir * x - front) / 1500 + 0.5, 0, 1)) : (() => 0);
    let sp;
    const args = { seed: p.seed, stain: p.stain, stainAt, bubbles: p.bubbles, fold: p.fold };
    if (p.tissue === 'onion') sp = makeOnion(args);
    else if (p.tissue === 'cheek') sp = makeCheek(args);
    else sp = makePotato(args);
    sp.coverTop = 175 + (p.excess ? 60 : 0);
    if (p.excess) { const L = sp.layers().map(l => Object.assign({}, l, { z: l.z + 60 })); sp.layers = () => L; sp.mainZ += 60; sp.drift = true; }
    const L = sp.layers(); L.push(dustLayer(5, sp.coverTop, 0.3));
    if (p.dirty) { L.push(dustLayer(77, 3, 0.95)); L.push(dustLayer(78, 3, 0.95)); }
    sp.layers = () => L;
    NE.userSlides[id] = sp;
    NE.SLIDE_INFO[id] = { name: p.name, desc: p.desc, dot: p.dot, user: true };
    sp.id = id; cache[id] = sp;
    return sp;
  };
})(window.NE);
