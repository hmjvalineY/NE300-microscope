/* 實驗台：3D 模型＋目鏡視野＋操作面板 */
(function (NE) {
  const PART_HINT = {
    coarse: ['粗調節輪', '上下拖曳或滾輪：大幅升降載物台（1 圈 37.7 mm）'],
    fine: ['細調節輪', '上下拖曳或滾輪：微調焦距（1 圈 0.2 mm，每格 2 µm）'],
    bright: ['亮度調節鈕', '上下拖曳或滾輪：調整 LED 亮度'],
    aperture: ['孔徑光圈環（標有 4x～100x）', '左右拖曳或滾輪：轉動光圈環；轉到與物鏡相同的倍率刻度＝適當光圈'],
    condenser: ['聚光鏡', 'N.A 1.25，固定插入式；把光線集中到標本上'],
    knobX: ['載物台 X 旋鈕（下）', '拖曳或滾輪：玻片左右移動'],
    knobY: ['載物台 Y 旋鈕（上）', '拖曳或滾輪：玻片前後移動'],
    nosepiece: ['旋轉盤（鼻輪）', '左右拖曳或滾輪：轉換物鏡'],
    obj0: ['物鏡 PLAN 4X', '點一下轉到此物鏡'], obj1: ['物鏡 PLAN 10X', '點一下轉到此物鏡'],
    obj2: ['物鏡 PLAN 40X', '點一下轉到此物鏡'], obj3: ['物鏡 PLAN 100X（油鏡）', '點一下轉到此物鏡'],
    eyepiece: ['右目鏡（10X）', '左右拖曳或滾輪：旋轉右目鏡（目鏡測微器跟著轉）'],
    eyepieceL: ['左目鏡（10X）', '左右拖曳：調整雙眼視距（向外拉開、向內靠攏）'], diopter: ['屈光度調節環', '補償左右眼視力差異'],
    tube: ['雙眼目鏡筒', '左右拖曳或滾輪：調整雙眼視距（48–75 mm）'], head: ['三眼觀察筒（NE300T）', '兩個目鏡＋上方相機接口，固定分光 50/50'],
    trinoc: ['三眼相機接口', 'C 型接口，可接 TK5613 平板數位相機，影像可投影給全班看'],
    stage: ['載物台', '180×130 mm，行程 74×30 mm'], holder: ['標本夾持器', '隨 XY 旋鈕移動'],
    clip: ['活動標本夾（左側，彈簧回彈）', '點一下：撥開並按住／放開'], slide: ['玻片', '沒玻片時點一下開玻片盒；撥開標本夾後點一下＝把玻片推到最裡面'],
    power: ['電源開關', '點一下：開／關'], light: ['LED 光源', '3W LED，5700K，壽命 30000 小時'],
    lcd: ['液晶螢幕', '顯示倍率、亮度、色溫'], arm: ['鏡臂', '一體式金屬機身，拿取時一手握鏡臂'],
    base: ['鏡座', '拿取時另一手托住鏡座'], tension: ['鬆緊環', '調整粗調節輪的鬆緊度'],
    lock: ['上限位鎖定', '點一下：鎖定／解除載物台上升的最高位置']
  };
  NE.PART_HINT = PART_HINT;

  let model, view, eyeInfo = {};
  const ui = {};

  function build() {
    const ctr = NE.$('#controls');
    const S = NE.S;
    const group = (title, valId) => {
      const g = NE.h('div', { class: 'cgroup' });
      g.appendChild(NE.h('h4', null, `<span>${title}</span>${valId ? `<span class="val" id="${valId}"></span>` : ''}`));
      ctr.appendChild(g); return g;
    };
    // 電源 / 亮度
    let g = group('電源・亮度', 'v-bright');
    let row = NE.h('div', { class: 'crow' }); g.appendChild(row);
    ui.power = NE.h('button', { class: 'btn power', title: '電源開關' }, '⏻');
    ui.power.onclick = () => NE.setPower(!S.power); row.appendChild(ui.power);
    const kb = NE.knob({ id: 'b', size: 52, label: '亮度鈕', onTurn: d => NE.setBright(S.bright + d * 14), wheelStep: 0.2 });
    row.appendChild(kb.el); ui.kb = kb;
    // 光圈
    g = group('聚光鏡光圈環', 'v-ap');
    ui.ap = NE.h('input', { type: 'range', min: 0.05, max: 1.25, step: 0.01, value: S.aperture, style: 'width:120px' });
    ui.ap.oninput = () => NE.setAperture(+ui.ap.value);
    g.appendChild(NE.h('div', { class: 'ccol', style: 'align-items:stretch' }, '<div style="display:flex;justify-content:space-between"><span>小（暗）</span><span>大（亮）</span></div>'));
    g.appendChild(ui.ap);
    ui.apInfo = NE.h('div', { class: 'readout' }); g.appendChild(ui.apInfo);
    // 物鏡
    g = group('物鏡（旋轉盤）', 'v-mag');
    row = NE.h('div', { class: 'crow' }); g.appendChild(row);
    ui.obj = NE.OBJ.map((o, i) => {
      const b = NE.h('button', { class: 'btn objbtn', style: `--rc:${o.ring === '#f4f4f4' ? '#999' : o.ring}`, title: o.name }, o.mag + 'X');
      b.onclick = () => NE.setObj(i); row.appendChild(b); return b;
    });
    ui.objInfo = NE.h('div', { class: 'readout' }); g.appendChild(ui.objInfo);
    // 對焦
    g = group('調焦（同軸粗/細調節輪）', 'v-focus');
    row = NE.h('div', { class: 'crow' }); g.appendChild(row);
    const kc = NE.knob({ id: 'c', size: 62, label: '粗調節輪', ridges: 24, onTurn: (d, sh) => NE.turnCoarse(d * (sh ? 0.1 : 1)), wheelStep: 0.06 });
    const kf = NE.knob({ id: 'f', size: 52, label: '細調節輪', scale: 50, color: '#3a3e46', onTurn: (d, sh) => NE.turnFine(d * (sh ? 0.25 : 1)), wheelStep: 0.12 });
    row.appendChild(kc.el); row.appendChild(kf.el); ui.kc = kc; ui.kf = kf;
    const col = NE.h('div', { class: 'ccol', style: 'gap:3px' });
    const up = NE.h('button', { class: 'btn sm', title: '粗調：載物台上升' }, '▲ 上升'); up.onclick = () => NE.turnCoarse(0.06);
    const dn = NE.h('button', { class: 'btn sm', title: '粗調：載物台下降' }, '▼ 下降'); dn.onclick = () => NE.turnCoarse(-0.06);
    ui.lock = NE.h('label', { style: 'font-size:11px;white-space:nowrap' }, '<input type="checkbox"> 上限位鎖');
    ui.lock.querySelector('input').onchange = e => { S.lock = e.target.checked; NE.toast(S.lock ? '已開啟上限位鎖定：載物台不會升到撞片高度（40X 以下）' : '已解除上限位鎖定'); NE.changed('lock'); };
    col.appendChild(up); col.appendChild(dn); col.appendChild(ui.lock); row.appendChild(col);
    ui.fineInfo = NE.h('div', { class: 'readout' }); g.appendChild(ui.fineInfo);
    // 載物台
    g = group('移動玻片（XY 旋鈕）', 'v-xy');
    row = NE.h('div', { class: 'crow' }); g.appendChild(row);
    const gain = () => 3.2 * [1, 0.45, 0.14, 0.06][S.obj];
    const kx = NE.knob({ id: 'x', size: 46, label: 'X 左右', onTurn: (d, sh) => NE.moveStage(d * gain() * (sh ? 0.2 : 1), 0), wheelStep: 0.1 });
    const ky = NE.knob({ id: 'y', size: 46, label: 'Y 前後', onTurn: (d, sh) => NE.moveStage(0, d * gain() * (sh ? 0.2 : 1)), wheelStep: 0.1 });
    row.appendChild(kx.el); row.appendChild(ky.el); ui.kx = kx; ui.ky = ky;
    const pad = NE.h('div', { class: 'pad', title: '移動「玻片」的方向（從上方看玻片）' });
    const step = () => 0.6 * [1, 0.4, 0.1, 0.04][S.obj];
    [['', 0, 0], ['↑', 0, 1], ['', 0, 0], ['←', -1, 0], ['·', 0, 0], ['→', 1, 0], ['', 0, 0], ['↓', 0, -1], ['', 0, 0]].forEach(([t, x, y]) => {
      const b = NE.h('button', null, t); if (!t) b.style.visibility = 'hidden';
      if (t === '·') { b.title = '回到中央'; b.onclick = () => NE.moveStage(-S.stageX, -S.stageY); }
      else b.onclick = () => NE.moveStage(x * step(), y * step());
      pad.appendChild(b);
    });
    row.appendChild(pad);
    // 玻片
    g = group('玻片', null);
    ui.slideName = NE.h('div', { class: 'readout', style: 'max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }); g.appendChild(ui.slideName);
    row = NE.h('div', { class: 'crow', style: 'flex-wrap:wrap;max-width:170px' }); g.appendChild(row);
    const sb = NE.h('button', { class: 'btn sm primary' }, '📦 玻片盒'); sb.onclick = slideBox; row.appendChild(sb);
    ui.clip = NE.h('button', { class: 'btn sm', title: '左手撥開（按住）／放開活動標本夾' }, '撥開標本夾'); ui.clip.onclick = () => NE.openClip(!S.clipOpen); row.appendChild(ui.clip);
    ui.push = NE.h('button', { class: 'btn sm', title: '右手把玻片往裡推，靠緊後方擋板' }, '⇡ 推入玻片'); ui.push.onclick = () => NE.pushSlide(1); row.appendChild(ui.push);
    const rm = NE.h('button', { class: 'btn sm' }, '取下'); rm.onclick = () => NE.removeSlide(); row.appendChild(rm);
    ui.oil = NE.h('button', { class: 'btn sm' }, '💧 浸潤油'); ui.oil.onclick = () => { NE.setOil(!S.oil); if (S.oil) NE.toast('已在蓋玻片上滴一滴浸潤油（香柏油），100X 物鏡前端要浸入油中', 'ok'); }; row.appendChild(ui.oil);
    ui.clean = NE.h('button', { class: 'btn sm' }, '擦 40X'); ui.clean.onclick = () => NE.cleanObjective(); row.appendChild(ui.clean);
    // 雙眼視距（瞳距）
    g = group('雙眼視距（瞳距）', 'v-ipd');
    row = NE.h('div', { class: 'crow' }); g.appendChild(row);
    ui.ipdFig = NE.h('div', { title: '從上方看兩個目鏡的間距' });
    row.appendChild(ui.ipdFig);
    const ic = NE.h('div', { class: 'ccol', style: 'align-items:stretch;gap:3px' });
    const nar = NE.h('button', { class: 'btn sm', title: '兩手把左右目鏡筒向內推' }, '▶◀ 靠攏'); nar.onclick = e => NE.setIPD(S.ipd - (e.shiftKey ? 0.5 : 2));
    const wid = NE.h('button', { class: 'btn sm', title: '兩手把左右目鏡筒向外拉' }, '◀▶ 拉開'); wid.onclick = e => NE.setIPD(S.ipd + (e.shiftKey ? 0.5 : 2));
    ic.appendChild(nar); ic.appendChild(wid); row.appendChild(ic);
    ui.ipd = NE.h('input', { type: 'range', min: 48, max: 75, step: 0.5, value: S.ipd, style: 'width:150px', title: '48–75 mm' });
    ui.ipd.oninput = () => NE.setIPD(+ui.ipd.value); g.appendChild(ui.ipd);
    g.appendChild(NE.h('div', { style: 'font-size:11px;color:var(--muted)' }, '3D：左右拖曳目鏡筒也可調整'));
    // 右目鏡・目鏡測微器
    g = group('右目鏡・目鏡測微器', 'v-erot');
    row = NE.h('div', { class: 'crow' }); g.appendChild(row);
    const ke = NE.knob({ id: 'e', size: 50, label: '旋轉右目鏡', color: '#444', onTurn: (d, sh) => NE.setEyeRot(S.eyeRot + d * 180 / Math.PI * (sh ? 0.1 : 0.5)), wheelStep: 0.05 });
    row.appendChild(ke.el); ui.ke = ke;
    const c2 = NE.h('div', { class: 'ccol', style: 'align-items:stretch;gap:3px' });
    ui.ret = NE.h('button', { class: 'btn sm' }, '放入目鏡測微器'); ui.ret.onclick = () => { NE.setReticle(!S.reticle); NE.toast(S.reticle ? '已把目鏡測微器（刻度片）放入右目鏡的視野光闌處' : '已取出目鏡測微器'); };
    c2.appendChild(ui.ret);
    const rr = NE.h('div', { class: 'crow', style: 'gap:3px' });
    const r1 = NE.h('button', { class: 'btn sm', title: '逆時針轉 1°（Shift：0.2°）' }, '↺ 1°'); r1.onclick = e => NE.setEyeRot(S.eyeRot - (e.shiftKey ? 0.2 : 1));
    const r2 = NE.h('button', { class: 'btn sm', title: '順時針轉 1°（Shift：0.2°）' }, '↻ 1°'); r2.onclick = e => NE.setEyeRot(S.eyeRot + (e.shiftKey ? 0.2 : 1));
    const r0 = NE.h('button', { class: 'btn sm', title: '轉回 0°' }, '歸零'); r0.onclick = () => NE.setEyeRot(0);
    rr.appendChild(r1); rr.appendChild(r2); rr.appendChild(r0); c2.appendChild(rr);
    c2.appendChild(NE.h('div', { style: 'font-size:11px;color:var(--muted)' }, '測微器隨右目鏡一起轉動'));
    row.appendChild(c2);
  }

  function refresh() {
    const S = NE.S, O = NE.optics();
    ui.power.classList.toggle('on', S.power);
    NE.$('#v-bright').textContent = S.power ? Math.round(S.bright) + '%' : 'OFF';
    ui.kb.setAngle(S.brightAng);
    if (+ui.ap.value !== S.aperture) ui.ap.value = S.aperture;
    NE.$('#v-ap').textContent = 'N.A ' + S.aperture.toFixed(2);
    const mk = NE.apMarkNow && NE.apMarkNow();
    ui.apInfo.innerHTML = `光圈環對準：<b>${mk || '—'}</b>｜物鏡 ${O.o.mag}X（N.A ${O.o.na.toFixed(2)}）`;
    ui.obj.forEach((b, i) => b.classList.toggle('on', i === S.obj));
    NE.$('#v-mag').textContent = `總倍率 ${O.total}X`;
    ui.objInfo.innerHTML = `視野 ${NE.fmt(20 / O.o.mag, 2)} mm｜景深 ≈${O.DOF >= 10 ? Math.round(O.DOF) : NE.fmt(O.DOF, 1)} µm`;
    ui.kc.setAngle(S.coarseAng); ui.kf.setAngle(S.fineAng);
    const fd = ((Math.round(S.fineAng / (2 * Math.PI) * 100) % 100) + 100) % 100;
    ui.fineInfo.innerHTML = `細調刻度 ${fd} 格（每格 2 µm）`;
    NE.$('#v-focus').textContent = `載物台高度 ${NE.fmt(-S.focusZ / 1000, 2)} mm`;
    ui.lock.querySelector('input').checked = S.lock;
    ui.kx.setAngle(S.xAng); ui.ky.setAngle(S.yAng);
    NE.$('#v-xy').textContent = `X ${NE.fmt(S.stageX, 1)}　Y ${NE.fmt(S.stageY, 1)} mm`;
    const info = S.slide ? NE.SLIDE_INFO[S.slide] : null;
    ui.clip.classList.toggle('on', S.clipOpen); ui.clip.textContent = S.clipOpen ? '放開標本夾' : '撥開標本夾';
    ui.push.disabled = !S.slide || !S.clipOpen || S.seat >= 1;
    ui.slideName.innerHTML = (info ? info.name : '（無玻片）') + (S.slide ? (S.clip ? ' <b style="color:#18794a">✓夾好</b>' : S.clipOpen ? (S.seat < 1 ? ' <b style="color:#c9353f">未推到底</b>' : ' <span style="color:#18794a">已推到底</span>') : ' <b style="color:#c9353f">未夾好</b>') : '');
    ui.oil.classList.toggle('on', S.oil); ui.oil.textContent = S.oil ? '擦去浸潤油' : '💧 浸潤油';
    ui.clean.style.display = S.oilOn40 ? '' : 'none';
    ui.ke.setAngle(S.eyeRot * Math.PI / 180);
    ui.ret.classList.toggle('on', S.reticle); ui.ret.textContent = S.reticle ? '取出目鏡測微器' : '放入目鏡測微器';
    const er = ((S.eyeRot + 180) % 360 + 360) % 360 - 180;
    NE.$('#v-erot').textContent = `${er >= 0 ? '+' : ''}${NE.fmt(er, 1)}°`;
    if (+ui.ipd.value !== S.ipd) ui.ipd.value = S.ipd;
    NE.$('#v-ipd').textContent = `${NE.fmt(S.ipd, 1)} mm`;
    const half = 14 + (S.ipd - 48) / 27 * 16, ok = Math.abs(S.ipd - NE.USER_IPD) < 1.6;
    ui.ipdFig.innerHTML = `<svg width="92" height="54" viewBox="0 0 92 54"><rect x="${46 - half - 4}" y="22" width="${2 * half + 8}" height="8" rx="3" fill="#2c2e33"/>` +
      [-1, 1].map(k => `<circle cx="${46 + k * half}" cy="26" r="11" fill="#1b1c1f" stroke="${ok ? '#1d9a5b' : '#888'}" stroke-width="2"/><circle cx="${46 + k * half}" cy="26" r="6" fill="#3d5a78"/>`).join('') +
      `<text x="46" y="51" font-size="10" text-anchor="middle" fill="${ok ? '#1d9a5b' : '#777'}">${ok ? '✓ 合成一個圓' : '看到兩個圓'}</text></svg>`;
    // 距離
    const gap = NE.gap(), wd = O.o.wd;
    const gb = NE.$('#gap-badge');
    gb.innerHTML = S.slide ? `物鏡前端 ↔ 蓋玻片：<b>${gap >= 1000 ? NE.fmt(gap / 1000, 2) + ' mm' : Math.round(gap) + ' µm'}</b><br><small>（此物鏡工作距離 ${wd >= 1000 ? wd / 1000 + ' mm' : wd + ' µm'}）</small>` : '載物台上沒有玻片';
    gb.classList.toggle('danger', S.slide && gap < Math.min(300, wd * 0.5));
    NE.$('#eye-label').textContent = `目鏡 10X × 物鏡 ${O.o.mag}X ＝ ${O.total}X｜視野直徑 ≈ ${NE.fmt(20 / O.o.mag, 2)} mm`;
  }

  function slideBox() {
    const ids = Object.keys(NE.SLIDE_INFO);
    const html = '<p style="margin:0">點選要放到載物台上的玻片：</p><div class="slidebox">' + ids.map(id => {
      const s = NE.SLIDE_INFO[id];
      return `<div class="sl" data-id="${id}"><div class="glass"><i style="background:${s.dot}"></i></div><b>${s.user ? '⭐ ' : ''}${s.name}</b>${s.desc}</div>`;
    }).join('') + '</div>';
    const m = NE.modal('📦 玻片盒', html, [{ text: '關閉' }]);
    m.querySelector('h3').style.color = 'var(--accent)';
    NE.$$('.sl', m).forEach(el => el.onclick = () => {
      NE.loadSlide(el.dataset.id);
      m.parentNode.remove();
      if (NE.S.clipOpen) NE.toast('右手已把「' + NE.SLIDE_INFO[el.dataset.id].name + '」放進標本夾：接著把玻片<b>推到最裡面</b>（點一下 3D 上的玻片，或按「推入玻片」），再放開標本夾。', 'ok', 5000);
    });
  }
  NE.slideBox = slideBox;

  // ---- 3D 互動 ----
  function bind3D() {
    const cv = NE.$('#three'), tip = NE.$('#tooltip');
    let drag = null;
    const turnPart = (part, d, fine) => {
      const S = NE.S;
      switch (part) {
        case 'coarse': NE.turnCoarse(d * (fine ? 0.1 : 1)); return true;
        case 'fine': NE.turnFine(d); return true;
        case 'bright': NE.setBright(S.bright + d * 14); return true;
        case 'aperture': NE.setAperture(S.aperture + d * 0.25); return true;
        case 'knobX': NE.moveStage(d * 3.2 * [1, 0.45, 0.14, 0.06][S.obj] * (fine ? 0.2 : 1), 0); return true;
        case 'knobY': NE.moveStage(0, d * 3.2 * [1, 0.45, 0.14, 0.06][S.obj] * (fine ? 0.2 : 1)); return true;
        case 'eyepiece': NE.setEyeRot(S.eyeRot + d * 30); return true;
        case 'tube': case 'eyepieceL': NE.setIPD(S.ipd + d * 4); return true;
        case 'slide': if (!S.slide) return false; NE.pushSlide(d * 0.6); return true;
      }
      return false;
    };
    const TURN = ['coarse', 'fine', 'bright', 'aperture', 'knobX', 'knobY', 'eyepiece', 'nosepiece', 'tube', 'eyepieceL'];
    const CLICKABLE = ['power', 'clip', 'slide', 'holder', 'lock', 'obj0', 'obj1', 'obj2', 'obj3'];
    const interactive = p => TURN.includes(p) || CLICKABLE.includes(p);
    // ---- 手機：先點選零件（選取），再在畫面任何地方滑動來操作 ----
    let sel = null, touches = 0;
    const SEL_INFO = {
      coarse: ['上下滑動', '▲ 上升', '▼ 下降', 0.05], fine: ['上下滑動', '▲ 上升', '▼ 下降', 0.1],
      bright: ['上下滑動', '▲ 調亮', '▼ 調暗', 0.15], aperture: ['左右滑動', '▶ 開大', '◀ 縮小', 0.035],
      knobX: ['上下滑動', '→ 右移', '← 左移', 0.06], knobY: ['上下滑動', '↑ 往裡', '↓ 往外', 0.06],
      eyepiece: ['左右滑動', '↻ 順轉', '↺ 逆轉', 0.04], tube: ['左右滑動', '◀▶ 拉開', '▶◀ 靠攏', 0.125], eyepieceL: ['左右滑動', '◀▶ 拉開', '▶◀ 靠攏', 0.125],
      nosepiece: ['左右滑動', '下一個物鏡', '上一個物鏡', 0]
    };
    const pill = NE.h('div', { id: 'sel-pill' }); pill.hidden = true; cv.parentNode.appendChild(pill);
    function stepSel(sign) {
      if (!sel) return;
      if (sel === 'nosepiece') { NE.setObj((NE.S.obj + (sign > 0 ? 1 : 3)) % 4); return; }
      turnPart(sel, sign * SEL_INFO[sel][3], false);
      NE.handsAway = performance.now();
    }
    function holdBtn(label, sign) {
      const b = NE.h('button', { class: 'btn' }, label);
      let t1 = 0, t2 = 0;
      const stop = () => { clearTimeout(t1); clearInterval(t2); };
      b.addEventListener('pointerdown', e => { e.preventDefault(); stepSel(sign); t1 = setTimeout(() => { t2 = setInterval(() => stepSel(sign), 70); }, 350); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
      return b;
    }
    NE.selectPart = function (part) {
      if (part && !SEL_INFO[part]) part = null;
      sel = part;
      model.setHover(part);
      pill.hidden = !part;
      if (!part) return;
      const [how, up, dn] = SEL_INFO[part];
      pill.innerHTML = `<span class="sp-name">🎯 ${PART_HINT[part] ? PART_HINT[part][0] : part}</span><span class="sp-how">在 3D 畫面任何地方<b>${how}</b>來操作</span>`;
      pill.appendChild(holdBtn(dn, -1)); pill.appendChild(holdBtn(up, 1));
      const x = NE.h('button', { class: 'btn sp-x', title: '取消選取' }, '✕'); x.onclick = () => NE.selectPart(null); pill.appendChild(x);
    };
    NE.selectedPart = () => sel;
    cv.addEventListener('pointerdown', e => {
      NE.handsAway = performance.now();
      const touch = e.pointerType !== 'mouse';
      if (touch) touches++;
      if (touch && touches > 1) { if (drag) drag.turn = false; return; }   // 兩指：交給縮放／旋轉
      let part = touch ? model.pickNear(e.clientX, e.clientY, 26, interactive) : model.pick(e.clientX, e.clientY);
      let target = part;
      // 已選取零件時，在空白處或非操作零件上滑動＝操作被選取的零件
      if (touch && sel && !interactive(part)) target = sel;
      const canTurn = TURN.includes(target) || (target === 'slide' && NE.S.slide && NE.S.clipOpen);
      drag = { part, target, x: e.clientX, y: e.clientY, moved: false, acc: 0, touch, turn: canTurn && e.button === 0, side: (target === 'tube' || target === 'eyepieceL') ? (target === sel && part !== sel ? 1 : (e.clientX >= model.hingeScreenX() ? 1 : -1)) : 1 };
      if (touch && TURN.includes(part)) model.setHover(part);
      if (drag.turn) { e.preventDefault(); cv.setPointerCapture(e.pointerId); }
    }, true);
    const touchEnd = e => { if (e.pointerType !== 'mouse') touches = Math.max(0, touches - 1); };
    cv.addEventListener('pointercancel', e => { touchEnd(e); drag = null; }, true);
    cv.addEventListener('pointermove', e => {
      if (drag) {
        NE.handsAway = performance.now();
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        if (drag.turn) {
          const tp = drag.target;
          if (tp === 'nosepiece') {
            drag.acc += dx; if (Math.abs(drag.acc) > 45) { NE.setObj((NE.S.obj + (drag.acc > 0 ? 1 : 3)) % 4); drag.acc = 0; }
          } else {
            const horiz = ['aperture', 'eyepiece', 'tube', 'eyepieceL'].includes(tp);
            const d = horiz ? dx * drag.side : -dy;
            turnPart(tp, d * (drag.touch ? 0.026 : 0.02), e.shiftKey);
          }
          drag.x = e.clientX; drag.y = e.clientY;
        }
        return;
      }
      const part = model.pick(e.clientX, e.clientY);
      model.setHover(part);
      const r = cv.parentNode.getBoundingClientRect();
      if (part && PART_HINT[part]) {
        tip.style.display = 'block'; tip.innerHTML = `${PART_HINT[part][0]}<small>${PART_HINT[part][1]}</small>`;
        tip.style.left = Math.min(r.width - 250, e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 12) + 'px';
        cv.style.cursor = ['aperture', 'eyepiece', 'tube', 'eyepieceL', 'nosepiece'].includes(part) ? 'ew-resize' : TURN.includes(part) ? 'ns-resize' : 'pointer';
      } else { tip.style.display = 'none'; cv.style.cursor = 'grab'; }
    }, true);
    cv.addEventListener('pointerleave', () => { model.setHover(null); tip.style.display = 'none'; });
    cv.addEventListener('pointerup', e => {
      touchEnd(e);
      if (!drag) return;
      const d = drag; drag = null;
      if (d.touch) {
        if (d.moved) { if (TURN.includes(d.target) && d.target !== sel) NE.selectPart(d.target); else model.setHover(sel); return; }
        // 點一下：旋鈕類＝選取；按鈕類＝直接操作；點空白處＝取消選取
        if (TURN.includes(d.part)) { NE.selectPart(d.part === sel ? null : d.part); return; }
        if (!d.part || !interactive(d.part)) { if (sel) { NE.selectPart(null); return; } }
        clickPart(d.part);
        return;
      }
      if (d.moved) return;
      clickPart(d.part);
    }, true);
    cv.addEventListener('wheel', e => {
      const part = model.pick(e.clientX, e.clientY);
      if (!part || !TURN.includes(part)) return;
      e.preventDefault(); NE.handsAway = performance.now();
      const s = e.deltaY < 0 ? 1 : -1;
      if (part === 'nosepiece') { NE.setObj((NE.S.obj + (s > 0 ? 1 : 3)) % 4); return; }
      const step = { coarse: 0.06, fine: 0.12, bright: 0.2, aperture: 0.12, knobX: 0.1, knobY: 0.1, eyepiece: 0.1, tube: 0.125, eyepieceL: 0.125 }[part];
      turnPart(part, s * step, e.shiftKey);
    }, { passive: false, capture: true });
  }
  function clickPart(part) {
    const S = NE.S;
    if (!part) return;
    if (/^obj\d$/.test(part)) { NE.setObj(+part[3]); return; }
    switch (part) {
      case 'power': NE.setPower(!S.power); break;
      case 'clip': NE.openClip(!S.clipOpen); break;
      case 'slide': case 'holder': if (!S.slide) slideBox(); else NE.pushSlide(1); break;
      case 'lock': S.lock = !S.lock; NE.toast(S.lock ? '已開啟上限位鎖定' : '已解除上限位鎖定'); NE.changed('lock'); break;
    }
    NE.emit('partClick', part);
  }

  // ---- 目鏡視野互動 ----
  function bindEye() {
    const cv = NE.$('#eyeview');
    const toCanvas = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * view.N, y: (e.clientY - r.top) / r.height * view.N }; };
    cv.addEventListener('wheel', e => { e.preventDefault(); if (e.shiftKey) NE.turnCoarse(e.deltaY < 0 ? 0.03 : -0.03); else NE.turnFine(e.deltaY < 0 ? 0.12 : -0.12); }, { passive: false });
    // 在視野上上下拖曳＝細調（手機沒有滾輪）；拖曳過就不算點選
    let fd = null, dragged = false;
    cv.addEventListener('pointerdown', e => { if (lensOn && e.pointerType !== 'mouse') return; fd = { y: e.clientY, y0: e.clientY }; dragged = false; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      if (!fd) return;
      if (Math.abs(e.clientY - fd.y0) > 6) dragged = true;
      if (dragged) { NE.turnFine((fd.y - e.clientY) * 0.012); fd.y = e.clientY; }
    });
    const fEnd = () => { fd = null; };
    cv.addEventListener('pointerup', fEnd); cv.addEventListener('pointercancel', fEnd);
    cv.addEventListener('click', e => {
      if (dragged) { dragged = false; return; }
      const p = toCanvas(e);
      NE.emit('eyeClick', { canvas: p, slide: view.toSlide(p.x, p.y) });
    });
    // 放大鏡（以更高解析度重新成像，不是放大像素）
    const lens = NE.h('canvas', { style: 'position:absolute;width:210px;height:210px;border-radius:50%;border:2px solid #ffd257;pointer-events:none;display:none;box-shadow:0 0 12px #000' });
    NE.$('#eye-wrap').appendChild(lens);
    const lensView = NE.View(lens, { lens: true, size: 360 });
    let lensOn = false, lastE = null, raf = 0;
    const btn = NE.h('button', { title: '放大檢視視野局部（4 倍），方便讀刻度' }, '🔍 放大鏡');
    btn.onclick = () => { lensOn = !lensOn; btn.style.color = lensOn ? '#ffd257' : ''; if (!lensOn) lens.style.display = 'none'; else NE.toast(NE.isMobile && NE.isMobile() ? '手指按住視野並移動，就會放大那個位置' : '把滑鼠移到視野上即可放大局部'); };
    const shot = NE.h('button', { title: '把目前視野存成圖片' }, '📷 存圖');
    shot.onclick = () => { const a = document.createElement('a'); a.download = '顯微鏡視野.png'; a.href = cv.toDataURL('image/png'); a.click(); };
    const tools = NE.h('div', { class: 'eye-tools' }); tools.appendChild(btn); tools.appendChild(shot); NE.$('#eye-wrap').appendChild(tools);
    function drawLens() {
      if (!lensOn || !lastE || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; if (!lastE) return;
        const wr = NE.$('#eye-wrap').getBoundingClientRect();
        const p = toCanvas(lastE);
        lens.style.display = 'block';
        const lx = NE.clamp(lastE.clientX - wr.left - 105, 0, wr.width - 210), ly = lastE.clientY - wr.top - 225;
        lens.style.left = lx + 'px'; lens.style.top = (ly < 0 ? lastE.clientY - wr.top + 20 : ly) + 'px';
        lensView.render({ z: 4.4, mx: p.x, my: p.y });
      });
    }
    cv.addEventListener('pointermove', e => { lastE = e; drawLens(); });
    cv.addEventListener('pointerleave', () => { lens.style.display = 'none'; lastE = null; });
    NE.lensDebug = (x, y) => { lensOn = true; lastE = { clientX: x, clientY: y }; drawLens(); };
    NE.on('eyeRendered', drawLens);
  }

  function keys() {
    window.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (!NE.benchVisible) return;
      const S = NE.S, st = (e.shiftKey ? 0.15 : 0.6) * [1, 0.4, 0.1, 0.04][S.obj];
      const map = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] };
      if (map[e.key]) { NE.moveStage(...map[e.key]); e.preventDefault(); }
      else if (e.key === 'PageUp') { NE.turnCoarse(0.06); e.preventDefault(); }
      else if (e.key === 'PageDown') { NE.turnCoarse(-0.06); e.preventDefault(); }
      else if (e.key === '+' || e.key === '=') NE.turnFine(0.12);
      else if (e.key === '-' || e.key === '_') NE.turnFine(-0.12);
      else if (/^[1-4]$/.test(e.key)) NE.setObj(+e.key - 1);
    });
  }

  function updateEye(info) {
    eyeInfo = info; NE._eyeStale = false;
    NE.$('#eye-msg').textContent = info.msg || '';
    NE.$('#eye-meter').innerHTML = `視野亮度<span class="bar"><i style="width:${Math.round(info.mean * 100)}%"></i></span><br>影像對比<span class="bar c"><i style="width:${Math.round(info.contrast * 100)}%"></i></span>`;
  }
  NE.eyeInfo = () => NE._eyeStale ? { mean: NaN, contrast: NaN } : eyeInfo;

  NE.initBench = function () {
    build();
    model = NE.Model(NE.$('#three'), NE.$('#three-wrap'));
    view = NE.View(NE.$('#eyeview'));
    NE.model = model; NE.view = view;
    NE.hands = NE.Hands(model);
    bind3D(); bindEye(); keys();
    const cb = NE.$('#cam-btns');
    [['front', '正面'], ['side', '側面（看物鏡距離）'], ['stage', '載物台'], ['top', '上方'], ['back', '背面']].forEach(([k, t]) => {
      const b = NE.h('button', null, t); b.onclick = () => model.view(k); cb.appendChild(b);
    });
    NE.on('change', () => { refresh(); });
    const top = NE.$('#bench-top'), eye = NE.$('#eye-wrap');
    new ResizeObserver(() => {
      const r = top.getBoundingClientRect(); if (!r.width) return;
      const m = NE.isMobile && NE.isMobile(), portrait = window.innerHeight > window.innerWidth;
      const s = m ? Math.max(140, Math.floor(portrait ? Math.min(r.width - 8, r.height * 0.5) : Math.min(r.height - 8, r.width * 0.5)))
        : Math.max(200, Math.floor(window.innerWidth <= 700 ? r.width - 16 : Math.min(r.height - 8, r.width * 0.56)));
      eye.style.width = eye.style.height = s + 'px';
    }).observe(top);
    refresh();
    let last = performance.now();
    (function loop() {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      NE.S.time += dt;
      model.frame();
      const sp = NE.spec();
      if (NE.takeDirty() || (sp && sp.drift && NE.S.power)) {
        const info = view.render(); updateEye(info); NE.emit('eyeRendered', info);
      }
      requestAnimationFrame(loop);
    })();
  };
})(window.NE);
