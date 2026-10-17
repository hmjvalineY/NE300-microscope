/* TEKFAR NE300 複式光學顯微鏡 3D 模型（單位：cm） */
(function (NE) {
  const T = THREE;
  const deg = Math.PI / 180;

  function rboxY(w, h, d, r) {           // 上視圓角、沿 y 擠出
    const b = Math.min(0.35, r * 0.6, h * 0.3);
    const W = w - 2 * b, D = d - 2 * b, rr = Math.max(0.02, r - b);
    const s = new T.Shape();
    s.moveTo(-W / 2 + rr, -D / 2); s.lineTo(W / 2 - rr, -D / 2); s.quadraticCurveTo(W / 2, -D / 2, W / 2, -D / 2 + rr);
    s.lineTo(W / 2, D / 2 - rr); s.quadraticCurveTo(W / 2, D / 2, W / 2 - rr, D / 2);
    s.lineTo(-W / 2 + rr, D / 2); s.quadraticCurveTo(-W / 2, D / 2, -W / 2, D / 2 - rr);
    s.lineTo(-W / 2, -D / 2 + rr); s.quadraticCurveTo(-W / 2, -D / 2, -W / 2 + rr, -D / 2);
    const g = new T.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 8 });
    g.translate(0, 0, -(h - 2 * b) / 2); g.rotateX(-Math.PI / 2);
    return g;
  }
  function gearGeo(r, w, teeth, depthFrac = 0.06, axis = 'x') {
    const s = new T.Shape();
    const n = teeth * 2;
    for (let i = 0; i <= n * 3; i++) {
      const a = i / (n * 3) * Math.PI * 2;
      const k = Math.cos(a * teeth) > 0 ? 1 : 1 - depthFrac;
      const x = Math.cos(a) * r * k, y = Math.sin(a) * r * k;
      i ? s.lineTo(x, y) : s.moveTo(x, y);
    }
    const b = Math.min(0.12, w * 0.15);
    const g = new T.ExtrudeGeometry(s, { depth: w - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.8, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -(w - 2 * b) / 2);
    if (axis === 'x') g.rotateY(Math.PI / 2); else g.rotateX(Math.PI / 2);
    return g;
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    t.userData = { canvas: c, draw };
    return t;
  }

  NE.Model = function (canvas, wrap) {
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new T.Scene();
    scene.background = new T.Color(0xe6eaf0);

    // 環境貼圖（讓金屬反光）
    (function () {
      const env = new T.Scene();
      const room = new T.Mesh(new T.BoxGeometry(100, 60, 100), new T.MeshBasicMaterial({ color: 0x9aa3ad, side: T.BackSide }));
      env.add(room);
      const panel = (w, h, x, y, z, ry, rx, c = 0xffffff) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m); };
      panel(60, 30, 0, 29, 0, 0, Math.PI / 2, 0xffffff);
      panel(30, 20, 49, 10, 0, -Math.PI / 2, 0, 0xf4f8ff);
      panel(30, 20, -49, 10, 10, Math.PI / 2, 0, 0xfff7ea);
      panel(40, 8, 0, -20, 49, Math.PI, 0, 0x55606c);
      const pm = new T.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(env, 0.03).texture;
    })();

    const camera = new T.PerspectiveCamera(30, 1, 1, 500);
    scene.add(new T.HemisphereLight(0xffffff, 0x7d8896, 0.55));
    const key = new T.DirectionalLight(0xffffff, 1.5);
    key.position.set(28, 60, 38); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 150 });
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03;
    scene.add(key);
    const fill = new T.DirectionalLight(0xdfe8ff, 0.45); fill.position.set(-40, 25, 10); scene.add(fill);

    const table = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshStandardMaterial({ color: 0xcfd6de, roughness: 0.92 }));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);

    const M = {
      white: new T.MeshStandardMaterial({ color: 0xf2f3f5, roughness: 0.36, metalness: 0.02 }),
      black: new T.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.55, metalness: 0.15 }),
      dark: new T.MeshStandardMaterial({ color: 0x2c2e33, roughness: 0.42, metalness: 0.35 }),
      rubber: new T.MeshStandardMaterial({ color: 0x121315, roughness: 0.9 }),
      chrome: new T.MeshStandardMaterial({ color: 0xd9dce1, roughness: 0.2, metalness: 1.0 }),
      steel: new T.MeshStandardMaterial({ color: 0xa9adb3, roughness: 0.35, metalness: 0.9 }),
      blue: new T.MeshStandardMaterial({ color: 0x2b4f92, roughness: 0.3, metalness: 0.15 }),
      glass: new T.MeshStandardMaterial({ color: 0xd9f0ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.38 }),
      lens: new T.MeshStandardMaterial({ color: 0x3d5a78, roughness: 0.05, metalness: 0.85 }),
      frost: new T.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.9 })
    };

    const root = new T.Group(); scene.add(root);
    const pickables = []; const partMats = {}; const partObjs = {};
    function P(mesh, part) {
      mesh.castShadow = true; mesh.receiveShadow = true;
      if (part) {
        mesh.userData.part = part; pickables.push(mesh);
        mesh.material = mesh.material.clone();
        (partMats[part] = partMats[part] || []).push(mesh.material);
        (partObjs[part] = partObjs[part] || []).push(mesh);
      }
      return mesh;
    }
    const mesh = (g, m, part) => P(new T.Mesh(g, m), part);

    // ====== 依 NE300 尺寸圖（右視圖 1:1 比例換算，單位 cm；光軸 x=0,z=2；z+ 為學生方向） ======
    const STAGE_TOP0 = 17.9, MOUNT_Y = 22.5;
    // 沿 x 擠出的側面輪廓：pts 為 [z,y] 或 ['q', cz, cy, z, y]（二次曲線）
    function extrudeX(pts, width, bev) {
      const s = new T.Shape();
      pts.forEach((p, i) => {
        if (p[0] === 'q') s.quadraticCurveTo(-p[1], p[2], -p[3], p[4]);
        else if (i === 0) s.moveTo(-p[0], p[1]); else s.lineTo(-p[0], p[1]);
      });
      const g = new T.ExtrudeGeometry(s, { depth: width - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 24 });
      g.rotateY(Math.PI / 2); g.translate(-(width - 2 * bev) / 2, 0, 0);
      return g;
    }
    function capsuleShape(w, h) {
      const r = w / 2, s = new T.Shape();
      s.moveTo(-r, -h / 2 + r); s.absarc(0, -h / 2 + r, r, Math.PI, Math.PI * 2); s.lineTo(r, h / 2 - r); s.absarc(0, h / 2 - r, r, 0, Math.PI);
      s.closePath(); return s;
    }

    // ---- 白色底座（前段，承托黑色光源座） ----
    const base = mesh(rboxY(20, 3.0, 17, 1.6), M.white, 'base'); base.position.set(0, 1.5, 2.1); root.add(base);
    [[-8.6, -5.4], [8.6, -5.4], [-8.6, 9.6], [8.6, 9.6], [-3.6, -16.6], [3.6, -16.6]].forEach(([x, z]) => { const f = mesh(new T.CylinderGeometry(0.8, 0.9, 0.3, 20), M.rubber); f.position.set(x, 0.1, z); root.add(f); });
    // ---- 黑色光源座（LCD 在前方斜面、光源口在頂端） ----
    const housing = mesh(extrudeX([[10.2, 2.9], [10.2, 3.5], [6.5, 6.6], ['q', 5.5, 7.3, 5.2, 8.1], ['q', 5.0, 8.6, 4.4, 8.6], [-5.2, 8.6], [-5.2, 2.9]], 10.2, 0.5), M.black, 'base');
    root.add(housing);
    const lcdTex = canvasTex(320, 220, () => { });
    const lcdG = new T.Group(); lcdG.position.set(0, 5.43, 8.75); lcdG.rotation.x = -50 * deg; root.add(lcdG);
    const lcdFrame = mesh(rboxY(5.4, 0.2, 3.9, 0.5), M.dark); lcdFrame.rotation.x = Math.PI / 2; lcdFrame.position.z = 0.0; lcdG.add(lcdFrame);
    const lcd = mesh(new T.PlaneGeometry(4.5, 3.05), new T.MeshBasicMaterial({ map: lcdTex, toneMapped: false }), 'lcd'); lcd.position.z = 0.115; lcdG.add(lcd);
    // 亮度旋鈕（光源座右側、靠前）
    const brightK = mesh(gearGeo(1.4, 1.1, 22, 0.07, 'x'), M.dark, 'bright'); brightK.position.set(6.15, 4.3, 4.6); root.add(brightK);
    // 電源開關（鏡臂右側後下方）
    const power = new T.Group(); power.position.set(4.85, 2.4, -15.0); root.add(power);
    const pw = mesh(new T.BoxGeometry(0.45, 1.3, 0.85), M.dark, 'power'); power.add(pw);
    const pwTop = mesh(new T.BoxGeometry(0.1, 0.4, 0.5), new T.MeshBasicMaterial({ color: 0x777777 }), 'power'); pwTop.position.set(0.25, 0.35, 0); power.add(pwTop);
    // 光源口（集光鏡）
    const port = mesh(new T.CylinderGeometry(2.9, 3.0, 0.7, 48), M.dark, 'light'); port.position.set(0, 9.45, 2); root.add(port);
    const portRing = mesh(new T.TorusGeometry(2.55, 0.18, 10, 48), M.black, 'light'); portRing.rotation.x = Math.PI / 2; portRing.position.set(0, 9.82, 2); root.add(portRing);
    const ledMat = new T.MeshStandardMaterial({ color: 0x9aa4ad, emissive: 0xfff4e2, emissiveIntensity: 0, roughness: 0.05, metalness: 0.3 });
    const led = mesh(new T.CircleGeometry(2.2, 48), ledMat, 'light'); led.rotation.x = -Math.PI / 2; led.position.set(0, 9.81, 2); root.add(led);

    // ---- 鏡臂（白色一體式 C 形，背面斜下、頂端前伸托住觀察筒） ----
    (function () {
      const g = extrudeX([[-4.9, 0.0], [-17.3, 0.0], ['q', -17.8, 0.0, -17.6, 1.4], [-13.7, 16.8], ['q', -11.6, 25.4, -11.0, 27.4], ['q', -10.8, 28.6, -9.6, 28.6],
        [6.6, 28.6], ['q', 7.0, 28.6, 7.0, 28.1], [7.0, 27.0], ['q', 7.0, 26.6, 6.6, 26.6], [-3.0, 26.6], ['q', -6.0, 26.6, -6.4, 24.2],
        [-7.5, 19.0], [-7.4, 11.6], ['q', -7.3, 8.4, -4.9, 8.4]], 9.6, 0.45);
      const arm = mesh(g, M.white, 'arm'); root.add(arm);
      // 前內側黑色導軌板（載物台升降處）
      const rail = mesh(rboxY(6.4, 12.6, 0.4, 0.3), M.black, 'arm'); rail.position.set(0, 17.9, -6.9); root.add(rail);
      // 背面黑色收線板
      const back = mesh(rboxY(6.6, 14.5, 0.55, 0.5), M.black, 'arm');
      back.position.set(0, 12.6, -15.75); back.rotation.x = 0.252; root.add(back);
      [[8.5], [16.5]].forEach(([y]) => { const h = mesh(new T.CylinderGeometry(0.35, 0.35, 1.0, 12), M.dark, 'arm'); h.rotation.x = Math.PI / 2 + 0.25; h.position.set(0, y, -16.6 + (y - 8.5) * 0.255); root.add(h); });
      // 藍色橢圓飾板（側面下方）
      const cg = new T.ExtrudeGeometry(capsuleShape(3.2, 11.2), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.08, bevelSegments: 2 });
      [1, -1].forEach(sx => {
        const gp = new T.Group(); gp.position.set(sx * 4.82, 6.9, -13.6); gp.rotation.x = 0.25; root.add(gp);
        const m = mesh(cg, M.blue, 'arm'); m.rotation.y = sx * Math.PI / 2; gp.add(m);
      });
      // 品牌字樣（懸臂側面）
      const logo = canvasTex(512, 110, (c, W, H) => {
        c.clearRect(0, 0, W, H); c.fillStyle = '#1f4f9c'; c.font = 'italic 900 78px Arial'; c.textBaseline = 'middle'; c.fillText('TEKFAR', 10, 50);
        c.fillStyle = '#5a6578'; c.font = '600 26px Arial'; c.fillText('NE300 複式光學顯微鏡', 14, 96);
      });
      [1, -1].forEach(sx => {
        const p = new T.Mesh(new T.PlaneGeometry(4.6, 1.0), new T.MeshBasicMaterial({ map: logo, transparent: true }));
        p.rotation.y = sx * Math.PI / 2; p.position.set(sx * 4.83, 27.6, -1.5); root.add(p);
      });
    })();

    // ---- 觀察筒（黑色，坐在懸臂上） ----
    const headGeo = extrudeX([[4.2, 28.6], [4.2, 30.0], [1.3, 37.9], ['q', 1.1, 38.5, 0.4, 38.5], [-7.0, 38.5], ['q', -7.7, 38.5, -7.9, 37.9], [-10.8, 30.4], [-10.6, 28.6]], 9.4, 0.5);
    (function () {   // 正面也做成上窄下寬：愈往上 x 愈收
      const pos = headGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setX(i, pos.getX(i) * (1 - 0.24 * NE.clamp((y - 28.6) / 9.9, 0, 1))); }
      headGeo.computeVertexNormals();
    })();
    const head = mesh(headGeo, M.black, 'head');
    root.add(head);
    // 三眼觀察筒：上方的相機接口（固定分光 50/50，沒有切換拉桿）
    const trin = new T.Group(); trin.position.set(0, 38.8, -3.3); root.add(trin);
    const tBase = mesh(new T.CylinderGeometry(2.3, 2.5, 0.9, 40), M.black, 'trinoc'); tBase.position.y = 0.2; trin.add(tBase);
    const tTube = mesh(new T.CylinderGeometry(2.0, 2.1, 3.2, 40), M.black, 'trinoc'); tTube.position.y = 2.5; trin.add(tTube);
    const tRing = mesh(gearGeo(2.25, 0.8, 40, 0.04, 'y'), M.dark, 'trinoc'); tRing.position.y = 3.2; trin.add(tRing);
    const tCap = mesh(new T.CylinderGeometry(1.75, 1.85, 0.6, 40), M.rubber, 'trinoc'); tCap.position.y = 4.4; trin.add(tCap);
    const tLens = mesh(new T.CircleGeometry(1.2, 32), M.lens, 'trinoc'); tLens.rotation.x = -Math.PI / 2; tLens.position.y = 4.71; trin.add(tLens);
    const lockScrew = mesh(new T.CylinderGeometry(0.45, 0.45, 1.0, 16), M.steel, 'head'); lockScrew.rotation.z = Math.PI / 2; lockScrew.position.set(5.2, 27.6, 4.6); root.add(lockScrew);
    const prism = mesh(rboxY(10.0, 3.8, 5.6, 1.6), M.black, 'head'); prism.position.set(0, 31.4, 4.6); prism.rotation.x = -0.47; root.add(prism);
    const hinge = new T.Vector3(0, 31.6, 6.0);
    const dir = new T.Vector3(0, Math.sin(27 * deg), Math.cos(27 * deg)).normalize();
    const down = new T.Vector3(0, -dir.z, dir.y);
    const qTube = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
    const hingeBody = mesh(new T.CylinderGeometry(1.9, 1.9, 5.2, 32), M.black, 'head');
    hingeBody.quaternion.copy(qTube); hingeBody.position.copy(hinge).addScaledVector(dir, 1.6); root.add(hingeBody);
    const TUBE_L = 7.5;
    const tubes = [];
    [-1, 1].forEach(side => {
      const g = new T.Group(); g.quaternion.copy(qTube); root.add(g);
      const part = side > 0 ? 'eyepiece' : 'eyepieceL';
      const tube = mesh(new T.CylinderGeometry(1.35, 1.5, TUBE_L, 32), M.black, 'tube'); tube.position.y = TUBE_L / 2; g.add(tube);
      const arm = mesh(new T.BoxGeometry(1.5, 5.0, 1.5), M.black, 'tube'); arm.position.set(0, 1.8, 0); g.add(arm);
      const ep = new T.Group(); ep.position.y = TUBE_L; g.add(ep);
      const body = mesh(new T.CylinderGeometry(1.65, 1.65, 2.6, 36), M.dark, part); body.position.y = 1.3; ep.add(body);
      const knurl = mesh(gearGeo(1.78, 0.7, 34, 0.04, 'y'), M.black, side < 0 ? 'diopter' : part); knurl.position.y = 0.6; ep.add(knurl);
      const cup = mesh(new T.LatheGeometry([new T.Vector2(1.3, 0), new T.Vector2(1.78, 0), new T.Vector2(1.86, 0.45), new T.Vector2(1.82, 1.1), new T.Vector2(1.55, 1.16), new T.Vector2(1.15, 1.0)], 36), M.rubber, part);
      cup.material.side = T.DoubleSide; cup.position.y = 2.6; ep.add(cup);
      const glass = mesh(new T.CircleGeometry(1.15, 32), M.lens, part); glass.rotation.x = -Math.PI / 2; glass.position.y = 3.6; ep.add(glass);
      if (side > 0) { const mark = mesh(new T.BoxGeometry(0.14, 0.8, 0.14), new T.MeshBasicMaterial({ color: 0xffffff }), part); mark.position.set(0, 1.4, 1.66); ep.add(mark); }
      tubes.push({ g, ep, side });
    });
    function placeTubes(ipd) {
      const L = 4.2, half = NE.clamp(ipd / 20, 2.3, 3.75);
      const phi = Math.asin(half / L);
      tubes.forEach(t => {
        t.g.position.copy(hinge).add(new T.Vector3(t.side * L * Math.sin(phi), 0, 0)).addScaledVector(down, L * Math.cos(phi) - 2.0);
      });
    }

    // ---- 旋轉盤（四孔內旋：盤面前低後高約 18°，物鏡朝鏡臂方向） ----
    const tilt = 18 * deg, rN = 2.5;
    const N = new T.Group(); N.position.set(0, MOUNT_Y + rN * Math.sin(tilt), 2 - rN * Math.cos(tilt)); N.rotation.x = tilt; root.add(N);
    const R = new T.Group(); N.add(R);
    const dome = mesh(new T.LatheGeometry([new T.Vector2(0.01, 0), new T.Vector2(3.8, 0), new T.Vector2(4.2, 0.18), new T.Vector2(4.14, 0.72), new T.Vector2(3.5, 1.7), new T.Vector2(2.0, 2.4), new T.Vector2(0.01, 2.5)], 64), M.dark, 'nosepiece');
    dome.material.side = T.DoubleSide; R.add(dome);
    const grip = mesh(gearGeo(4.25, 0.5, 50, 0.04, 'y'), M.black, 'nosepiece'); grip.position.y = 0.4; R.add(grip);
    const neck = mesh(new T.CylinderGeometry(1.7, 1.8, 1.8, 32), M.black, 'head'); neck.position.y = 2.9; N.add(neck);
    NE.OBJ.forEach((o, k) => {
      const g1 = new T.Group(); g1.rotation.y = k * Math.PI / 2; R.add(g1);
      const g2 = new T.Group(); g2.position.set(0, 0, rN); g2.rotation.x = -tilt; g1.add(g2);
      const L = o.len, tip = Math.min(1.0, L * 0.4);
      const prof = [[0.01, -L], [0.3, -L], [0.46, -L + 0.06], [0.66, -L + tip * 0.6], [0.92, -L + tip], [0.92, -0.35], [0.98, -0.35], [0.98, 0], [0.01, 0]].map(p => new T.Vector2(p[0], p[1]));
      const part = 'obj' + k;
      const body = mesh(new T.LatheGeometry(prof, 40), M.chrome, part); body.material.side = T.DoubleSide; g2.add(body);
      const ring = mesh(new T.CylinderGeometry(0.93, 0.93, 0.17, 40, 1, true), new T.MeshStandardMaterial({ color: o.ring, roughness: 0.35 }), part);
      ring.position.y = -L + tip + 0.1; g2.add(ring);
      if (k === 3) { const oil = mesh(new T.CylinderGeometry(0.925, 0.925, 0.12, 40, 1, true), M.black, part); oil.position.y = -L + tip + 0.32; g2.add(oil); }
      const lab = canvasTex(512, 64, (c, W, H) => {
        c.fillStyle = '#cfd3d8'; c.fillRect(0, 0, W, H); c.fillStyle = '#20242b'; c.font = 'bold 30px Arial'; c.textBaseline = 'middle';
        const t = `Plan ${o.mag}x/${o.na.toFixed(2)} ∞/0.17   `; c.fillText(t + t, 6, H / 2);
      });
      const bh = Math.min(0.5, Math.max(0.15, L - tip - 0.62));
      const band = mesh(new T.CylinderGeometry(0.925, 0.925, bh, 40, 1, true), new T.MeshStandardMaterial({ map: lab, metalness: 0.55, roughness: 0.32 }), part);
      band.position.y = -0.5 - bh / 2; g2.add(band);
      const fl = mesh(new T.CircleGeometry(0.27, 24), M.lens, part); fl.rotation.x = Math.PI / 2; fl.position.y = -L - 0.001; g2.add(fl);
    });

    // ---- 載物台（隨對焦上下移動；台面 180×130 mm） ----
    const stageG = new T.Group(); root.add(stageG);
    const plate = mesh(rboxY(18, 1.6, 12.6, 0.8), M.black, 'stage'); plate.position.set(0, -0.8, 0.3); stageG.add(plate);
    // 在 XZ 平面畫形狀、往上擠出厚度 d（底面在 y=0）
    function shapeXZ(build, d) {
      const sh = new T.Shape(); build(sh);
      const g = new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: Math.min(0.02, d / 4), bevelSize: 0.03, bevelSegments: 2, curveSegments: 16 });
      g.rotateX(Math.PI / 2); g.translate(0, d, 0); return g;
    }
    const holeG = shapeXZ(sh => { const w = 2.4, h = 1.05; sh.moveTo(-w + h, -h); sh.lineTo(w - h, -h); sh.absarc(w - h, 0, h, -Math.PI / 2, Math.PI / 2); sh.lineTo(-w + h, h); sh.absarc(-w + h, 0, h, Math.PI / 2, Math.PI * 1.5); }, 0.01);
    const hole = mesh(holeG, new T.MeshBasicMaterial({ color: 0x08090a }), 'stage'); hole.position.set(0, 0.002, 2); stageG.add(hole);
    const holeLens = mesh(new T.CircleGeometry(0.75, 32), M.lens, 'stage'); holeLens.rotation.x = -Math.PI / 2; holeLens.position.set(0, 0.016, 2); stageG.add(holeLens);
    const carrier = mesh(new T.BoxGeometry(12.5, 0.9, 9.5), M.black, 'stage'); carrier.position.set(0, -2.05, 0.4); stageG.add(carrier);
    const bracket = mesh(new T.BoxGeometry(6, 5.2, 1.6), M.dark, 'stage'); bracket.position.set(0, -3.0, -6.6); stageG.add(bracket);
    const vern = canvasTex(400, 70, (c, W, H) => {
      c.fillStyle = '#1b1c1f'; c.fillRect(0, 0, W, H); c.strokeStyle = '#e8e8e8'; c.fillStyle = '#e8e8e8'; c.lineWidth = 2;
      for (let i = 0; i <= 40; i++) { const x = 10 + i * 9.5; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, i % 10 === 0 ? 34 : i % 5 === 0 ? 24 : 16); c.stroke(); }
      c.font = '18px Arial'; for (let i = 0; i <= 4; i++) c.fillText(String(i * 10 + 50), 4 + i * 95, 58);
    });
    const vplate = new T.Mesh(new T.PlaneGeometry(4, 0.8), new T.MeshBasicMaterial({ map: vern })); vplate.position.set(5.5, -0.8, 6.62); stageG.add(vplate);
    // XY 同軸旋鈕（台下右側、偏後方）
    const shaft = mesh(new T.CylinderGeometry(0.3, 0.3, 4.6, 16), M.steel, 'knobY'); shaft.position.set(7.3, -4.4, -3.1); stageG.add(shaft);
    const knobY = mesh(gearGeo(1.25, 1.6, 20, 0.08, 'y'), M.dark, 'knobY'); knobY.position.set(7.3, -4.2, -3.1); stageG.add(knobY);
    const knobX = mesh(gearGeo(1.0, 1.5, 18, 0.08, 'y'), M.dark, 'knobX'); knobX.position.set(7.3, -6.0, -3.1); stageG.add(knobX);
    // 標本夾持器（隨 XY 移動；銀色金屬）
    const holder = new T.Group(); stageG.add(holder);
    // 固定夾：後方銀色薄板（玻片後緣靠著它）＋右側直角擋邊（玻片右端靠著它）＋向右伸出的圓頭舌片
    const fixedG = shapeXZ(sh => {
      sh.moveTo(-4.4, -3.5); sh.lineTo(4.9, -3.5); sh.quadraticCurveTo(5.2, -3.5, 5.2, -3.2); sh.lineTo(5.2, 0.0);
      sh.quadraticCurveTo(5.2, 0.4, 4.8, 0.4); sh.lineTo(4.3, 0.4); sh.quadraticCurveTo(3.9, 0.4, 3.9, 0.0);
      sh.lineTo(3.9, -1.32); sh.lineTo(-4.1, -1.32); sh.quadraticCurveTo(-4.4, -1.32, -4.4, -1.62); sh.closePath();
    }, 0.07);
    const fixedPlate = mesh(fixedG, M.steel, 'holder'); holder.add(fixedPlate);
    [[-0.4, -2.5], [1.9, -2.5]].forEach(([x, z]) => { const post = mesh(new T.CylinderGeometry(0.26, 0.26, 0.42, 16), M.chrome, 'holder'); post.position.set(x, 0.24, z); holder.add(post); });
    // 活動夾：支點（圓形凸鈕）在後方偏左，長臂斜向左前方，末端是圓形手指撥片；臂的內側邊壓住玻片左端
    const clipG = new T.Group(); clipG.position.set(-2.68, 0.075, -2.15); holder.add(clipG);
    const armG = shapeXZ(sh => {
      sh.moveTo(-0.62, -0.7); sh.lineTo(0.62, -0.7); sh.lineTo(0.62, 3.7); sh.quadraticCurveTo(1.35, 3.8, 1.4, 4.6); sh.quadraticCurveTo(1.4, 5.7, 0.0, 5.75);
      sh.quadraticCurveTo(-1.4, 5.7, -1.4, 4.6); sh.quadraticCurveTo(-1.35, 3.8, -0.62, 3.7); sh.closePath();
    }, 0.07);
    const clipArm = mesh(armG, M.chrome, 'clip'); clipArm.rotation.y = -0.744; clipG.add(clipArm);
    const clipPiv = mesh(new T.CylinderGeometry(0.8, 0.85, 0.38, 28), M.chrome, 'clip'); clipPiv.position.y = 0.19; clipG.add(clipPiv);
    const clipCap = mesh(new T.CylinderGeometry(0.3, 0.3, 0.42, 16), M.steel, 'clip'); clipCap.position.y = 0.3; clipG.add(clipCap);
    const clipTab = new T.Object3D(); clipTab.position.set(0, 0.1, 4.9); clipArm.add(clipTab);
    const slideG = new T.Group(); holder.add(slideG);
    const gapMat = new T.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.6, depthWrite: false });
    const gapBar = new T.Mesh(new T.BoxGeometry(7.0, 0.05, 1), gapMat); gapBar.position.y = 0.03; holder.add(gapBar);
    const slideGlass = mesh(new T.BoxGeometry(7.6, 0.1, 2.6), M.glass, 'slide'); slideGlass.position.y = 0.05; slideG.add(slideGlass);
    const slideLabel = mesh(new T.BoxGeometry(2.2, 0.104, 2.5), M.frost, 'slide'); slideLabel.position.set(-2.6, 0.05, 0); slideG.add(slideLabel);
    const specMat = new T.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.75, roughness: 0.6 });
    const spec = mesh(new T.CircleGeometry(0.75, 32), specMat, 'slide'); spec.rotation.x = -Math.PI / 2; spec.position.y = 0.102; slideG.add(spec);
    const cover = mesh(new T.BoxGeometry(2.2, 0.017, 2.2), M.glass, 'slide'); cover.position.y = 0.112; slideG.add(cover);
    const oilDrop = mesh(new T.SphereGeometry(0.35, 24, 12), new T.MeshStandardMaterial({ color: 0xffd36b, transparent: true, opacity: 0.7, roughness: 0.05 })); oilDrop.scale.set(1, 0.2, 1); oilDrop.position.y = 0.125; slideG.add(oilDrop);
    const cracks = new T.Group(); slideG.add(cracks);
    for (let i = 0; i < 5; i++) { const c = new T.Mesh(new T.BoxGeometry(1.1 + i * 0.1, 0.004, 0.025), new T.MeshBasicMaterial({ color: 0x222222 })); c.position.set(Math.cos(i * 1.25) * 0.3, 0.123, Math.sin(i * 1.25) * 0.3); c.rotation.y = i * 1.25 + 0.3; cracks.add(c); }
    // 聚光鏡＋孔徑光圈環（環上標有物鏡倍率，轉到與物鏡相同的刻度＝適當光圈）
    const cond = new T.Group(); cond.position.set(0, -2.5, 2); stageG.add(cond);
    const cbody = mesh(new T.LatheGeometry([new T.Vector2(0.01, -2.7), new T.Vector2(2.3, -2.7), new T.Vector2(2.5, -2.4), new T.Vector2(2.5, -1.6), new T.Vector2(2.7, -1.5), new T.Vector2(2.7, -0.5), new T.Vector2(2.4, -0.4), new T.Vector2(2.4, 0), new T.Vector2(0.01, 0)], 48), M.black, 'condenser');
    cbody.material.side = T.DoubleSide; cond.add(cbody);
    const AP_MARKS = [['4x', 0.075, '#e04848'], ['10x', 0.19, '#e9c21f'], ['20x', 0.30, '#3fbf5a'], ['40x', 0.49, '#4aa3e8'], ['60x', 0.64, '#4a6fe8'], ['100x', 0.94, '#f2f2f2']];
    NE.AP_MARKS = AP_MARKS;
    const apTex = canvasTex(1024, 96, (c, W, H) => {
      c.fillStyle = '#16171a'; c.fillRect(0, 0, W, H);
      AP_MARKS.forEach(([t, na, col], i) => {
        const deg0 = 30 * i, x = (deg0 / 360) * W;
        c.fillStyle = col; c.font = 'bold 34px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(t, x, 34); c.fillRect(x - 2, 60, 4, 26);
        if (x < 60) { c.fillText(t, x + W, 34); c.fillRect(x + W - 2, 60, 4, 26); }
      });
    });
    apTex.wrapS = T.RepeatWrapping;
    const apRing = mesh(new T.CylinderGeometry(3.4, 3.4, 1.0, 64, 1, true), new T.MeshStandardMaterial({ map: apTex, roughness: 0.5, side: T.DoubleSide }), 'aperture');
    apRing.position.y = -1.0; cond.add(apRing);
    const apCap = mesh(new T.RingGeometry(2.6, 3.4, 64), M.black, 'aperture'); apCap.rotation.x = -Math.PI / 2; apCap.position.y = -0.5; cond.add(apCap);
    const apIdx = mesh(new T.ConeGeometry(0.22, 0.4, 3), new T.MeshBasicMaterial({ color: 0xffffff }), 'condenser'); apIdx.rotation.x = Math.PI; apIdx.position.set(0, -1.75, 2.62); cond.add(apIdx);
    const apFront = new T.Object3D(); apFront.position.set(0, -1.0, 3.45); cond.add(apFront);
    const carm = mesh(new T.BoxGeometry(1.6, 0.8, 7.0), M.dark, 'condenser'); carm.position.set(0, -3.4, -2.0); stageG.add(carm);
    // 光圈 N.A → 光圈環轉角（各倍率刻度相隔 30°）
    function apAngleOf(na) {
      const P = [[0.05, -12]].concat(AP_MARKS.map(([t, n], i) => [n, 30 * i])).concat([[1.25, 180]]);
      for (let i = 0; i < P.length - 1; i++) if (na <= P[i + 1][0]) return P[i][1] + (P[i + 1][1] - P[i][1]) * (na - P[i][0]) / (P[i + 1][0] - P[i][0]);
      return 180;
    }
    NE.apMarkNow = function () {
      const a = apAngleOf(NE.S.aperture);
      const m = AP_MARKS.map((x, i) => [x[0], Math.abs(a - 30 * i)]).sort((p, q) => p[1] - q[1])[0];
      return m[1] < 6 ? m[0] : null;
    };

    // ---- 粗/細調節輪（同軸，光源座後方兩側；粗調直徑約 6 cm，細調在最外側並有刻度） ----
    const focusL = [], focusF = [];
    [1, -1].forEach(sx => {
      const g = new T.Group(); g.position.set(0, 6.2, -4.7); root.add(g);
      const boss = mesh(new T.CylinderGeometry(2.2, 2.3, 1.5, 40), M.dark, sx > 0 ? 'tension' : 'lock'); boss.rotation.z = Math.PI / 2; boss.position.x = sx * 6.3; g.add(boss);
      if (sx < 0) { const lk = mesh(new T.BoxGeometry(0.3, 0.6, 1.8), M.steel, 'lock'); lk.position.set(-6.3, 2.5, 0.6); g.add(lk); }
      const coarse = mesh(gearGeo(3.1, 2.0, 30, 0.06, 'x'), M.black, 'coarse'); coarse.position.x = sx * 8.05; g.add(coarse);
      const fine = mesh(gearGeo(1.7, 1.8, 24, 0.07, 'x'), M.dark, 'fine'); fine.position.x = sx * 9.95; g.add(fine);
      const sc = canvasTex(256, 256, (c, W, H) => {
        c.fillStyle = '#2c2e33'; c.fillRect(0, 0, W, H); c.strokeStyle = '#eee'; c.fillStyle = '#eee'; c.lineWidth = 2;
        for (let i = 0; i < 100; i += 2) { const a = i / 100 * Math.PI * 2; const r1 = 120, r2 = i % 10 === 0 ? 96 : 106; c.beginPath(); c.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); c.lineTo(128 + Math.cos(a) * r2, 128 + Math.sin(a) * r2); c.stroke(); }
        c.font = 'bold 15px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; c.fillText(String(i * 10), 128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80); }
      });
      const face = mesh(new T.CircleGeometry(1.6, 40), new T.MeshStandardMaterial({ map: sc, roughness: 0.5 }), 'fine');
      face.rotation.y = sx * Math.PI / 2; face.position.x = sx * 10.87; g.add(face);
      focusL.push(coarse); focusF.push(fine, face);
    });
    const torque = canvasTex(256, 64, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = '#e8e8e8'; c.font = 'bold 30px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TORQUE', W / 2, H / 2); });
    const tq = new T.Mesh(new T.PlaneGeometry(2.4, 0.6), new T.MeshBasicMaterial({ map: torque, transparent: true })); tq.rotation.y = Math.PI / 2; tq.position.set(5.62, 3.6, -1.8); root.add(tq);

    // ---- 光束 ----
    const beamMat = new T.MeshBasicMaterial({ color: 0xfff1cf, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false });
    const beam1 = new T.Mesh(new T.CylinderGeometry(1.6, 2.0, 1, 32, 1, true), beamMat); root.add(beam1);
    const beam2 = new T.Mesh(new T.CylinderGeometry(0.25, 0.6, 1, 24, 1, true), beamMat); root.add(beam2);

    // ---- LCD 畫面（實機為淺色背光：倍率、亮度格與數值） ----
    let lcdKey = '';
    function drawLCD() {
      const S = NE.S, O = NE.OBJ[S.obj];
      const k = [S.power, S.obj, Math.round(S.bright)].join();
      if (k === lcdKey) return; lcdKey = k;
      const c = lcdTex.userData.canvas.getContext('2d'), W = 320, H = 220;
      c.fillStyle = S.power ? '#d8e6e1' : '#101214'; c.fillRect(0, 0, W, H);
      if (S.power) {
        c.fillStyle = '#2e3a48'; c.font = 'italic 900 34px Arial'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText('TEKFAR', 70, 42);
        c.fillStyle = '#16a3c7'; c.beginPath(); c.arc(30, 112, 9, 0, 7); c.fill();
        c.fillStyle = '#1c232c'; c.font = 'bold 30px Arial'; c.fillText(O.mag + 'X', 48, 112);
        c.strokeStyle = '#1c232c'; c.lineWidth = 3; c.beginPath(); c.arc(270, 62, 13, Math.PI, 0); c.stroke();
        for (let i = 0; i < 5; i++) { const a = Math.PI + i * Math.PI / 4; c.beginPath(); c.moveTo(270 + Math.cos(a) * 18, 62 + Math.sin(a) * 18); c.lineTo(270 + Math.cos(a) * 25, 62 + Math.sin(a) * 25); c.stroke(); }
        const n = Math.round(S.bright / 10);
        for (let i = 0; i < 10; i++) { const h = 10 + i * 5.5; c.fillStyle = i < n ? '#1c232c' : 'rgba(28,35,44,0.18)'; c.strokeStyle = '#1c232c'; c.lineWidth = 1.5; c.fillRect(110 + i * 15, 190 - h, 11, h); c.strokeRect(110 + i * 15, 190 - h, 11, h); }
        c.fillStyle = '#1c232c'; c.font = '34px Arial'; c.textAlign = 'right'; c.fillText(String(Math.round(S.bright)), 305, 170);
      }
      lcdTex.needsUpdate = true;
    }

    // ---- 狀態同步 ----
    let stageY = STAGE_TOP0 - NE.S.focusZ / 10000, noseAng = 0, holdX = 0, holdZ = 2, apAng = 0, clipAng = 0, seatV = 1;
    let needs = true;
    NE.nosepieceMoving = false;
    function update(dt) {
      const S = NE.S;
      const k = 1 - Math.exp(-dt * 14);
      let moving = false;
      const ty = STAGE_TOP0 - S.focusZ / 10000;
      if (Math.abs(ty - stageY) > 1e-4) { stageY += (ty - stageY) * k; moving = true; }
      stageG.position.y = stageY;
      const tn = -S.obj * Math.PI / 2;
      let d = tn - noseAng; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) > 0.002) { noseAng += d * (1 - Math.exp(-dt * 7)); moving = true; }
      const was = NE.nosepieceMoving; NE.nosepieceMoving = Math.abs(d) > 0.06;
      if (was !== NE.nosepieceMoving) NE.dirty();
      R.rotation.y = noseAng;
      const hx = S.stageX / 10, hz = 2 - S.stageY / 10;
      if (Math.abs(hx - holdX) + Math.abs(hz - holdZ) > 1e-4) { holdX += (hx - holdX) * k; holdZ += (hz - holdZ) * k; moving = true; }
      holder.position.set(holdX, 0, holdZ);
      slideG.visible = !!S.slide;
      seatV += ((S.slide ? S.seat : 1) - seatV) * k;
      slideG.position.set(S.place.dx / 10, 0.0, -S.place.dy / 10 + (1 - seatV) * NE.UNSEAT_MM / 10);
      const gap = S.slide ? (1 - seatV) * NE.UNSEAT_MM / 10 : 0;
      gapBar.visible = gap > 0.03;
      if (gapBar.visible) { gapBar.scale.z = gap; gapBar.position.set(S.place.dx / 10, 0.03, -1.32 + gap / 2); gapMat.opacity = 0.4 + 0.3 * Math.sin(performance.now() / 180); moving = true; }
      slideG.rotation.y = S.place.rot * deg;
      oilDrop.visible = !!S.oil; cracks.visible = !!S.cracked;
      if (S.slide) { const info = NE.SLIDE_INFO[S.slide]; specMat.color.set(/^#/.test(info.dot) ? info.dot : '#8a7aa8'); }
      const ta = -apAngleOf(S.aperture) * deg;
      if (Math.abs(ta - apAng) > 1e-4) { apAng += (ta - apAng) * k; moving = true; }
      apRing.rotation.y = apAng;
      const tc = S.clipOpen ? -0.5 : !S.slide ? 0.07 : S.clip ? 0 : -0.1; if (Math.abs(tc - clipAng) > 1e-3) { clipAng += (tc - clipAng) * k; moving = true; }
      clipG.rotation.y = clipAng;
      focusL.forEach(m => m.rotation.x = S.coarseAng);
      focusF.forEach(m => m.rotation.x = S.fineAng);
      knobY.rotation.y = S.yAng; knobX.rotation.y = S.xAng;
      brightK.rotation.x = S.brightAng;
      pw.rotation.z = S.power ? 0.25 : -0.25; pwTop.material.color.set(S.power ? 0x38e07b : 0x666666);
      tubes[1].ep.rotation.y = S.eyeRot * deg;
      placeTubes(S.ipd);
      const lum = S.power ? Math.pow(S.bright / 100, 0.8) : 0;
      ledMat.emissiveIntensity = lum * 2.2;
      beamMat.opacity = lum * 0.13;
      const yb = 9.85, yt = stageY - 2.5 - 2.7;
      beam1.visible = beam2.visible = lum > 0.01;
      beam1.scale.y = Math.max(0.01, yt - yb); beam1.position.set(0, (yb + yt) / 2, 2);
      const tipY = MOUNT_Y - NE.OBJ[S.obj].len, sy = stageY + 0.18;
      beam2.scale.y = Math.max(0.01, tipY - sy); beam2.position.set(0, (sy + tipY) / 2, 2);
      beam2.visible = beam1.visible && !NE.nosepieceMoving && tipY > sy;
      drawLCD();
      return moving;
    }

    // ---- 相機 ----
    const orbit = new NE.Orbit(camera, canvas);
    orbit.target.set(0, 19, -1); orbit.r = 88; orbit.theta = 0.62; orbit.phi = 1.2; orbit.update();
    orbit.onChange = () => { needs = true; };
    const VIEWS = {
      front: [new T.Vector3(0, 19, -1), 88, 0.62, 1.2],
      side: [new T.Vector3(0, 18.8, 1), 34, Math.PI / 2, 1.5],
      top: [new T.Vector3(0, 18, 1), 66, 0.0, 0.25],
      back: [new T.Vector3(0, 19, -4), 86, Math.PI + 0.6, 1.2],
      stage: [new T.Vector3(3, 16, 2), 46, 0.75, 1.05]
    };
    const fitK = () => Math.max(1, 0.95 / (camera.aspect || 1));
    function view(name) { const v = VIEWS[name]; if (v) orbit.animateTo(v[0], v[1] * fitK(), v[2], v[3]); }
    function focusPart(part) {
      const objs = partObjs[part]; if (!objs) return;
      const box = new T.Box3(); objs.forEach(o => box.expandByObject(o));
      const c = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3()).length();
      orbit.animateTo(c, NE.clamp(size * 2.6, 16, 70), orbit.theta, NE.clamp(orbit.phi, 0.6, 1.45));
    }

    // ---- 選取 ----
    const ray = new T.Raycaster(), v2 = new T.Vector2();
    function pick(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      v2.set((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(v2, camera);
      const hits = ray.intersectObjects(pickables, false).filter(h => h.object.visible && (h.object.parent.visible !== false) && isShown(h.object));
      return hits.length ? hits[0].object.userData.part : null;
    }
    function isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
    let hover = null, flash = null;
    function setHover(part) {
      if (part === hover) return;
      const set = (p, on) => (partMats[p] || []).forEach(m => { if (m.emissive) { m.emissive.set(on ? 0x2f66e0 : 0x000000); m.emissiveIntensity = on ? 0.45 : 1; } });
      if (hover && hover !== flash) set(hover, false);
      hover = part; if (part) set(part, true);
      needs = true;
    }
    function highlight(part) {
      pulse = false;
      const set = (p, on) => (partMats[p] || []).forEach(m => { if (m.emissive) { m.emissive.set(on ? 0x18a058 : 0x000000); m.emissiveIntensity = on ? 0.55 : 1; } });
      if (flash) set(flash, false);
      flash = part; if (part) set(part, true);
      needs = true;
    }

    function resize() {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      const k0 = fitK();
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); needs = true;
      if (orbit) { orbit.r *= fitK() / k0; orbit.update(); }
    }
    new ResizeObserver(resize).observe(wrap); resize();
    let lastT = performance.now();
    function frame() {
      const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      const a = orbit.tick();
      const m = update(dt);
      let h = false;
      hooks.forEach(f => { if (f(dt, now / 1000)) h = true; });
      if (flash && pulse) {
        const k = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(now / 1000 * 6));
        (partMats[flash] || []).forEach(mt => { if (mt.emissive) mt.emissiveIntensity = k; });
        h = true;
      }
      if (needs || a || m || h || NE._modelDirty) { renderer.render(scene, camera); needs = false; NE._modelDirty = false; }
    }
    const hooks = [];
    let pulse = false;
    function pulseHighlight(part) { highlight(part); pulse = !!part; }
    function partCenter(part) {
      const objs = partObjs[part]; if (!objs) return null;
      const box = new T.Box3(); objs.forEach(o => { if (isShown(o)) box.expandByObject(o); });
      return box.isEmpty() ? null : box.getCenter(new T.Vector3());
    }
    function lookAt(target, r, theta, phi, ms) { orbit.animateTo(target, r * fitK(), theta == null ? orbit.theta : theta, phi == null ? orbit.phi : phi, ms); }
    const W = o => o.getWorldPosition(new T.Vector3());
    const info = {
      bright: () => W(brightK), coarse: () => W(focusL[0]), fine: () => W(focusF[0]),
      knobX: () => W(knobX), knobY: () => W(knobY), lever: () => W(apFront), clip: () => W(clipTab), power: () => W(pw),
      slideLabel: () => W(slideLabel), slide: () => W(slideG),
      tube: side => W(tubes[side > 0 ? 1 : 0].g).addScaledVector(dir, TUBE_L / 2), eyepc: side => W(tubes[side > 0 ? 1 : 0].g).addScaledVector(dir, TUBE_L + 1.3), tubeDir: dir.clone(),
      noseAxis: new T.Vector3(0, Math.cos(tilt), Math.sin(tilt)), noseCenter: () => N.position.clone().addScaledVector(new T.Vector3(0, Math.cos(tilt), Math.sin(tilt)), 0.4)
    };
    NE.on('change', () => { needs = true; });
    function hingeScreenX() {
      const v = hinge.clone().project(camera), r = canvas.getBoundingClientRect();
      return r.left + (v.x + 1) / 2 * r.width;
    }
    return { frame, view, focusPart, pick, hingeScreenX, hooks, pulseHighlight, partCenter, lookAt, info, fitK, setHover, highlight, orbit, camera, renderer, scene, invalidate: () => { needs = true; } };
  };
})(window.NE);
