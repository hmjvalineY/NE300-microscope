/* 簡易軌道相機控制：左鍵拖曳旋轉、右鍵/Shift 拖曳平移、滾輪縮放、雙指縮放 */
(function (NE) {
  NE.Orbit = function (camera, dom) {
    const self = this;
    this.target = new THREE.Vector3(0, 17, 1);
    this.r = 70; this.theta = 0.6; this.phi = 1.15;
    this.enabled = true; this.onChange = null;
    let anim = null;
    this.update = function () {
      const sp = Math.sin(this.phi);
      camera.position.set(
        this.target.x + this.r * sp * Math.sin(this.theta),
        this.target.y + this.r * Math.cos(this.phi),
        this.target.z + this.r * sp * Math.cos(this.theta));
      camera.lookAt(this.target);
      this.onChange && this.onChange();
    };
    this.animateTo = function (target, r, theta, phi, ms = 700) {
      let dth = theta - this.theta;
      while (dth > Math.PI) dth -= 2 * Math.PI; while (dth < -Math.PI) dth += 2 * Math.PI;
      anim = { t0: performance.now(), ms, from: { t: this.target.clone(), r: this.r, th: this.theta, ph: this.phi }, to: { t: target.clone(), r, th: this.theta + dth, ph: phi } };
    };
    this.tick = function () {
      if (!anim) return false;
      let k = (performance.now() - anim.t0) / anim.ms; if (k >= 1) k = 1;
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.target.lerpVectors(anim.from.t, anim.to.t, e);
      this.r = NE.lerp(anim.from.r, anim.to.r, e);
      this.theta = NE.lerp(anim.from.th, anim.to.th, e);
      this.phi = NE.lerp(anim.from.ph, anim.to.ph, e);
      this.update();
      if (k >= 1) anim = null;
      return true;
    };
    const ptrs = new Map(); let mode = null, last = null, pinch = 0;
    dom.addEventListener('contextmenu', e => e.preventDefault());
    dom.addEventListener('pointerdown', e => {
      if (!self.enabled || e.defaultPrevented) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dom.setPointerCapture(e.pointerId);
      anim = null;
      mode = (e.button === 2 || e.button === 1 || e.shiftKey) ? 'pan' : 'rot';
      if (ptrs.size === 2) { mode = 'pinch'; const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      last = { x: e.clientX, y: e.clientY };
    });
    dom.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId) || !mode) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'pinch' && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) self.r = NE.clamp(self.r * pinch / d, 12, 160); pinch = d; self.update(); return;
      }
      const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
      if (mode === 'rot') {
        self.theta -= dx * 0.008; self.phi = NE.clamp(self.phi - dy * 0.008, 0.08, 1.62);
      } else if (mode === 'pan') {
        const k = self.r * 0.0016;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
        self.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
      }
      self.update();
    });
    const end = e => { ptrs.delete(e.pointerId); if (ptrs.size === 0) mode = null; };
    dom.addEventListener('pointerup', end); dom.addEventListener('pointercancel', end);
    dom.addEventListener('wheel', e => {
      if (!self.enabled || e.defaultPrevented) return;
      e.preventDefault(); anim = null;
      self.r = NE.clamp(self.r * (e.deltaY > 0 ? 1.1 : 1 / 1.1), 12, 160); self.update();
    }, { passive: false });
    this.update();
  };
})(window.NE);
