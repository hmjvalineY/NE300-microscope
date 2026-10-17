/* 各章節教學內容與任務檢核 */
(function (NE) {
  const S = NE.S;
  const strip = s => s.replace(/<[^>]+>/g, '');

  // ---------- 共用元件 ----------
  NE.Tasks = function (el, list, opt = {}) {
    const seq = opt.seq !== false;
    const ul = NE.h('ul', { class: 'tasks' }); el.appendChild(ul);
    const done = list.map(() => false);
    const lis = list.map((t, i) => {
      const li = NE.h('li', null, `<span class="ck">${i + 1}</span><div>${t.t}${t.sub ? `<span class="sub">${t.sub}</span>` : ''}</div>`);
      ul.appendChild(li); return li;
    });
    function render() {
      lis.forEach((li, i) => {
        li.classList.toggle('ok', done[i]);
        li.querySelector('.ck').textContent = done[i] ? '✓' : i + 1;
        li.classList.toggle('cur', seq && !done[i] && (i === 0 || done[i - 1]));
      });
    }
    function check() {
      for (let i = 0; i < list.length; i++) {
        if (done[i]) continue;
        if (seq && i > 0 && !done[i - 1]) break;
        let ok = false; try { ok = list[i].check(); } catch (e) { }
        if (ok) { done[i] = true; list[i].onDone && list[i].onDone(); if (!NE.wizardOn) NE.toast('✔ ' + strip(list[i].t), 'ok', 2400); }
        else if (seq) break;
      }
      render();
      if (opt.onComplete && done.every(Boolean) && !this._fired) { this._fired = true; opt.onComplete(); }
    }
    render();
    const api = { check, done, get complete() { return done.every(Boolean); } };
    api.check = check.bind(api);
    return api;
  };
  NE.mcq = function (el, q, opts, ans, explain, onOk) {
    const box = NE.h('div', { class: 'qa' });
    const name = 'q' + Math.random().toString(36).slice(2);
    box.innerHTML = `<div class="q">${q}</div>` + opts.map((o, i) => `<label><input type="radio" name="${name}" value="${i}"> ${o}</label>`).join('') + '<div class="fb"></div>';
    const fb = box.querySelector('.fb');
    box.querySelectorAll('input').forEach(inp => inp.onchange = () => {
      const ok = +inp.value === ans;
      fb.className = 'fb ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = ok ? '✔ 正確！' + (explain ? ' ' + explain : '') : '✘ 再想想看。';
      if (ok) { box.dataset.ok = 1; onOk && onOk(); }
    });
    el.appendChild(box); return box;
  };
  NE.quickSetup = function (o = {}) {
    if (o.slide && (S.slide !== o.slide || o.reload)) NE.loadSlide(o.slide, { centered: o.centered !== false, clip: true });
    if (S.slide) { if (S.badSeat) { S.place.rot -= S.badSeat; S.badSeat = 0; } S.seat = 1; S.clipOpen = false; S.clip = true; } else S.clip = false;
    S.power = true; S.ipd = NE.USER_IPD; S.cracked = false;
    S.obj = o.obj != null ? o.obj : 0; S.oil = S.obj === 3; S.oilOn40 = false;
    S.aperture = o.aperture != null ? o.aperture : NE.OBJ[S.obj].na * 0.75;
    S.bright = o.bright != null ? o.bright : NE.autoBright();
    const sp = NE.spec();
    S.focusZ = o.focusZ != null ? o.focusZ : (sp ? (o.focus === false ? sp.mainZ + 900 : sp.mainZ) : 3000);
    if (o.reticle != null) S.reticle = o.reticle;
    if (o.stage) { S.stageX = o.stage[0]; S.stageY = o.stage[1]; }
    else if (o.centered !== false && sp) { S.stageX = -S.place.dx; S.stageY = -S.place.dy; }
    S.usedCoarseSinceObj = false; S.target = null;
    NE.changed('setup');
  };
  NE.autoBright = function (target = 0.92) {
    const sv = S.power; S.power = true; S.bright = 100;
    const O = NE.optics(); S.power = sv;
    const E100 = O.E || 0.01;
    return NE.clamp(Math.round(100 * Math.pow(target / E100, 1 / 1.6)), 3, 100);
  };
  // 玻片上一點在目鏡視野中的位置（以視野半徑為單位，右、下為正）
  NE.eyePos = function (x, y) {
    const p = NE.view.toScreen(x, y); const v = NE.view;
    return { u: (p.x - v.cx) / v.R, v: (p.y - v.cy) / v.R };
  };
  const btn = (txt, fn, cls = '') => { const b = NE.h('button', { class: 'btn ' + cls }, txt); b.onclick = fn; return b; };
  NE.btn = btn;

  // 玻片俯視圖（顯示視野在玻片上的位置）
  NE.slideMap = function (el) {
    const cv = NE.h('canvas', { width: 640, height: 250, style: 'width:100%;border-radius:8px;background:#e9e4da;border:1px solid #d4cbbb' });
    el.appendChild(cv);
    const c = cv.getContext('2d');
    function draw() {
      if (!cv.isConnected) return;
      const k = 7.6; // px per mm
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 640, 250);
      c.fillStyle = '#e9e4da'; c.fillRect(0, 0, 640, 250);
      c.fillStyle = '#58606b'; c.font = '15px "Microsoft JhengHei"'; c.fillText('從上方直接看玻片（實物方向）　● 紅圈 = 目前視野範圍', 12, 22);
      if (!S.slide) { c.fillText('（沒有玻片）', 280, 140); return; }
      c.translate(320, 140); c.scale(1, -1);
      const rot = S.place.rot * Math.PI / 180; c.rotate(rot);
      c.fillStyle = 'rgba(214,236,250,0.9)'; c.strokeStyle = '#9fb7c9'; c.lineWidth = 1.5;
      c.fillRect(-38 * k, -13 * k, 76 * k, 26 * k); c.strokeRect(-38 * k, -13 * k, 76 * k, 26 * k);
      c.fillStyle = '#f7f7f2'; c.fillRect(-38 * k, -13 * k, 20 * k, 26 * k);
      c.strokeStyle = '#b8c9d6'; c.strokeRect(-11 * k, -11 * k, 22 * k, 22 * k);
      if (S.slide === 'letter_e') { c.save(); c.scale(1, -1); c.fillStyle = '#222'; c.font = `bold ${2.5 * k}px "Times New Roman"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('e', 0, 0); c.restore(); }
      else { c.fillStyle = NE.SLIDE_INFO[S.slide].dot.startsWith('#') ? NE.SLIDE_INFO[S.slide].dot : '#7d6ca8'; c.globalAlpha = 0.5; c.beginPath(); c.arc(0, 0, 4 * k, 0, 7); c.fill(); c.globalAlpha = 1; }
      c.save(); c.scale(1, -1); c.fillStyle = '#555'; c.font = `${2 * k}px "Microsoft JhengHei"`; c.textAlign = 'center'; c.fillText('標籤', -28 * k, 0.8 * k); c.restore();
      // 視野
      const O = NE.optics(); const pl = S.place;
      const so = NE.slideOff(); const Tx = S.stageX + so.x, Ty = S.stageY + so.y;
      const cc = Math.cos(rot), sn = Math.sin(rot);
      const px = -(cc * Tx + sn * Ty), py = sn * Tx - cc * Ty;
      c.strokeStyle = '#e0303a'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(px * k, py * k, Math.max(3, O.fovUm / 2000 * k), 0, 7); c.stroke();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = '#58606b'; c.font = '13px "Microsoft JhengHei"'; c.fillText('↑ 遠離你的方向', 520, 44); c.fillText('↓ 你（學生）', 530, 238);
    }
    NE.on('change', draw); draw();
    return { draw };
  };

  // ---------- 零件說明 ----------
  const PARTS = [
    ['eyepiece', '目鏡', '10X，視野數 FN = 20 mm（視野光闌直徑 20 mm）。雙眼都可調屈光度。目鏡測微器（刻度片）就放在目鏡內的視野光闌處。'],
    ['tube', '雙眼目鏡筒', '摺疊式，視距（瞳距）可調 48–75 mm。兩手扶住左右鏡筒向內或向外推，直到左右視野合成一個圓。'],
    ['trinoc', '三眼相機接口', '本校的 NE300 是<b>三眼款（NE300T）</b>：觀察筒上方多一個垂直的相機接口（C 型接口），可裝 TK5613 一體式平板數位相機，把顯微影像即時顯示在螢幕上、拍照、錄影，或投影給全班看。NE300T 是<b>固定分光</b>（50/50），不需要切換：目鏡和相機永遠同時看得到影像。'],
    ['nosepiece', '旋轉盤（鼻輪）', '四孔「內旋式」：物鏡朝向鏡臂內側，前方操作空間大。轉換物鏡時要握住旋轉盤外緣轉動，聽到「喀」一聲表示定位，不可直接扳物鏡。'],
    ['obj0', '物鏡 PLAN 4X', 'N.A = 0.10，工作距離 W.D = 28 mm，紅色色環。視野最大（5 mm），用來「找標本」。'],
    ['obj1', '物鏡 PLAN 10X', 'N.A = 0.25，W.D = 7.4 mm，黃色色環。'],
    ['obj2', '物鏡 PLAN 40X', 'N.A = 0.65，W.D = 0.65 mm，藍色色環。工作距離很短，只能用細調節輪。'],
    ['obj3', '物鏡 PLAN 100X 油鏡', 'N.A = 1.25，W.D 只有 0.14 mm，白色色環＋黑色油環。必須在蓋玻片與物鏡間滴浸潤油，使 N.A 能大於 1。'],
    ['stage', '載物台', '180 × 130 mm，行程 74 × 30 mm，抗刮痕面板，附標尺（可記錄標本位置）與標本夾。NE300 是「載物台升降」對焦：轉調節輪時，物鏡不動、載物台上下移動。'],
    ['clip', '活動標本夾', '銀色長臂，支點（圓形凸鈕）在後方偏左，末端是圓形撥片；在玻片左側，是有<b>彈簧回彈</b>的夾臂。正確放法：<b>左手</b>把夾臂向左撥開並按住 → <b>右手</b>把玻片放進去、<b>推到最裡面</b>（靠緊後方擋板與右側固定夾）→ 左手慢慢放開，夾臂彈回夾住玻片。玻片沒推到底就放手，夾臂會把玻片夾歪、夾不牢，移動載物台時玻片會滑動。'],
    ['knobX', 'XY 同軸旋鈕', '在載物台右下方，右手操作。一個旋鈕讓玻片左右移動，另一個讓玻片前後移動。'],
    ['condenser', '聚光鏡', '固定插入式，N.A = 1.25。把光源的光集中照射到標本上。'],
    ['aperture', '孔徑光圈環（光圈）', '聚光鏡上的旋轉環，環上標有 4x、10x、20x、40x、60x、100x。<b>把環轉到與目前物鏡相同的倍率刻度</b>，光圈大小就約為該物鏡 N.A 的 75%，是最適當的光圈。光圈改變照明光錐的大小：影響亮度、對比、解析度與景深。'],
    ['light', 'LED 光源', '3W LED，壽命 30000 小時，色溫 5700K（可調）。內置透射「科勒照明」系統，視野照明均勻。'],
    ['bright', '亮度調節鈕', '在黑色光源座的右側、靠前方。無段式調光，具亮度記憶功能。開關電源前都應先把亮度調到最低。'],
    ['lcd', '液晶螢幕', '在光源座前方的斜面上，顯示目前物鏡倍率（如 ● 4X）與亮度格數、亮度數值；具定時休眠節能與鎖定功能。'],
    ['coarse', '粗調節輪', '大幅升降載物台：轉一圈 37.7 mm。只在低倍（4X、10X）找焦距時使用。有鬆緊環可調手感。'],
    ['fine', '細調節輪', '與粗調同軸。轉一圈 0.2 mm，刻度最小 2 µm。高倍時只用細調節輪；也可用刻度估計標本的厚度（深度）。'],
    ['lock', '上限位鎖定', '設定載物台能上升的最高位置，避免物鏡撞到玻片。'],
    ['arm', '鏡臂', '一體式金屬機身；背部有收線裝置。搬運時一手握鏡臂。'],
    ['base', '鏡座', '內含光源與電路。搬運時另一手托住鏡座。'],
    ['power', '電源開關', '在鏡座右側後方。']
  ];
  NE.PARTS = PARTS;
  function partCard(el, key) {
    const p = PARTS.find(x => x[0] === key) || (NE.PART_HINT[key] && [key, NE.PART_HINT[key][0], NE.PART_HINT[key][1]]);
    if (!p) return;
    el.innerHTML = `<div class="partcard"><b>${p[1]}</b><br>${p[2]}</div>`;
  }

  const fmtUm = v => v >= 10 ? Math.round(v) : NE.fmt(v, 1);
  function dofTable() {
    const sv = { obj: S.obj, ap: S.aperture };
    let rows = '';
    NE.OBJ.forEach((o, i) => {
      S.obj = i; S.aperture = o.na * 0.75;
      const O = NE.optics();
      rows += `<tr><td>${o.mag}X</td><td>${o.na}</td><td>${O.total}X</td><td>${NE.fmt(20 / o.mag, 2)} mm</td><td>${fmtUm(O.DOF)} µm</td><td>${NE.fmt(O.res, 2)} µm</td><td>${o.wd >= 1000 ? o.wd / 1000 + ' mm' : o.wd / 1000 + ' mm'}</td></tr>`;
    });
    S.obj = sv.obj; S.aperture = sv.ap;
    return `<table class="t"><tr><th>物鏡</th><th>N.A</th><th>總倍率</th><th>視野直徑</th><th>景深≈</th><th>解析度≈</th><th>工作距離</th></tr>${rows}</table><div style="font-size:12px;color:var(--muted)">（景深、解析度為光圈開到物鏡 N.A 75% 時的估計值；視野直徑 = 20 mm ÷ 物鏡倍率）</div>`;
  }

  // ---------- 章節 ----------
  const CH = [];
  NE.CHAPTERS = CH;
  const add = c => CH.push(c);

  add({
    id: 'intro', ic: '1', title: '認識 NE300', sec: '認識顯微鏡', enter(el) {
      el.innerHTML = `<h2>認識本校的 TEKFAR NE300</h2>
      <p>NE300 是<b>複式光學顯微鏡</b>：物鏡先把標本放大成一個倒立的實像（中間像），再用目鏡把這個像放大。</p>
      <div class="formula">總放大倍率 ＝ 目鏡倍率（10X）× 物鏡倍率</div>
      <p>左邊的 3D 模型可以旋轉、縮放；滑鼠移到零件上會顯示名稱，<b>點下面的按鈕</b>可以看零件說明並在模型上標示。</p>
      <div class="parts" id="parts"></div><div id="pcard"></div>
      <h3>NE300 規格（標準配件）</h3>
      <table class="t">
      <tr><th>項目</th><th class="l">規格</th></tr>
      <tr><td>光學系統</td><td class="l">NIS 無限遠雙向色差校準系統，物鏡齊焦距離 45 mm</td></tr>
      <tr><td>調焦</td><td class="l">粗微調同軸；粗調 1 圈 37.7 mm、微調 1 圈 0.2 mm、最小精度 2 µm；鬆緊環、上限位鎖定</td></tr>
      <tr><td>觀察筒</td><td class="l">本校為<b>三眼款 NE300T</b>：摺疊式雙眼＋相機接口，視距 48–75 mm，固定分光 50/50</td></tr>
      <tr><td>目鏡</td><td class="l">10X，FN = 20 mm，屈光度可調</td></tr>
      <tr><td>鼻輪</td><td class="l">四孔內旋式</td></tr>
      <tr><td>物鏡</td><td class="l">PLAN 4X/0.10（W.D 28 mm）、10X/0.25（7.4 mm）、40X/0.65（0.65 mm）、100X/1.25 油（0.14 mm），CG = 0.17 mm</td></tr>
      <tr><td>聚光鏡</td><td class="l">固定插入式，N.A = 1.25</td></tr>
      <tr><td>載物台</td><td class="l">180 × 130 mm，行程 74 × 30 mm，右手 XY 同軸，帶標尺及標本夾</td></tr>
      <tr><td>光源</td><td class="l">3W LED，30000 小時，5700K；科勒照明；LCD 顯示倍率/亮度/色溫</td></tr>
      </table>
      <p style="font-size:13px;color:var(--muted)">CG = 0.17 表示物鏡是針對 0.17 mm 厚的蓋玻片設計；∞ 表示無限遠光學系統。</p>
      <h3>取用與收納</h3>
      <ol><li>搬運時<b>一手握鏡臂、一手托鏡座</b>，靠近身體，不可單手提。</li>
      <li>放在桌面平穩處，離桌緣約 10 公分；電線不要垂在走道。</li>
      <li>鏡頭只能用<b>拭鏡紙</b>擦拭，不可用手指、衛生紙。</li>
      <li>收納：亮度調到最低 → 關電源 → 轉回 4X → 降下載物台 → 取下玻片 → 用背部收線裝置捲好電線 → 蓋上防塵套。</li></ol>`;
      const pl = NE.$('#parts', el), card = NE.$('#pcard', el);
      PARTS.forEach(p => {
        const b = NE.h('button', null, p[1]);
        b.onclick = () => { NE.$$('button', pl).forEach(x => x.classList.remove('on')); b.classList.add('on'); partCard(card, p[0]); NE.model.highlight(p[0]); NE.model.focusPart(p[0]); };
        pl.appendChild(b);
      });
      this._pc = part => { partCard(card, part); NE.model.highlight(part); };
      NE.model.view('front');
    },
    onPart(part) { this._pc && this._pc(part); },
    leave() { NE.model.highlight(null); }
  });

  add({
    id: 'free', ic: '2', title: '自由操作實驗台', enter(el) {
      el.innerHTML = `<h2>自由操作實驗台</h2>
      <p>這是一台虛擬的 NE300。左邊是 3D 顯微鏡，右邊是<b>從目鏡看到的視野</b>，下方是操作面板。</p>
      <h3>操作方式</h3>
      <ul><li>3D 模型上的<b>旋鈕可直接拖曳或用滾輪轉動</b>（粗/細調節輪、亮度鈕、XY 旋鈕、光圈環、旋轉盤）。</li><li><b>左右拖曳目鏡筒</b>＝調整雙眼視距；<b>左右拖曳右目鏡</b>＝旋轉右目鏡（目鏡測微器跟著轉）。</li>
      <li>點 3D 模型上的物鏡可直接轉換；點電源開關、標本夾也可操作。</li>
      <li>在目鏡視野上滾動滑鼠滾輪＝<b>細調</b>（按住 Shift＝粗調）。</li>
      <li>鍵盤：<span class="kbd">←→↑↓</span> 移動玻片（Shift 慢速）、<span class="kbd">PgUp/PgDn</span> 粗調、<span class="kbd">+ / −</span> 細調、<span class="kbd">1–4</span> 轉換物鏡。</li>
      <li>視野左下角的 <b>🔍 放大鏡</b>可放大局部，方便讀刻度；<b>📷 存圖</b>可存下目前視野。</li></ul>
      <h3>快速準備</h3><p style="font-size:13.5px">直接放好玻片、開燈、在 4X 對好焦（想自己從頭操作，請用「顯微鏡操作步驟」章節）。</p>
      <div id="qs" style="display:flex;flex-wrap:wrap;gap:5px"></div>
      <h3>玻片在哪裡？</h3><div id="map"></div>`;
      const qs = NE.$('#qs', el);
      Object.keys(NE.SLIDE_INFO).forEach(id => qs.appendChild(btn(NE.SLIDE_INFO[id].name, () => NE.quickSetup({ slide: id, obj: 0 }), 'sm')));
      NE.slideMap(NE.$('#map', el));
    }
  });

  add({
    id: 'operate', ic: '3', title: '顯微鏡操作步驟', sec: '基本操作', enter(el) {
      el.innerHTML = `<h2>顯微鏡的操作步驟</h2>
      <div class="tip" style="background:#fff8db;border-color:#f0d78a"><b>🎓 第一次操作？</b>試試「操作教學精靈」：3D 顯微鏡會全螢幕顯示，小精靈「小微」會配合雙手動作一步一步教你，做對了自動進入下一步，卡住時還能看示範。<div style="margin-top:6px"><button class="btn primary" id="wizgo">🎓 開始操作教學精靈（全螢幕）</button></div></div>
      <p>也可以自己依序完成下列步驟（完成會自動打勾）。<b>從頭開始</b>可先按「重設顯微鏡」。</p>
      <div style="display:flex;gap:6px;margin:6px 0" id="ops"></div><div id="tk"></div>
      <div class="danger"><b>為什麼要「側面注視」？</b>NE300 是載物台上升對焦。若一邊看目鏡一邊把載物台往上升，看不到物鏡和玻片的距離，很容易撞破玻片、刮傷物鏡。所以：<b>從側面看著上升，從目鏡看著下降</b>。</div>
      <div class="tip"><b>齊焦（parfocal）</b>：NE300 的物鏡齊焦距離都是 45 mm，低倍對好焦後換高倍，影像只會稍微模糊，用細調節輪就能調清楚。</div>`;
      NE.$('#wizgo', el).onclick = () => NE.Wizard.start();
      const ops = NE.$('#ops', el);
      ops.appendChild(btn('重設顯微鏡', () => NE.resetScope()));
      ops.appendChild(btn('側面視角', () => NE.model.view('side')));
      ops.appendChild(btn('正面視角', () => NE.model.view('front')));
      const ePos = () => { const so = NE.slideOff(); return { x: S.stageX + so.x, y: S.stageY + so.y }; };
      this.tasks = NE.Tasks(NE.$('#tk', el), [
        { t: '先把亮度調到最低，再打開電源', sub: '亮度鈕在鏡座右側；電源開關在右側後方（也可點操作面板的 ⏻）', check: () => S.power && S.powerOnBright <= 10 },
        { t: '轉動旋轉盤，換到 <b>4X 低倍物鏡</b>', check: () => S.obj === 0 },
        { t: '<b>左手</b>撥開活動標本夾，<b>右手</b>放入「字母 e」玻片並<b>推到最裡面</b>，再放開標本夾', sub: '操作面板「玻片」：撥開標本夾 → 📦 玻片盒 → 推入玻片 → 放開標本夾', check: () => S.slide === 'letter_e' && S.clip },
        { t: '移動載物台，讓字母 e 位在<b>通光孔正中央</b>', sub: '看 3D 模型或用「載物台」視角。誤差 1 mm 內', check: () => S.slide === 'letter_e' && Math.abs(ePos().x) < 1 && Math.abs(ePos().y) < 1 },
        { t: '<b>從側面注視</b>，用粗調節輪把載物台升到最高（接近物鏡）', sub: '按「側面視角」看物鏡與玻片的距離', check: () => S.focusZ < -1500 },
        { t: '眼睛看目鏡：調整<b>雙眼視距</b>，使左右兩個圓合成一個', sub: '操作面板「雙眼視距（瞳距）」→ 靠攏／拉開；或在 3D 模型上左右拖曳目鏡筒', check: () => Math.abs(S.ipd - NE.USER_IPD) < 1.6 },
        { t: '一邊看目鏡，一邊用<b>粗調節輪慢慢下降</b>載物台，直到看見 e 的影像', check: () => S.obj === 0 && NE.inFocus(4) && S.power },
        { t: '改用<b>細調節輪</b>調到最清楚', check: () => NE.inFocus(0.5) },
        { t: '調整<b>光圈與亮度</b>：視野不刺眼、影像清楚', sub: '亮度條約 55–90%，光圈約物鏡 N.A 的 50–90%', check: () => { const m = NE.eyeInfo().mean; const r = S.aperture / NE.OBJ[S.obj].na; return m > 0.5 && m < 0.93 && r >= 0.45 && r <= 0.95; } },
        { t: '把要看的部分移到視野中央，轉到 <b>10X</b>，<b>只用細調節輪</b>調清楚', check: () => S.obj === 1 && NE.inFocus(0.6) && !S.usedCoarseSinceObj },
        { t: '再轉到 <b>40X</b>，同樣只用細調節輪', sub: '高倍視野較暗，可調亮一點', check: () => S.obj === 2 && NE.inFocus(0.6) && !S.usedCoarseSinceObj },
        { t: '觀察完畢：亮度調最低 → 關電源 → 轉回 4X → 降下載物台 → 取下玻片', check: () => !S.power && (S.powerOffBright || 0) <= 10 && S.obj === 0 && S.focusZ > 3000 && !S.slide }
      ]);
    }
  });

  add({
    id: 'light', ic: '4', title: '光圈・亮度・明暗', enter(el) {
      el.innerHTML = `<h2>調光圈、燈泡亮度與分辨明暗</h2>
      <p>NE300 的<b>孔徑光圈環</b>在載物台下方的聚光鏡上，環上標有 4x～100x：<b>轉到與物鏡相同的倍率刻度</b>就是建議的光圈大小；未染色的透明標本可以再轉小一點。<b>亮度</b>則由光源座右側的亮度鈕（LED）控制。</p>
      <table class="t"><tr><th></th><th>光圈開大</th><th>光圈縮小</th></tr>
      <tr><td>視野亮度</td><td>亮</td><td>暗</td></tr>
      <tr><td>對比（明暗差）</td><td>低，透明標本看不清</td><td>高，邊緣明顯</td></tr>
      <tr><td>解析度</td><td>高（細節清楚）</td><td>降低，太小會出現暗粗的繞射邊</td></tr>
      <tr><td>景深</td><td>淺</td><td>較深</td></tr></table>
      <div class="tip"><b>原則：</b>亮度用<b>亮度鈕</b>調整；光圈用來調<b>對比</b>，一般開到物鏡 N.A 的約 70–80%。未染色的透明標本可把光圈再縮小一些。低倍光線多，要調暗；換高倍視野變暗，要調亮。</div>
      <div id="ops" style="margin:6px 0"></div><div id="tk"></div>
      <h3>分辨氣泡與細胞</h3>
      <p>製作水埋玻片時常會有氣泡。氣泡的特徵：<b>圓形或橢圓形、邊緣有一圈很粗很黑的環、中央透亮</b>，裡面沒有任何構造；微調時黑環的粗細、亮暗會改變。細胞則有細胞壁（或細胞膜）及細胞核等構造。</p>
      <div id="ops2"></div><div id="q1"></div>
      <h3>視野中的污點在哪裡？</h3>
      <p>視野中有不會消失的污點時：<b>移動玻片</b>污點跟著動 → 在玻片上；<b>旋轉目鏡</b>污點跟著轉 → 在目鏡上；兩者都不動 → 在物鏡上。</p>
      <div id="tk2"></div><div id="q2"></div>`;
      NE.$('#ops', el).appendChild(btn('快速準備：未染色洋蔥表皮，10X', () => NE.quickSetup({ slide: 'onion_raw', obj: 1, aperture: 1.25 }), 'primary'));
      this.tasks = NE.Tasks(NE.$('#tk', el), [
        { t: '在 10X 下觀察<b>未染色</b>洋蔥表皮，把光圈<b>開到最大</b>（N.A ≥ 1.0）', sub: '細胞幾乎透明，看不太清楚（對比低）', check: () => S.slide === 'onion_raw' && S.obj === 1 && S.aperture >= 1.0 && NE.inFocus(1.5) && S.power },
        { t: '慢慢把光圈縮小到 N.A 約 0.12–0.18', sub: '細胞壁和細胞核變明顯了；視野也變暗', check: () => S.aperture >= 0.1 && S.aperture <= 0.19 && S.obj === 1 },
        { t: '把光圈縮到最小（N.A ≤ 0.07），看看會怎樣', sub: '更暗、邊緣出現粗黑線，細節反而變差（解析度降低）', check: () => S.aperture <= 0.07 },
        { t: '光圈調回 0.14–0.22，用<b>亮度鈕</b>把視野調到適中', sub: '視野亮度條約 60–90%', check: () => S.aperture >= 0.14 && S.aperture <= 0.22 && NE.eyeInfo().mean > 0.6 && NE.eyeInfo().mean < 0.92 },
        { t: '轉到 40X（只用細調），發現視野變暗了 → 把光圈開大到約物鏡 N.A 的 60–80%，再用亮度鈕補光', sub: '40X 物鏡 N.A 0.65，光圈約 0.4–0.52；視野亮度條約 55–90%', check: () => S.obj === 2 && NE.inFocus(0.8) && S.aperture >= 0.38 && S.aperture <= 0.56 && NE.eyeInfo().mean > 0.55 && NE.eyeInfo().mean < 0.93 },
        { t: '換「洋蔥表皮（碘液染色）」玻片比較：染色後光圈開大一些也看得清楚', sub: '光圈 ≥ 物鏡 N.A 的 60%，並對好焦', check: () => S.slide === 'onion_iodine' && S.aperture >= NE.OBJ[S.obj].na * 0.6 && NE.inFocus(0.8) }
      ]);
      NE.$('#ops2', el).appendChild(btn('快速準備：有氣泡的洋蔥水埋玻片，4X', () => NE.quickSetup({ slide: 'onion_bubbles', obj: 0, aperture: 0.08 }), 'sm'));
      NE.mcq(NE.$('#q1', el), '視野中一個「中央透亮、外圍有很粗黑環的圓」，最可能是？', ['細胞核', '氣泡', '洋蔥細胞', '灰塵'], 1, '氣泡與水的折射率差很大，光在邊緣被大量折射、反射，所以出現粗黑環。');
      this.tasks2 = NE.Tasks(NE.$('#tk2', el), [
        { t: '開燈並放上任一玻片後，<b>旋轉右目鏡</b>（操作面板「右目鏡・目鏡測微器」的旋鈕，或在 3D 模型上左右拖曳右目鏡）超過 45°，觀察視野邊緣的兩個灰色小污點', sub: '污點跟著轉 → 污點在目鏡上', check: () => S.power && Math.abs(((S.eyeRot + 180) % 360) - 180) > 45 }
      ], { seq: false });
      NE.mcq(NE.$('#q2', el), '由 10X 換到 40X 後，視野的亮度會？', ['變亮', '變暗', '不變'], 1, '高倍物鏡視野範圍小、收集的光分散到更大的放大像上，所以變暗，需要調亮或開大光圈。');
    }
  });

  add({
    id: 'focus', ic: '5', title: '對焦與景深', enter(el) {
      el.innerHTML = `<h2>調焦距與景深</h2>
      <p><b>景深</b>：焦平面上下「同時看得清楚」的厚度範圍。物鏡的 N.A 越大、倍率越高，景深越淺；光圈縮小，景深稍微變深。</p>
      ${dofTable()}
      <p>40X 的景深只有約 1–2 µm，而 NE300 細調節輪每格 2 µm——所以高倍時一定要用細調節輪，而且要<b>邊看邊轉、上下微調</b>，才能看清標本不同深度的構造。</p>
      <h3>實驗：三色絲線的上下順序</h3>
      <p>玻片上有紅、黃、藍三條絲線交疊在一起。試著用景深判斷哪一條在最上面。</p>
      <div id="ops"></div><div id="tk"></div>
      <div id="ans" style="display:none">
        <div class="form-row">最上層：<select id="t2"></select> 中間：<select id="t1"></select> 最下層：<select id="t0"></select> <button class="btn primary" id="chk">檢查</button></div>
        <div id="ansfb"></div>
      </div>
      <div class="tip"><b>判斷方法：</b>先讓三條都模糊（載物台降低一點），再用細調節輪<b>慢慢上升</b>載物台：焦平面從上往下移動，<b>最先變清楚的在最上面</b>。</div>
      <h3>用細調節輪測量深度</h3>
      <p>先對焦到最上層絲線，記下細調刻度；再轉到最下層絲線變清楚，記下刻度。兩者相差的格數 × 2 µm ＝ 兩條絲線中心的深度差。</p>
      <div class="form-row">最上與最下絲線相差 <input type="number" id="dep"> µm <button class="btn" id="chk2">檢查</button></div><div id="depfb"></div>
      <p style="font-size:12.5px;color:var(--muted)">註：實際上光線經過封片液與玻璃會折射，讀到的深度與真實厚度略有差異，此處忽略。</p>`;
      NE.$('#ops', el).appendChild(btn('快速準備：三色絲線，4X', () => NE.quickSetup({ slide: 'threads', obj: 0 }), 'primary'));
      const visited = [false, false, false];
      const lvlInFocus = k => { const O = NE.optics(); return Math.abs(S.focusZ - NE.THREAD_Z[k]) < O.DOF / 2 + 12; };
      this.tasks = NE.Tasks(NE.$('#tk', el), [
        { t: '在 <b>4X</b> 下對焦：三條絲線都幾乎同時清楚', sub: '4X 景深較深（約 90 µm）', check: () => S.slide === 'threads' && S.obj === 0 && Math.abs(S.focusZ - 135) < 70 && S.power },
        { t: '換到 <b>10X</b>，用細調節輪上下調：一次只能看清楚一條', sub: '分別讓三條絲線各清楚一次', check: () => { if (S.slide === 'threads' && S.obj === 1) for (let k = 0; k < 3; k++) if (lvlInFocus(k)) visited[k] = true; return visited.every(Boolean); }, onDone: () => { NE.$('#ans', el).style.display = ''; } }
      ]);
      ['t0', 't1', 't2'].forEach(id => { const s = NE.$('#' + id, el); s.innerHTML = '<option value="">—</option>' + NE.THREAD_COL.map((c, i) => `<option value="${i}">${c[0]}色</option>`).join(''); });
      NE.$('#chk', el).onclick = () => {
        const v = [0, 1, 2].map(k => NE.$('#t' + k, el).value);
        const ok = v.every((x, k) => x !== '' && +x === NE.threadOrder[k]);
        NE.$('#ansfb', el).innerHTML = ok ? '<div class="result ok">✔ 完全正確！</div>' : '<div class="result bad">✘ 不太對，再用細調節輪仔細觀察：從上往下，哪一條最先清楚？</div>';
      };
      NE.$('#chk2', el).onclick = () => {
        const v = +NE.$('#dep', el).value, truth = NE.THREAD_Z[2] - NE.THREAD_Z[0];
        NE.$('#depfb', el).innerHTML = Math.abs(v - truth) <= 24 ? `<div class="result ok">✔ 很好！實際約 ${truth} µm（${truth / 2} 格）。</div>` : `<div class="result bad">✘ 差距較大。提示：細調節輪 1 格 = 2 µm，轉一圈 100 格 = 200 µm。</div>`;
      };
    }
  });

  add({
    id: 'move', ic: '6', title: '移動玻片與倒像', enter(el) {
      el.innerHTML = `<h2>如何移動玻片：倒像</h2>
      <p>複式顯微鏡看到的影像是<b>上下顛倒、左右相反</b>（等於旋轉 180°）。所以玻片往右移，影像往左跑；玻片往遠離你的方向推，影像往下跑。</p>
      <div class="formula">口訣：影像偏哪邊，玻片就往哪邊移</div>
      <div id="map"></div><div id="ops" style="margin:6px 0"></div><div id="tk"></div><div id="q"></div>`;
      NE.slideMap(NE.$('#map', el));
      NE.$('#ops', el).appendChild(btn('快速準備：字母 e，4X', () => NE.quickSetup({ slide: 'letter_e', obj: 0 }), 'primary'));
      const ep = () => NE.eyePos(0, 0);
      let x0 = null;
      const qbox = NE.$('#q', el);
      this.tasks = NE.Tasks(NE.$('#tk', el), [
        { t: '在 4X 下看清楚字母 e，和上方「實物方向」比較', check: () => S.slide === 'letter_e' && NE.inFocus(1) && S.power && Math.hypot(ep().u, ep().v) < 0.8, onDone: () => NE.mcq(qbox, '視野中的 e 和實物相比？', ['完全一樣', '只有左右相反', '只有上下顛倒', '上下顛倒且左右相反（轉了 180°）'], 3) },
        { t: '用 X 旋鈕（或 → 鍵）把玻片<b>往右</b>移動，觀察影像移動的方向', sub: '玻片往右移動 1 mm 以上', check: () => { if (x0 == null) x0 = S.stageX; return S.stageX - x0 > 0.9; }, onDone: () => NE.mcq(qbox, '玻片往右移，影像往哪邊移？', ['往右', '往左', '往上', '不動'], 1) },
        { t: '挑戰：把 e 移到視野的<b>右上方</b>', check: () => { const p = ep(); return p.u > 0.3 && p.v < -0.3 && Math.hypot(p.u, p.v) < 0.95; } },
        { t: '再把 e 移回視野<b>正中央</b>，換到 10X 觀察', check: () => { const p = ep(); return Math.hypot(p.u, p.v) < 0.25 && S.obj === 1 && NE.inFocus(0.8); }, onDone: () => NE.mcq(qbox, '視野「左下方」有一個細胞，想把它移到視野中央，玻片要往哪個方向移動？', ['右上方', '左下方', '右下方', '左上方'], 1, '影像在左下，玻片就往左下移。') }
      ]);
      this._reset = () => { x0 = null; };
    }
  });

  add({ id: 'wetmount', ic: '7', title: '製作水埋玻片', sec: '玻片製作', mode: 'scene', enter(el) { NE.WetMount.enter(el); }, leave() { NE.WetMount.leave(); } });
  add({ id: 'stain', ic: '8', title: '染色', mode: 'scene', enter(el) { NE.Stain.enter(el); }, leave() { NE.Stain.leave(); } });

  // ---------- 測微器校正 ----------
  function calTable() {
    return `<table class="t"><tr><th>物鏡</th><th>目鏡格數</th><th>載物臺格數</th><th>目鏡測微器每格</th></tr>` + NE.OBJ.map((o, i) => {
      const c = NE.userCal[i];
      return `<tr><td>${o.mag}X</td><td>${c ? c.oc : '—'}</td><td>${c ? c.st : '—'}</td><td>${c ? '<b>' + NE.fmt(c.um, 2) + ' µm</b>' : '<span style="color:#999">尚未校正</span>'}</td></tr>`;
    }).join('') + '</table>';
  }
  NE.calTable = calTable;
  const wrap180 = a => { a = ((a % 180) + 180) % 180; return a > 90 ? a - 180 : a; };
  add({
    id: 'calib', ic: '9', title: '目鏡測微器校正', sec: '顯微測量', enter(el) {
      el.innerHTML = `<h2>用載物臺測微器校正目鏡測微器</h2>
      <table class="t"><tr><th></th><th>目鏡測微器</th><th>載物臺測微器</th></tr>
      <tr><td>位置</td><td>放在<b>目鏡內</b>的視野光闌處</td><td>像玻片一樣放在<b>載物台</b>上</td></tr>
      <tr><td>刻度</td><td>10 mm 分成 100 格（數字 0–10）</td><td>1 mm 分成 100 格，<b>每格 0.01 mm = 10 µm</b></td></tr>
      <tr><td>每格長度</td><td><b>未知</b>，隨物鏡倍率改變，需校正</td><td>已知，是「標準尺」</td></tr>
      <tr><td>換物鏡時</td><td>看起來大小<b>不變</b></td><td>跟著標本一起被放大</td></tr></table>
      <div class="formula">目鏡測微器每格長度 ＝ <u>載物臺測微器格數 × 10 µm</u> ÷ 目鏡測微器格數<br><small>（取兩尺「完全重合」的兩條刻度線之間的格數）</small></div>
      <div id="tk"></div>
      <div class="qa" id="form"><div class="q">記錄目前物鏡（<span id="cobj"></span>）的重合格數</div>
      <div class="form-row">目鏡測微器 <input type="number" id="oc" min="1" max="100"> 格 ＝ 載物臺測微器 <input type="number" id="st" min="1" max="100"> 格 <button class="btn primary" id="calc">計算並檢查</button></div>
      <div id="cfb"></div></div>
      <h3>校正紀錄</h3><div id="ctab"></div>
      <div class="tip"><b>小技巧：</b>選擇<b>距離 0 越遠</b>的重合線，格數越多、誤差越小。用視野左下的 🔍 放大鏡讀刻度。若找不到剛好重合的線，可移動載物台重新對齊零點。</div>
      <div class="note">每台顯微鏡物鏡的實際倍率都有些微誤差（本模擬每台也不同），因此<b>每個物鏡都要實際校正</b>，不能只用「100 µm ÷ 物鏡倍率」估算。</div>
      <div id="map"></div>`;
      const tk = NE.$('#tk', el);
      const ops = NE.h('div', { style: 'margin:6px 0;display:flex;gap:6px;flex-wrap:wrap' });
      ops.appendChild(btn('快速準備：載物臺測微器 4X', () => { NE.quickSetup({ slide: 'micrometer', obj: 0, reticle: false, centered: true }); S.stageX += 0.25; S.stageY -= 0.18; NE.changed(); }, 'primary'));
      tk.appendChild(ops);
      const zeroOK = () => {
        if (S.slide !== 'micrometer') return false;
        const v = NE.view, er = S.eyeRot * Math.PI / 180, mm = v.R / 10;
        const rz = { x: v.cx - 5 * mm * Math.cos(er), y: v.cy - 5 * mm * Math.sin(er) };
        return [-500, 500].some(x => {
          const z = v.toScreen(x, 0);
          const dx = z.x - rz.x, dy = z.y - rz.y;
          const along = dx * Math.cos(er) + dy * Math.sin(er), perp = -dx * Math.sin(er) + dy * Math.cos(er);
          return Math.abs(along) < mm / 10 * 0.5 && Math.abs(perp) < v.R * 0.12;
        });
      };
      this.tasks = NE.Tasks(tk, [
        { t: '把<b>目鏡測微器</b>放入目鏡', sub: '操作面板「右目鏡・目鏡測微器」→ 放入目鏡測微器', check: () => S.reticle },
        { t: '放上<b>載物臺測微器</b>並夾好，在 4X 下對焦看清刻度', check: () => S.slide === 'micrometer' && S.clip && NE.inFocus(0.8) && S.power },
        { t: '<b>旋轉右目鏡</b>，使兩組刻度互相平行', sub: '用「右目鏡・目鏡測微器」旋鈕或 ↺↻ 1° 按鈕微調，誤差 0.8° 以內', check: () => S.slide === 'micrometer' && Math.abs(wrap180(S.eyeRot + S.place.rot)) < 0.8 },
        { t: '移動載物台，使目鏡測微器的「0」線與載物臺測微器<b>左端第一條線重合</b>', sub: '載物臺測微器在視野中是倒像，數字上下顛倒，從哪一端開始數都可以；兩尺要靠在一起', check: zeroOK },
        { t: '向右找出另一條<b>完全重合</b>的刻度線，在下方填入格數', check: () => !!NE.userCal[0] },
        { t: '換 10X、40X，重複對齊零點並完成校正', sub: '換物鏡後要重新對齊（零點會移開）', check: () => !!(NE.userCal[1] && NE.userCal[2]) },
        { t: '（選做）100X 油鏡也完成校正', sub: '記得滴浸潤油', check: () => !!NE.userCal[3] }
      ], { seq: true });
      const refreshTab = () => { NE.$('#ctab', el).innerHTML = calTable(); NE.$('#cobj', el).textContent = NE.OBJ[S.obj].mag + 'X'; };
      refreshTab(); this._rt = refreshTab;
      NE.$('#calc', el).onclick = () => {
        const oc = +NE.$('#oc', el).value, st = +NE.$('#st', el).value, fb = NE.$('#cfb', el);
        if (S.slide !== 'micrometer' || !S.reticle) { fb.innerHTML = '<div class="result bad">請先放上載物臺測微器並裝上目鏡測微器。</div>'; return; }
        if (!(oc > 0 && st > 0)) { fb.innerHTML = '<div class="result bad">請輸入格數。</div>'; return; }
        const um = st * 10 / oc, truth = NE.CAL[S.obj].um;
        if (Math.abs(um - truth) / truth < 0.022) {
          NE.userCal[S.obj] = { oc, st, um }; NE.saveUserCal();
          fb.innerHTML = `<div class="result ok">✔ ${NE.OBJ[S.obj].mag}X：目鏡測微器每格 ＝ ${st} × 10 µm ÷ ${oc} ＝ <b>${NE.fmt(um, 2)} µm</b>，已記錄！</div>`;
        } else {
          fb.innerHTML = `<div class="result bad">✘ 算出每格 ${NE.fmt(um, 2)} µm，和實際不符。請確認：①兩尺平行 ②0 刻度確實重合 ③選的線是「完全重合」 ④格數是從 0 開始數。</div>`;
        }
        refreshTab(); this.tasks.check();
      };
      NE.slideMap(NE.$('#map', el));
    },
    onChange() { this._rt && this._rt(); }
  });

  // ---------- 測量 ----------
  const records = NE.store.get('records', []);
  add({
    id: 'measure', ic: '10', title: '不同倍率下測量', enter(el) {
      el.innerHTML = `<h2>在不同倍率下用目鏡測微器測量</h2>
      <ol><li>先完成各倍率的<b>校正</b>（上一章）。</li>
      <li>取下載物臺測微器，換上要測量的標本玻片；目鏡測微器留在目鏡內。</li>
      <li>旋轉右目鏡、移動玻片，讓刻度跨在待測物上，讀出所占的格數。</li>
      <li><b>實際長度 ＝ 格數 × 該倍率的每格長度</b>（換物鏡就要換用該倍率的校正值）。</li></ol>
      <div id="ctab"></div>
      <div id="ops" style="display:flex;flex-wrap:wrap;gap:5px;margin:6px 0"></div>
      <div class="qa"><div class="q">① 在目鏡視野中<b>點一下</b>要測量的細胞（綠色虛線框）</div><div id="tgt" style="font-size:14px;color:var(--muted)">尚未選取</div>
      <div class="form-row">② 所占格數 <input type="number" id="n" step="0.1"> 格 <button class="btn primary" id="go">計算</button></div><div id="mfb"></div></div>
      <h3>測量紀錄</h3><div id="rec"></div><button class="btn sm" id="clr">清除紀錄</button>
      <div id="tk"></div><div id="q"></div>`;
      NE.$('#ctab', el).innerHTML = calTable();
      const ops = NE.$('#ops', el);
      ops.appendChild(btn('洋蔥表皮（碘液）10X', () => NE.quickSetup({ slide: 'onion_iodine', obj: 1, reticle: true }), 'sm'));
      ops.appendChild(btn('口腔皮膜細胞 10X', () => NE.quickSetup({ slide: 'cheek_mb', obj: 1, reticle: true }), 'sm'));
      ops.appendChild(btn('血液抹片 40X', () => NE.quickSetup({ slide: 'blood', obj: 2, reticle: true }), 'sm'));
      ops.appendChild(btn('馬鈴薯澱粉 10X', () => NE.quickSetup({ slide: 'potato_iodine', obj: 1, reticle: true }), 'sm'));
      const tgt = NE.$('#tgt', el), fb = NE.$('#mfb', el);
      const showT = () => {
        const t = S.target;
        tgt.innerHTML = t ? `已選取：<b>${t.label}</b>，請測量它的「<b>${t.main}</b>」（目前 ${NE.OBJ[S.obj].mag}X）` : '尚未選取';
      };
      this._eye = e => {
        const sp = NE.spec(); if (!sp || !sp.pick || !S.power) return;
        const t = sp.pick(e.slide.x, e.slide.y);
        if (t) { t.slide = S.slide; S.target = t; NE.changed('target'); showT(); }
      };
      const drawRec = () => {
        NE.$('#rec', el).innerHTML = records.length ? `<table class="t"><tr><th>標本</th><th>物鏡</th><th>格數</th><th>每格 µm</th><th>測得長度</th><th>結果</th></tr>${records.map(r => `<tr><td>${r.label}</td><td>${r.mag}X</td><td>${r.n}</td><td>${NE.fmt(r.um, 2)}</td><td>${NE.fmt(r.len, 1)} µm</td><td>${r.ok ? '✔' : '✘'}</td></tr>`).join('')}</table>` : '<p style="color:#999">還沒有紀錄</p>';
      };
      drawRec();
      NE.$('#clr', el).onclick = () => { records.length = 0; NE.store.set('records', records); drawRec(); };
      NE.$('#go', el).onclick = () => {
        const t = S.target, n = +NE.$('#n', el).value;
        if (!t || t.slide !== S.slide) { fb.innerHTML = '<div class="result bad">請先在視野中點選一個細胞。</div>'; return; }
        if (!S.reticle) { fb.innerHTML = '<div class="result bad">目鏡測微器還沒裝上！</div>'; return; }
        if (!(n > 0)) { fb.innerHTML = '<div class="result bad">請輸入格數。</div>'; return; }
        const uc = NE.userCal[S.obj];
        const um = uc ? uc.um : NE.CAL[S.obj].um;
        const truth = t.dims[t.main], nTrue = truth / NE.CAL[S.obj].um;
        const ok = Math.abs(n - nTrue) <= Math.max(1, nTrue * 0.12);
        const len = n * um;
        records.push({ label: t.label, id: t.id, mag: NE.OBJ[S.obj].mag, obj: S.obj, n, um, len, ok }); NE.store.set('records', records);
        let msg = `${n} 格 × ${NE.fmt(um, 2)} µm ＝ <b>${NE.fmt(len, 1)} µm</b>${uc ? '' : '（⚠ 此倍率尚未校正，暫用正確值計算）'}。`;
        msg += ok ? `<br>✔ 讀數合理！這個${t.label}的${t.main}實際約 ${truth} µm。` : `<br>✘ 格數與實際差距較大（實際約占 ${NE.fmt(nTrue, 1)} 格）。確認刻度與細胞${t.main}方向平行、兩端都對齊。`;
        fb.innerHTML = `<div class="result ${ok ? 'ok' : 'bad'}">${msg}</div>`;
        drawRec(); this.tasks.check();
      };
      const has = f => records.some(f);
      this.tasks = NE.Tasks(NE.$('#tk', el), [
        { t: '在 10X 下測量一個<b>洋蔥表皮細胞</b>的長度', check: () => has(r => r.ok && r.label === '洋蔥表皮細胞' && r.obj === 1) },
        { t: '選一個<b>口腔皮膜細胞</b>，分別在 10X 和 40X 測量<b>同一個細胞</b>的直徑', sub: '在 10X 選好細胞並移到中央，換 40X 後細胞仍在框內', check: () => { const a = records.filter(r => r.ok && r.label === '口腔皮膜細胞'); return a.some(r => r.obj === 1 && a.some(q => q.obj === 2 && q.id === r.id)); } },
        { t: '在 40X 或 100X 下測量一個<b>紅血球</b>的直徑', check: () => has(r => r.ok && r.label === '紅血球' && r.obj >= 2) }
      ], { seq: false });
      const q = NE.$('#q', el);
      NE.mcq(q, '同一個細胞在 10X 占 6 格、在 40X 占 24 格，算出的實際長度會？', ['40X 的比較長', '10X 的比較長', '應該相同', '無法比較'], 2, '格數不同是因為每格代表的長度不同（10X 每格約 10 µm，40X 約 2.5 µm），細胞本身大小不變。');
      NE.mcq(q, '測量細小的構造（如紅血球）時，為什麼要用較高倍率？', ['因為比較亮', '每格代表的長度較小，所占格數多，讀數誤差相對較小', '因為景深較深', '因為不需要校正'], 1);
      showT();
    },
    onEye(e) { this._eye && this._eye(e); },
    leave() { S.target = null; NE.changed(); }
  });

  // ---------- 為什麼不用載物臺測微器 ----------
  add({
    id: 'why', ic: '11', title: '為何不用載物臺測微器測量', enter(el) {
      el.innerHTML = `<h2>為什麼不直接用載物臺測微器測量？</h2>
      <p>載物臺測微器有精確的刻度（每格 10 µm），看起來直接拿來量最準，為什麼還要多一個目鏡測微器？</p>
      <h3>① 兩者無法同時看清楚</h3>
      <p>載物臺測微器本身就是一片玻片，標本在另一片玻片上。若把標本玻片疊在測微器上，標本與刻度相差約 <b>1.2 mm</b>（一片載玻片＋蓋玻片的厚度），遠大於景深（4X 約 90 µm、40X 約 2 µm）。</p>
      <div id="ops"></div><div id="tk"></div>
      <h3>② 目鏡測微器與影像在同一個平面</h3>
      ${opticSVG()}
      <p>目鏡測微器放在目鏡的<b>視野光闌</b>處，正好是物鏡形成<b>中間像</b>的位置，所以刻度和標本的像<b>疊在一起、同時清楚</b>，對焦時刻度也永遠清楚。</p>
      <h3>③ 刻度大小不隨倍率改變</h3>
      <p>目鏡測微器不經過物鏡放大，在任何倍率下都能看到完整的 100 格；載物臺測微器卻會跟著放大：在 100X 時視野直徑只有 0.2 mm，只看得到約 20 格，刻度線也變粗。</p>
      <h3>④ 操作方便、保護標準尺</h3>
      <ul><li>移動玻片時目鏡刻度不動，可以把刻度對準視野中任何一個細胞；轉動目鏡就能改變測量方向。</li>
      <li>載物臺測微器是精密昂貴的「標準尺」，若常放濕的水埋玻片、滴油，容易污染、刮傷。</li>
      <li>載物台上的<b>標尺（游標尺）</b>只能讀到 0.1 mm，是用來記錄標本位置的，無法測量細胞。</li></ul>
      <div class="formula" style="text-align:left">結論：<b>載物臺測微器</b>＝已知長度的標準尺，用來<b>校正</b>；<br><b>目鏡測微器</b>＝校正後真正用來<b>測量</b>的尺。</div>
      <div id="q"></div>`;
      NE.$('#ops', el).appendChild(btn('示範：把口腔細胞玻片疊在載物臺測微器上（4X）', () => { NE.quickSetup({ slide: 'stack', obj: 0, reticle: false, aperture: 0.08 }); }, 'primary'));
      const near = (z) => { const O = NE.optics(); return Math.abs(S.focusZ - z) < O.DOF * 0.6 + 4; };
      this.tasks = NE.Tasks(NE.$('#tk', el), [
        { t: '對焦到<b>測微器的刻度</b>：刻度清楚，細胞卻完全看不見', check: () => S.slide === 'stack' && near(0) && S.power },
        { t: '再對焦到<b>上面那片的口腔細胞</b>：細胞清楚，刻度卻消失了', sub: '要用粗調讓載物台下降約 1.2 mm', check: () => S.slide === 'stack' && near(1184) && S.power },
        { t: '換上口腔細胞玻片並裝上<b>目鏡測微器</b>：細胞與刻度同時清楚', check: () => S.slide === 'cheek_mb' && S.reticle && NE.inFocus(0.6) && S.power }
      ]);
      NE.mcq(NE.$('#q', el), '下列何者是使用目鏡測微器、而不直接用載物臺測微器測量的主要原因？', ['目鏡測微器比較便宜', '目鏡測微器的刻度與標本的像在同一平面，可同時看清楚', '載物臺測微器的刻度不準', '目鏡測微器不需要校正'], 1, '目鏡測微器「需要」校正，但校正後可在任何倍率直接疊在影像上測量。');
    }
  });
  function opticSVG() {
    return `<svg class="svgfig" viewBox="0 0 360 400" xmlns="http://www.w3.org/2000/svg" font-family="Microsoft JhengHei,sans-serif" font-size="12">
    <defs><marker id="ar" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8z" fill="#e0a020"/></marker></defs>
    <rect x="150" y="18" width="60" height="16" rx="8" fill="#6f7d91"/><text x="220" y="31">眼睛</text>
    <rect x="140" y="52" width="80" height="78" rx="6" fill="#e8ecf2" stroke="#8090a8"/><text x="230" y="70">目鏡（10X）</text>
    <ellipse cx="180" cy="66" rx="34" ry="5" fill="#b9d4f0" stroke="#5c7ca8"/>
    <line x1="146" y1="118" x2="214" y2="118" stroke="#d22" stroke-width="3"/><text x="230" y="114" fill="#c22">視野光闌＝中間像平面</text><text x="230" y="129" fill="#c22">目鏡測微器放這裡</text>
    <g stroke="#d22" stroke-width="1">${Array.from({ length: 11 }, (_, i) => `<line x1="${150 + i * 6}" y1="118" x2="${150 + i * 6}" y2="${i % 5 ? 113 : 110}"/>`).join('')}</g>
    <path d="M180 300 L170 118" stroke="#e0a020" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/><path d="M180 300 L190 118" stroke="#e0a020" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
    <rect x="150" y="190" width="60" height="40" rx="4" fill="#d9dce1" stroke="#8a8f98"/><text x="220" y="214">物鏡</text>
    <ellipse cx="180" cy="228" rx="18" ry="4" fill="#b9d4f0"/>
    <rect x="90" y="296" width="180" height="8" fill="#cfe7f7" stroke="#8fb3cc"/><text x="275" y="304">標本（玻片）</text>
    <circle cx="180" cy="293" r="3" fill="#3b5bc4"/>
    <rect x="70" y="306" width="220" height="10" fill="#26282c"/><text x="295" y="318">載物台</text>
    <rect x="155" y="326" width="50" height="24" rx="3" fill="#2c2e33"/><text x="215" y="342">聚光鏡＋光圈</text>
    <circle cx="180" cy="378" r="10" fill="#ffe7a6" stroke="#e0a020"/><text x="200" y="382">LED 光源</text>
    <line x1="180" y1="366" x2="180" y2="352" stroke="#e0a020" stroke-width="2" marker-end="url(#ar)"/>
    <text x="14" y="150" fill="#556">標本經物鏡</text><text x="14" y="166" fill="#556">成像在這個平面，</text><text x="14" y="182" fill="#556">和刻度重疊</text>
    </svg>`;
  }

  // ---------- 綜合測驗 ----------
  add({
    id: 'quiz', ic: '12', title: '綜合測驗', sec: '總結', enter(el) {
      el.innerHTML = `<h2>綜合測驗</h2><div id="score" class="tip">答對 <b id="sc">0</b> / <span id="tot"></span> 題</div><div id="qs"></div>`;
      const Q = [
        ['NE300 使用 10X 目鏡與 40X 物鏡時，總放大倍率為？', ['50X', '400X', '40X', '4000X'], 1],
        ['NE300 的視野數 FN = 20 mm，用 10X 物鏡時，視野直徑約為？', ['20 mm', '2 mm', '0.2 mm', '200 mm'], 1],
        ['上升載物台時，眼睛應該？', ['看目鏡', '從側面注視物鏡與玻片', '閉上', '看 LCD 螢幕'], 1],
        ['在 40X 下要調焦，應使用？', ['粗調節輪', '細調節輪', '光圈環', 'XY 旋鈕'], 1],
        ['觀察未染色的透明細胞，想看得更清楚（提高對比），最適當的做法是？', ['把亮度調到最亮', '把光圈稍微縮小', '換 100X 不滴油', '把光圈開到最大'], 1],
        ['製作水埋玻片時，蓋玻片應如何放下？', ['直接平放蓋上', '從高處丟下', '一邊先接觸水滴，以約 45° 慢慢放下', '先蓋再滴水'], 2],
        ['以引流法染色時，吸水紙應放在？', ['蓋玻片上面', '染液的同一側', '染液的對側', '載玻片下方'], 2],
        ['10X 物鏡下，目鏡測微器 50 格恰與載物臺測微器 49 格重合，目鏡測微器每格為？', ['9.8 µm', '10.2 µm', '49 µm', '0.98 µm'], 0],
        ['承上題，換到 40X 時，目鏡測微器每格長度會？', ['不變', '約變為 1/4', '約變為 4 倍', '變為 0'], 1],
        ['為什麼不直接用載物臺測微器測量細胞？', ['刻度不準', '標本與刻度不在同一平面，無法同時對焦', '太便宜', '只能在 4X 使用'], 1],
        ['使用 100X 物鏡時必須？', ['不需蓋玻片', '在蓋玻片上滴浸潤油', '把光圈關到最小', '使用粗調節輪'], 1],
        ['視野中的污點在移動玻片、轉動目鏡時都不動，污點最可能在？', ['玻片上', '目鏡上', '物鏡上', '載物台上'], 2]
      ];
      NE.$('#tot', el).textContent = Q.length;
      const qs = NE.$('#qs', el);
      const upd = () => { NE.$('#sc', el).textContent = NE.$$('.qa', qs).filter(b => b.dataset.ok).length; };
      Q.forEach((q, i) => NE.mcq(qs, (i + 1) + '. ' + q[0], q[1], q[2], '', upd));
    }
  });
})(window.NE);
