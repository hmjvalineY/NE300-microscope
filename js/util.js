/* 共用工具：命名空間、亂數、事件、旋鈕元件、提示訊息 */
window.NE = window.NE || {};
(function (NE) {
  NE.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  NE.lerp = (a, b, t) => a + (b - a) * t;
  NE.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  NE.hash2 = function (x, y, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1013, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  };
  NE.fmt = (v, d = 1) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);

  // 事件
  const L = {};
  NE.on = (e, f) => { (L[e] = L[e] || []).push(f); };
  NE.emit = (e, d) => { (L[e] || []).slice().forEach(f => f(d)); };

  NE.$ = (s, r = document) => r.querySelector(s);
  NE.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  NE.h = function (tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  };

  NE.store = {
    get(k, d) { try { const v = localStorage.getItem('ne300_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ne300_' + k, JSON.stringify(v)); } catch (e) { } }
  };

  // 提示
  NE.toast = function (msg, type = '', ms = 3200) {
    let box = document.getElementById('toast');
    if (!box) { box = NE.h('div', { id: 'toast' }); document.body.appendChild(box); }
    const t = NE.h('div', { class: 't ' + type }, msg);
    box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => t.remove(), ms);
  };
  NE.modal = function (title, html, buttons) {
    const bg = NE.h('div', { class: 'modal-bg' });
    const m = NE.h('div', { class: 'modal' }, (title ? `<h3>${title}</h3>` : '') + html);
    const row = NE.h('div', { style: 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px' });
    (buttons || [{ text: '我知道了', primary: true }]).forEach(b => {
      const btn = NE.h('button', { class: 'btn ' + (b.primary ? 'primary' : '') }, b.text);
      btn.onclick = () => { bg.remove(); b.fn && b.fn(); };
      row.appendChild(btn);
    });
    m.appendChild(row); bg.appendChild(m);
    bg.addEventListener('pointerdown', e => { if (e.target === bg) bg.remove(); });
    document.body.appendChild(bg);
    return m;
  };

  /* 旋鈕元件：拖曳（繞圈或上下拖）、滾輪都能轉。onTurn(弧度, 是否精細) ，順時針為正 */
  NE.knob = function (opt) {
    const size = opt.size || 58, r = size / 2;
    const ridges = opt.ridges || 18;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.classList.add('knob');
    const col = opt.color || '#2a2d33';
    let g = `<defs><radialGradient id="kg${opt.id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#6b7180"/><stop offset="1" stop-color="${col}"/></radialGradient></defs>`;
    g += `<circle cx="${r}" cy="${r}" r="${r - 1}" fill="#15171b"/>`;
    g += `<g class="rot">`;
    for (let i = 0; i < ridges; i++) {
      const a = i / ridges * Math.PI * 2;
      const x1 = r + Math.cos(a) * (r - 1.5), y1 = r + Math.sin(a) * (r - 1.5);
      const x2 = r + Math.cos(a) * (r - 6), y2 = r + Math.sin(a) * (r - 6);
      g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#474c57" stroke-width="2"/>`;
    }
    g += `<circle cx="${r}" cy="${r}" r="${r - 6}" fill="url(#kg${opt.id})"/>`;
    if (opt.scale) {
      for (let i = 0; i < opt.scale; i++) {
        const a = i / opt.scale * Math.PI * 2 - Math.PI / 2;
        const big = i % (opt.scale / 10) === 0;
        const rr = r - 7, rr2 = rr - (big ? 6 : 3);
        g += `<line x1="${r + Math.cos(a) * rr}" y1="${r + Math.sin(a) * rr}" x2="${r + Math.cos(a) * rr2}" y2="${r + Math.sin(a) * rr2}" stroke="#e6e9ef" stroke-width="${big ? 1.3 : 0.7}"/>`;
      }
    }
    g += `<line x1="${r}" y1="${r - (r - 8)}" x2="${r}" y2="${r - 4}" stroke="#ffd257" stroke-width="3" stroke-linecap="round"/>`;
    g += `</g>`;
    if (opt.scale) g += `<path d="M${r - 4} 1 L${r + 4} 1 L${r} 6Z" fill="#ff5a5a"/>`;
    svg.innerHTML = g;
    const rot = svg.querySelector('.rot');
    let angle = 0;
    function setAngle(a) { angle = a; rot.setAttribute('transform', `rotate(${a * 180 / Math.PI} ${r} ${r})`); }
    let drag = null;
    svg.addEventListener('pointerdown', e => {
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      const b = svg.getBoundingClientRect();
      drag = { cx: b.left + b.width / 2, cy: b.top + b.height / 2, a: Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)), y: e.clientY };
    });
    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.cx, dy = e.clientY - drag.cy;
      const dist = Math.hypot(dx, dy);
      let d;
      if (dist > size * 0.22) {
        const a = Math.atan2(dy, dx);
        d = a - drag.a; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
        drag.a = a;
      } else {
        d = (drag.y - e.clientY) * 0.03; drag.a = Math.atan2(dy, dx);
      }
      drag.y = e.clientY;
      if (d) opt.onTurn(d, e.shiftKey);
    });
    const end = () => { drag = null; opt.onEnd && opt.onEnd(); };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      opt.onTurn((e.deltaY < 0 ? 1 : -1) * (opt.wheelStep || 0.12), e.shiftKey);
      opt.onEnd && opt.onEnd();
    }, { passive: false });
    const wrap = NE.h('div', { class: 'ccol' });
    wrap.appendChild(svg);
    if (opt.label) wrap.appendChild(NE.h('div', null, opt.label));
    return { el: wrap, svg, setAngle, get angle() { return angle; } };
  };
})(window.NE);
