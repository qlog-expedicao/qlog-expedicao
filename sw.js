const CACHE='qlog-v4.3.47';
const ASSETS=["./","splash.webp","splash0.png","style.css","app.js","icone.png","nuvem.js","zxing/zxing.min.js","fb-app.js","favicon.png","icon-192.png","icon-512.png","marca-txt.png","ocr/tesseract-core-simd-lstm.wasm.js","ocr/tesseract.min.js","ocr/eng.traineddata.gz","ocr/worker.min.js","ocr/tesseract-core-lstm.wasm.js","icon-180.png","marca.png","logo.png","index.html","tema.js","manifest.webmanifest","fb-firestore.js","logic.js","firebase-config.js","fb-auth.js"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(async c=>{for(const u of ASSETS){try{await c.add(u);}catch(x){}}}).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||e.request.url.includes('version.json'))return;
  const u=new URL(e.request.url);
  const path=u.pathname;
  const netFirst=e.request.mode==='navigate'||/\.(html?|js|css)$/i.test(path)||path.endsWith('/')||/\/index\.html?$/i.test(path);
  if(netFirst){
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c)).catch(()=>{});return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).catch(()=>caches.match('./index.html'))));
});
