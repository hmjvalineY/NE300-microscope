/* 實驗操作場景：製作水埋玻片、染色（引流法） */
(function (NE) {
  const W = 1200, H = 720;
  // ---------- 場景畫布 ----------
  const Host = { cur: null, scale: 1, ox: 0, oy: 0 };
  NE.SceneHost = Host;
  function initHost() {
    if (Host.cv) return;
    const cv = Host.cv = NE.$('#scene'), ctx = Host.ctx = cv.getContext('2d');
    function fit() {
      const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      if (!r.width) return;
      cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
      Host.scale = Math.min(cv.width / W, cv.height / H);
      Host.ox = (cv.width - W * Host.scale) / 2; Host.oy = (cv.height - H * Host.scale) / 2;
    }
    new ResizeObserver(fit).observe(cv); fit();
    const P = e => { const r = cv.getBoundingClientRect(), d = cv.width / r.width; return { x: ((e.clientX - r.left) * d - Host.ox) / Host.scale, y: ((e.clientY - r.top) * d - Host.oy) / Host.scale }; };
    cv.addEventListener('pointerdown', e => { if (!Host.cur) return; cv.setPointerCapture(e.pointerId); Host.mouse = P(e); Host.cur.down && Host.cur.down(P(e), e); });
    cv.addEventListener('pointermove', e => { if (!Host.cur) return; Host.mouse = P(e); Host.cur.move && Host.cur.move(P(e), e); });
    cv.addEventListener('pointerup', e => { if (!Host.cur) return; Host.cur.up && Host.cur.up(P(e), e); });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); Host.cur && Host.cur.cancel && Host.cur.cancel(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && Host.cur && Host.cur.cancel) Host.cur.cancel(); });
    let last = performance.now();
    (function loop() {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (Host.cur && cv.width) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#e4d8c2'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.setTransform(Host.scale, 0, 0, Host.scale, Host.ox, Host.oy);
        Host.cur.draw(ctx, dt);
      }
      requestAnimationFrame(loop);
    })();
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function table(c) {
    c.fillStyle = '#e4d8c2'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(160,130,90,0.12)'; c.lineWidth = 2;
    for (let i = 0; i < 30; i++) { c.beginPath(); c.moveTo(0, i * 26 + 8); c.bezierCurveTo(300, i * 26 + 18, 800, i * 26 - 6, W, i * 26 + 10); c.stroke(); }
  }
  const font = (s, w = '') => `${w} ${s}px "Microsoft JhengHei","PingFang TC",sans-serif`;
  function label(c, t, x, y, s = 15, col = '#333', al = 'center') { c.fillStyle = col; c.font = font(s, '600'); c.textAlign = al; c.textBaseline = 'middle'; c.fillText(t, x, y); }

  // 工具圖示
  const ICON = {
    lens(c) { c.fillStyle = '#fff'; c.strokeStyle = '#bbb'; rr(c, -26, -20, 52, 40, 3); c.fill(); c.stroke(); c.strokeStyle = '#ddd'; c.beginPath(); c.moveTo(-26, 0); c.lineTo(26, 0); c.moveTo(0, -20); c.lineTo(0, 20); c.stroke(); },
    dropper(c, col = 'rgba(120,180,240,0.6)') { c.save(); c.rotate(-0.5); c.fillStyle = '#d23'; rr(c, -7, -34, 14, 18, 6); c.fill(); c.fillStyle = 'rgba(230,245,255,0.9)'; c.strokeStyle = '#8ab'; rr(c, -5, -16, 10, 40, 3); c.fill(); c.stroke(); c.fillStyle = col; c.fillRect(-4, 6, 8, 16); c.restore(); },
    forceps(c) { c.strokeStyle = '#8c939c'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-4, -30); c.lineTo(-2, 30); c.moveTo(4, -30); c.lineTo(2, 30); c.stroke(); c.beginPath(); c.moveTo(-4, -30); c.lineTo(4, -30); c.stroke(); },
    needle(c) { c.fillStyle = '#7a4b2a'; rr(c, -5, -32, 10, 34, 4); c.fill(); c.strokeStyle = '#999'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, 32); c.stroke(); },
    cover(c) { c.fillStyle = '#5d6b7c'; rr(c, -28, -18, 56, 36, 4); c.fill(); c.fillStyle = 'rgba(220,240,255,0.85)'; c.fillRect(-18, -12, 22, 22); c.fillRect(-12, -6, 22, 22); },
    paper(c) { c.fillStyle = '#fdf3f6'; c.strokeStyle = '#e3b6c4'; c.save(); c.rotate(0.2); rr(c, -30, -12, 60, 24, 3); c.fill(); c.stroke(); c.restore(); },
    onion(c) { c.fillStyle = '#e9d9a8'; c.strokeStyle = '#c9a85c'; c.lineWidth = 2; c.beginPath(); c.moveTo(-34, 14); c.quadraticCurveTo(0, -40, 34, 14); c.quadraticCurveTo(0, 0, -34, 14); c.fill(); c.stroke(); c.strokeStyle = '#d8c48c'; c.beginPath(); c.moveTo(-24, 8); c.quadraticCurveTo(0, -24, 24, 8); c.stroke(); },
    swab(c) { c.strokeStyle = '#f2f2f2'; c.lineWidth = 3; c.beginPath(); c.moveTo(-20, 22); c.lineTo(18, -18); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(20, -20, 9, 6, -0.8, 0, 7); c.fill(); c.strokeStyle = '#ccc'; c.lineWidth = 1; c.stroke(); },
    mouth(c) { c.fillStyle = '#f2c9a8'; c.beginPath(); c.arc(0, 0, 26, 0, 7); c.fill(); c.fillStyle = '#c4515a'; c.beginPath(); c.ellipse(0, 9, 11, 6, 0, 0, 7); c.fill(); c.fillStyle = '#333'; c.beginPath(); c.arc(-9, -6, 3, 0, 7); c.arc(9, -6, 3, 0, 7); c.fill(); },
    potato(c) { c.fillStyle = '#c9a36a'; c.beginPath(); c.ellipse(0, 0, 30, 21, 0.3, 0, 7); c.fill(); c.fillStyle = '#f3e7bd'; c.beginPath(); c.ellipse(4, 2, 18, 12, 0.3, 0, 7); c.fill(); },
    blade(c) { c.fillStyle = '#cfd4da'; c.strokeStyle = '#8a929c'; rr(c, -26, -9, 52, 18, 2); c.fill(); c.stroke(); c.fillStyle = '#8a929c'; c.fillRect(-10, -3, 20, 6); },
    iodine(c) { c.fillStyle = '#6b3d10'; rr(c, -14, -20, 28, 40, 5); c.fill(); c.fillStyle = '#222'; c.fillRect(-7, -30, 14, 11); c.fillStyle = '#fff'; c.font = font(11, 'bold'); c.textAlign = 'center'; c.fillText('碘液', 0, 4); },
    mb(c) { c.fillStyle = '#2442a8'; rr(c, -14, -20, 28, 40, 5); c.fill(); c.fillStyle = '#222'; c.fillRect(-7, -30, 14, 11); c.fillStyle = '#fff'; c.font = font(10, 'bold'); c.textAlign = 'center'; c.fillText('亞甲藍', 0, 4); },
    clock(c) { c.fillStyle = '#fff'; c.strokeStyle = '#555'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -15); c.moveTo(0, 0); c.lineTo(10, 4); c.stroke(); }
  };

  function tray(c, tools, sel) {
    c.fillStyle = 'rgba(250,246,238,0.95)'; rr(c, 20, 572, W - 40, 132, 14); c.fill();
    c.strokeStyle = '#c8b99c'; c.stroke();
    const n = tools.length, w = (W - 60) / n;
    tools.forEach((t, i) => {
      const x = 30 + w * i + w / 2;
      t._x = x; t._y = 628; t._w = w;
      if (sel === t.id) { c.fillStyle = '#dbe9ff'; rr(c, x - w / 2 + 4, 580, w - 8, 116, 10); c.fill(); c.strokeStyle = '#5b93e6'; c.lineWidth = 2; c.stroke(); }
      c.save(); c.translate(x, 625); ICON[t.icon](c, t.col); c.restore();
      label(c, t.name, x, 680, 14, '#3d3d3d');
    });
  }
  function hitTray(tools, p) { if (p.y < 575 || p.y > 705) return null; return tools.find(t => Math.abs(p.x - t._x) < t._w / 2) || null; }

  // ================= 製作水埋玻片 =================
  const WM = {};
  NE.WetMount = WM;
  const SL = { x: 600, y: 290, k: 7 }; // 玻片中心、px/mm
  function newState(tissue) {
    return { tissue, clean: false, drops: [], liquid: null, spec: null, holding: null, cover: null, excess: false, blotted: 0, bubbles: [], fell: false, tool: null, lower: null, fx: [], seed: (Math.random() * 1e6) | 0, done: false };
  }
  let st = null, panel = null;
  const TOOLSETS = {
    onion: [['lens', 'lens', '拭鏡紙'], ['water', 'dropper', '滴管（清水）'], ['forceps', 'forceps', '鑷子'], ['onion', 'onion', '洋蔥鱗葉'], ['needle', 'needle', '解剖針'], ['cover', 'cover', '蓋玻片'], ['paper', 'paper', '吸水紙']],
    cheek: [['lens', 'lens', '拭鏡紙'], ['water', 'dropper', '滴管（清水）'], ['saline', 'dropper', '滴管（生理食鹽水）'], ['swab', 'swab', '乾淨棉花棒'], ['mouth', 'mouth', '口腔內頰'], ['cover', 'cover', '蓋玻片'], ['paper', 'paper', '吸水紙']],
    potato: [['lens', 'lens', '拭鏡紙'], ['water', 'dropper', '滴管（清水）'], ['blade', 'blade', '刀片'], ['potato', 'potato', '馬鈴薯切面'], ['needle', 'needle', '解剖針'], ['cover', 'cover', '蓋玻片'], ['paper', 'paper', '吸水紙']]
  };
  let tools = [];
  const TNAME = { onion: '洋蔥表皮', cheek: '口腔皮膜細胞', potato: '馬鈴薯澱粉粒' };

  WM.enter = function (el) {
    initHost(); panel = el;
    el.innerHTML = `<h2>製作水埋玻片</h2>
      <p>水埋玻片（濕式裝片）：把標本放在水滴中，蓋上蓋玻片。水可以使標本保持濕潤、攤平，並讓光線均勻通過。</p>
      <div class="form-row">選擇材料：<span id="tsel"></span></div>
      <div id="steps"></div>
      <div class="tip"><b>操作方式：</b>先點下方托盤的工具（會跟著滑鼠），再點玻片上的位置。右鍵或 Esc 放下工具。</div>
      <div id="result"></div>
      <h3>重點提醒</h3>
      <ul><li><b>水量一滴即可</b>：太多水，蓋玻片會浮動、標本漂移；太少則容易產生氣泡。</li>
      <li>洋蔥要撕取<b>鱗葉內側的表皮</b>，薄、透明，只有一層細胞；放入水中後用解剖針<b>攤平</b>，避免重疊、摺疊。</li>
      <li>口腔細胞用<b>乾淨棉花棒輕刮口腔內頰</b>，塗在<b>生理食鹽水（0.9%）</b>中，細胞才不會因吸水而變形。用過的棉花棒丟入指定垃圾桶。</li>
      <li><b>蓋蓋玻片：用鑷子夾住，一邊先接觸水滴，以約 45° 慢慢放下</b>，讓水沿著蓋玻片推開空氣，就不會產生氣泡。</li>
      <li>蓋玻片周圍多出來的水，用吸水紙從邊緣吸乾。</li></ul>`;
    const ts = NE.$('#tsel', el);
    ['onion', 'cheek', 'potato'].forEach(t => ts.appendChild(NE.btn(TNAME[t], () => start(t), 'sm')));
    start(NE.myMountTissue || 'onion');
    Host.cur = WM;
  };
  WM.leave = function () { if (Host.cur === WM) Host.cur = null; };
  function start(t) {
    st = newState(t);
    tools = TOOLSETS[t].map(([id, icon, name]) => ({ id, icon, name }));
    NE.$$('#tsel button', panel).forEach((b, i) => b.classList.toggle('on', ['onion', 'cheek', 'potato'][i] === t));
    NE.$('#result', panel).innerHTML = '';
    drawSteps();
  }
  function stepList() {
    const t = st.tissue;
    const L = [['用拭鏡紙擦淨載玻片', st.clean]];
    L.push([t === 'cheek' ? '在載玻片中央滴一滴<b>生理食鹽水</b>' : '在載玻片中央滴<b>一滴清水</b>', st.drops.length > 0]);
    if (t === 'onion') { L.push(['用鑷子撕取洋蔥鱗葉內表皮，放入水滴中', !!st.spec]); L.push(['用解剖針把表皮<b>攤平</b>', st.spec && st.spec.flat]); }
    if (t === 'cheek') L.push(['用棉花棒輕刮口腔內頰，塗在液滴中', !!st.spec]);
    if (t === 'potato') { L.push(['用刀片刮取少許馬鈴薯汁液，加入水滴中', !!st.spec]); L.push(['用解剖針輕輕攪散', st.spec && st.spec.flat]); }
    L.push(['用鑷子夾蓋玻片，<b>一邊先接觸水滴，以約 45° 慢慢放下</b>', !!st.cover]);
    L.push(['用吸水紙吸去蓋玻片周圍多餘的水', !!st.cover && !st.excess]);
    return L;
  }
  function drawSteps() {
    const L = stepList();
    let cur = L.findIndex(x => !x[1]);
    NE.$('#steps', panel).innerHTML = '<ul class="tasks">' + L.map((s, i) => `<li class="${s[1] ? 'ok' : ''} ${i === cur ? 'cur' : ''}"><span class="ck">${s[1] ? '✓' : i + 1}</span><div>${s[0]}</div></li>`).join('') + '</ul>';
    if (st.cover && !st.lower && !st.done && !st.excess) finish();
  }
  const onSlide = p => Math.abs(p.x - SL.x) < 38 * SL.k && Math.abs(p.y - SL.y) < 13 * SL.k;
  const onGlass = p => onSlide(p) && p.x > SL.x - 18 * SL.k;
  const nearDrop = p => st.drops.some(d => Math.hypot(d.x - p.x, d.y - p.y) < 30 + 8 * st.drops.length);
  const dropCenter = () => { const n = st.drops.length; return { x: st.drops.reduce((a, d) => a + d.x, 0) / n, y: st.drops.reduce((a, d) => a + d.y, 0) / n }; };
  const fx = (x, y, col) => st.fx.push({ x, y, t: 0, col });

  WM.down = function (p) {
    if (st.lower) return lowerDown(p);
    const tt = hitTray(tools, p);
    if (tt) {
      if (st.holding && ((tt.id === 'onion' && st.holding === 'forceps') || (tt.id === 'mouth' && st.holding === 'swab') || (tt.id === 'potato' && st.holding === 'blade'))) {
        st.holding = st.holding === 'forceps' ? 'film' : st.holding === 'swab' ? 'swabCells' : 'juice';
        NE.toast({ film: '撕下一小片薄而透明的內表皮（約 0.5 cm 見方）', swabCells: '輕輕刮取口腔內頰的細胞', juice: '刮下少許含澱粉粒的汁液' }[st.holding], 'ok');
        return;
      }
      if (['onion', 'mouth', 'potato'].includes(tt.id)) { NE.toast(tt.id === 'onion' ? '要先拿起「鑷子」再點洋蔥' : tt.id === 'mouth' ? '要先拿起「棉花棒」再點口腔' : '要先拿起「刀片」再點馬鈴薯'); return; }
      st.tool = st.tool === tt.id ? null : tt.id;
      st.holding = st.tool; return;
    }
    if (!st.holding) return;
    const h = st.holding;
    if (h === 'lens') {
      if (onSlide(p)) { if (st.drops.length) { NE.toast('已經滴了水，不能再擦了'); return; } st.clean = true; for (let i = 0; i < 8; i++) fx(p.x + (Math.random() - 0.5) * 300, p.y + (Math.random() - 0.5) * 120, '#fff'); NE.toast('載玻片擦乾淨了（手只拿玻片邊緣）', 'ok'); }
    } else if (h === 'water' || h === 'saline') {
      if (!onGlass(p)) { NE.toast('請滴在載玻片中央（不要滴在標籤上）'); return; }
      if (st.cover) { NE.toast('已經蓋上蓋玻片了。若要染色，請到「染色」章節。'); return; }
      st.drops.push({ x: p.x, y: p.y }); st.liquid = st.liquid && st.liquid !== h ? 'mix' : h;
      if (Math.abs(p.x - SL.x) > 90 || Math.abs(p.y - SL.y) > 50) NE.toast('液滴最好在玻片中央，方便放到通光孔上觀察', 'warn');
      if (st.drops.length === 3) { st.excess = true; NE.toast('水太多了！蓋上蓋玻片後要用吸水紙吸掉多餘的水', 'warn'); }
      if (st.tissue === 'cheek' && h === 'water' && !st._w) { st._w = 1; NE.toast('提醒：口腔細胞放在清水中會吸水膨脹變形，最好使用 0.9% 生理食鹽水', 'warn', 4500); }
    } else if (h === 'film' || h === 'swabCells' || h === 'juice') {
      if (!onGlass(p)) return;
      if (!st.drops.length || !nearDrop(p)) { NE.toast('標本要放在液滴裡！放在乾的玻片上會捲曲、乾掉', 'warn'); return; }
      const c = dropCenter();
      st.spec = { x: c.x, y: c.y, flat: h === 'swabCells', kind: h };
      st.holding = st.tool = null;
      if (h === 'film') NE.toast('表皮有些皺摺，用解剖針把它攤平', '', 3500);
      if (h === 'juice') NE.toast('用解剖針輕輕攪散，讓澱粉粒分散開來');
      if (h === 'swabCells') NE.toast('把棉花棒在液滴中輕輕旋轉塗抹', 'ok');
    } else if (h === 'needle') {
      if (st.spec && Math.hypot(p.x - st.spec.x, p.y - st.spec.y) < 60) { if (st.cover) { NE.toast('已經蓋上蓋玻片了'); return; } st.spec.flat = true; NE.toast(st.tissue === 'onion' ? '表皮攤平了，沒有重疊' : '攪散了', 'ok'); }
    } else if (h === 'cover') {
      if (!st.drops.length) { NE.toast('要先滴水，才能蓋蓋玻片'); return; }
      if (!st.spec) { NE.toast('先把標本放進液滴中'); return; }
      if (st.cover) return;
      if (!onGlass(p)) return;
      st.lower = { angle: 62, drag: false, hist: [], maxSpeed: 0, falling: false, t: 0 };
      st.holding = st.tool = null;
    } else if (h === 'paper') {
      if (!st.cover) { NE.toast('還沒蓋蓋玻片。吸水紙是用來吸去蓋玻片周圍多餘的水'); return; }
      const c = st.cover, d = Math.max(Math.abs(p.x - c.x), Math.abs(p.y - c.y));
      if (d < 70 || d > 110) { NE.toast('把吸水紙放在蓋玻片的「邊緣」'); return; }
      if (st.excess) { st.excess = false; st.blotted++; NE.toast('多餘的水被吸乾了', 'ok'); }
      else { st.blotted++; if (st.blotted >= 2) { addBubbles(1, true); NE.toast('吸太多了：蓋玻片下的水被吸走，空氣從邊緣跑進去形成氣泡', 'warn'); } else NE.toast('水量剛好，不需要再吸了'); }
    }
    drawSteps();
  };
  WM.move = function (p) { if (st && st.lower) lowerMove(p); };
  WM.up = function (p) { if (st && st.lower) lowerUp(p); };
  WM.cancel = function () { if (st && !st.lower) { st.holding = st.tool = null; } };

  // ---- 蓋蓋玻片（側視圖） ----
  const LV = { x: 160, y: 40, w: 880, h: 400, piv: { x: 330, y: 330 }, len: 300 };
  function lowerDown(p) {
    const L = st.lower;
    if (p.x > LV.x + LV.w - 190 && p.y > LV.y + LV.h - 50 && p.x < LV.x + LV.w - 20) { L.demo = true; return; }
    L.drag = true; lowerMove(p);
  }
  function lowerMove(p) {
    const L = st.lower; if (!L.drag || L.falling) return;
    let a = Math.atan2(LV.piv.y - p.y, p.x - LV.piv.x) * 180 / Math.PI;
    a = NE.clamp(a, 0, 80); setAngle(a);
  }
  function setAngle(a) {
    const L = st.lower, now = performance.now();
    L.hist.push({ t: now, a }); while (L.hist.length > 2 && now - L.hist[0].t > 90) L.hist.shift();
    if (L.hist.length >= 2) { const h0 = L.hist[0], dt = (now - h0.t) / 1000; if (dt > 0.02 && a < 50) L.maxSpeed = Math.max(L.maxSpeed, (h0.a - a) / dt); }
    L.angle = a;
    if (a <= 0.5) placeCover();
  }
  function lowerUp() {
    const L = st.lower; if (!L || !L.drag) return; L.drag = false;
    if (L.angle > 6) { L.falling = true; st.fell = true; NE.toast('放手太早了！蓋玻片「啪」一聲掉下去', 'warn'); }
    else setAngle(0);
  }
  function addBubbles(n, edge) {
    const r = NE.rng(st.seed + st.bubbles.length * 7);
    for (let i = 0; i < n; i++) {
      const big = r() < 0.35;
      st.bubbles.push(edge ? { x: (r() < 0.5 ? -1 : 1) * (3000 + r() * 1500), y: (r() - 0.5) * 5000, r: 120 + r() * 250 } : { x: (r() - 0.5) * 6000, y: (r() - 0.5) * 4200, r: big ? 300 + r() * 450 : 60 + r() * 200 });
    }
  }
  function placeCover() {
    const L = st.lower;
    let n = 0;
    if (L.maxSpeed > 90) n += 1 + Math.floor((L.maxSpeed - 90) / 70);
    if (st.fell) n += 2 + Math.floor(Math.random() * 2);
    if (L.startLow) n += 2;
    if (st.drops.length === 1 && st.tissue === 'onion' && !st.spec.flat) n += 1;
    n = Math.min(n, 9);
    addBubbles(n);
    const c = dropCenter();
    st.cover = { x: c.x, y: c.y };
    st.lowerResult = { speed: Math.round(L.maxSpeed), fell: st.fell, n };
    st.lower = null;
    NE.toast(n === 0 ? '漂亮！蓋玻片下沒有氣泡' : `蓋玻片下產生了 ${n} 個氣泡${st.fell ? '（放手太早）' : L.maxSpeed > 90 ? '（放下太快）' : ''}`, n ? 'warn' : 'ok', 3500);
    if (st.excess) NE.toast('蓋玻片周圍有多餘的水，請用吸水紙吸乾', 'warn', 3500);
    drawSteps();
  }
  function drawLower(c, dt) {
    const L = st.lower;
    if (L.demo && !L.falling) { L.angle = Math.max(0, L.angle - dt * 22); setAngle(L.angle); if (!st.lower) return; }
    if (L.falling) { L.angle -= dt * 420; L.maxSpeed = Math.max(L.maxSpeed, 420); if (L.angle <= 0) { L.angle = 0; placeCover(); return; } }
    c.fillStyle = 'rgba(30,40,55,0.55)'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#f7f9fc'; rr(c, LV.x, LV.y, LV.w, LV.h, 14); c.fill();
    label(c, '側面圖：拖曳蓋玻片的右端（鑷子處），以約 45° 慢慢放下（請勿太快、勿太早放手）', LV.x + LV.w / 2, LV.y + 28, 17, '#24395e');
    const py = LV.piv.y;
    c.fillStyle = '#d6ecf8'; c.strokeStyle = '#8fb3cc'; c.fillRect(LV.x + 40, py, LV.w - 80, 26); c.strokeRect(LV.x + 40, py, LV.w - 80, 26);
    label(c, '載玻片', LV.x + 90, py + 13, 13, '#567');
    const nd = st.drops.length, dw = 120 + nd * 40, dh = 28 + nd * 12;
    const dx0 = LV.piv.x + 30;
    const a = L.angle * Math.PI / 180;
    const ex = LV.piv.x + Math.cos(a) * LV.len, ey = py - Math.sin(a) * LV.len;
    // 水（被蓋玻片推開）
    c.fillStyle = 'rgba(110,170,235,0.55)';
    c.beginPath(); c.moveTo(dx0 - 30, py);
    const spread = (1 - L.angle / 62);
    for (let i = 0; i <= 30; i++) {
      const t = i / 30, x = dx0 - 30 + t * (dw + spread * 160);
      const yDome = py - Math.sin(Math.PI * NE.clamp((x - dx0 + 30) / (dw + spread * 160), 0, 1)) * dh * (1 - spread * 0.85);
      const yCov = py - Math.tan(a) * (x - LV.piv.x);
      c.lineTo(x, Math.max(yDome, Math.min(py, yCov)));
    }
    c.lineTo(dx0 - 30 + dw + spread * 160, py); c.closePath(); c.fill();
    // 標本
    c.strokeStyle = st.tissue === 'onion' ? '#c9a85c' : '#bbb'; c.lineWidth = 3; c.beginPath(); c.moveTo(dx0 + 10, py - 3); c.lineTo(dx0 + dw - 40, py - 3); c.stroke();
    // 被困住的氣泡（放太快時）
    if (L.maxSpeed > 90 || st.fell) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.strokeStyle = '#333'; c.lineWidth = 1.5; for (let i = 0; i < Math.min(6, 1 + L.maxSpeed / 90); i++) { const x = dx0 + 40 + i * 37, y = py - 7; if (py - Math.tan(a) * (x - LV.piv.x) > py - 20) { c.beginPath(); c.arc(x, y, 5 + (i % 3) * 2, 0, 7); c.fill(); c.stroke(); } } }
    // 蓋玻片
    c.strokeStyle = '#6fa4cc'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(LV.piv.x, py - 2); c.lineTo(ex, ey); c.stroke();
    c.lineCap = 'butt';
    // 鑷子
    c.save(); c.translate(ex, ey); c.rotate(-a - 0.9); c.strokeStyle = '#8c939c'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(110, -10); c.moveTo(0, 6); c.lineTo(110, 2); c.stroke(); c.restore();
    // 角度
    c.strokeStyle = '#e07b2b'; c.lineWidth = 2; c.beginPath(); c.arc(LV.piv.x, py, 60, -a, 0); c.stroke();
    label(c, Math.round(L.angle) + '°', LV.piv.x + 82, py - 22, 18, '#c0601a');
    const sp = L.hist.length >= 2 ? Math.max(0, (L.hist[0].a - L.angle) / Math.max(0.02, (performance.now() - L.hist[0].t) / 1000)) : 0;
    const col = sp > 90 ? '#c9353f' : '#1d9a5b';
    label(c, '放下速度：' + Math.round(sp) + ' °/秒' + (sp > 90 ? '（太快！）' : ''), LV.x + 40, LV.y + LV.h - 30, 16, col, 'left');
    c.fillStyle = '#e8f0fb'; rr(c, LV.x + LV.w - 190, LV.y + LV.h - 50, 170, 34, 8); c.fill(); c.strokeStyle = '#8fb0dd'; c.stroke();
    label(c, '▶ 示範正確放法', LV.x + LV.w - 105, LV.y + LV.h - 33, 15, '#1f4f9c');
  }

  WM.draw = function (c, dt) {
    if (!st) return;
    table(c);
    label(c, `製作「${TNAME[st.tissue]}」水埋玻片`, 30, 30, 22, '#24395e', 'left');
    // 玻片
    const k = SL.k, x0 = SL.x - 38 * k, y0 = SL.y - 13 * k;
    c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(x0 + 6, y0 + 8, 76 * k, 26 * k);
    c.fillStyle = st.clean ? 'rgba(226,244,255,0.95)' : 'rgba(214,232,240,0.95)'; c.fillRect(x0, y0, 76 * k, 26 * k);
    c.strokeStyle = '#9fb7c9'; c.lineWidth = 2; c.strokeRect(x0, y0, 76 * k, 26 * k);
    c.fillStyle = '#f5f4ee'; c.fillRect(x0, y0, 20 * k, 26 * k);
    label(c, TNAME[st.tissue], x0 + 10 * k, SL.y, 14, '#555');
    if (!st.clean) { c.fillStyle = 'rgba(120,110,100,0.25)'; const r = NE.rng(3); for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(x0 + 20 * k + r() * 56 * k, y0 + r() * 26 * k, 1 + r() * 3, 0, 7); c.fill(); } c.fillStyle = 'rgba(150,140,130,0.12)'; c.beginPath(); c.ellipse(SL.x + 120, SL.y - 30, 30, 22, 0.4, 0, 7); c.fill(); }
    // 水
    st.drops.forEach((d, i) => { const r = 30 + (st.drops.length - 1) * 9; c.fillStyle = 'rgba(120,180,240,0.35)'; c.beginPath(); c.arc(d.x, d.y, r, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(d.x - r * 0.35, d.y - r * 0.35, r * 0.25, r * 0.12, -0.6, 0, 7); c.fill(); });
    if (st.cover && st.excess) { c.fillStyle = 'rgba(110,170,235,0.35)'; c.beginPath(); c.ellipse(st.cover.x + 10, st.cover.y + 4, 112, 100, 0, 0, 7); c.fill(); }
    // 標本
    if (st.spec) {
      const s = st.spec;
      if (st.tissue === 'onion') {
        c.fillStyle = 'rgba(240,226,170,0.6)'; c.strokeStyle = 'rgba(190,160,90,0.8)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(s.x - 32, s.y - 22); c.lineTo(s.x + 28, s.y - 26); c.lineTo(s.x + 34, s.y + 18); c.lineTo(s.x - 26, s.y + 24); c.closePath(); c.fill(); c.stroke();
        if (!s.flat) { c.strokeStyle = 'rgba(170,140,70,0.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(s.x - 28, s.y - 4); c.quadraticCurveTo(s.x, s.y + 8, s.x + 30, s.y - 6); c.stroke(); c.beginPath(); c.moveTo(s.x - 20, s.y + 10); c.quadraticCurveTo(s.x + 4, s.y + 18, s.x + 26, s.y + 8); c.stroke(); }
      } else if (st.tissue === 'cheek') { c.fillStyle = 'rgba(245,240,235,0.7)'; c.beginPath(); c.ellipse(s.x, s.y, 34, 24, 0.3, 0, 7); c.fill(); }
      else { c.fillStyle = 'rgba(250,250,245,0.75)'; const r = NE.rng(9); for (let i = 0; i < (s.flat ? 60 : 25); i++) { c.beginPath(); c.arc(s.x + (r() - 0.5) * (s.flat ? 70 : 30), s.y + (r() - 0.5) * (s.flat ? 50 : 22), 1.5 + r() * 2, 0, 7); c.fill(); } }
    }
    // 蓋玻片
    if (st.cover) {
      const cv = st.cover, h = 11 * k;
      c.fillStyle = 'rgba(235,248,255,0.55)'; c.strokeStyle = 'rgba(110,160,200,0.9)'; c.lineWidth = 2;
      c.fillRect(cv.x - h, cv.y - h, 2 * h, 2 * h); c.strokeRect(cv.x - h, cv.y - h, 2 * h, 2 * h);
      st.bubbles.forEach(b => { const bx = cv.x + b.x * 0.007 * 1.8, by = cv.y - b.y * 0.007 * 1.8, br = Math.max(3, b.r * 0.007 * 3); c.fillStyle = 'rgba(255,255,255,0.85)'; c.strokeStyle = '#333'; c.lineWidth = 1.5; c.beginPath(); c.arc(bx, by, br, 0, 7); c.fill(); c.stroke(); });
    }
    // 特效
    st.fx = st.fx.filter(f => (f.t += dt) < 0.8);
    st.fx.forEach(f => { c.globalAlpha = 1 - f.t / 0.8; c.fillStyle = f.col; c.beginPath(); c.arc(f.x, f.y - f.t * 30, 4 + f.t * 6, 0, 7); c.fill(); c.globalAlpha = 1; });
    tray(c, tools, st.tool);
    // 手上的工具
    const m = Host.mouse;
    if (st.holding && m && !st.lower) {
      c.save(); c.translate(m.x + 18, m.y - 18);
      const ic = { lens: 'lens', water: 'dropper', saline: 'dropper', forceps: 'forceps', needle: 'needle', cover: 'cover', paper: 'paper', swab: 'swab', blade: 'blade', film: 'forceps', swabCells: 'swab', juice: 'blade' }[st.holding];
      c.globalAlpha = 0.9; ICON[ic](c); c.restore();
      const tip = { film: '鑷子夾著洋蔥表皮 → 點水滴放入', swabCells: '棉花棒沾有細胞 → 點液滴塗抹', juice: '刀片上有汁液 → 點水滴', forceps: '點托盤中的「洋蔥鱗葉」撕取表皮', swab: '點托盤中的「口腔內頰」', blade: '點托盤中的「馬鈴薯切面」', cover: '點液滴旁開始蓋蓋玻片' }[st.holding];
      if (tip) label(c, tip, m.x + 30, m.y + 26, 13, '#1f4f9c', 'left');
    }
    if (st.lower) drawLower(c, dt);
  };

  function finish() {
    st.done = true;
    const t = st.tissue, r = st.lowerResult || {};
    const rows = [
      ['載玻片擦拭', st.clean ? '✔ 有擦淨' : '✘ 沒有擦（視野中會有髒污）'],
      ['液體', t === 'cheek' ? (st.liquid === 'saline' ? '✔ 生理食鹽水' : '△ 清水（細胞可能膨脹變形）') : '✔ 清水'],
      ['水量', st.drops.length >= 3 ? (st.blotted ? '△ 太多，但已用吸水紙吸乾' : '✘ 太多') : '✔ 適中'],
      t !== 'cheek' ? ['標本攤平/分散', st.spec.flat ? '✔' : '✘ 有摺疊（視野中會出現重疊的暗帶）'] : null,
      ['蓋蓋玻片', r.fell ? '✘ 放手太早' : r.speed > 90 ? `△ 速度太快（最快 ${r.speed}°/秒）` : '✔ 慢慢放下'],
      ['氣泡', st.bubbles.length ? `${st.bubbles.length} 個` : '✔ 沒有氣泡']
    ].filter(Boolean);
    const p = {
      tissue: t, seed: st.seed % 997, bubbles: st.bubbles.slice(), fold: t === 'onion' && !st.spec.flat ? { y: -900 + Math.random() * 500, h: 380 } : null,
      excess: st.drops.length >= 3 && !st.blotted, dirty: !st.clean, name: '我的水埋玻片（' + TNAME[t] + '）', desc: '自己製作的' + (st.bubbles.length ? `，有 ${st.bubbles.length} 個氣泡` : '，沒有氣泡'), dot: t === 'onion' ? '#e8dca8' : t === 'cheek' ? '#ddd' : '#eee'
    };
    NE.myMount = p; NE.myMountTissue = t;
    NE.makeUserSlide('my_mount', p);
    const res = NE.$('#result', panel);
    res.innerHTML = `<h3>完成！玻片品質</h3><table class="t">${rows.map(r => `<tr><td>${r[0]}</td><td class="l">${r[1]}</td></tr>`).join('')}</table>`;
    const row = NE.h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
    row.appendChild(NE.btn('🔬 放到顯微鏡上觀察', () => { NE.go('free'); NE.quickSetup({ slide: 'my_mount', obj: 0, focus: false, reload: true }); NE.toast('已放上你的玻片（4X）。請用粗、細調節輪自己對焦！', 'ok', 4000); }, 'primary'));
    row.appendChild(NE.btn('🧪 接著染色', () => NE.go('stain')));
    row.appendChild(NE.btn('重新製作', () => start(t)));
    res.appendChild(row);
  }

  // ================= 染色（引流法） =================
  const SN = {};
  NE.Stain = SN;
  let ss = null, sp = null;
  const CV = { x: 470, y: 290, h: 190 }; // 蓋玻片中心與半邊長（放大圖）
  const STAIN_OF = { onion: 'iodine', cheek: 'mb', potato: 'iodine' };
  const STAIN_NAME = { iodine: '碘液', mb: '亞甲藍液' };
  SN.enter = function (el) {
    initHost(); sp = el;
    el.innerHTML = `<h2>染色：引流法</h2>
      <p>細胞大多透明，染色可以讓特定構造（如細胞核）著色，提高對比，更容易觀察與測量。</p>
      <table class="t"><tr><th>材料</th><th>染液</th><th>結果</th></tr>
      <tr><td>洋蔥表皮</td><td>碘液</td><td class="l">細胞核染成黃褐色，細胞質淡黃色</td></tr>
      <tr><td>口腔皮膜細胞</td><td>亞甲藍液</td><td class="l">細胞核深藍色，細胞質淡藍色</td></tr>
      <tr><td>馬鈴薯澱粉粒</td><td>碘液</td><td class="l">澱粉遇碘呈藍紫色（澱粉的檢驗）</td></tr></table>
      <div class="form-row">使用的玻片：<span id="src"></span></div>
      <div id="steps"></div><div id="result"></div>
      <div class="tip"><b>引流法：</b>在蓋玻片一側邊緣滴染液，在<b>對側</b>用吸水紙吸水，染液就會被「拉」進蓋玻片下方，流過標本。不必掀開蓋玻片，也不會產生氣泡。</div>
      <div class="danger"><b>安全：</b>碘液具刺激性、亞甲藍會染色皮膚與衣物；沾到皮膚立刻用大量清水沖洗。染液不可滴在蓋玻片上方，以免沾汙物鏡。</div>`;
    const src = NE.$('#src', el);
    const opts = [];
    if (NE.myMount) opts.push(['my', '我的水埋玻片（' + TNAME[NE.myMount.tissue] + '）']);
    ['onion', 'cheek', 'potato'].forEach(t => opts.push([t, '新的未染色 ' + TNAME[t]]));
    opts.forEach(([k, n]) => src.appendChild(NE.btn(n, () => begin(k), 'sm')));
    begin(NE.myMount ? 'my' : 'onion');
    Host.cur = SN;
  };
  SN.leave = function () { if (Host.cur === SN) Host.cur = null; };
  function begin(k) {
    const base = k === 'my' ? Object.assign({}, NE.myMount) : { tissue: k, seed: (Math.random() * 997) | 0, bubbles: [], fold: null, excess: false };
    ss = { k, base, tissue: base.tissue, stain: null, holding: null, drops: [], side: 0, paper: [], cov: 0, supply: 0, suction: 0, waited: false, waitT: -1, done: false, mess: false, tool: null };
    NE.$$('#src button', sp).forEach((b, i) => b.classList.toggle('on', (NE.myMount ? ['my', 'onion', 'cheek', 'potato'] : ['onion', 'cheek', 'potato'])[i] === k));
    NE.$('#result', sp).innerHTML = '';
    stSteps();
  }
  const stools = [{ id: 'iodine', icon: 'iodine', name: '碘液（滴管）' }, { id: 'mb', icon: 'mb', name: '亞甲藍液（滴管）' }, { id: 'paper', icon: 'paper', name: '吸水紙' }, { id: 'wait', icon: 'clock', name: '靜置 1 分鐘' }];
  function stSteps() {
    const L = [
      [`選擇正確的染液（${TNAME[ss.tissue]} → ${STAIN_NAME[STAIN_OF[ss.tissue]]}）`, !!ss.stain],
      ['在蓋玻片<b>左側或右側邊緣</b>滴 1～2 滴染液', ss.drops.length > 0],
      ['在<b>對側</b>邊緣放吸水紙，把染液引流過標本', ss.cov > 0.95],
      ['靜置約 1 分鐘，讓染液充分作用', ss.waited],
    ];
    const cur = L.findIndex(x => !x[1]);
    NE.$('#steps', sp).innerHTML = '<ul class="tasks">' + L.map((s, i) => `<li class="${s[1] ? 'ok' : ''} ${i === cur ? 'cur' : ''}"><span class="ck">${s[1] ? '✓' : i + 1}</span><div>${s[0]}</div></li>`).join('') + '</ul>' +
      `<div class="readout" style="display:inline-block;margin:4px 0">染液已流過：${Math.round(ss.cov * 100)}%</div>`;
    if (!ss.done && ss.cov > 0.05 && (ss.waited || ss.cov > 0.95)) showFinish();
  }
  SN.down = function (p) {
    const tt = hitTray(stools, p);
    if (tt) {
      if (tt.id === 'wait') {
        if (ss.cov < 0.3) { NE.toast('還沒有染液流過標本'); return; }
        if (ss.waitT < 0) { ss.waitT = 0; NE.toast('靜置中…（模擬 1 分鐘）'); }
        return;
      }
      if (tt.id === 'iodine' || tt.id === 'mb') {
        if (STAIN_OF[ss.tissue] !== tt.id) {
          NE.toast(ss.tissue === 'cheek' ? '口腔皮膜細胞通常用亞甲藍液染色，細胞核會染成藍色' : ss.tissue === 'onion' ? '洋蔥表皮實驗使用碘液，細胞核染成黃褐色' : '檢驗澱粉要用碘液：澱粉遇碘呈藍紫色', 'warn', 4000);
          return;
        }
        ss.stain = tt.id;
      }
      ss.holding = ss.tool = ss.tool === tt.id ? null : tt.id; stSteps(); return;
    }
    if (!ss.holding) return;
    const dx = p.x - CV.x, dy = p.y - CV.y, h = CV.h;
    const inside = Math.abs(dx) < h && Math.abs(dy) < h;
    const edgeX = Math.abs(dy) < h && Math.abs(dx) >= h - 6 && Math.abs(dx) < h + 50;
    const edgeY = Math.abs(dx) < h && Math.abs(dy) >= h - 6 && Math.abs(dy) < h + 50;
    if (ss.holding === 'iodine' || ss.holding === 'mb') {
      if (inside) { ss.mess = true; NE.toast('不要滴在蓋玻片上面！染液進不去，還會沾到物鏡。要滴在蓋玻片「邊緣」', 'bad', 4000); return; }
      if (edgeY) { NE.toast('請在蓋玻片的左側或右側邊緣滴染液'); return; }
      if (!edgeX) return;
      const s = Math.sign(dx);
      if (ss.side && ss.side !== s) { NE.toast('染液要滴在同一側'); return; }
      ss.side = s; ss.drops.push({ y: dy }); ss.supply += 0.6;
      NE.toast('染液滴在邊緣，部分已滲入蓋玻片下', 'ok');
    } else if (ss.holding === 'paper') {
      if (!ss.drops.length) { NE.toast('先在一側滴染液，再在對側放吸水紙'); return; }
      if (!edgeX && !edgeY) { NE.toast('把吸水紙放在蓋玻片的邊緣'); return; }
      if (edgeY) { NE.toast('吸水紙要放在染液的「對側」（另一邊的左/右邊緣）'); return; }
      if (Math.sign(dx) === ss.side) { NE.toast('吸水紙放在染液同一側，會直接把染液吸走！要放在對側', 'warn', 4000); ss.supply = Math.max(0, ss.supply - 0.4); return; }
      ss.paper.push({ y: dy, t: 0 }); ss.suction += 0.65;
    }
    stSteps();
  };
  SN.cancel = function () { if (ss) ss.holding = ss.tool = null; };
  SN.draw = function (c, dt) {
    if (!ss) return;
    table(c);
    label(c, `染色：${TNAME[ss.tissue]}`, 30, 30, 22, '#24395e', 'left');
    label(c, '（俯視放大圖：中央為蓋玻片）', 30, 60, 14, '#666', 'left');
    // 流動
    if (ss.supply > 0 && ss.suction > 0 && ss.cov < 1) {
      const d = Math.min(dt * 0.16, ss.supply, ss.suction);
      ss.cov = Math.min(1, ss.cov + d); ss.supply -= d * 0.9; ss.suction -= d;
      if (ss._last !== Math.round(ss.cov * 20)) { ss._last = Math.round(ss.cov * 20); stSteps(); }
      if (ss.supply <= 0.001 && ss.cov < 0.95) { ss.supply = 0; NE.toast('染液用完了，再滴一滴', 'warn', 2000); }
      if (ss.suction <= 0.001 && ss.cov < 0.95) { ss.suction = 0; NE.toast('吸水紙吸飽了，再放一張新的吸水紙', 'warn', 2000); }
    }
    if (ss.waitT >= 0 && !ss.waited) { ss.waitT += dt; if (ss.waitT > 2.5) { ss.waited = true; NE.toast('染色完成', 'ok'); stSteps(); } }
    const h = CV.h, stainCol = ss.stain === 'mb' ? [40, 70, 190] : [150, 90, 20];
    // 玻片
    c.fillStyle = 'rgba(214,232,240,0.95)'; c.fillRect(30, CV.y - h - 50, 900, 2 * h + 100); c.strokeStyle = '#9fb7c9'; c.strokeRect(30, CV.y - h - 50, 900, 2 * h + 100);
    // 標本（示意）
    const r = NE.rng(11);
    const front = ss.side > 0 ? CV.x + h - ss.cov * 2 * h : CV.x - h + ss.cov * 2 * h;
    const stainAt = x => ss.side === 0 ? 0 : NE.clamp((ss.side > 0 ? x - front : front - x) / 50 + 0.5, 0, 1);
    for (let i = 0; i < 260; i++) {
      const x = CV.x + (r() - 0.5) * 2 * h * 0.82, y = CV.y + (r() - 0.5) * 2 * h * 0.75;
      const a = stainAt(x) * (ss.waited ? 1 : 0.7);
      if (ss.tissue === 'onion') {
        c.strokeStyle = `rgba(${Math.round(160 - a * 40)},${Math.round(150 - a * 60)},${Math.round(120 - a * 70)},${0.25 + a * 0.5})`; c.lineWidth = 1; c.strokeRect(x - 14, y - 4, 28, 8);
        c.fillStyle = `rgba(${stainCol[0]},${stainCol[1]},${stainCol[2]},${0.1 + a * 0.75})`; c.beginPath(); c.arc(x + (r() - 0.5) * 16, y, 2, 0, 7); c.fill();
      } else if (ss.tissue === 'cheek') {
        if (i % 2) continue;
        c.fillStyle = `rgba(${stainCol[0]},${stainCol[1]},${stainCol[2]},${0.05 + a * 0.18})`; c.strokeStyle = `rgba(100,110,130,${0.3 + a * 0.3})`; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); c.stroke();
        c.fillStyle = `rgba(${stainCol[0]},${stainCol[1]},${stainCol[2]},${0.1 + a * 0.8})`; c.beginPath(); c.arc(x + 1, y, 2.2, 0, 7); c.fill();
      } else {
        c.fillStyle = a > 0.05 ? `rgba(70,50,125,${0.15 + a * 0.75})` : 'rgba(250,250,250,0.8)'; c.strokeStyle = 'rgba(120,120,130,0.5)';
        c.beginPath(); c.ellipse(x, y, 3 + r() * 5, 2 + r() * 3, r() * 3, 0, 7); c.fill(); c.stroke();
      }
    }
    // 染液前緣
    if (ss.side && ss.cov > 0) {
      const x1 = ss.side > 0 ? front : CV.x - h, x2 = ss.side > 0 ? CV.x + h : front;
      c.fillStyle = `rgba(${stainCol[0]},${stainCol[1]},${stainCol[2]},0.18)`; c.fillRect(x1, CV.y - h, x2 - x1, 2 * h);
    }
    // 蓋玻片
    c.fillStyle = 'rgba(235,248,255,0.25)'; c.strokeStyle = 'rgba(100,150,200,0.95)'; c.lineWidth = 3; c.fillRect(CV.x - h, CV.y - h, 2 * h, 2 * h); c.strokeRect(CV.x - h, CV.y - h, 2 * h, 2 * h);
    label(c, '蓋玻片', CV.x, CV.y - h - 18, 14, '#46637a');
    // 染液滴
    ss.drops.forEach(d => { c.fillStyle = `rgba(${stainCol[0]},${stainCol[1]},${stainCol[2]},${0.25 + Math.min(0.5, ss.supply)})`; c.beginPath(); c.ellipse(CV.x + ss.side * (h + 18), CV.y + d.y, 22, 30, 0, 0, 7); c.fill(); });
    // 吸水紙
    ss.paper.forEach(pp => {
      const x = CV.x - ss.side * (h + 40); pp.t += dt;
      c.save(); c.translate(x, CV.y + pp.y); c.fillStyle = '#fdf3f6'; c.strokeStyle = '#e3b6c4'; rr(c, -28, -70, 56, 140, 4); c.fill(); c.stroke();
      c.fillStyle = `rgba(${stainCol[0]},${stainCol[1]},${stainCol[2]},${Math.min(0.5, pp.t * 0.08)})`; rr(c, ss.side > 0 ? 6 : -28, -60, 22, 120, 4); c.fill(); c.restore();
    });
    if (ss.cov > 0 && ss.cov < 0.95 && ss.supply > 0 && ss.suction > 0) {
      c.strokeStyle = 'rgba(30,60,120,0.7)'; c.lineWidth = 3;
      for (let i = -1; i <= 1; i++) { const y = CV.y + i * 90, x = front; c.beginPath(); c.moveTo(x + ss.side * 30, y); c.lineTo(x - ss.side * 10, y); c.lineTo(x, y - 8); c.moveTo(x - ss.side * 10, y); c.lineTo(x, y + 8); c.stroke(); }
    }
    if (ss.waitT >= 0 && !ss.waited) { c.save(); c.translate(1020, 200); ICON.clock(c); c.rotate(ss.waitT * 2.4); c.restore(); label(c, '靜置中…', 1020, 240, 16, '#555'); }
    tray(c, stools, ss.tool);
    const m = Host.mouse;
    if (ss.holding && m) { c.save(); c.translate(m.x + 18, m.y - 18); c.globalAlpha = 0.9; (ss.holding === 'paper' ? ICON.paper : ICON.dropper)(c, ss.stain === 'mb' ? 'rgba(40,70,190,0.8)' : 'rgba(150,90,20,0.8)'); c.restore(); }
  };
  function showFinish() {
    ss.done = true;
    const p = Object.assign({}, ss.base, { stain: STAIN_OF[ss.tissue], stainFront: 11000 - ss.cov * 22000, stainDir: ss.side, name: '我的染色玻片（' + TNAME[ss.tissue] + '）', desc: `${STAIN_NAME[STAIN_OF[ss.tissue]]}染色，染色範圍 ${Math.round(ss.cov * 100)}%`, dot: ss.stain === 'mb' ? '#3b5bc4' : ss.tissue === 'potato' ? '#46327a' : '#b97a2e' });
    NE.makeUserSlide('my_stained', p);
    const res = NE.$('#result', sp);
    res.innerHTML = `<div class="result ok">染色${ss.cov > 0.95 ? '完成' : '只完成一部分（染液沒有流過整個蓋玻片，顯微鏡下會看到一半有染色、一半沒有）'}！</div>`;
    const row = NE.h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
    row.appendChild(NE.btn('🔬 放到顯微鏡上觀察', () => { NE.go('free'); NE.quickSetup({ slide: 'my_stained', obj: 0, focus: false, reload: true }); NE.toast('已放上你的染色玻片（4X），請自己對焦', 'ok', 4000); }, 'primary'));
    row.appendChild(NE.btn('重新染色', () => begin(ss.k)));
    res.appendChild(row);
  }
})(window.NE);
