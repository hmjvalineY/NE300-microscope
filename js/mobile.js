/* 手機版（橫向）與 PWA：版面切換、抽屜、觸控提示、安裝按鈕、離線快取 */
(function (NE) {
  const body = document.body;
  // 橫向手機（高度小）或很窄的螢幕 → 手機版
  const mq = window.matchMedia('(max-height: 560px), (max-width: 760px)');
  NE.isMobile = () => body.classList.contains('m');

  function apply() {
    const m = mq.matches;
    body.classList.toggle('m', m);
    if (!m) body.classList.remove('nav-open', 'lesson-open', 'ctl-open');
    const hint = NE.$('#three-wrap .hint3d');
    if (hint) hint.textContent = m ? '單指旋轉｜雙指縮放｜拖曳旋鈕可直接操作' : '拖曳空白處旋轉｜右鍵平移｜滾輪縮放｜拖曳或滾動旋鈕可直接操作';
    if (NE.model) setTimeout(() => NE.model.invalidate(), 60);
  }
  // 抽屜：nav（章節）、lesson（說明與任務）、ctl（操作面板）
  NE.drawer = function (which, on) {
    const cls = which + '-open';
    const want = on == null ? !body.classList.contains(cls) : on;
    if (want && which !== 'ctl') ['nav', 'lesson'].forEach(w => { if (w !== which) body.classList.remove(w + '-open'); });
    if (want && which === 'ctl') body.classList.remove('nav-open', 'lesson-open');
    if (want && which !== 'ctl') body.classList.remove('ctl-open');
    body.classList.toggle(cls, want);
  };
  NE.closeDrawers = () => body.classList.remove('nav-open', 'lesson-open', 'ctl-open');

  function lessonCloseBar() {
    const el = NE.$('#lesson');
    if (!el || el.querySelector('.lesson-close')) return;
    const bar = NE.h('div', { class: 'lesson-close' }, '<span>📖 說明與任務</span>');
    const x = NE.h('button', { class: 'btn sm' }, '✕ 關閉，回到顯微鏡'); x.onclick = () => NE.drawer('lesson', false);
    bar.appendChild(x); el.insertBefore(bar, el.firstChild);
  }

  // ---- 安裝成 App（PWA） ----
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let deferred = null;
  function installHelp() {
    const ios = `<ol style="line-height:1.9"><li>用 <b>Safari</b> 開啟本網頁</li><li>點下方的 <b>分享</b> 按鈕（方框加向上箭頭）</li><li>選「<b>加入主畫面</b>」→「新增」</li><li>回到主畫面，點「NE300顯微鏡」圖示即可像 App 一樣使用</li></ol>`;
    const other = `<ol style="line-height:1.9"><li>用 <b>Chrome</b> 或 <b>Edge</b> 開啟本網頁</li><li>點右上角選單（⋮）</li><li>選「<b>安裝應用程式</b>」或「<b>加到主畫面</b>」</li></ol>`;
    NE.modal('📲 安裝成 App', `<p>安裝後會出現在手機主畫面，開啟時沒有網址列、畫面更大，而且<b>沒有網路也能使用</b>。</p>${isIOS ? ios : other}`, [{ text: '知道了', primary: true }])
      .querySelector('h3').style.color = 'var(--accent)';
  }
  function setupInstall() {
    const btn = NE.$('#btn-install');
    if (!btn) return;
    const show = () => { if (!standalone()) btn.hidden = false; };
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; show(); });
    window.addEventListener('appinstalled', () => { btn.hidden = true; deferred = null; NE.toast('已安裝！可以從主畫面開啟「NE300顯微鏡」', 'ok', 4000); });
    if (isIOS && /^https?:/.test(location.protocol)) show();
    btn.onclick = async () => {
      if (deferred) {
        deferred.prompt();
        try { const r = await deferred.userChoice; if (r.outcome === 'accepted') btn.hidden = true; } catch (e) { }
        deferred = null;
      } else installHelp();
    };
    NE.installHelp = installHelp;
  }
  // 安裝後（獨立視窗）在手機上盡量鎖定橫向
  function lockLandscape() {
    if (!standalone() || !NE.isMobile()) return;
    try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); p && p.catch && p.catch(() => { }); } catch (e) { }
  }

  // ---- 離線快取（Service Worker） ----
  function setupSW() {
    if (!('serviceWorker' in navigator) || !/^https?:/.test(location.protocol)) return;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
    navigator.serviceWorker.register('sw.js').then(reg => {
      const ask = w => NE.modal('🔄 有新版本', '<p>網頁內容已經更新，要現在重新載入嗎？（你在本機的校正與測量紀錄會保留）</p>', [{ text: '稍後' }, { text: '立即更新', primary: true, fn: () => w.postMessage('skipWaiting') }]).querySelector('h3').style.color = 'var(--accent)';
      if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) ask(nw); });
      });
    }).catch(() => { });
  }

  NE.initMobile = function () {
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
    NE.$('#btn-ctl').onclick = () => NE.drawer('ctl');
    NE.$('#btn-lesson').onclick = () => NE.drawer('lesson');
    NE.$('#drawer-mask').onclick = () => body.classList.remove('nav-open', 'lesson-open');
    NE.$('#rh-ok').onclick = () => body.classList.add('portrait-ok');
    NE.on('change', what => { if (what === 'chapter') lessonCloseBar(); });
    // 3D 相機按鈕：手機上把較少用的收起來
    NE.$$('#cam-btns button').forEach(b => { if (/上方|背面/.test(b.textContent)) b.classList.add('cb-extra'); });
    NE.$('#eye-wrap').appendChild(NE.h('div', { class: 'eye-touch-hint' }, '上下拖曳視野＝細調'));
    // 手機上沒有滑鼠游標提示：點零件時顯示名稱與用法
    NE.on('partClick', p => {
      if (!NE.isMobile()) return;
      const h = NE.PART_HINT && NE.PART_HINT[p];
      if (h) NE.toast(`<b>${h[0]}</b>　${h[1]}`, '', 2600);
    });
    window.addEventListener('pointerdown', lockLandscape, { once: true });
    setupInstall();
    setupSW();
    lessonCloseBar();
  };
})(window.NE);
