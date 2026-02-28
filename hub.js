// Mobile Automation Hub — resilient + mobile-friendly UI
// Host this file (GitHub raw or jsDelivr) and call it with a short loader bookmarklet.
(function(){
  if(window.__MOBILE_AUTOMATION_HUB_RUNNING__) return;
  window.__MOBILE_AUTOMATION_HUB_RUNNING__ = true;

  // ---- Config ----
  const ID = '__mob_auto_hub_v2';
  const STYLE_ID = ID + '_styles';
  const REATTACH_CHECK_MS = 1200;
  const SCAN_DEBOUNCE_MS = 600;
  const AUTO_SCROLL_INTERVAL_MS = 900;
  const MAX_COLLECT = 1000; // prevents runaway memory on mobile

  // ---- Helpers ----
  function $el(tag, attrs = {}, css = {}) {
    const e = document.createElement(tag);
    for(const k in attrs) e[k] = attrs[k];
    Object.assign(e.style, css);
    return e;
  }
  function norm(url){
    try{ const u = new URL(url, location.href); u.hash=''; u.search=''; return u.href; }
    catch(e){ return null; }
  }
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), ms); }; }

  // ---- inject safe styles once ----
  if(!document.getElementById(STYLE_ID)){
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      /* Hub v2 mobile styles */
      #${ID} *{ box-sizing:border-box; -webkit-tap-highlight-color: transparent; }
      #${ID} { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; position: fixed; top:6vh; left:4vw; width:92vw; max-width:560px; border-radius:12px; z-index:2147483646 !important; box-shadow: 0 18px 60px rgba(0,0,0,0.6); }
      #${ID}.collapsed { height: 56px; overflow: visible; border-radius:12px; }
      #${ID} .hub-area { background: linear-gradient(180deg, rgba(20,22,24,0.98), rgba(10,12,14,0.98)); padding:12px; color:#e6eef8; border:1px solid rgba(255,255,255,0.03); max-height:84vh; overflow:hidden; display:flex; flex-direction:column; gap:10px;}
      #${ID} .row { display:flex; gap:8px; align-items:center; }
      #${ID} .title { font-weight:700; font-size:15px; flex:1; }
      #${ID} button { padding:10px 12px; border-radius:10px; border:none; font-weight:700; font-size:14px; }
      #${ID} button.small { padding:8px 10px; font-size:13px; }
      #${ID} .btn-primary { background:#0b84ff; color:white; }
      #${ID} .btn-ghost { background:rgba(255,255,255,0.04); color:#dfe; border:1px solid rgba(255,255,255,0.02); }
      #${ID} .status { font-size:12px; color:#9fb0c8; }
      #${ID} textarea { background:#050607; color:#7fff9b; border-radius:8px; border:1px solid rgba(255,255,255,0.03); padding:8px; font-family: monospace; font-size:12px; width:100%; height:140px; resize: vertical; }
      #${ID} .controls { display:flex; gap:6px; flex-wrap:wrap; }
      #${ID} .hint { font-size:11px; color:#aabccf; }
      #${ID} .compact { display:flex; gap:8px; align-items:center; }
    `;
    (document.head || document.documentElement).appendChild(s);
  }

  // ---- root node creation ----
  function buildUI(){
    // if existing element was removed by page re-render, create a fresh one
    let root = document.getElementById(ID);
    if(root) return root;
    root = $el('div', { id: ID }, { position:'fixed', right:'4vw', bottom:'6vh', width:'92vw', maxWidth:'520px', zIndex:'2147483646', touchAction:'manipulation' });
    const area = $el('div', { className: 'hub-area' });
    // Header
    const header = $el('div', { className:'row' });
    const title = $el('div', { className:'title' });
    title.textContent = '📥 Mobile Automation Hub';
    const closeBtn = $el('button', { className:'small btn-ghost' });
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', destroy);
    header.appendChild(title);
    header.appendChild(closeBtn);

    // status
    const status = $el('div', { className:'status' });
    status.textContent = 'ready — tap Scan';

    // controls
    const controls = $el('div', { className:'controls' });

    const scanBtn = $el('button', { className:'btn-primary' });
    scanBtn.textContent = 'Scan';
    const autoScrollBtn = $el('button', { className:'btn-ghost' });
    autoScrollBtn.textContent = 'Auto-Scroll: Off';
    const stopBtn = $el('button', { className:'small btn-ghost' });
    stopBtn.textContent = 'Stop';
    const copyBtn = $el('button', { className:'small btn-ghost' });
    copyBtn.textContent = 'Copy';
    const exportBtn = $el('button', { className:'small btn-ghost' });
    exportBtn.textContent = 'Export .txt';
    const collapseBtn = $el('button', { className:'small btn-ghost' });
    collapseBtn.textContent = 'Hide';

    controls.append(scanBtn, autoScrollBtn, copyBtn, exportBtn, stopBtn, collapseBtn);

    // output
    const out = $el('textarea');
    out.readOnly = true;
    out.placeholder = 'Collected links will appear here...';

    const hint = $el('div', { className:'hint' });
    hint.textContent = 'Tip: Tap Auto-Scroll then stop it after a few scrolls. Select fewer than ~50 items before exporting on mobile.';

    area.append(header, status, controls, out, hint);
    root.appendChild(area);

    // attach to documentElement (safer for sites that rewrite body)
    (document.documentElement || document.body || document).appendChild(root);

    // make draggable on touch devices (small)
    makeDraggable(root);

    // return elements for binding
    return { root, status, scanBtn, autoScrollBtn, stopBtn, copyBtn, exportBtn, collapseBtn, out };
  }

  function makeDraggable(node){
    let startX=0, startY=0, origX=0, origY=0, dragging=false;
    node.addEventListener('touchstart', (ev)=>{
      if(ev.touches.length !== 1) return;
      dragging = true;
      startX = ev.touches[0].clientX;
      startY = ev.touches[0].clientY;
      const rect = node.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
    }, { passive:true });
    node.addEventListener('touchmove', (ev)=>{
      if(!dragging) return;
      const dx = ev.touches[0].clientX - startX;
      const dy = ev.touches[0].clientY - startY;
      node.style.left = Math.min(Math.max(6, origX + dx), window.innerWidth - node.offsetWidth - 6) + 'px';
      node.style.top = Math.min(Math.max(6, origY + dy), window.innerHeight - node.offsetHeight - 6) + 'px';
    }, { passive:true });
    node.addEventListener('touchend', ()=> dragging = false, { passive:true });
  }

  // ---- collector state ----
  const collected = new Set();
  let scanCount = 0;
  let scrollTarget = null;
  let autoScrollTimer = null;
  let lastManualScrollTime = 0;

  // detect best scrollable container (tries to find element that scrolls)
  function detectScrollContainer(){
    // candidates: main, [role="main"], elements with overflow:auto / scroll and height > 200
    const candidates = [];
    const mains = document.querySelectorAll('main, [role="main"]');
    mains.forEach(n => candidates.push(n));
    // look for elements with scrolling
    const all = Array.from(document.querySelectorAll('div, section, article'));
    all.forEach(el=>{
      const st = getComputedStyle(el);
      if(!st) return;
      const overflow = (st.overflow + st.overflowY + st.overflowX).toLowerCase();
      if(overflow.includes('auto') || overflow.includes('scroll')){
        const h = el.clientHeight || el.offsetHeight;
        if(h > Math.min(200, window.innerHeight * 0.3)) candidates.push(el);
      }
    });
    // pick the candidate with largest height
    let best = window;
    let bestH = 0;
    candidates.forEach(c=>{
      const h = (c === window) ? window.innerHeight : (c.clientHeight || 0);
      if(h > bestH){
        best = c;
        bestH = h;
      }
    });
    scrollTarget = best || window;
    return scrollTarget;
  }

  // ---- scanning logic (lightweight) ----
  function scanOnce(){
    // don't overrun memory
    if(collected.size >= MAX_COLLECT) return;
    const host = location.hostname || '';
    // get images, sources, links
    const nodes = document.querySelectorAll('img, source, video, a');
    nodes.forEach(node => {
      if(collected.size >= MAX_COLLECT) return;
      let candidate = node.src || node.getAttribute && node.getAttribute('href') || node.currentSrc || node.dataset && (node.dataset.src||node.dataset.url);
      if(!candidate && node.tagName === 'VIDEO') {
        const s = node.querySelector('source');
        if(s) candidate = s.src;
      }
      if(!candidate) return;
      // Pinterest special-case: replace size path with originals if plausible
      if(candidate.includes('pinimg.com')) {
        candidate = candidate.replace(/\/(236x|474x|736x|originals|280x|564x)\//i, '/originals/');
      }
      // normalize & dedupe
      const n = norm(candidate);
      if(!n) return;
      if(!collected.has(n)){
        collected.add(n);
        scanCount++;
      }
    });
    // update UI
    updateOutput();
  }

  const debouncedScan = debounce(scanOnce, SCAN_DEBOUNCE_MS);

  function updateOutput(){
    const uiEls = document.getElementById(ID);
    if(!uiEls) return;
    const out = uiEls.querySelector('textarea');
    if(!out) return;
    out.value = Array.from(collected).join('\n');
    const status = uiEls.querySelector('.status');
    if(status) status.textContent = `collected ${collected.size} links (scans: ${scanCount})`;
  }

  // ---- auto-scroll ----
  function startAutoScroll(){
    if(autoScrollTimer) return;
    detectScrollContainer();
    const target = scrollTarget || window;
    autoScrollTimer = setInterval(()=> {
      // if user scrolled manually recently, pause auto scroll briefly
      if(Date.now() - lastManualScrollTime < 800) return;
      try{
        if(target === window) window.scrollBy({ top: Math.round(window.innerHeight * 0.6), behavior: 'smooth' });
        else target.scrollBy({ top: Math.round(target.clientHeight * 0.6), behavior: 'smooth' });
      }catch(e){
        // fallback simple
        if(target === window) window.scrollBy(0, Math.round(window.innerHeight * 0.6));
        else target.scrollTop += Math.round(target.clientHeight * 0.6);
      }
      debouncedScan();
    }, AUTO_SCROLL_INTERVAL_MS);
    // mark button
    const b = document.getElementById(ID).querySelector('button.btn-ghost');
    if(b) b.textContent = 'Auto-Scroll: On';
  }

  function stopAutoScroll(){
    if(autoScrollTimer) { clearInterval(autoScrollTimer); autoScrollTimer = null; }
    const b = document.getElementById(ID).querySelector('button.btn-ghost');
    if(b) b.textContent = 'Auto-Scroll: Off';
  }

  // detect manual scrolling to temporarily suspend auto scroll
  window.addEventListener('scroll', ()=> { lastManualScrollTime = Date.now(); }, { passive:true });
  window.addEventListener('touchmove', ()=> { lastManualScrollTime = Date.now(); }, { passive:true });

  // ---- robust re-attach: if hub removed by SPA re-render, put it back ----
  let uiBuilt = null;
  function ensureAttached(){
    uiBuilt = buildUI();
    // attach events once
    attachBindings(uiBuilt);
    // observe documentElement to reattach if removed
    const obs = new MutationObserver(()=> {
      const root = document.getElementById(ID);
      if(!root) {
        // re-create
        uiBuilt = buildUI();
        attachBindings(uiBuilt);
      }
    });
    try{ obs.observe(document.documentElement || document.body, { childList:true, subtree:true }); }catch(e){}
  }

  // ---- actions ----
  function attachBindings(ui){
    if(!ui) ui = buildUI();
    const { root } = ui;
    const scanBtn = root.querySelector('button.btn-primary');
    const autoBtn = root.querySelector('button.btn-ghost');
    const stopBtn = root.querySelector('button.small');
    const copyBtn = root.querySelectorAll('button.small')[1];
    const exportBtn = root.querySelectorAll('button.small')[2];
    const collapseBtn = root.querySelectorAll('button.small')[3];
    const out = root.querySelector('textarea');
    const status = root.querySelector('.status');

    // prevent multiple bindings
    if(scanBtn._bound) return;
    scanBtn._bound = true;

    scanBtn.addEventListener('click', ()=> {
      debouncedScan();
      status.textContent = 'Scanning...';
      // small visual bounce
      scanBtn.style.transform = 'scale(0.98)';
      setTimeout(()=> scanBtn.style.transform = '', 140);
      setTimeout(()=> status.textContent = `collected ${collected.size} links`, 600);
    });

    autoBtn.addEventListener('click', ()=> {
      if(autoScrollTimer) { stopAutoScroll(); } else { startAutoScroll(); }
    });

    stopBtn.addEventListener('click', ()=> {
      stopAutoScroll();
      status.textContent = 'Stopped';
    });

    copyBtn.addEventListener('click', async ()=> {
      try{
        await navigator.clipboard.writeText(out.value || '');
        status.textContent = 'Copied links to clipboard';
      }catch(e){
        status.textContent = 'Clipboard blocked — long-press to copy';
        // fallback: select text
        out.focus(); out.select();
      }
    });

    exportBtn.addEventListener('click', ()=> {
      const txt = out.value || '';
      if(!txt.trim()){
        status.textContent = 'No links to export';
        return;
      }
      const blob = new Blob([txt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media_links_${Date.now()}.txt`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      status.textContent = 'Exported .txt';
    });

    collapseBtn.addEventListener('click', ()=> {
      const rootEl = document.getElementById(ID);
      if(!rootEl) return;
      if(rootEl.classList.contains('collapsed')){
        rootEl.classList.remove('collapsed');
        collapseBtn.textContent = 'Hide';
      } else {
        rootEl.classList.add('collapsed');
        collapseBtn.textContent = 'Show';
      }
    });

    // if out is editable in some pages, ensure readOnly
    out.readOnly = true;
    // touch-friendly improvements: allow tap to focus & select
    out.addEventListener('touchstart', ()=> { out.focus(); out.select(); });

    // quick initial scan to pick up current view
    debouncedScan();

    // observe DOM changes near viewport to trigger scans but debounce
    const m = new MutationObserver(debounce(()=> debouncedScan(), 500));
    try{ m.observe(document.documentElement || document.body, { childList:true, subtree:true }); }catch(e){}
  }

  // destroy hub safely
  function destroy(){
    stopAutoScroll();
    const root = document.getElementById(ID);
    if(root) root.remove();
    try{ delete window.__MOBILE_AUTOMATION_HUB_RUNNING__; }catch(e){}
  }

  // kick off
  ensureAttached();

  // safety: if hosting page navigates single-page, keep hub alive; remove after long time if needed
  setTimeout(()=> {
    if(!document.getElementById(ID)){
      ensureAttached();
    }
  }, REATTACH_CHECK_MS);

  // never leak globals beyond this (small)
})();
