<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children } = $props();

	// list pages render as fullscreen dashboards; detail/home scroll normally
	const dashboard = $derived(
		page.url.pathname === '/generals' || page.url.pathname === '/cards'
	);
	$effect(() => {
		document.body.classList.toggle('dashboard', dashboard);
	});

	// 注册 PWA service worker（Chrome/Edge「安装应用」支持）
	onMount(async () => {
		if ('serviceWorker' in navigator) {
			try {
				await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
			} catch (e) {
				console.warn('service worker registration failed:', e);
			}
		}
	});
</script>

<header class="site">
	<div class="container">
		<a class="brand-seal" href="/">三国杀卡查</a>
		<nav>
			<a href="/generals" class:active={page.url.pathname.startsWith('/generals')}>武将</a>
			<a href="/cards" class:active={page.url.pathname.startsWith('/cards')}>卡牌</a>
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>
