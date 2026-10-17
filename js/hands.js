/* 教學用 3D 雙手：握旋鈕、轉動、按壓、推動等姿勢與動畫 */
(function (NE) {
  const T = THREE;
  const SC = 0.74;                 // 手的比例（真實大小約 18 cm）
  const TIP = 11.2 * SC;           // 掌心到食指指尖距離
  const FINGERS = [                // x 位置、各節長度（右手：拇指在 -x）
    { x: -2.6, len: [3.0, 2.3, 1.9], y0: 4.0 },
    { x: -0.85, len: [3.3, 2.5, 2.0], y0: 4.2 },
    { x: 0.9, len: [3.1, 2.4, 1.9], y0: 4.0 },
    { x: 2.55, len: [2.5, 1.9, 1.6], y0: 3.5 }
  ];

  function makeHand(left) {
    const g = new T.Group(), inner = new T.Group(); g.add(inner);
    inner.scale.set(left ? -SC : SC, SC, SC);
    const skin = new T.MeshStandardMaterial({ color: 0xf0c4a2, roughness: 0.6, metalness: 0, transparent: true, opacity: 0.88 });
    const coat = new T.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, transparent: true });
    const add = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
    const palm = add(new T.SphereGeometry(1, 28, 18), skin, inner); palm.scale.set(3.8, 4.3, 1.3);
    const joints = [];
    FINGERS.forEach((f, i) => {
      let parent = new T.Group(); parent.position.set(f.x, f.y0 - 0.6, 0); inner.add(parent);
      const chain = [];
      f.len.forEach((L, j) => {
        const r = 0.82 - j * 0.08;
        const j0 = j === 0 ? parent : new T.Group();
        if (j > 0) { j0.position.y = f.len[j - 1]; parent.add(j0); }
        add(new T.CapsuleGeometry(r, Math.max(0.1, L - r), 4, 10), skin, j0, 0, L / 2);
        chain.push(j0); parent = j0;
      });
      joints.push(chain);
    });
    // 拇指
    const tb = new T.Group(); tb.position.set(-3.0, -1.2, -0.5); tb.rotation.set(-0.3, 0, 0.95); inner.add(tb);
    add(new T.CapsuleGeometry(1.0, 2.0, 4, 10), skin, tb, 0, 1.4);
    const t2 = new T.Group(); t2.position.y = 2.8; tb.add(t2);
    add(new T.CapsuleGeometry(0.86, 1.6, 4, 10), skin, t2, 0, 1.2);
    // 實驗衣袖口
    add(new T.CylinderGeometry(3.3, 3.6, 7, 24), coat, inner, 0, -7.6, 0.2);
    add(new T.TorusGeometry(3.3, 0.35, 8, 24), coat, inner, 0, -4.2, 0.2).rotation.x = Math.PI / 2;
    function setGrip(gr, mode) {
      joints.forEach((ch, i) => ch.forEach((jt, j) => {
        let a = gr * [1.05, 1.25, 0.95][j];
        if (mode === 'point' && i === 0) a = 0.05;
        if (mode === 'point' && i > 0) a = [1.4, 1.5, 1.1][j];
        jt.rotation.x = -a;
      }));
      tb.rotation.x = -0.3 - (mode === 'point' ? 0.9 : gr * 0.7);
      t2.rotation.x = -(mode === 'point' ? 0.6 : gr * 0.5);
    }
    setGrip(0.3);
    return { g, setGrip, mat: skin, coat };
  }

  const tmpM = new T.Matrix4();
  function quatFrom(f, n) {      // 手指方向 f（local +y）、掌心朝向 n（local -z）
    const Y = f.clone().normalize();
    let Z = n.clone().negate();
    Z.addScaledVector(Y, -Z.dot(Y)).normalize();
    const X = new T.Vector3().crossVectors(Y, Z).normalize();
    tmpM.makeBasis(X, Y, Z);
    return new T.Quaternion().setFromRotationMatrix(tmpM);
  }
  // 握住圓柱（旋鈕、鏡筒）：c 中心、a 軸、r 半徑、u 手所在的徑向方向
  function gripCyl(c, a, r, u, spin, push, left) {
    a = a.clone().normalize();
    u = u.clone().addScaledVector(a, -u.dot(a)).normalize();
    if (spin) u.applyAxisAngle(a, spin);
    const p = c.clone().addScaledVector(u, r + 1.55 * SC);
    if (push) p.add(push);
    const f = new T.Vector3().crossVectors(a, u); if (left) f.negate();
    return { p, q: quatFrom(f, u.clone().negate()), grip: 0.62 };
  }
  // 用食指指尖按/推某一點：from 是手從哪個方向過來
  function point(target, from, down) {
    const f = from.clone().normalize().negate();
    let n = (down || new T.Vector3(0, -1, 0)).clone(); n.addScaledVector(f, -n.dot(f));
    if (n.lengthSq() < 1e-3) n.set(0, 0, -1);
    const p = target.clone().addScaledVector(f, -TIP);
    return { p, q: quatFrom(f, n.normalize()), grip: 1, mode: 'point' };
  }
  const V = (x, y, z) => new T.Vector3(x, y, z);
  // 繞旋鈕軸轉動整隻手（表現「轉動」）
  function around(c, a, ang, pose) {
    pose.p = c.clone().add(pose.p.clone().sub(c).applyAxisAngle(a, ang));
    pose.q = new T.Quaternion().setFromAxisAngle(a, ang).multiply(pose.q);
    return pose;
  }
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  // 靠近 → 操作 → 離開 → 停一下（讓零件露出來）
  const CYCLE = 4.6;
  function engage(t) {
    const u = t % CYCLE;
    return u < 0.8 ? ease(u / 0.8) : u < 3.0 ? 1 : u < 3.7 ? 1 - ease((u - 3.0) / 0.7) : 0;
  }
  NE.Hands = function (model) {
    const L = makeHand(true), R = makeHand(false);
    model.scene.add(L.g); model.scene.add(R.g);
    L.g.visible = R.g.visible = false;
    const st = { L: { p: V(-30, 20, 30), q: new T.Quaternion(), vis: 0 }, R: { p: V(30, 20, 30), q: new T.Quaternion(), vis: 0 } };
    let pose = null, t0 = performance.now() / 1000;
    const I = model.info;
    const sin = (t, w = 2.6) => Math.sin(t * w);
    // 姿勢庫：回傳 {L, R}，t 為秒
    const POSES = {
      carry: t => ({
        R: gripCyl(V(0, 19, -10.6), V(0, 1, 0), 5.0, V(-0.8, 0, -0.6)),
        L: { p: V(-12.4, 1.5 + 0.3 * sin(t, 1.5), 1), q: quatFrom(V(1, 0, 0.15), V(0, 1, 0)), grip: 0.2 }
      }),
      // 亮度鈕：手從顯微鏡正面伸過來，掌心貼著旋鈕外側，手指包住旋鈕
      bright: t => { const c = I.bright(); return { R: around(c, V(1, 0, 0), 0.32 * sin(t, 2.2), { p: c.clone().add(V(1.75, 0.45, 4.4)), q: quatFrom(V(0, 0.06, -1), V(-1, 0, 0)), grip: 0.55 }) }; },
      power: t => ({ R: point(I.power().add(V(0.35, 0.25, 0)).add(V(0.5 + 0.5 * sin(t, 4), 0, 0)), V(1, 0.25, 0.35)) }),
      nose: t => {
        const a = I.noseAxis, c = I.noseCenter();
        return { R: gripCyl(c, a, 4.2, V(0.85, 0, 0.5), 0.3 * sin(t, 1.8)) };
      },
      // 左手撥開並按住活動標本夾（不離開）
      clipOpen: t => ({ L: Object.assign(point(I.clip().add(V(-0.15 * (0.5 + 0.5 * sin(t, 2.5)), 0.12, 0)), V(-0.35, 1, 0.55)), { hold: true }) }),
      // 右手拿玻片放進去（左手按住標本夾）
      slidePlace: t => {
        const k = (t % 3.2) / 3.2, h = Math.max(0, 1 - k * 1.7) * 6;
        return {
          L: Object.assign(point(I.clip().add(V(0, 0.12, 0)), V(-0.35, 1, 0.55)), { hold: true }),
          R: point(I.slide().add(V(2.4, 0.12 + h, 1.0 + h * 0.6)), V(0.45, 1, 0.7))
        };
      },
      // 右手把玻片往裡推到底（左手按住標本夾）
      slidePush: t => ({
        L: Object.assign(point(I.clip().add(V(0, 0.12, 0)), V(-0.35, 1, 0.55)), { hold: true }),
        R: point(I.slide().add(V(0.8, 0.07, 1.32 + 0.35 * (0.5 + 0.5 * sin(t, 3)))), V(0.15, 0.45, 1))
      }),
      // 左手慢慢放開，讓夾臂彈回
      clipRelease: t => ({ L: Object.assign(point(I.clip().add(V(0.25 * ease((t % 3) / 2), 0.12 + 1.6 * ease(((t % 3) - 2) / 0.8), 0)), V(-0.35, 1, 0.55)), { hold: true }) }),
      clip: t => ({ L: point(I.clip().add(V(-0.2 * (0.5 + 0.5 * sin(t, 3)), 0.12, 0)), V(-0.35, 1, 0.55)) }),
      slide: t => {
        const k = (t % 3) / 3, h = Math.max(0, 1 - k * 1.6) * 7;
        return { R: point(I.slideLabel().add(V(0, 0.3 + h, 0)), V(0.4, 1, 0.6)) };
      },
      xy: t => ({ R: gripCyl(I.knobY().add(V(0, -0.8, 0)), V(0, 1, 0), 1.3, V(0.75, 0, 0.66), 0.45 * sin(t, 2)) }),
      coarse: t => ({ R: gripCyl(I.coarse(), V(1, 0, 0), 3.1, V(0, 0.42, 0.9), 0.4 * sin(t, 1.8)) }),
      coarseUp: t => ({ R: gripCyl(I.coarse(), V(1, 0, 0), 3.1, V(0, 0.42, 0.9), -0.25 - 0.25 * (0.5 + 0.5 * sin(t, 2))) }),
      fine: t => ({ R: gripCyl(I.fine(), V(1, 0, 0), 1.7, V(0, 0.42, 0.9), 0.35 * sin(t, 2.2)) }),
      tubes: t => {
        const d = I.tubeDir, s = 0.45 * sin(t, 2);
        return {
          L: gripCyl(I.tube(-1), d, 1.45, V(-1, 0.15, 0), 0, V(-s, 0, 0), true),
          R: gripCyl(I.tube(1), d, 1.45, V(1, 0.15, 0), 0, V(s, 0, 0))
        };
      },
      aperture: t => ({ L: point(I.lever().add(V(0.9 * sin(t, 1.6), 0.15, 0.25)), V(-0.85, 0.2, 0.55)) }),
      eyeRot: t => ({ R: gripCyl(I.eyepc(1), I.tubeDir, 1.7, V(1, 0.3, 0), 0.35 * sin(t, 2)) })
    };
    function set(name) {
      pose = name ? POSES[name] : null; t0 = performance.now() / 1000;
    }
    let holdAll = false;
    const tmpV = new T.Vector3();
    model.hooks.push((dt, now) => {
      const t = now - t0;
      const tgt = pose ? pose(t) : {};
      const userBusy = performance.now() - (NE.handsAway || 0) < 2200;
      let moving = false;
      [['L', L], ['R', R]].forEach(([k, h]) => {
        const s = st[k], g = tgt[k];
        const want = g ? 1 : 0;
        s.vis += (want - s.vis) * (1 - Math.exp(-dt * 6));
        if (g) {
          // 靠近／離開
          let e = (g.hold || holdAll) ? 1 : engage(t);
          if (userBusy) e = 0;
          s.e = s.e == null ? e : s.e + (e - s.e) * (1 - Math.exp(-dt * (userBusy ? 10 : 8)));
          const away = tmpV.set(0, -12, 7).applyQuaternion(g.q);      // 沿手臂往後退、離開零件表面
          const target = g.p.clone().addScaledVector(away, 1 - s.e);
          if (s.vis < 0.05) { s.p.copy(target).add(V(k === 'L' ? -12 : 12, 10, 14)); s.q.copy(g.q); }
          const kk = 1 - Math.exp(-dt * 9);
          s.p.lerp(target, kk); s.q.slerp(g.q, kk);
          h.setGrip(g.mode === 'point' ? 1 : g.grip * (0.35 + 0.65 * s.e), g.mode);
        }
        h.g.visible = s.vis > 0.03;
        h.g.position.copy(s.p); h.g.quaternion.copy(s.q);
        const fade = Math.min(1, s.vis * 1.2) * (0.3 + 0.7 * (s.e == null ? 1 : s.e));
        h.mat.opacity = 0.88 * fade; h.coat.opacity = fade;
        if (h.g.visible) moving = true;
      });
      return moving;
    });
    function hold(on) { holdAll = on; }
    return { set, hold, POSES };
  };
})(window.NE);
