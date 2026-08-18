// 最小 PWA service worker：静态资源（图标/数据/图片）缓存优先，其余直接走网络。
// 目的是满足 Chrome/Edge 的应用安装条件，不做离线页面兜底。
/// <reference lib="./src/service-worker.d.ts" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));
const CACHE = 'sgs-card-viewer-v1';

const PRECACHE = [
	'/manifest.webmanifest',
	'/icons/icon-192.png',
	'/icons/icon-512.png',
	'/icons/icon-maskable-512.png'
];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(PRECACHE))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (event.request.method !== 'GET' || url.origin !== location.origin) return;

	// 数据与图片：缓存优先（体积大且不变），其余（页面/代码）直接网络
	const cacheable = url.pathname.startsWith('/data/') || url.pathname.startsWith('/images/');
	if (!cacheable) return;

	event.respondWith(
		caches.match(event.request).then(
			(hit) =>
				hit ??
				fetch(event.request).then((res) => {
					const copy = res.clone();
					caches.open(CACHE).then((c) => c.put(event.request, copy));
					return res;
				})
		)
	);
});
