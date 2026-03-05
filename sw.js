const CACHE='egmond-v3';
const ASSETS=['./','./index.html','./manifest.json','./sw.js','./images/wappen_neu.png'];
self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
 self.skipWaiting();
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(k=>Promise.all(k.map(x=>x!==CACHE?caches.delete(x):null))));
 self.clients.claim();
});
self.addEventListener('fetch',e=>{
 const r=e.request;
 if(r.method!=='GET')return;
 const u=new URL(r.url);
 if(u.origin!==location.origin)return;
 e.respondWith(
  caches.match(r).then(res=>res||fetch(r).then(net=>{
   const copy=net.clone();
   caches.open(CACHE).then(c=>c.put(r,copy));
   return net;
  }))
 );
});
