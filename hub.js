Javascript:(function(){
/* ===== Automation Hub — All-in (no NSFW detection) =====
   Paste this into address bar or save as a bookmark.
   Copyright: you. Use responsibly.
*/
if(window.__AUTOMATION_HUB_RUNNING__) { alert("Automation Hub already running"); throw "already running"; }
window.__AUTOMATION_HUB_RUNNING__ = true;

(async ()=>{

/* --------- Config & libs --------- */
const JSZIP_CDN = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
const UI_CSS = `
position:fixed; top:2%; left:2%; width:420px; max-height:92vh; background:#0f1113; color:#e6eef8;
z-index:2147483647; border-radius:12px; padding:14px; font-family:system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
box-shadow:0 20px 60px rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.04); overflow:hidden;
display:flex; flex-direction:column; gap:8px;
`;
const smallBtnCSS = "padding:8px 10px; border-radius:8px; border:none; cursor:pointer; font-weight:600;";
const HOST = location.hostname;

/* load JSZip if not present */
if(!window.JSZip){
  await new Promise((res,rej)=>{
    const s = document.createElement('script');
    s.src = JSZIP_CDN;
    s.onload = ()=> res();
    s.onerror = ()=> rej("Failed loading JSZip");
    document.head.appendChild(s);
  }).catch(e=>{ alert("Failed to load JSZip: "+e); });
}

/* --------- DOM UI --------- */
const container = document.createElement('div');
container.id = "__automation_hub_container";
container.style.cssText = UI_CSS;

const header = document.createElement('div');
header.style.display='flex'; header.style.justifyContent='space-between'; header.style.alignItems='center';

const title = document.createElement('div');
title.innerHTML = '<strong>🚀 Automation Hub — Pro</strong>';
title.style.fontSize='14px';
const hdrRight = document.createElement('div');

const closeBtn = document.createElement('button');
closeBtn.textContent = '✕';
closeBtn.style.cssText = smallBtnCSS + "background:#222;color:#fff";
hdrRight.appendChild(closeBtn);

header.appendChild(title); header.appendChild(hdrRight);

/* status row */
const statusRow = document.createElement('div');
statusRow.style.fontSize='12px'; statusRow.style.color='#9fb0c8';
statusRow.textContent = `Host: ${HOST} — idle`;

/* control row */
const controlRow = document.createElement('div');
controlRow.style.display='flex'; controlRow.style.gap='6px'; controlRow.style.flexWrap='wrap';

const autoScanBtn = document.createElement('button'); autoScanBtn.textContent='Auto'; autoScanBtn.style.cssText = smallBtnCSS + "background:#0066ff;color:#fff";
const pinterestBtn = document.createElement('button'); pinterestBtn.textContent='Pinterest'; pinterestBtn.style.cssText = smallBtnCSS + "background:#bd081c;color:#fff";
const redditBtn = document.createElement('button'); redditBtn.textContent='Reddit'; redditBtn.style.cssText = smallBtnCSS + "background:#ff4500;color:#fff";
const imgurBtn = document.createElement('button'); imgurBtn.textContent='Imgur'; imgurBtn.style.cssText = smallBtnCSS + "background:#2d9cdb;color:#fff";
const instagramBtn = document.createElement('button'); instagramBtn.textContent='Instagram'; instagramBtn.style.cssText = smallBtnCSS + "background:#833AB4;color:#fff";
const twitterBtn = document.createElement('button'); twitterBtn.textContent='Twitter/X'; twitterBtn.style.cssText = smallBtnCSS + "background:#1da1f2;color:#fff";
const genericBtn = document.createElement('button'); genericBtn.textContent='Generic'; genericBtn.style.cssText = smallBtnCSS + "background:#444;color:#fff";
const loadMoreBtn = document.createElement('button'); loadMoreBtn.textContent='Auto LoadMore'; loadMoreBtn.style.cssText = smallBtnCSS + "background:#2b2;color:#000";

/* settings row */
const settingsRow = document.createElement('div');
settingsRow.style.display='flex'; settingsRow.style.gap='8px'; settingsRow.style.alignItems='center';

const concurrencyLabel = document.createElement('label'); concurrencyLabel.style.fontSize='12px'; concurrencyLabel.style.color='#bcd';
concurrencyLabel.innerHTML = 'Concurrency: <input id="hub_conc" type="number" value="4" min="1" max="12" style="width:52px;margin-left:6px"/>';
const retryLabel = document.createElement('label'); retryLabel.style.fontSize='12px'; retryLabel.style.color='#bcd';
retryLabel.innerHTML = 'Retries: <input id="hub_retry" type="number" value="2" min="0" max="6" style="width:48px;margin-left:6px"/>';
const delayLabel = document.createElement('label'); delayLabel.style.fontSize='12px'; delayLabel.style.color='#bcd';
delayLabel.innerHTML = 'Delay(ms): <input id="hub_delay" type="number" value="200" min="0" max="5000" style="width:64px;margin-left:6px"/>';

settingsRow.append(concurrencyLabel, retryLabel, delayLabel);

/* proxy input */
const proxyRow = document.createElement('div');
proxyRow.style.display='flex'; proxyRow.style.gap='6px';
const proxyInput = document.createElement('input'); proxyInput.placeholder = 'Proxy prefix (optional) e.g. https://your-proxy.com/fetch?url=';
proxyInput.style.cssText = "flex:1; padding:8px; border-radius:8px; background:#0b0b0b; border:1px solid #222; color:#ddd;";
const proxyNote = document.createElement('div'); proxyNote.style.fontSize='11px'; proxyNote.style.color='#a88'; proxyNote.textContent='Provide a proxy prefix only if you control/trust it. Proxying may expose data.';
proxyRow.append(proxyInput);

/* gallery and controls */
const galleryWrap = document.createElement('div');
galleryWrap.style.cssText = "flex:1; overflow:auto; background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); padding:8px; border-radius:8px; border:1px solid rgba(255,255,255,0.02);";

const galleryControls = document.createElement('div'); galleryControls.style.display='flex'; galleryControls.style.gap='6px'; galleryControls.style.marginBottom='6px';

const selectAllBtn = document.createElement('button'); selectAllBtn.textContent='Select All'; selectAllBtn.style.cssText = smallBtnCSS + "background:#2b6;color:#000";
const invertBtn = document.createElement('button'); invertBtn.textContent='Invert'; invertBtn.style.cssText = smallBtnCSS + "background:#666;color:#fff";
const copyLinksBtn = document.createElement('button'); copyLinksBtn.textContent='Copy Links'; copyLinksBtn.style.cssText = smallBtnCSS + "background:#444;color:#fff";
const exportTxtBtn = document.createElement('button'); exportTxtBtn.textContent='Export .txt'; exportTxtBtn.style.cssText = smallBtnCSS + "background:#0066ff;color:#fff";
const exportCsvBtn = document.createElement('button'); exportCsvBtn.textContent='Export .csv'; exportCsvBtn.style.cssText = smallBtnCSS + "background:#0066ff;color:#fff";
const downloadSelBtn = document.createElement('button'); downloadSelBtn.textContent='Download selected (ZIP)'; downloadSelBtn.style.cssText = smallBtnCSS + "background:#0b8;color:#000";
const downloadAllBtn = document.createElement('button'); downloadAllBtn.textContent='Download all (ZIP)'; downloadAllBtn.style.cssText = smallBtnCSS + "background:#0b8;color:#000";
const stopAllBtn = document.createElement('button'); stopAllBtn.textContent='Stop'; stopAllBtn.style.cssText = smallBtnCSS + "background:#b33;color:#fff";

galleryControls.append(selectAllBtn, invertBtn, copyLinksBtn, exportTxtBtn, exportCsvBtn, downloadSelBtn, downloadAllBtn, stopAllBtn);

/* gallery grid */
const galleryGrid = document.createElement('div');
galleryGrid.style.cssText = "display:grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap:8px;";

/* footer log */
const footer = document.createElement('div');
footer.style.fontSize='12px'; footer.style.color='#9fb0c8'; footer.textContent = "Log: ready";

/* assemble */
galleryWrap.append(galleryControls, galleryGrid);
container.append(header, statusRow, controlRow, settingsRow, proxyRow, proxyNote, galleryWrap, footer);
document.body.appendChild(container);

/* append buttons to control row */
controlRow.append(autoScanBtn, pinterestBtn, redditBtn, imgurBtn, instagramBtn, twitterBtn, genericBtn, loadMoreBtn);
container.insertBefore(controlRow, settingsRow);

/* helper state */
const state = {
  collected: new Map(), // key: normalizedURL -> {url, type, preview, filename, host}
  scanning: false,
  observer: null,
  downloaderController: new AbortController(),
  downloading: false,
  autoClicking: false,
};

/* util: normalize */
function normalizeUrl(u){
  try {
    const url = new URL(u, location.href);
    url.search = ""; // remove query for dedupe
    if(url.hash) url.hash = "";
    return url.href;
  } catch(e){ return null; }
}

/* util: pretty filename */
function filenameFromUrl(url, idx){
  try{
    const u = new URL(url);
    const path = u.pathname.split('/').filter(Boolean).pop() || 'file';
    const extMatch = path.match(/\.[a-z0-9]{1,6}$/i);
    const ext = extMatch ? extMatch[0] : '';
    const base = path.replace(/\.[a-z0-9]{1,6}$/i, '');
    const safe = base.replace(/[^a-z0-9_\-]/ig,'_').slice(0,80);
    return `${idx.toString().padStart(3,'0')}_${safe}${ext || '.bin'}`;
  }catch(e){ return `file_${idx}.bin`; }
}

/* add item to state and UI */
function addMedia(url, type='auto'){
  const norm = normalizeUrl(url);
  if(!norm) return;
  if(state.collected.has(norm)) return;
  const idx = state.collected.size + 1;
  const item = {
    url: norm,
    type,
    filename: filenameFromUrl(norm, idx),
    preview: norm,
    selected: true,
  };
  state.collected.set(norm, item);
  // create UI tile
  const tile = document.createElement('div');
  tile.style.cssText = "background:#0b1215; border-radius:8px; padding:6px; display:flex; flex-direction:column; gap:6px; align-items:center; text-align:center; border:1px solid rgba(255,255,255,0.02);";
  const preview = document.createElement('img');
  preview.style.cssText = "width:100%; height:72px; object-fit:cover; border-radius:6px; background:#050505";
  preview.loading = 'lazy';
  preview.src = item.preview;
  preview.onerror = ()=> { preview.style.display='none'; };
  const ck = document.createElement('input'); ck.type='checkbox'; ck.checked = item.selected;
  ck.style.width='18px'; ck.style.height='18px';
  const name = document.createElement('div'); name.style.fontSize='11px'; name.style.color='#cfe'; name.textContent = item.filename;
  tile.append(preview, ck, name);
  galleryGrid.prepend(tile);
  // bind
  ck.addEventListener('change', ()=> item.selected = ck.checked);
  preview.addEventListener('click', ()=> window.open(item.url, '_blank'));
}

/* scaners */
function scanPinterest(){
  // images with pinimg domains
  document.querySelectorAll('img').forEach(img=>{
    const s = img.src || img.getAttribute('data-src') || img.getAttribute('data-image-src');
    if(!s) return;
    if(s.includes('pinimg.com') || s.includes('pinterest')) {
      // attempt to convert to originals
      let hd = s.replace(/\/(236x|474x|736x|originals)\/?/i, '/originals/');
      if(!hd.includes('originals')) hd = s;
      addMedia(hd, 'pinterest');
    }
  });
  // background-image style
  document.querySelectorAll('[style]').forEach(el=>{
    const m = (el.style.backgroundImage || '').match(/url\(["']?(.*?)["']?\)/);
    if(m && m[1] && (m[1].includes('pinimg.com') || m[1].includes('pinterest'))) addMedia(m[1], 'pinterest');
  });
}

function scanReddit(){
  // direct links & images
  document.querySelectorAll('a[href]').forEach(a=>{
    const h = a.href;
    if(h.includes('i.redd.it') || h.includes('v.redd.it') || h.includes('preview.redd.it')) addMedia(h, 'reddit');
  });
  document.querySelectorAll('img').forEach(img=>{
    const s = img.src || img.getAttribute('srcset') || img.getAttribute('data-src');
    if(s && (s.includes('redd.it') || s.includes('reddit'))) addMedia(s, 'reddit');
  });
}

function scanImgur(){
  document.querySelectorAll('a[href], img[src]').forEach(el=>{
    const s = el.href||el.src;
    if(!s) return;
    if(s.includes('i.imgur.com') || s.includes('imgur.com')) {
      // if imgur gallery link, try to get direct image
      addMedia(s.replace(/gallery\//,'').replace(/a\//,''), 'imgur');
    }
  });
}

function scanInstagram(){
  document.querySelectorAll('img').forEach(img=>{
    const s = img.src || img.getAttribute('srcset') || img.getAttribute('data-src');
    if(!s) return;
    if(s.includes('cdninstagram') || s.includes('instagram')) addMedia(s, 'instagram');
  });
  // video tags
  document.querySelectorAll('video source, video').forEach(v=>{
    const s = v.src || v.getAttribute('data-src');
    if(s) addMedia(s, 'instagram');
  });
}

function scanTwitter(){
  document.querySelectorAll('img, video, source, a').forEach(el=>{
    const s = el.src || el.href || el.getAttribute('data-src');
    if(!s) return;
    if(s.includes('pbs.twimg.com') || s.includes('twimg.com')) addMedia(s, 'twitter');
  });
}

function scanTumblr(){
  document.querySelectorAll('img').forEach(img=>{
    const s = img.src || img.getAttribute('data-src');
    if(!s) return;
    if(s.includes('media.tumblr.com')) addMedia(s,'tumblr');
  });
}

function scanFlickr(){
  document.querySelectorAll('img').forEach(img=>{
    const s = img.src || img.getAttribute('srcset');
    if(!s) return;
    if(s.includes('staticflickr.com')) addMedia(s,'flickr');
  });
}

function genericScan(){
  // basic greedy scan for images & video sources
  document.querySelectorAll('img, source, video, a').forEach(el=>{
    const s = el.src || el.href || el.getAttribute('data-src');
    if(!s) return;
    if(/\.(jpe?g|png|gif|webp|mp4|mov|mp3|m3u8|avif|bmp)$/i.test(s) || s.includes('amazonaws') || s.includes('cdn')) addMedia(s,'generic');
  });
}

/* auto detection */
function autoDetectAndScan(){
  if(location.hostname.includes('pinterest')) scanPinterest();
  else if(location.hostname.includes('reddit')) scanReddit();
  else if(location.hostname.includes('imgur')) scanImgur();
  else if(location.hostname.includes('instagram')) scanInstagram();
  else if(location.hostname.includes('twitter') || location.hostname.includes('x.com')) scanTwitter();
  else if(location.hostname.includes('tumblr')) scanTumblr();
  else if(location.hostname.includes('flickr')) scanFlickr();
  else genericScan();
  statusRow.textContent = `Host: ${HOST} — collected ${state.collected.size} items`;
  footer.textContent = `Collected ${state.collected.size} unique items`;
}

/* auto-click load more */
let loadMoreInterval = null;
function startAutoLoadMore(){
  if(state.autoClicking) return;
  state.autoClicking = true;
  let tries = 0;
  loadMoreInterval = setInterval(()=>{
    // find buttons with text
    const btns = Array.from(document.querySelectorAll('button, a')).filter(el=>{
      const t = (el.innerText||el.textContent||'').toLowerCase();
      return /load more|show more|more posts|more|see more|view more|next/i.test(t);
    });
    if(btns.length){
      tries = 0;
      btns.forEach(b=> b.click && b.click());
    } else {
      tries++;
      if(tries > 8){ stopAutoLoadMore(); }
    }
  }, 900);
  statusRow.textContent = 'Auto LoadMore: running';
}
function stopAutoLoadMore(){
  if(loadMoreInterval) clearInterval(loadMoreInterval);
  state.autoClicking = false;
  statusRow.textContent = 'Auto LoadMore: stopped';
}

/* mutation observer scanning for infinite load */
function startMutationScan(scannerFn){
  if(state.observer) state.observer.disconnect();
  state.observer = new MutationObserver((mutations)=>{
    scannerFn();
  });
  state.observer.observe(document.body, { childList:true, subtree:true });
}

/* bind control buttons */
autoScanBtn.addEventListener('click', ()=>{
  autoDetectAndScan();
  startMutationScan(autoDetectAndScan);
  statusRow.textContent = `Auto scan deployed — collected ${state.collected.size}`;
});
pinterestBtn.addEventListener('click', ()=>{ scanPinterest(); startMutationScan(scanPinterest); statusRow.textContent='Pinterest scan active'; });
redditBtn.addEventListener('click', ()=>{ scanReddit(); startMutationScan(scanReddit); statusRow.textContent='Reddit scan active'; });
imgurBtn.addEventListener('click', ()=>{ scanImgur(); startMutationScan(scanImgur); statusRow.textContent='Imgur scan active'; });
instagramBtn.addEventListener('click', ()=>{ scanInstagram(); startMutationScan(scanInstagram); statusRow.textContent='Instagram scan active'; });
twitterBtn.addEventListener('click', ()=>{ scanTwitter(); startMutationScan(scanTwitter); statusRow.textContent='Twitter scan active'; });
genericBtn.addEventListener('click', ()=>{ genericScan(); startMutationScan(genericScan); statusRow.textContent='Generic scan active'; });

loadMoreBtn.addEventListener('click', ()=>{ if(state.autoClicking) stopAutoLoadMore(); else startAutoLoadMore(); });

/* select / copy / export UI controls */
selectAllBtn.addEventListener('click', ()=>{
  state.collected.forEach(v=> v.selected = true);
  // sync UI checkboxes
  galleryGrid.querySelectorAll('input[type=checkbox]').forEach(ch=> ch.checked = true);
});
invertBtn.addEventListener('click', ()=>{
  let i=0;
  state.collected.forEach(v=> { v.selected = !v.selected; i++; });
  galleryGrid.querySelectorAll('input[type=checkbox]').forEach(ch=> ch.checked = !ch.checked);
});
copyLinksBtn.addEventListener('click', async ()=>{
  const txt = [...state.collected.values()].filter(i=>i.selected).map(i=>i.url).join("\n");
  try{ await navigator.clipboard.writeText(txt); footer.textContent='Links copied to clipboard'; } catch(e){ footer.textContent='Clipboard failed: '+e; }
});
exportTxtBtn.addEventListener('click', ()=>{
  const txt = [...state.collected.values()].map(i=>i.url).join("\n");
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt],{type:'text/plain'}));
  a.download = 'media_links.txt';
  a.click();
});
exportCsvBtn.addEventListener('click', ()=>{
  const rows = [['url','filename','type']];
  [...state.collected.values()].forEach(i=> rows.push([i.url, i.filename, i.type]));
  const csv = rows.map(r=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = 'media_links.csv';
  a.click();
});

/* build gallery initial scan pass to populate present images immediately */
autoDetectAndScan();

/* show previously collected items into UI (if any) */
function populateExisting(){
  // clear then re-add
  galleryGrid.innerHTML = '';
  state.collected.forEach(i=> addMedia(i.url, i.type));
}
/* Actually we already added on addMedia; but expose function in case. */

/* downloader logic: uses fetch in worker optionally or main thread with concurrency */
async function downloadSelectedToZip(useProxy=false){
  if(state.downloading) { footer.textContent='Download in progress — stop first'; return; }
  const selected = [...state.collected.values()].filter(i=>i.selected);
  if(selected.length === 0){ footer.textContent='No items selected'; return; }
  state.downloading = true;
  state.downloaderController = new AbortController();
  footer.textContent = `Starting download of ${selected.length} items...`;

  const conc = Math.max(1, parseInt(document.getElementById('hub_conc').value||4));
  const retries = Math.max(0, parseInt(document.getElementById('hub_retry').value||2));
  const delayMs = Math.max(0, parseInt(document.getElementById('hub_delay').value||200));
  const proxyPrefix = (proxyInput.value||'').trim();

  const zip = new JSZip();
  let index=0;
  const stats = { success:0, fail:0 };

  // job queue
  const queue = selected.map((item, idx)=> ({item, idx: idx+1}));

  async function fetchWithRetries(url, attempt=0){
    const controller = new AbortController();
    const signal = controller.signal;
    const timeout = setTimeout(()=> controller.abort(), 60000); // 60s timeout per file
    try{
      const fetchUrl = proxyPrefix ? proxyPrefix + encodeURIComponent(url) : url;
      const resp = await fetch(fetchUrl, { signal, mode: proxyPrefix ? 'cors' : 'cors' });
      clearTimeout(timeout);
      if(!resp.ok) throw new Error('HTTP '+resp.status);
      const blob = await resp.blob();
      return blob;
    }catch(err){
      clearTimeout(timeout);
      if(err.name === 'AbortError') throw new Error('aborted');
      if(attempt < retries) {
        await new Promise(r=> setTimeout(r, 1000 + attempt*500));
        return fetchWithRetries(url, attempt+1);
      } else {
        throw err;
      }
    }
  }

  // worker option: can be extended to worker fetch; for simplicity we fetch in main thread
  async function workerJob(job){
    const url = job.item.url;
    try{
      const blob = await fetchWithRetries(url);
      const name = job.item.filename || filenameFromUrl(url, job.idx);
      zip.file(name, blob);
      stats.success++;
      footer.textContent = `Downloaded ${stats.success}/${selected.length} — adding to ZIP...`;
    }catch(err){
      stats.fail++;
      footer.textContent = `Failed ${stats.fail} items so far: ${err.message || err}`;
      console.error('Download error', url, err);
    }
  }

  // pool
  const pool = new Array(conc).fill(null).map(async function runner(){
    while(queue.length && !state.downloaderController.signal.aborted){
      const job = queue.shift();
      if(!job) break;
      await workerJob(job);
      // polite delay
      await new Promise(r=> setTimeout(r, delayMs));
    }
  });

  try{
    await Promise.all(pool);
  }catch(e){
    console.warn('Pool stopped', e);
  }

  if(state.downloaderController.signal.aborted){ footer.textContent='Download aborted by user'; state.downloading=false; return; }

  // finalize zip
  footer.textContent = `Building ZIP (${stats.success} files)...`;
  try{
    const content = await zip.generateAsync({type:'blob'}, (meta)=>{
      footer.textContent = `Zipping: ${Math.round(meta.percent)}%`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `media_${Date.now()}.zip`;
    a.click();
    footer.textContent = `ZIP ready. Success: ${stats.success}, Fail: ${stats.fail}`;
  }catch(e){
    footer.textContent = 'ZIP creation failed: '+e;
  } finally {
    state.downloading = false;
  }
}

/* download all / selection buttons */
downloadSelBtn.addEventListener('click', ()=> downloadSelectedToZip());
downloadAllBtn.addEventListener('click', ()=>{
  // mark all selected then download
  state.collected.forEach(v=> v.selected = true);
  galleryGrid.querySelectorAll('input[type=checkbox]').forEach(ch=> ch.checked = true);
  downloadSelectedToZip();
});

/* stop button aborts downloads and scanning */
stopAllBtn.addEventListener('click', ()=>{
  if(state.observer) state.observer.disconnect();
  state.downloaderController.abort();
  stopAutoLoadMore();
  footer.textContent = 'Stopped scanning and downloads';
  state.downloading = false;
});

/* close btn removes UI and cleans state */
closeBtn.addEventListener('click', ()=>{
  try{ if(state.observer) state.observer.disconnect(); }catch(e){}
  try{ state.downloaderController.abort(); }catch(e){}
  try{ stopAutoLoadMore(); }catch(e){}
  container.remove();
  window.__AUTOMATION_HUB_RUNNING__ = false;
});

/* STOP SIGNAL binding for outside */
window.__AUTOMATION_HUB_STOP__ = ()=>{
  try{ state.downloaderController.abort(); }catch(e){}
  try{ if(state.observer) state.observer.disconnect(); }catch(e){}
  try{ stopAutoLoadMore(); }catch(e){}
  footer.textContent = 'Stopped via global stop';
};

/* render thumbnails: as items are added, use MutationObserver to attach checkboxes (we already attach in addMedia) */
/* But when populate on initial run, ensure checkboxes reflect selection */
function syncGalleryCheckboxes(){
  // update checkboxes to reflect `selected`
  const tiles = galleryGrid.querySelectorAll('div');
  // nothing else; addMedia created inputs and bound them
}

/* final: expose quick API in console */
window.AutomationHub = {
  addMedia,
  scanPinterest,
  scanReddit,
  scanImgur,
  scanInstagram,
  scanTwitter,
  genericScan,
  downloadSelectedToZip,
  stop: window.__AUTOMATION_HUB_STOP__,
  getItems: ()=> [...state.collected.values()],
};

/* log */
footer.textContent = 'Ready — run a scan (Auto / Pinterest / Reddit / Generic)';

})(); // end async IIFE
})(); // end outer IIFE
