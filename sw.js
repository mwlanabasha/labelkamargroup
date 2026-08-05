/* إدارة المعمل — Service Worker
   Network-first with cache fallback for same-origin GET requests:
   the page shell loads fast and stays available offline; external
   (Supabase API) requests always go to the network. */
const CACHE = "lab-manager-v1";

self.addEventListener("install", ()=>{
  self.skipWaiting();
});

self.addEventListener("activate", (event)=>{
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await clients.claim();
  })());
});

self.addEventListener("fetch", (event)=>{
  const req = event.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  event.respondWith((async()=>{
    const cache = await caches.open(CACHE);
    try{
      const fresh = await fetch(req);
      if(fresh && (fresh.status === 200 || fresh.type === "basic")) cache.put(req, fresh.clone());
      return fresh;
    }catch(err){
      const cached = await cache.match(req);
      if(cached) return cached;
      if(req.mode === "navigate"){
        const shell = await cache.match("./");
        if(shell) return shell;
      }
      return new Response("أنت غير متصل بالإنترنت", { status: 503, statusText: "Offline" });
    }
  })());
});
