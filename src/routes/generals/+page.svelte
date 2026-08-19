<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { kingdomLabel, kingdomStyle, KINGDOMS } from '$lib/kingdoms';
	import { isMobileLayout, loadListState, saveListState, syncFiltersToUrl } from '$lib/restore';
	import type { General, GamePackage } from '$lib/types';

	let generals: General[] = $state([]);
	let packages: GamePackage[] = $state([]);
	let loaded = $state(false);

	let q = $state('');
	let main = $state(''); // main pack key (extensionName)
	let sub = $state(''); // sub package name ('' = all in main)
	let kingdom = $state('');
	let limit = $state(60);
	// 移动端多级抽屉
	let drawer = $state(false);
	let drawerMain = $state(''); // '' = 第一级（扩展系列），否则为第二级的扩展 key

	// 返回时恢复：记录滚动位置（桌面端为 .scroll 容器，移动端为 window）
	let scrollEl: HTMLElement | undefined = $state();
	let scrollPos = 0;

	interface MainPack {
		key: string;
		label: string;
		category: string;
		subs: GamePackage[];
		total: number;
	}

	const pkgByName = $derived(new Map(packages.map((p) => [p.name, p])));

	// 每个子包的武将数量
	const countBySub = $derived.by(() => {
		const m = new Map<string, number>();
		for (const g of generals) m.set(g.package, (m.get(g.package) ?? 0) + 1);
		return m;
	});

	const mainPacks = $derived.by(() => {
		const map = new Map<string, MainPack>();
		for (const p of packages) {
			const key = p.extensionName ?? p.name;
			if (!map.has(key)) {
				map.set(key, { key, label: p.mainLabel ?? p.label, category: p.category ?? '其他', subs: [], total: 0 });
			}
			map.get(key)!.subs.push(p);
		}
		for (const g of generals) {
			const ext = pkgByName.get(g.package)?.extensionName;
			if (ext && map.has(ext)) map.get(ext)!.total++;
		}
		return [...map.values()].filter((m) => m.total > 0);
	});

	// 子包同样只列出含有武将的（“标准卡牌”等纯卡牌包不显示）
	const subs = $derived(
		(mainPacks.find((m) => m.key === main)?.subs ?? []).filter((s) => (countBySub.get(s.name) ?? 0) > 0)
	);

	const filtered = $derived.by(() => {
		const query = q.trim().toLowerCase();
		return generals.filter((g) => {
			if (sub && g.package !== sub) return false;
			if (!sub && main) {
				const ext = packages.find((p) => p.name === g.package)?.extensionName;
				if (ext !== main) return false;
			}
			if (kingdom && g.kingdom !== kingdom) return false;
			if (!query) return true;
			return (
				g.name.toLowerCase().includes(query) ||
				g.id.toLowerCase().includes(query) ||
				g.title.toLowerCase().includes(query) ||
				g.skills.some((s) => s.name.toLowerCase().includes(query) || s.description.includes(query))
			);
		});
	});

	const shown = $derived(filtered.slice(0, limit));

	function selectMain(key: string) {
		main = main === key ? '' : key;
		sub = '';
		limit = 60;
	}
	function selectSub(name: string) {
		sub = sub === name ? '' : name;
		limit = 60;
	}

	// 抽屉打开时锁定背景页面滚动
	$effect(() => {
		document.body.style.overflow = drawer ? 'hidden' : '';
	});

	// 筛选条件写入 URL，返回时由 onMount 重新读取
	$effect(() => {
		syncFiltersToUrl({ q, main, sub, kingdom });
	});

	onMount(async () => {
		const params = new URLSearchParams(location.search);
		q = params.get('q') ?? '';
		main = params.get('main') ?? '';
		sub = params.get('sub') ?? '';
		kingdom = params.get('kingdom') ?? '';
		const saved = loadListState('generals');
		if (saved) limit = Math.max(60, Number(saved.limit) || 60); // 恢复“加载更多”的条数，否则滚动位置无处可去
		const [g, p] = await Promise.all([
			fetch('/data/generals.json').then((r) => r.json()),
			fetch('/data/packages.json').then((r) => r.json()),
		]);
		generals = g;
		packages = p;
		loaded = true;
		if (saved) {
			const pos = Number(saved.pos) || 0;
			await tick();
			if (isMobileLayout()) window.scrollTo(0, pos);
			else if (scrollEl) scrollEl.scrollTop = pos;
		}
	});

	// 离开页面（进入武将详情等）时保存滚动位置与已加载条数
	onMount(() => () => saveListState('generals', { pos: scrollPos, limit }));
</script>

<svelte:head>
	<title>武将 · 三国杀卡查</title>
