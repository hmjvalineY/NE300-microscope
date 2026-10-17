/* 顯微鏡狀態、光學參數與操作動作（依 TEKFAR NE300 規格） */
(function (NE) {
  // NE300 標準配件物鏡（PDF 規格）
  NE.OBJ = [
    { mag: 4, na: 0.10, wd: 28000, name: 'PLAN 4X', ring: '#d8343a', len: 1.7 },
    { mag: 10, na: 0.25, wd: 7400, name: 'PLAN 10X', ring: '#e9c21f', len: 3.76 },
    { mag: 40, na: 0.65, wd: 650, name: 'PLAN 40X', ring: '#38a2e0', len: 4.43 },
    { mag: 100, na: 1.25, wd: 140, name: 'PLAN 100X (油鏡)', ring: '#f4f4f4', len: 4.49, oil: true }
  ];
  NE.EYE = { mag: 10, fn: 20 };          // 10X，視野數 FN = 20 mm
  NE.COARSE_PER_TURN = 37700;           // µm / 圈
  NE.FINE_PER_TURN = 200;               // µm / 圈（100 格，每格 2 µm）
  NE.STAGE_TRAVEL = { x: 37, y: 15 };   // 行程 74 × 30 mm → ±37, ±15
  NE.FOCUS_MAX = 14000, NE.FOCUS_MIN = -2500, NE.FOCUS_LOCK = -400;
  NE.USER_IPD = 62;                     // 模擬「學生的」雙眼瞳距

  // 每台顯微鏡的物鏡實際倍率會有小誤差 → 每次開啟隨機抽一組（皆有可讀的重合刻度）
  const CAL_CHOICES = [
    [{ oc: 40, st: 100 }, { oc: 41, st: 100 }, { oc: 39, st: 100 }],
    [{ oc: 100, st: 100 }, { oc: 49, st: 50 }, { oc: 50, st: 49 }],
    [{ oc: 40, st: 10 }, { oc: 39, st: 10 }, { oc: 41, st: 10 }],
    [{ oc: 100, st: 10 }, { oc: 49, st: 5 }, { oc: 51, st: 5 }]
  ];
  NE.settings = Object.assign({ realErr: true }, NE.store.get('settings', {}));
  let seed = NE.store.get('seed', null);
  if (seed == null) { seed = (Math.random() * 1e9) | 0; NE.store.set('seed', seed); }
  NE.seed = seed;
  function buildCal() {
    const r = NE.rng(NE.seed ^ 0x5bd1e995);
    NE.CAL = CAL_CHOICES.map((arr, i) => {
      const c = NE.settings.realErr ? arr[1 + Math.floor(r() * 2)] : arr[0];
      const um = c.st * 10 / c.oc;                // 目鏡測微器每格實際長度 µm
      return { um, oc: c.oc, st: c.st, magEff: 100 / um };
    });
  }
  buildCal();
  NE.rebuildCal = buildCal;
  // 三色絲線上下順序（隨機）
  (function () {
    const r = NE.rng(NE.seed ^ 0x1234);
    const a = [0, 1, 2];
    for (let i = 2; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    NE.threadOrder = a;          // a[k] = 第 k 層（0 最下）是哪一色
  })();

  const S = NE.S = {
    power: false, bright: 0, aperture: 0.25, obj: 0,
    focusZ: 12000,            // 焦平面相對於標本面的位置（µm）；正值＝載物台較低
    stageX: 0, stageY: 0,     // mm
    slide: null, place: { dx: 0, dy: 0, rot: 0 }, clip: false, clipOpen: false, seat: 1,
    reticle: false, eyeRot: 0, ipd: 70,
    oil: false, oilOn40: false, lock: false, cracked: false,
    coarseAng: 0, fineAng: 0, xAng: 0, yAng: 0, brightAng: 0,
    usedCoarseSinceObj: false, lastFocusDir: 0, powerOnBright: 0,
    target: null, time: 0
  };
  NE.userCal = NE.store.get('userCal', [null, null, null, null]);

  NE.spec = function () { return S.slide ? NE.getSlide(S.slide) : null; };

  // ---- 光學計算 ----
  NE.optics = function () {
    const o = NE.OBJ[S.obj];
    const cal = NE.CAL[S.obj];
    const mag = cal.magEff;
    const oilBad = o.oil && !S.oil && S.slide;
    let NAo = o.na;
    if (oilBad) NAo = 0.9;
    const NAc = Math.min(S.aperture, NAo);
    const NAe = (NAo + NAc) / 2;
    const DOF = 0.55 / (NAe * NAe) + 7 / (mag * NAe);      // µm
    const res = 1.22 * 0.55 / (NAo + NAc);                 // µm（解析度）
    const ratio = NE.clamp(S.aperture / NAo, 0, 1);
    const phaseVis = 0.16 + 0.84 * Math.pow(1 - ratio, 1.25);
    const illum = Math.pow((NAc * NAc / (mag * mag)) / (0.01 / 16), 0.75);
    let E = S.power ? Math.pow(S.bright / 100, 1.6) * 4 * illum : 0;
    if (oilBad) E *= 0.55;
    let extraBlur = 0;
    if (oilBad) extraBlur = 7;
    if (S.oilOn40 && S.obj === 2) extraBlur = 5;
    return {
      o, mag, NAo, NAc, NAe, DOF, res, ratio, phaseVis, E, illum, oilBad, extraBlur,
      fovUm: NE.EYE.fn * 1000 / mag, umPerDiv: cal.um, total: o.mag * NE.EYE.mag
    };
  };

  NE.coverTop = function () { const sp = NE.spec(); return sp ? sp.coverTop : -1000 - 170; };
  // 物鏡前端與蓋玻片（或載物台）的距離 µm
  NE.gap = function (fz = S.focusZ, obj = S.obj) {
    const wd = NE.OBJ[obj].wd;
    const sp = NE.spec();
    if (sp) return wd + fz - (sp.coverTop - 170);
    return wd + fz + 1000 + 170;
  };
  NE.inFocus = function (tol = 0.5) {
    const sp = NE.spec(); if (!sp) return false;
    const O = NE.optics();
    return Math.abs(S.focusZ - sp.mainZ) <= Math.max(O.DOF * tol, (sp.mainDepth || 0) / 2 + O.DOF * tol);
  };

  let dirtyFlag = true;
  NE.dirty = () => { dirtyFlag = true; };
  NE.takeDirty = () => { const d = dirtyFlag; dirtyFlag = false; return d; };
  function changed(what) { dirtyFlag = true; NE._eyeStale = true; NE.emit('change', what); }
  NE.changed = changed;

  // ---- 動作 ----
  let lastWarn = 0;
  function applyFocus(dz, kind) {
    if (!dz) return;
    const min = S.lock ? NE.FOCUS_LOCK : NE.FOCUS_MIN;
    let nz = NE.clamp(S.focusZ + dz, min, NE.FOCUS_MAX);
    if (nz === min && dz < 0 && S.focusZ > min + 1) NE.toast(S.lock ? '已到「上限位鎖定」的高度，載物台無法再上升' : '載物台已升到最高', '', 1800);
    if (S.slide && NE.gap(nz) < 0) {
      // 撞片
      const zTouch = S.focusZ - NE.gap(S.focusZ);
      S.focusZ = zTouch + 2;
      crash('focus');
      changed('focus');
      return;
    }
    S.lastFocusDir = Math.sign(nz - S.focusZ);
    S.focusZ = nz;
    if (kind === 'coarse') {
      S.usedCoarseSinceObj = true;
      if (S.obj >= 2 && performance.now() - lastWarn > 4000) {
        lastWarn = performance.now();
        NE.toast('⚠ 高倍物鏡（40X/100X）下請只用「細調節輪」，粗調節輪一轉就 37.7 mm，很容易撞破玻片！', 'warn', 4000);
      }
    }
    changed('focus');
  }
  NE.turnCoarse = function (rad) {
    S.coarseAng += rad;
    applyFocus(-rad / (2 * Math.PI) * NE.COARSE_PER_TURN, 'coarse');
  };
  NE.turnFine = function (rad) {
    S.fineAng += rad;
    applyFocus(-rad / (2 * Math.PI) * NE.FINE_PER_TURN, 'fine');
  };
  NE.moveStage = function (dxmm, dymm) {
    const ox = S.stageX, oy = S.stageY;
    S.stageX = NE.clamp(S.stageX + dxmm, -NE.STAGE_TRAVEL.x, NE.STAGE_TRAVEL.x);
    S.stageY = NE.clamp(S.stageY + dymm, -NE.STAGE_TRAVEL.y, NE.STAGE_TRAVEL.y);
    if (S.slide && !S.clip) {
      // 沒夾好 → 玻片留在原地（相對載物台滑動）
      S.place.dx -= S.stageX - ox; S.place.dy -= S.stageY - oy;
      if (performance.now() - lastWarn > 3000) { lastWarn = performance.now(); NE.toast('玻片沒有用標本夾夾好，移動載物台時玻片沒有跟著動！', 'warn'); }
    }
    S.xAng += (S.stageX - ox) * 0.6; S.yAng += (S.stageY - oy) * 0.6;
    changed('stage');
  };
  NE.setBright = function (v) {
    const nv = NE.clamp(Math.round(v * 10) / 10, 0, 100);
    S.brightAng += (nv - S.bright) * 0.05;
    S.bright = nv; changed('bright');
  };
  NE.setAperture = function (v) { S.aperture = NE.clamp(v, 0.05, 1.25); changed('aperture'); };
  NE.setPower = function (on) {
    if (on === S.power) return;
    S.power = on;
    if (on) {
      S.powerOnBright = S.bright;
      if (S.bright > 30) NE.toast('提醒：開電源前應先把亮度調到最低，避免強光刺眼，也保護 LED。', 'warn', 4200);
    } else {
      S.powerOffBright = S.bright;
    }
    changed('power');
  };
  NE.setObj = function (i) {
    if (i === S.obj) return true;
    if (S.slide && NE.gap(S.focusZ, i) < 0) {
      crash('switch', i);
      return false;
    }
    const from = S.obj;
    S.obj = i; S.usedCoarseSinceObj = false;
    if (i === 3 && !S.oil && S.slide) NE.toast('100X 是「油鏡」：必須在蓋玻片上滴一滴浸潤油，否則影像模糊又昏暗。', 'warn', 4500);
    if (i === 2 && S.oil && from === 3) {
      S.oilOn40 = true;
      NE.toast('⚠ 40X 物鏡轉過浸潤油，前端沾到油了！影像變得模糊。用完油鏡應轉回低倍，並用拭鏡紙擦乾淨。', 'bad', 5000);
    }
    changed('obj');
    return true;
  };
  NE.setReticle = function (on) { S.reticle = on; changed('reticle'); };
  NE.setEyeRot = function (deg) { S.eyeRot = ((deg % 360) + 360) % 360; changed('eyeRot'); };
  NE.setIPD = function (v) { S.ipd = NE.clamp(v, 48, 75); changed('ipd'); };
  // 活動標本夾（彈簧回彈）：左手撥開 → 右手把玻片推到最裡面 → 放開
  NE.UNSEAT_MM = 8;                     // 玻片沒推到底時，離後方擋板的距離
  NE.slideOff = () => ({ x: S.place.dx, y: S.place.dy - (1 - S.seat) * NE.UNSEAT_MM });
  NE.openClip = function (open) {
    if (open === S.clipOpen) return;
    S.clipOpen = open;
    if (open) { S.clip = false; if (S.badSeat) { S.place.rot -= S.badSeat; S.badSeat = 0; } }
    else if (S.slide) {
      if (S.seat >= 0.95) { S.seat = 1; S.clip = true; NE.toast('標本夾彈回，把玻片牢牢夾住了 ✓', 'ok', 2200); }
      else {
        S.clip = false; S.badSeat = 6; S.place.rot += S.badSeat;
        NE.toast('⚠ 玻片沒有推到最裡面（還差約 8 mm）！標本夾彈回時把玻片夾歪了，玻片沒有被夾住，標本也不在通光孔上。請再撥開標本夾，把玻片推到底。', 'bad', 5500);
      }
    }
    changed('clip');
  };
  NE.pushSlide = function (d) {
    if (!S.slide) return;
    if (!S.clipOpen) { if (performance.now() - (NE._pw || 0) > 2500) { NE._pw = performance.now(); NE.toast('標本夾彈著，推不進去：要先用左手把活動標本夾撥開'); } return; }
    const was = S.seat;
    S.seat = NE.clamp(S.seat + d, 0, 1);
    if (was < 0.95 && S.seat >= 0.95) { S.seat = 1; NE.toast('玻片已推到最裡面，靠緊後方擋板 ✓', 'ok', 2200); }
    changed('seat');
  };
  // 舊介面：直接「夾好」或「放開」
  NE.setClip = function (on) {
    if (!S.slide) { NE.toast('載物台上還沒有玻片'); return; }
    if (on) { if (S.badSeat) { S.place.rot -= S.badSeat; S.badSeat = 0; } S.seat = 1; S.clipOpen = false; S.clip = true; }
    else { S.clipOpen = true; S.clip = false; }
    changed('clip');
  };
  NE.setOil = function (on) {
    if (on && !S.slide) { NE.toast('請先放上玻片'); return; }
    S.oil = on; changed('oil');
  };
  NE.cleanObjective = function () { S.oilOn40 = false; changed('oil'); NE.toast('已用拭鏡紙沾少量清潔液擦淨 40X 物鏡', 'ok'); };

  NE.loadSlide = function (id, opts = {}) {
    const sp = NE.getSlide(id);
    if (!sp) return;
    if (S.slide && NE.gap(S.focusZ) < 3000 && !opts.force) {
      // 取放玻片前應先降下載物台
    }
    S.slide = id;
    const r = Math.random;
    const off = opts.centered ? 0 : 1;
    S.place = {
      dx: opts.dx != null ? opts.dx : (r() - 0.5) * 6 * off,
      dy: opts.dy != null ? opts.dy : (r() - 0.5) * 4 * off,
      rot: opts.rot != null ? opts.rot : (sp.rotJitter || 1.2) * (r() * 2 - 1)
    };
    S.clip = !!opts.clip; S.badSeat = 0;
    S.seat = opts.clip ? 1 : 0;
    if (opts.clip) S.clipOpen = false;
    else if (!S.clipOpen && !opts.quiet) NE.toast('玻片放在載物台上了，但還沒放進標本夾：先用左手撥開活動標本夾，再把玻片推到最裡面。', 'warn', 4500);
    S.cracked = false; S.oil = false; S.target = null;
    if (S.focusZ < NE.FOCUS_MIN + 1) S.focusZ = 5000;
    // 若目前高度放入玻片會壓到物鏡，強制降低
    if (NE.gap(S.focusZ) < 300) S.focusZ = Math.max(S.focusZ, -NE.OBJ[S.obj].wd + (sp.coverTop - 170) + 3000);
    changed('slide');
  };
  NE.removeSlide = function () {
    if (!S.slide) return;
    if (NE.gap(S.focusZ) < 1500) NE.toast('取下玻片前，應先降低載物台並轉回低倍物鏡，避免刮傷鏡頭。', 'warn');
    S.slide = null; S.clip = false; S.oil = false; S.target = null; S.cracked = false; S.seat = 1; S.badSeat = 0;
    changed('slide');
  };

  function crash(kind, toObj) {
    const o = NE.OBJ[toObj != null ? toObj : S.obj];
    const high = o.mag >= 40;
    if (high) S.cracked = true;
    NE.emit('crash', { kind, obj: o });
    const how = kind === 'switch'
      ? `轉換到 <b>${o.name}</b> 時，物鏡前端碰到了玻片。這是因為載物台位置太高（物鏡與蓋玻片的距離小於此物鏡的工作距離 ${o.wd >= 1000 ? (o.wd / 1000) + ' mm' : o.wd / 1000 + ' mm'}）。`
      : `使用 <b>${o.name}</b> 時把載物台升得太高，物鏡前端壓到了蓋玻片。`;
    NE.modal('💥 物鏡撞到玻片了！', `<p>${how}</p>${high ? '<p>蓋玻片已經<b>破裂</b>，請換一片新的玻片（玻片盒 → 重新放置）。</p>' : ''}
      <div class="tip"><b>正確做法：</b><br>① 先用低倍物鏡對焦，再轉換高倍（NE300 物鏡「齊焦」，換高倍後只需細調）。<br>
      ② 上升載物台時要<b>從側面注視</b>物鏡與玻片的距離。<br>③ 高倍物鏡下只使用<b>細調節輪</b>。<br>
      ④ NE300 有「上限位鎖定」，可設定載物台的最高位置，防止撞片。</div>`);
    changed('crash');
  }
  NE.crash = crash;

  NE.saveUserCal = function () { NE.store.set('userCal', NE.userCal); };
})(window.NE);
