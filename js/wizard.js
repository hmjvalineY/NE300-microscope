/* 全螢幕模式＋「操作說明精靈」：像遊戲教學一樣一步一步帶學生操作 NE300 */
(function (NE) {
  const S = NE.S;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let demoToken = 0;
  function until(cond, act, ms = 9000) {
    const tok = demoToken;
    return new Promise(res => {
      const t0 = performance.now(); let last = t0;
      (function f() {
        const now = performance.now();
        const n = NE.clamp(Math.round((now - last) / 16.7), 1, 20); last = now;
        for (let k = 0; k < n; k++) {
          if (tok !== demoToken || cond() || now - t0 > ms) return res();
          act();
        }
        requestAnimationFrame(f);
      })();
    });
  }
  const sgn = v => v > 0 ? 1 : v < 0 ? -1 : 0;
  const off = () => { const so = NE.slideOff(); return { x: S.stageX + so.x, y: S.stageY + so.y }; };
  const centered = (tol = 1) => S.slide && Math.abs(off().x) < tol && Math.abs(off().y) < tol;
  const ratio = () => S.aperture / NE.OBJ[S.obj].na;
  const mean = () => NE.eyeInfo().mean;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ================= 全螢幕 =================
  const FS = NE.FS = { on: false };
  FS.enter = function () {
    if (FS.on) return;
    FS.on = true;
    document.body.classList.add('fs-mode');
    const tw = NE.$('#three-wrap'), eye = NE.$('#eye-wrap');
    FS._eyeParent = eye.parentNode; tw.appendChild(eye); eye.classList.add('inset');
    NE.$('#fs-bar').style.display = '';
    try { const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); p && p.catch && p.catch(() => { }); } catch (e) { }
    refreshBar(); setTimeout(() => NE.model.invalidate(), 60);
  };
  FS.exit = function () {
    if (!FS.on) return;
    FS.on = false;
    document.body.classList.remove('fs-mode');
    const eye = NE.$('#eye-wrap'); eye.classList.remove('inset'); FS._eyeParent.appendChild(eye);
    NE.$('#fs-bar').style.display = 'none';
    if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) { } }
    if (W.on) W.stop();
    setTimeout(() => NE.model.invalidate(), 60);
  };
  FS.toggle = () => FS.on ? FS.exit() : FS.enter();
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && FS.on) FS.exit(); });

  function buildBar() {
    const bar = NE.h('div', { id: 'fs-bar', style: 'display:none' });
    const b = (txt, fn, title) => { const e = NE.h('button', { title: title || '' }, txt); e.onclick = fn; bar.appendChild(e); return e; };
    FS.ui = {
      power: b('⏻ 電源', () => NE.setPower(!S.power)),
      objs: NE.OBJ.map((o, i) => b(o.mag + 'X', () => NE.setObj(i))),
      box: b('📦 玻片盒', () => NE.slideBox()),
      clip: b('撥開標本夾', () => NE.openClip(!S.clipOpen)),
      push: b('推入玻片', () => NE.pushSlide(1)),
      ret: b('目鏡測微器', () => NE.setReticle(!S.reticle)),
      wiz: b('🎓 教學精靈', () => W.on ? W.stop() : W.start()),
      exit: b('✕ 離開全螢幕', () => FS.exit())
    };
    NE.$('#three-wrap').appendChild(bar);
  }
  function refreshBar() {
    if (!FS.ui) return;
    FS.ui.power.classList.toggle('on', S.power);
    FS.ui.objs.forEach((e, i) => e.classList.toggle('on', i === S.obj));
    FS.ui.clip.classList.toggle('on', S.clipOpen); FS.ui.clip.textContent = S.clipOpen ? '放開標本夾' : '撥開標本夾';
    FS.ui.push.disabled = !S.slide || !S.clipOpen || S.seat >= 1;
    FS.ui.ret.classList.toggle('on', S.reticle);
    FS.ui.wiz.classList.toggle('on', W.on);
  }

  // ================= 精靈 =================
  const MASCOT = `<svg viewBox="0 0 100 100" width="86" height="86" class="mascot-svg">
    <ellipse cx="50" cy="92" rx="26" ry="5" fill="rgba(0,0,0,.12)"/>
    <rect x="44" y="4" width="12" height="18" rx="3" fill="#2c2e33"/><rect x="40" y="18" width="20" height="7" rx="3" fill="#d8343a"/>
    <circle cx="50" cy="55" r="34" fill="#8fd0ff" stroke="#2b6cb0" stroke-width="3"/>
    <circle cx="38" cy="50" r="11" fill="#fff" stroke="#2b6cb0" stroke-width="2.5"/><circle cx="62" cy="50" r="11" fill="#fff" stroke="#2b6cb0" stroke-width="2.5"/>
    <line x1="49" y1="50" x2="51" y2="50" stroke="#2b6cb0" stroke-width="2.5"/>
    <g class="eyes"><circle cx="39" cy="51" r="4.5" fill="#1b2a44"/><circle cx="63" cy="51" r="4.5" fill="#1b2a44"/><circle cx="40.5" cy="49" r="1.5" fill="#fff"/><circle cx="64.5" cy="49" r="1.5" fill="#fff"/></g>
    <path d="M40 68 Q50 77 60 68" stroke="#1b2a44" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="27" cy="64" r="4" fill="#ffb3c1" opacity=".8"/><circle cx="73" cy="64" r="4" fill="#ffb3c1" opacity=".8"/></svg>`;

  const I = () => NE.model.info;
  const cam = (t, r, th, ph) => () => NE.model.lookAt(typeof t === 'function' ? t() : t, r, th, ph);
  const STEPS = [
    {
      title: '歡迎來到 NE300 操作練習！', manual: true, hands: 'carry', cam: cam(V3(-2, 17, -3), 95, -0.85, 1.2),
      text: '我是顯微鏡小精靈「小微」。我會一步一步帶你操作顯微鏡，<b>右上角的圓形畫面</b>就是你從目鏡看到的影像。每完成一步，我就會幫你打勾；卡住時按「示範給我看」。',
      hint: '先記住正確的拿法：<b>一手握鏡臂、一手托鏡座</b>，靠近身體搬運，不可以單手提。'
    },
    {
      title: '先把亮度調到最低', hands: 'bright', part: 'bright', cam: cam(() => I().bright(), 58, 0.95, 1.2),
      text: '上一位同學用完沒有把亮度調暗！開電源前要先把鏡座右側的<b>亮度鈕</b>轉到最低，避免一開燈強光刺眼，也保護 LED。',
      hint: '在亮度鈕上<b>往下拖曳</b>，或用滑鼠滾輪往下捲。', check: () => S.bright <= 3,
      demo: () => until(() => S.bright <= 0.5, () => NE.setBright(S.bright - 1.2))
    },
    {
      title: '打開電源', hands: 'power', part: 'power', cam: cam(() => I().power(), 58, 1.75, 1.2),
      text: '電源開關在鏡座的<b>右側後方</b>。打開後，鏡座前面的 LCD 螢幕會亮起，顯示物鏡倍率與亮度。',
      hint: '點一下電源開關（或上方工具列的「⏻ 電源」）。', check: () => S.power,
      demo: async () => { await wait(400); NE.setPower(true); }
    },
    {
      title: '把亮度調亮一點', hands: 'bright', part: 'bright', cam: cam(() => I().bright(), 58, 0.95, 1.2),
      text: '電源開了，但亮度是 0。把亮度慢慢調到約 <b>30–50%</b>，鏡座上方的光源就會發光。',
      hint: '在亮度鈕上往上拖曳；鏡座 LCD 會顯示亮度百分比。', check: () => S.bright >= 25 && S.bright <= 60,
      demo: () => until(() => S.bright >= 38, () => NE.setBright(S.bright + 0.8))
    },
    {
      title: '轉到 4X 低倍物鏡', hands: 'nose', part: 'nosepiece', cam: cam(() => I().noseCenter(), 62, 0.7, 1.2),
      text: '上一位同學停在 40X。觀察一定要<b>從低倍開始</b>：4X 視野最大（約 5 mm）最容易找到標本，工作距離也最長（28 mm）最安全。<br>握住<b>旋轉盤的外緣</b>轉動，聽到「喀」一聲就定位了；不可以直接扳物鏡。',
      hint: '左右拖曳旋轉盤，或直接點紅色環的 4X 物鏡。', check: () => S.obj === 0 && !NE.nosepieceMoving,
      demo: async () => { NE.setObj(0); await wait(900); }
    },
    {
      title: '左手撥開活動標本夾', id: 'clipA', hands: 'clipOpen', part: 'clip', cam: cam(() => I().clip(), 58, 0.3, 0.95),
      text: '載物台左側的<b>活動標本夾</b>有彈簧，放手就會彈回來。所以要先用<b>左手</b>把夾臂向左撥開，並且<b>一直按住</b>，右手才能放玻片。',
      hint: '點一下標本夾（或上方工具列的「撥開/放開標本夾」）＝左手撥開並按住。', check: () => S.clipOpen,
      demo: async () => { await wait(500); NE.openClip(true); await wait(400); }
    },
    {
      title: '右手把玻片放進標本夾', hands: 'slidePlace', cam: cam(() => I().slide().add(V3(3, 2, 4)), 56, 0.5, 0.88), fail: true,
      text: '左手繼續按住標本夾，<b>右手</b>拿「字母 e」玻片（手指只碰玻片邊緣，蓋玻片朝上、標籤在左），放進標本夾與後方擋板之間。',
      act: [{ label: '✋ 右手拿「字母 e」玻片放進去', fn: () => { if (!S.clipOpen) { NE.toast('左手要先撥開標本夾！'); return; } NE.loadSlide('letter_e', { dx: 3.2, dy: -2.2, rot: 0.6 }); } }],
      check: () => S.slide === 'letter_e', demo: async () => { if (!S.clipOpen) NE.openClip(true); await wait(600); NE.loadSlide('letter_e', { dx: 3.2, dy: -2.2, rot: 0.6 }); await wait(500); }
    },
    {
      title: '把玻片推到最裡面！', hands: 'slidePush', part: 'slide', cam: cam(() => I().slide().add(V3(3, 2, 5)), 54, 0.55, 0.88), fail: true,
      text: '這一步最常出錯：玻片要<b>往裡推到底</b>，緊靠後方擋板和右側的固定夾。現在玻片離後方擋板還有約 <b>8 mm</b>（3D 上紅色閃爍的空隙）——沒推到底就放手，彈回來的夾臂會把玻片夾歪、夾不住，移動載物台時玻片會滑動。',
      act: [{ label: '⇡ 右手把玻片推到最裡面', fn: () => NE.pushSlide(1) }],
      hint: '<b>點一下 3D 上的玻片</b>（或按上面的按鈕、工具列的「推入玻片」）。紅色空隙消失就表示推到底了。', check: () => S.seat >= 1,
      demo: () => until(() => S.seat >= 1, () => NE.pushSlide(0.015))
    },
    {
      title: '左手慢慢放開標本夾', hands: 'clipRelease', part: 'clip', cam: cam(() => I().clip(), 50, 0.3, 0.95),
      text: '玻片推到底後，左手<b>慢慢</b>放開，讓夾臂彈回、輕輕夾住玻片的左端。夾好後玻片會跟著 XY 旋鈕一起移動。',
      hint: '再點一次標本夾＝放開。', check: () => S.clip,
      demo: async () => { await wait(800); NE.openClip(false); }
    },
    {
      title: '把字母 e 移到通光孔中央', hands: 'xy', part: 'knobY', cam: cam(V3(2.5, 16, 1), 68, 0.75, 0.95),
      text: '轉動載物台右下方的 <b>XY 同軸旋鈕</b>：上面的旋鈕讓玻片前後移動，下面的旋鈕讓玻片左右移動。把 e 移到載物台中央有光透出的<b>通光孔</b>上。',
      hint: '拖曳 XY 旋鈕（或用鍵盤方向鍵 ←→↑↓）。', check: () => centered(1),
      demo: () => until(() => centered(0.15), () => NE.moveStage(-sgn(off().x) * Math.min(0.08, Math.abs(off().x)), -sgn(off().y) * Math.min(0.08, Math.abs(off().y))))
    },
    {
      title: '從側面注視，把載物台升到最高', hands: 'coarseUp', part: 'coarse', cam: cam(V3(1, 16.5, -2), 66, Math.PI / 2 - 0.12, 1.42),
      text: '<b>眼睛先不要看目鏡！</b>從側面看著物鏡和玻片，用<b>粗調節輪</b>把載物台慢慢往上升，讓玻片盡量接近物鏡。4X 工作距離很長，不會撞到。',
      hint: '在粗調節輪上<b>往上拖曳</b>（或按 PgUp）。左上角會顯示物鏡與蓋玻片的距離。', check: () => S.focusZ < -1500,
      demo: () => until(() => S.focusZ < -1700, () => NE.turnCoarse(0.035))
    },
    {
      title: '看目鏡：調整雙眼視距', hands: 'tubes', part: 'tube', eye: true, cam: cam(V3(0, 34, 10), 68, 0.4, 1.05),
      text: '現在看<b>右上角的目鏡視野</b>。如果看到兩個圓重疊在一起，表示兩個目鏡的距離和你的瞳距不同。兩手扶住左右目鏡筒，<b>向內推或向外拉</b>，直到兩個圓合成一個。',
      hint: '左右拖曳目鏡筒，或在操作面板按「▶◀ 靠攏／◀▶ 拉開」。', check: () => Math.abs(S.ipd - NE.USER_IPD) < 1.6,
      demo: () => until(() => Math.abs(S.ipd - NE.USER_IPD) < 0.3, () => NE.setIPD(S.ipd - sgn(S.ipd - NE.USER_IPD) * 0.25))
    },
    {
      title: '看著目鏡，用粗調節輪慢慢下降', hands: 'coarse', part: 'coarse', eye: true, cam: cam(() => I().coarse(), 70, 1.05, 1.15),
      text: '眼睛看目鏡，用粗調節輪讓載物台<b>往下慢慢降</b>，直到看到 e 的影像（先模糊、再變清楚）。往下降是遠離物鏡，所以不會撞破玻片。',
      hint: '在粗調節輪上<b>往下拖曳</b>，慢慢轉；看到影像就停下來。', check: () => NE.inFocus(4) && S.focusZ > -1500,
      demo: () => until(() => NE.inFocus(2.2), () => NE.turnCoarse(-0.008))
    },
    {
      title: '用細調節輪調到最清楚', hands: 'fine', part: 'fine', eye: true, cam: cam(() => I().fine(), 62, 1.05, 1.15),
      text: '<b>細調節輪</b>在粗調節輪的外側，轉一圈只移動 0.2 mm（每格 2 µm），用來把影像調到最清楚。',
      hint: '拖曳細調節輪，或直接在目鏡視野上滾動滑鼠滾輪。', check: () => NE.inFocus(0.5),
      demo: () => until(() => Math.abs(S.focusZ - NE.spec().mainZ) < 2, () => NE.turnFine(sgn(S.focusZ - NE.spec().mainZ) * 0.05))
    },
    {
      title: '轉動光圈環到「4x」', hands: 'aperture', part: 'aperture', eye: true, cam: cam(() => I().lever(), 50, 0.2, 1.4),
      text: '載物台下方聚光鏡上的<b>光圈環</b>標有 4x、10x、20x、40x…。光圈大 → 亮、對比低；光圈小 → 暗、對比高。<b>把光圈環轉到和物鏡相同的倍率刻度</b>（現在是 4X，就轉到「4x」）就是適當的光圈。',
      hint: '左右拖曳光圈環，讓「4x」對準前方的白色三角形；操作面板會顯示目前對準的刻度。', check: () => ratio() >= 0.6 && ratio() <= 0.9,
      demo: () => until(() => Math.abs(S.aperture - 0.075) < 0.006, () => NE.setAperture(S.aperture - sgn(S.aperture - 0.075) * Math.min(0.01, Math.abs(S.aperture - 0.075))))
    },
    {
      title: '用亮度鈕把視野調到適中', hands: 'bright', part: 'bright', eye: true, cam: cam(() => I().bright(), 58, 0.95, 1.2),
      text: '視野<b>不刺眼、又看得清楚</b>就好（目鏡畫面右上方的亮度條約 60–90%）。亮度靠亮度鈕調整，光圈是用來調對比的。',
      hint: '拖曳亮度鈕，邊調邊看目鏡。', check: () => mean() > 0.55 && mean() < 0.92,
      demo: () => { const tg = NE.autoBright(0.8); return until(() => Math.abs(S.bright - tg) < 1, () => NE.setBright(S.bright + sgn(tg - S.bright) * 0.7)); }
    },
    {
      title: '觀察倒像：把 e 移到視野正中央', hands: 'xy', part: 'knobX', eye: true, cam: cam(V3(2.5, 16, 1), 68, 0.75, 0.95),
      text: '仔細看目鏡裡的 e：<b>上下顛倒、左右相反</b>！試試看把玻片往右移，影像反而往左跑。把 e 移到<b>視野正中央</b>，準備換高倍。',
      hint: '影像偏哪邊，玻片就往哪邊移。', check: () => { const p = NE.eyePos(0, 0); return Math.hypot(p.u, p.v) < 0.15; },
      demo: () => until(() => centered(0.08), () => NE.moveStage(-sgn(off().x) * Math.min(0.03, Math.abs(off().x)), -sgn(off().y) * Math.min(0.03, Math.abs(off().y))))
    },
    {
      title: '轉到 10X', hands: 'nose', part: 'obj1', cam: cam(() => I().noseCenter(), 62, 0.7, 1.2),
      text: 'NE300 的物鏡是<b>齊焦</b>的：低倍對好焦後換高倍，影像只會稍微模糊。10X 的工作距離有 7.4 mm，可以直接轉換。',
      hint: '轉動旋轉盤，或點黃色環的 10X 物鏡。', check: () => S.obj === 1 && !NE.nosepieceMoving,
      demo: async () => { NE.setObj(1); await wait(900); }
    },
    {
      title: '只用細調節輪調清楚', hands: 'fine', part: 'fine', eye: true, cam: cam(() => I().fine(), 62, 1.05, 1.15),
      text: '換到高倍以後，<b>只用細調節輪</b>微調就好，不要再碰粗調節輪。',
      hint: '拖曳細調節輪，或在目鏡視野上滾動滾輪。', check: () => S.obj === 1 && NE.inFocus(0.5),
      demo: () => until(() => Math.abs(S.focusZ - NE.spec().mainZ) < 1, () => NE.turnFine(sgn(S.focusZ - NE.spec().mainZ) * 0.03))
    },
    {
      title: '轉到 40X（從側面確認距離）', hands: 'nose', part: 'obj2', cam: cam(V3(1, 19, 1), 48, Math.PI / 2 - 0.1, 1.45),
      text: '40X 的工作距離只有 <b>0.65 mm</b>！轉換時從側面看一下，確認物鏡不會碰到玻片。因為剛才已經在 10X 對好焦，40X 不會撞到。',
      hint: '轉動旋轉盤，或點藍色環的 40X 物鏡。', check: () => S.obj === 2 && !NE.nosepieceMoving,
      demo: async () => { NE.setObj(2); await wait(900); }
    },
    {
      title: '40X：開大光圈、補亮度、細調', hands: 'aperture', part: 'aperture', eye: true, cam: cam(() => I().lever(), 50, 0.2, 1.4),
      text: '高倍時視野變暗了：把<b>光圈環轉到「40x」</b>（光圈開大），再用<b>亮度鈕</b>補光，最後用<b>細調節輪</b>調清楚。<br>⚠ 40X 下絕對不能用粗調節輪！',
      hint: '光圈環轉到 40x → 亮度 → 細調。', check: () => S.obj === 2 && NE.inFocus(0.6) && S.aperture >= 0.38 && S.aperture <= 0.56 && mean() > 0.5 && mean() < 0.93,
      demo: async () => {
        NE.hands.set('aperture'); await until(() => Math.abs(S.aperture - 0.49) < 0.006, () => NE.setAperture(S.aperture + sgn(0.49 - S.aperture) * Math.min(0.01, Math.abs(0.49 - S.aperture))));
        NE.hands.set('bright'); const tg = NE.autoBright(0.8); await until(() => Math.abs(S.bright - tg) < 1, () => NE.setBright(S.bright + sgn(tg - S.bright) * 0.8));
        NE.hands.set('fine'); await until(() => Math.abs(S.focusZ - NE.spec().mainZ) < 0.4, () => NE.turnFine(sgn(S.focusZ - NE.spec().mainZ) * 0.01));
      }
    },
    {
      title: '觀察結束：亮度調到最低', hands: 'bright', part: 'bright', cam: cam(() => I().bright(), 58, 0.95, 1.2),
      text: '收顯微鏡也有順序。第一步：把亮度鈕轉到最低。', hint: '往下拖曳亮度鈕。', check: () => S.bright <= 3,
      demo: () => until(() => S.bright <= 0.5, () => NE.setBright(S.bright - 1.5))
    },
    {
      title: '關掉電源', hands: 'power', part: 'power', cam: cam(() => I().power(), 58, 1.75, 1.2),
      text: '亮度調到最低後再關電源。', hint: '點一下電源開關。', check: () => !S.power,
      demo: async () => { await wait(300); NE.setPower(false); }
    },
    {
      title: '轉回 4X 低倍物鏡', hands: 'nose', part: 'obj0', cam: cam(() => I().noseCenter(), 62, 0.7, 1.2),
      text: '轉回最低倍的物鏡，下一位同學使用時才安全，取玻片時也不會刮到高倍物鏡。',
      hint: '轉動旋轉盤到 4X（紅色環）。', check: () => S.obj === 0 && !NE.nosepieceMoving,
      demo: async () => { NE.setObj(0); await wait(900); }
    },
    {
      title: '降下載物台', hands: 'coarse', part: 'coarse', cam: cam(V3(0, 16, 0), 56, Math.PI / 2, 1.45),
      text: '用粗調節輪把載物台降低，讓玻片離開物鏡，方便取下。', hint: '在粗調節輪上往下拖曳。', check: () => S.focusZ > 5000,
      demo: () => until(() => S.focusZ > 6000, () => NE.turnCoarse(-0.05))
    },
    {
      title: '取下玻片，放回玻片盒', hands: 'slide', cam: () => NE.model.view('stage'),
      text: '撥開標本夾，取下玻片放回玻片盒。最後捲好電線（背部收線裝置）、蓋上防塵套就完成了！',
      act: [{ label: '取下玻片', fn: () => NE.removeSlide() }], check: () => !S.slide,
      demo: async () => { NE.setClip(false); await wait(500); NE.removeSlide(); }
    },
    { title: '🎉 恭喜完成！', manual: true, final: true, hands: null, cam: () => NE.model.view('front'), text: '', hint: '' }
  ];

  const W = NE.Wizard = { on: false, i: 0 };
  let box, done = [], advTimer = 0, stats = { demos: 0, crashes: 0, t0: 0 };
  function build() {
    box = NE.h('div', { id: 'wiz', style: 'display:none' });
    box.innerHTML = `<div class="wiz-prog"><i></i></div>
      <div class="wiz-main"><div class="wiz-mascot">${MASCOT}</div>
      <div class="wiz-content"><div class="wiz-step"></div><h3 class="wiz-title"></h3><div class="wiz-text"></div><div class="wiz-hint"></div><div class="wiz-act"></div><div class="wiz-status"></div></div></div>
      <div class="wiz-btns"><button class="btn sm" data-a="prev">◀ 上一步</button><button class="btn sm" data-a="demo">▶ 示範給我看</button><span style="flex:1"></span><button class="btn sm" data-a="skip">略過</button><button class="btn primary" data-a="next">下一步 ▶</button><button class="btn sm" data-a="close" title="結束教學">✕</button></div>`;
    NE.$('#three-wrap').appendChild(box);
    box.querySelector('[data-a=prev]').onclick = () => go(W.i - 1);
    box.querySelector('[data-a=next]').onclick = () => { if (STEPS[W.i].final) W.start(); else go(W.i + 1); };
    box.querySelector('[data-a=skip]').onclick = () => go(W.i + 1);
    box.querySelector('[data-a=close]').onclick = () => W.stop();
    box.querySelector('[data-a=demo]').onclick = demo;
    NE.on('change', () => { refreshBar(); if (W.on) check(); });
    NE.on('eyeRendered', () => { if (W.on) check(); });
    NE.on('crash', () => { if (W.on) stats.crashes++; });
  }
  W.start = function () {
    if (!box) build();
    FS.enter();
    NE.resetScope();
    S.bright = 35; S.obj = 2; S.ipd = 70; S.clipOpen = false; NE.changed('wizard');
    W.on = true; NE.wizardOn = true; done = STEPS.map(() => false);
    stats = { demos: 0, crashes: 0, t0: performance.now() };
    box.style.display = '';
    go(0); refreshBar();
  };
  W.stop = function () {
    demoToken++; W.on = false; NE.wizardOn = false;
    if (box) box.style.display = 'none';
    NE.hands.set(null); NE.model.highlight(null);
    NE.$('#eye-wrap').classList.remove('wiz-eye');
    clearTimeout(advTimer); refreshBar();
  };
  function go(i) {
    i = NE.clamp(i, 0, STEPS.length - 1);
    demoToken++; clearTimeout(advTimer);
    W.i = i; const st = STEPS[i];
    NE.hands.set(st.hands || null);
    NE.model.pulseHighlight(st.part || null);
    st.cam && st.cam();
    NE.$('#eye-wrap').classList.toggle('wiz-eye', !!st.eye);
    box.querySelector('.wiz-step').textContent = st.final ? '完成' : `步驟 ${i} / ${STEPS.length - 2}`;
    if (i === 0) box.querySelector('.wiz-step').textContent = '準備';
    box.querySelector('.wiz-title').innerHTML = st.title;
    let text = st.text;
    if (st.final) {
      const sec = Math.round((performance.now() - stats.t0) / 1000);
      text = `你已經完整練習了 NE300 的操作流程！<br>⏱ 用時 ${Math.floor(sec / 60)} 分 ${sec % 60} 秒　▶ 看示範 ${stats.demos} 次　💥 撞片 ${stats.crashes} 次<br>${stats.crashes ? '有撞片紀錄喔，記得：<b>側面注視上升、看目鏡時只往下降、高倍只用細調</b>。' : '沒有撞片，太棒了！'}<br>接下來可以到「光圈・亮度・明暗」「對焦與景深」等章節繼續挑戰。`;
    }
    box.querySelector('.wiz-text').innerHTML = text;
    const hint = box.querySelector('.wiz-hint');
    hint.innerHTML = st.hint ? '🖱 ' + st.hint : ''; hint.style.display = st.hint ? '' : 'none';
    const act = box.querySelector('.wiz-act'); act.innerHTML = '';
    (st.act || []).forEach(a => act.appendChild(NE.btn(a.label, a.fn, 'primary sm')));
    box.querySelector('[data-a=prev]').disabled = i === 0;
    box.querySelector('[data-a=demo]').style.display = st.demo ? '' : 'none';
    box.querySelector('[data-a=skip]').style.display = st.manual ? 'none' : '';
    box.querySelector('[data-a=next]').textContent = st.final ? '🔁 再練習一次' : i === 0 ? '開始 ▶' : '下一步 ▶';
    box.querySelector('.wiz-prog i').style.width = (i / (STEPS.length - 1) * 100) + '%';
    const m = box.querySelector('.wiz-mascot'); m.classList.remove('bounce'); void m.offsetWidth; m.classList.add('bounce');
    done[i] = false;
    status();
    setTimeout(check, 50);
  }
  function status() {
    const st = STEPS[W.i], el = box.querySelector('.wiz-status'), nx = box.querySelector('[data-a=next]');
    if (st.manual) { el.innerHTML = ''; nx.disabled = false; nx.classList.remove('glow'); return; }
    el.innerHTML = done[W.i] ? '<span class="ok">✔ 做得好！</span>' : '<span class="wait">⏳ 等你動手操作…</span>';
    nx.disabled = !done[W.i]; nx.classList.toggle('glow', done[W.i]);
  }
  let failT = 0;
  function check() {
    const st = STEPS[W.i];
    if (!st) return;
    // 玻片沒推到底就放開標本夾 → 回到「撥開標本夾」重來
    const cur = STEPS[W.i];
    if ((cur.fail || cur.title.startsWith('左手慢慢')) && S.slide && !S.clipOpen && !S.clip && !failT) {
      box.querySelector('.wiz-status').innerHTML = '<span style="color:#c9353f;font-weight:700">⚠ 玻片沒推到最裡面就放開了，標本夾把玻片夾歪了！我們回到「撥開標本夾」再試一次。</span>';
      failT = setTimeout(() => { failT = 0; if (W.on) go(STEPS.findIndex(x => x.id === 'clipA')); }, 2600);
      return;
    }
    if (st.manual || done[W.i] || !st.check) return;
    let ok = false; try { ok = st.check(); } catch (e) { }
    if (!ok) return;
    done[W.i] = true; status();
    const m = box.querySelector('.wiz-mascot'); m.classList.remove('bounce'); void m.offsetWidth; m.classList.add('bounce');
    const i = W.i;
    advTimer = setTimeout(() => { if (W.on && W.i === i) go(i + 1); }, 1700);
  }
  async function demo() {
    const st = STEPS[W.i]; if (!st.demo) return;
    stats.demos++;
    const btn = box.querySelector('[data-a=demo]'); btn.disabled = true;
    NE.hands.hold(true);
    try { await st.demo(); } catch (e) { }
    NE.hands.hold(false);
    btn.disabled = false;
    NE.hands.set(STEPS[W.i].hands || null);
    check();
  }

  W.go = i => go(i);
  NE.initWizard = function () {
    buildBar();
    const cb = NE.$('#cam-btns');
    const fsb = NE.h('button', { title: '3D 區全螢幕' }, '⛶ 全螢幕'); fsb.onclick = () => FS.toggle(); cb.appendChild(fsb);
    const wb = NE.h('button', { class: 'wiz-start', title: '操作說明精靈：一步一步帶你操作' }, '🎓 操作教學精靈'); wb.onclick = () => W.on ? W.stop() : W.start(); cb.appendChild(wb);
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && FS.on && !document.fullscreenElement) FS.exit(); });
  };
})(window.NE);