</svelte:head>

<svelte:window onscroll={() => { if (isMobileLayout()) scrollPos = window.scrollY; }} />

<div class="page">
	<aside class="pane mains">
		<div class="pane-title">扩展系列</div>
		{#if loaded}
			{#each mainPacks as m, i (m.key)}
				{#if i === 0 || mainPacks[i - 1].category !== m.category}
					<div class="group-label"><span class="group-line"></span>{m.category}<span class="group-line"></span></div>
				{/if}
				<button class="navitem" class:active={main === m.key} onclick={() => selectMain(m.key)}>
					{m.label}
					<span class="count">{m.total}</span>
				</button>
			{/each}
		{/if}
	</aside>

	<aside class="pane subs">
		<div class="pane-title">{main ? mainPacks.find((m) => m.key === main)?.label : '全部子包'}</div>
		{#if loaded && main}
			<button class="navitem" class:active={sub === ''} onclick={() => selectSub('')}>
				全部
				<span class="count">{mainPacks.find((m) => m.key === main)?.total ?? 0}</span>
			</button>
			{#each subs as s (s.name)}
				<button class="navitem" class:active={sub === s.name} onclick={() => selectSub(s.name)}>
					{s.label}
					{#if countBySub.get(s.name)}
						<span class="count">{countBySub.get(s.name)}</span>
					{/if}
				</button>
			{/each}
		{:else if loaded}
			<div class="hint">先选择左侧扩展系列</div>
		{/if}
	</aside>

	<section class="content">
		<div class="content-head">
			<h1>武将</h1>
			<span class="crumb">
				{mainPacks.find((m) => m.key === main)?.label ?? '全部系列'}
				{#if sub}
					<span class="sep">·</span>
					{pkgByName.get(sub)?.label}
				{/if}
			</span>
		</div>
		<div class="toolbar">
			<input class="search" placeholder="搜索武将名 / 称号 / 技能…" bind:value={q} />
			<button class="mfilter" onclick={() => { drawer = true; drawerMain = ''; }}>
				<span class="mfilter-label">扩展</span>
				<span class="mfilter-value">
					{mainPacks.find((m) => m.key === main)?.label ?? '全部'}
					{#if sub}<span class="sep">·</span>{pkgByName.get(sub)?.label}{/if}
				</span>
				<span class="mfilter-caret">▾</span>
			</button>
			<div class="kingdoms">
				<button class="pill kbtn" class:active={!kingdom} onclick={() => (kingdom = '')}>全部</button>
				{#each Object.entries(KINGDOMS) as [key, k] (key)}
					<button
						class="pill kbtn"
						class:active={kingdom === key}
						style={`background:${kingdomStyle(key).bg};color:${kingdomStyle(key).fg}`}
						onclick={() => (kingdom = kingdom === key ? '' : key)}
					>
						{k.label}
					</button>
				{/each}
			</div>
			<span class="muted count-label">{loaded ? `${filtered.length} 名武将` : '加载中…'}</span>
		</div>

		<div class="scroll" bind:this={scrollEl} onscroll={() => { if (!isMobileLayout()) scrollPos = scrollEl?.scrollTop ?? 0; }}>
			{#if loaded && filtered.length === 0}
				<div class="empty">没有匹配的武将</div>
			{:else if loaded}
				<div class="grid">
					{#each shown as g (g.package + '/' + g.id)}
						{@const ks = kingdomStyle(g.kingdom)}
						<a class="gcard" href={`/generals/${g.package}/${g.id}`}>
							{#if g.image}
								<img src={g.image} alt={g.name} loading="lazy" />
							{:else}
								<div class="noimg">{g.name}</div>
							{/if}
							<div class="info">
								<div class="row">
									<span class="name">{g.name}</span>
									<span class="pill" style={`background:${ks.bg};color:${ks.fg}`}>{kingdomLabel(g.kingdom)}</span>
								</div>
								<div class="title">{g.title || pkgByName.get(g.package)?.label || ''}</div>
							</div>
						</a>
					{/each}
				</div>
				{#if shown.length < filtered.length}
					<div class="more">
						<button class="btn" onclick={() => (limit += 120)}>加载更多（{filtered.length - shown.length}）</button>
					</div>
				{/if}
			{:else}
				<div class="empty">加载中…</div>
			{/if}
		</div>
	</section>

	<!-- 移动端：扩展选择抽屉（第一级系列 → 第二级子包） -->
	{#if drawer}
		<div class="drawer-mask" onclick={() => (drawer = false)} aria-hidden="true"></div>
		<div class="drawer" role="dialog" aria-label="选择扩展">
			<div class="drawer-head">
				{#if drawerMain}
					<button class="drawer-back" onclick={() => (drawerMain = '')}>‹ 返回</button>
					<span class="drawer-title">{mainPacks.find((m) => m.key === drawerMain)?.label}</span>
				{:else}
					<span class="drawer-title">选择扩展系列</span>
				{/if}
				<button class="drawer-close" onclick={() => (drawer = false)} aria-label="关闭">✕</button>
			</div>
			<div class="drawer-body">
				{#if !drawerMain}
					<button
						class="navitem"
						class:active={!main}
						onclick={() => { main = ''; sub = ''; limit = 60; drawer = false; }}
					>
						全部系列
						<span class="count">{generals.length}</span>
					</button>
					{#each mainPacks as m, i (m.key)}
						{#if i === 0 || mainPacks[i - 1].category !== m.category}
							<div class="group-label"><span class="group-line"></span>{m.category}<span class="group-line"></span></div>
						{/if}
						<button class="navitem" onclick={() => (drawerMain = m.key)}>
							{m.label}
							<span class="count">{m.total}</span>
							<span class="go">›</span>
						</button>
					{/each}
				{:else}
					<button
						class="navitem"
						class:active={main === drawerMain && !sub}
						onclick={() => { main = drawerMain; sub = ''; limit = 60; drawer = false; }}
					>
						全部
						<span class="count">{mainPacks.find((m) => m.key === drawerMain)?.total ?? 0}</span>
					</button>
					{#each mainPacks.find((m) => m.key === drawerMain)?.subs.filter((s) => (countBySub.get(s.name) ?? 0) > 0) as s (s.name)}
						<button
							class="navitem"
							class:active={main === drawerMain && sub === s.name}
							onclick={() => { main = drawerMain; sub = s.name; limit = 60; drawer = false; }}
						>
							{s.label}
							{#if countBySub.get(s.name)}<span class="count">{countBySub.get(s.name)}</span>{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		display: grid;
		grid-template-columns: 200px 230px 1fr;
		gap: 16px;
		height: 100%;
		padding: 20px 24px 16px;
		align-items: stretch;
		overflow: hidden;
	}
	@media (max-width: 900px) {
		.page {
			display: flex;
			flex-direction: column;
			height: auto;
			overflow: visible;
			padding: 12px 14px 32px;
			gap: 10px;
		}
		/* 侧栏改为抽屉选择，不再平铺 */
		.pane.mains,
		.pane.subs {
			display: none;
		}
		.mfilter {
			display: flex;
		}
		.content {
			overflow: visible;
			min-height: 0;
		}
		.scroll {
			overflow: visible;
		}
		.grid {
			grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
			gap: 8px;
		}
	}
	.pane {
		border: 1px solid var(--color-ash-border);
		border-radius: 12px;
		padding: 8px;
		overflow-y: auto;
		min-height: 0;
	}
	.pane-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-slate-whisper);
		padding: 10px 12px 6px;
		letter-spacing: 0.18em;
		border-bottom: 1px solid var(--color-ink-wash);
		margin-bottom: 6px;
	}
	.navitem {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		border: none;
		background: transparent;
		font-family: var(--font-ui);
		font-size: 14px;
		font-weight: 500;
		color: var(--color-graphite);
		padding: 8px 12px;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		letter-spacing: -0.41px;
	}
	.navitem:hover {
		background: var(--color-fog);
		color: var(--color-onyx-ink);
	}
	.navitem.active {
		background: var(--color-mint-mist);
		color: var(--color-emerald-signal);
		font-weight: 600;
	}
	.navitem .count {
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		color: var(--color-gilded);
		margin-left: auto; /* 右对齐：多个子元素（标签+数量+箭头）时数量统一贴右 */
		padding-left: 12px;
	}
	.navitem.active .count {
		color: var(--color-cinnabar);
	}
	.group-label {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 14px 8px 6px;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.32em;
		text-indent: 0.32em; /* 平衡最后一个字的字间距 */
		color: var(--color-zinc-veil);
		user-select: none;
	}
	.group-label:first-child {
		margin-top: 4px;
	}
	.group-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(to right, transparent, var(--color-ink-wash), transparent);
	}
	.hint {
		font-size: 13px;
		color: var(--color-zinc-veil);
		padding: 8px 12px;
	}
	.content {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}
	.content-head {
		display: flex;
		align-items: baseline;
		gap: 12px;
		padding: 6px 4px 12px;
		flex-shrink: 0;
	}
	h1 {
		font-size: 26px;
	}
	.crumb {
		font-family: var(--font-inter-tight);
		font-size: 14px;
		color: var(--color-gilded);
		letter-spacing: 0.06em;
	}
	.sep {
		color: var(--color-zinc-veil);
		margin: 0 2px;
	}
	.toolbar {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 16px;
		padding: 2px 6px 0 2px; /* 留出选中光环空间，避免贴边裁切 */
		flex-shrink: 0;
	}
	.kingdoms {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.kbtn {
		border: 1px solid var(--color-ash-border);
		cursor: pointer;
		font-family: var(--font-ui);
		transition: border-color 0.15s, box-shadow 0.15s;
	}
	.kbtn:hover {
		border-color: var(--color-gold-hairline);
	}
	.kbtn.active {
		border-color: var(--color-emerald-signal);
		box-shadow: 0 0 0 2px rgba(180, 35, 24, 0.15);
	}
	.count-label {
		font-size: 12px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
		gap: 12px;
	}
	.gcard {
		background: var(--color-pure-canvas);
		border: 1px solid var(--color-ash-border);
		border-radius: 10px;
		overflow: hidden;
		box-shadow: var(--shadow-subtle);
		transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
	}
	.gcard:hover {
		box-shadow: var(--shadow-card-lift);
		border-color: var(--color-gold-hairline);
		transform: translateY(-2px);
	}
	.gcard img {
		width: 100%;
		aspect-ratio: 250/292;
		object-fit: cover;
		display: block;
	}
	.noimg {
		aspect-ratio: 250/292;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22px;
		color: var(--color-zinc-veil);
		background: var(--color-fog);
	}
	.info {
		padding: 8px 10px 10px;
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.name {
		font-family: var(--font-inter-tight);
		font-size: 14px;
		font-weight: 700;
	}
	.title {
		color: var(--color-slate-whisper);
		font-size: 12px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-top: 2px;
	}
	.scroll {
		flex: 1;
		overflow-y: auto;
		min-height: 0;
		padding: 2px 6px 8px 2px;
	}
	.empty {
		color: var(--color-slate-whisper);
		text-align: center;
		padding: 64px 0;
	}
	.more {
		text-align: center;
		margin-top: 24px;
	}

	/* ── 移动端：扩展筛选按钮 + 多级抽屉 ── */
	@media (min-width: 901px) {
		.mfilter {
			display: none; /* 桌面端隐藏 */
		}
	}
	.mfilter {
		align-items: center;
		gap: 10px;
		width: 100%;
		border: 1px solid var(--color-ash-border);
		border-radius: 8px;
		background: var(--color-pure-canvas);
		padding: 10px 14px;
		font-family: var(--font-ui);
		font-size: 14px;
		cursor: pointer;
		text-align: left;
	}
	.mfilter-label {
		flex-shrink: 0;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.14em;
		color: var(--color-slate-whisper);
	}
	.mfilter-value {
		flex: 1;
		min-width: 0;
		font-weight: 500;
		color: var(--color-onyx-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.mfilter-value .sep {
		margin: 0 3px;
	}
	.mfilter-caret {
		flex-shrink: 0;
		color: var(--color-zinc-veil);
		font-size: 12px;
	}
	.drawer-mask {
		position: fixed;
		inset: 0;
		background: rgba(33, 29, 23, 0.35);
		z-index: 40;
	}
	.drawer {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		max-height: 78vh;
		display: flex;
		flex-direction: column;
		background: var(--color-pure-canvas);
		border-top: 1px solid var(--color-ash-border);
		border-radius: 16px 16px 0 0;
		box-shadow: 0 -10px 30px -10px rgba(33, 29, 23, 0.25);
		z-index: 41;
		padding-bottom: env(safe-area-inset-bottom);
		animation: drawer-up 0.22s ease-out;
	}
	@keyframes drawer-up {
		from {
			transform: translateY(40px);
			opacity: 0.6;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.drawer {
			animation: none;
		}
	}
	.drawer-head {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--color-ink-wash);
		flex-shrink: 0;
	}
	.drawer-back,
	.drawer-close {
		border: none;
		background: transparent;
		font-family: var(--font-ui);
		font-size: 14px;
		font-weight: 500;
		color: var(--color-emerald-signal);
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 6px;
	}
	.drawer-back:active,
	.drawer-close:active {
		background: var(--color-fog);
	}
	.drawer-title {
		flex: 1;
		font-family: var(--font-inter-tight);
		font-size: 15px;
		font-weight: 700;
		text-align: center;
	}
	.drawer-close {
		color: var(--color-zinc-veil);
	}
	.drawer-body {
		overflow-y: auto;
		overscroll-behavior: contain; /* 抽屉内滚动到头不再带动背景 */
		padding: 8px;
	}
	.navitem .go {
		color: var(--color-zinc-veil);
		margin-left: 8px;
	}
</style>
