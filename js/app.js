/* 主程式：章節導覽、設定、初始化 */
(function (NE) {
  NE.resetScope = function () {
    Object.assign(NE.S, {
      power: false, bright: 0, aperture: 0.25, obj: 0, focusZ: 12000, stageX: 0, stageY: 0, slide: null, clip: false, clipOpen: false, seat: 1, badSeat: 0,
      reticle: false, eyeRot: 0, ipd: 70, oil: false, oilOn40: false, lock: false, cracked: false,
      usedCoarseSinceObj: false, powerOnBright: 0, powerOffBright: undefined, target: null
    });
    NE.changed('reset');
    if (NE.curChapter && NE.curChapter.mode !== 'scene') NE.go(NE.curChapter.id);
  };

  let cur = null;
  NE.go = function (id) {
    const ch = NE.CHAPTERS.find(c => c.id === id) || NE.CHAPTERS[0];
    if (cur && cur.leave) cur.leave();
    cur = NE.curChapter = ch;
    NE.$$('#nav .item').forEach(it => it.classList.toggle('active', it.dataset.id === ch.id));
    try { history.replaceState(null, '', '#' + ch.id); } catch (e) { }
    const scene = ch.mode === 'scene';
    NE.$('#bench').style.display = scene ? 'none' : '';
    NE.$('#scene-wrap').hidden = !scene;
    NE.benchVisible = !scene;
    const el = NE.$('#lesson'); el.scrollTop = 0; el.innerHTML = '';
    ch.enter(el);
    if (NE.model) NE.model.invalidate();
    NE.changed('chapter');
    document.body.classList.remove('nav-expanded');
  };
  let pend = false;
  function runChecks() {
    if (!cur) return;
    cur.tasks && cur.tasks.check();
    cur.tasks2 && cur.tasks2.check();
    cur.onChange && cur.onChange();
  }
  function throttled() { if (pend) return; pend = true; setTimeout(() => { pend = false; runChecks(); }, 120); }

  function buildNav() {
    const nav = NE.$('#nav');
    NE.CHAPTERS.forEach(c => {
      if (c.sec) nav.appendChild(NE.h('div', { class: 'sec' }, c.sec));
      const it = NE.h('div', { class: 'item', 'data-id': c.id, title: c.title }, `<span class="ic">${c.ic}</span><span class="tx">${c.title}</span>`);
      it.onclick = () => NE.go(c.id);
      nav.appendChild(it);
    });
  }
  function settings() {
    const m = NE.modal('設定', `
      <label style="display:block;margin:8px 0"><input type="checkbox" id="s-err" ${NE.settings.realErr ? 'checked' : ''}> 模擬物鏡實際倍率的誤差（每台顯微鏡不同，需實際校正）</label>
      <p style="font-size:13px;color:#666">取消勾選則使用理論值：4X 每格 25 µm、10X 10 µm、40X 2.5 µm、100X 1 µm。</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        <button class="btn" id="s-clr">清除校正與測量紀錄</button>
        <button class="btn" id="s-new">換一台顯微鏡（重新抽誤差與絲線順序）</button>
        <button class="btn" id="s-ans">教師：顯示本機正確校正值</button>
      </div><div id="s-out" style="margin-top:8px"></div>`, [{ text: '關閉', primary: true }]);
    m.querySelector('h3').style.color = 'var(--accent)';
    NE.$('#s-err', m).onchange = e => {
      NE.settings.realErr = e.target.checked; NE.store.set('settings', NE.settings); NE.rebuildCal();
      NE.userCal = [null, null, null, null]; NE.saveUserCal(); NE.changed('cal');
      NE.toast('已更新設定，校正紀錄已清除'); if (cur) NE.go(cur.id);
    };
    NE.$('#s-clr', m).onclick = () => { NE.userCal = [null, null, null, null]; NE.saveUserCal(); NE.store.set('records', []); NE.toast('已清除'); setTimeout(() => location.reload(), 600); };
    NE.$('#s-new', m).onclick = () => { NE.store.set('seed', (Math.random() * 1e9) | 0); NE.userCal = [null, null, null, null]; NE.saveUserCal(); location.reload(); };
    NE.$('#s-ans', m).onclick = () => {
      NE.$('#s-out', m).innerHTML = '<table class="t"><tr><th>物鏡</th><th>重合</th><th>每格</th></tr>' + NE.CAL.map((c, i) => `<tr><td>${NE.OBJ[i].mag}X</td><td>目鏡 ${c.oc} 格 = 載物臺 ${c.st} 格</td><td>${NE.fmt(c.um, 2)} µm</td></tr>`).join('') + `</table><p style="font-size:13px">三色絲線由上而下：${[2, 1, 0].map(k => NE.THREAD_COL[NE.threadOrder[k]][0]).join('、')}</p>`;
    };
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (!window.THREE) {
      document.body.innerHTML = '<div style="padding:40px;font-size:18px">無法載入 3D 函式庫（js/vendor/three.min.js）。請確認資料夾完整，或連上網路後重新整理。</div>';
      return;
    }
    NE.initBench();
    NE.initWizard();
    buildNav();
    NE.on('change', runChecks);
    NE.on('eyeRendered', throttled);
    NE.on('partClick', p => cur && cur.onPart && cur.onPart(p));
    NE.on('eyeClick', e => cur && cur.onEye && cur.onEye(e));
    NE.$('#btn-nav').onclick = () => { document.body.classList.toggle(window.innerWidth <= 1440 ? 'nav-expanded' : 'nav-collapsed'); setTimeout(() => NE.model.invalidate(), 50); };
    NE.$('#btn-reset').onclick = () => NE.resetScope();
    NE.$('#btn-set').onclick = settings;
    NE.$('#btn-help').onclick = () => NE.modal('使用說明', `<ul style="line-height:1.8">
      <li>左側選擇章節；右側是說明與任務，完成會自動打勾。</li>
      <li><b>3D 模型</b>：拖曳空白處旋轉、右鍵平移、滾輪縮放；拖曳或滾動旋鈕可直接操作。</li>
      <li><b>目鏡視野</b>：滾輪＝細調（Shift＝粗調）；🔍 放大鏡方便讀刻度。</li>
      <li>鍵盤：方向鍵移動玻片、PgUp/PgDn 粗調、+/- 細調、1–4 換物鏡。</li>
      <li>依據：TEKFAR NE300 規格（物鏡 PLAN 4X/10X/40X/100X、目鏡 10X FN20、粗調 37.7 mm/圈、細調 0.2 mm/圈）。</li></ul>`, [{ text: '開始使用', primary: true }]);
    const id = (location.hash || '').slice(1);
    NE.go(NE.CHAPTERS.some(c => c.id === id) ? id : 'intro');
  });
})(window.NE);
