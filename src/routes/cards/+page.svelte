<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { SUIT_SYMBOL, suitRed, typeLabel, CARD_TYPE_LABEL } from '$lib/kingdoms';
	import { isMobileLayout, loadListState, saveListState, syncFiltersToUrl } from '$lib/restore';
	import type { Card, GamePackage } from '$lib/types';

	let cards: Card[] = $state([]);
	let packages: GamePackage[] = $state([]);
	let loaded = $state(false);
	let q = $state('');
	let type = $state('');
	let pkg = $state('');
	let cat = $state(''); // 分组级筛选：身份局 / 国战
	// 移动端筛选抽屉
	let drawer = $state(false);

	// 返回时恢复：记录滚动位置（桌面端为 .scroll 容器，移动端为 window）
	let scrollEl: HTMLElement | undefined = $state();
	let scrollPos = 0;

	const pkgLabel = (name: string) => packages.find((p) => p.name === name)?.label ?? name;
	const numberCN = (n: number | null) => (n === null ? '' : n <= 10 ? String(n) : ['J', 'Q', 'K'][n - 11] ?? String(n));

	// 卡牌分组：经典牌堆（标准/EX/军争）归为「身份局」，其余按分类
	const CATEGORY_LABEL: Record<string, string> = { 经典: '身份局' };

	const currentFilterLabel = $derived(
		cat
			? CATEGORY_LABEL[cat] ?? cat
			: pkg
				? pkgLabel(pkg)
				: '全部'
	);

	const cardPkgs = $derived.by(() => {
		const meta = new Map(packages.map((p) => [p.name, p]));
		return [...new Set(cards.flatMap((c) => c.packages.map((p) => p.package)))]
			.map((name) => {
				const m = meta.get(name);
				return { name, category: m?.category ?? '其他' };
			})
			.sort((a, b) => {
				const order = new Map(packages.map((p, i) => [p.name, i]));
				return (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0);
			});
	});
	const countByType = $derived.by(() => {
		const m = new Map<string, number>();
		for (const c of cards) {
			const t = c.packages.find((p) => p.type)?.type ?? '';
			m.set(t, (m.get(t) ?? 0) + 1);
		}
		return m;
	});
	const countByPkg = $derived.by(() => {
		const m = new Map<string, number>();
		for (const c of cards) for (const p of c.packages) m.set(p.package, (m.get(p.package) ?? 0) + 1);
		return m;
	});
	const countByCat = $derived.by(() => {
		const meta = new Map(packages.map((p) => [p.name, p]));
		const m = new Map<string, number>();
		for (const c of cards) {
			const seen = new Set();
			for (const p of c.packages) {
				const k = meta.get(p.package)?.category ?? '其他';
				if (k && !seen.has(k)) {
					seen.add(k);
					m.set(k, (m.get(k) ?? 0) + 1);
				}
			}
		}
		return m;
	});

	const filtered = $derived.by(() => {
		const query = q.trim().toLowerCase();
		const meta = new Map(packages.map((p) => [p.name, p]));
		return cards.filter((c) => {
			const t = c.packages.find((p) => p.type)?.type ?? '';
			if (type && t !== type) return false;
			if (pkg && !c.packages.some((p) => p.package === pkg)) return false;
			if (cat) {
				const cats = new Set(c.packages.map((p) => meta.get(p.package)?.category ?? '其他'));
				if (!cats.has(cat)) return false;
			}
			if (!query) return true;
			return c.name.toLowerCase().includes(query) || c.id.includes(query) || c.description.includes(query);
		});
	});

	// 抽屉打开时锁定背景页面滚动
	$effect(() => {
		document.body.style.overflow = drawer ? 'hidden' : '';
	});

	// 筛选条件写入 URL，返回时由 onMount 重新读取
	$effect(() => {
		syncFiltersToUrl({ q, type, pkg, cat });
	});

	onMount(async () => {
		const params = new URLSearchParams(location.search);
		q = params.get('q') ?? '';
		type = params.get('type') ?? '';
		pkg = params.get('pkg') ?? '';
		cat = params.get('cat') ?? '';
		const saved = loadListState('cards');
		const [c, p] = await Promise.all([
			fetch('/data/cards.json').then((r) => r.json()),
			fetch('/data/packages.json').then((r) => r.json()),
		]);
		cards = c;
		packages = p;
		loaded = true;
		if (saved) {
			const pos = Number(saved.pos) || 0;
			await tick();
			if (isMobileLayout()) window.scrollTo(0, pos);
			else if (scrollEl) scrollEl.scrollTop = pos;
		}
	});

	// 离开页面（进入卡牌详情等）时保存滚动位置
	onMount(() => () => saveListState('cards', { pos: scrollPos }));
</script>

<svelte:head>
	<title>卡牌 · 三国杀卡查</title>
</svelte:head>

<svelte:window onscroll={() => { if (isMobileLayout()) scrollPos = window.scrollY; }} />

<div class="page">
	<aside class="pane">
		<div class="pane-title">搜索</div>
		<div class="pane-body">
			<input class="search" placeholder="卡牌名 / 效果…" bind:value={q} />
		</div>
		<div class="pane-title">卡牌包</div>
		<div class="pane-body">
			<button class="navitem" class:active={!pkg && !cat} onclick={() => { pkg = ''; cat = ''; }}>全部卡牌</button>
			{#each cardPkgs as cp, i (cp.name)}
				{#if i === 0 || cardPkgs[i - 1].category !== cp.category}
					<button class="navitem group-btn" class:active={cat === cp.category} onclick={() => { cat = cat === cp.category ? '' : cp.category; pkg = ''; }}>
						{CATEGORY_LABEL[cp.category] ?? cp.category}
						{#if countByCat.get(cp.category)}<span class="count">{countByCat.get(cp.category)}</span>{/if}
					</button>
				{/if}
				<button class="navitem sub" class:active={pkg === cp.name} onclick={() => { pkg = pkg === cp.name ? '' : cp.name; cat = ''; }}>
					{pkgLabel(cp.name)}
					{#if countByPkg.get(cp.name)}<span class="count">{countByPkg.get(cp.name)}</span>{/if}
				</button>
			{/each}
		</div>
	</aside>

	<section class="content">
		<div class="head">
			<h1>卡牌</h1>
			<span class="muted count-label">{loaded ? `${filtered.length} 种卡牌` : '加载中…'}</span>
		</div>
		<input class="search msearch" placeholder="卡牌名 / 效果…" bind:value={q} />
		<button class="mfilter" onclick={() => (drawer = true)}>
			<span class="mfilter-label">卡牌包</span>
			<span class="mfilter-value">{currentFilterLabel}</span>
			<span class="mfilter-caret">▾</span>
		</button>
		<div class="filterbar">
			<button class="chip" class:active={!type} onclick={() => (type = '')}>全部类型</button>
			{#each Object.entries(CARD_TYPE_LABEL) as [key, label] (key)}
				<button class="chip" class:active={type === key} onclick={() => (type = type === key ? '' : key)}>
					{label}
					{#if countByType.get(key)}<span class="chip-count">{countByType.get(key)}</span>{/if}
				</button>
			{/each}
		</div>
		<div class="scroll" bind:this={scrollEl} onscroll={() => { if (!isMobileLayout()) scrollPos = scrollEl?.scrollTop ?? 0; }}>
			{#if loaded && filtered.length === 0}
				<div class="empty">没有匹配的卡牌</div>
			{:else if loaded}
				<div class="grid">
					{#each filtered as c (c.id)}
						{@const mainType = c.packages.find((p) => p.type)?.type}
						{@const specs = c.packages.find((p) => p.specs.length)?.specs ?? []}
						<a class="ccard" href={`/cards/${c.id}`}>
							<div class="top">
								<span class="cname">{c.name}</span>
								{#if mainType}<span class="type-pill">{typeLabel(mainType)}</span>{/if}
							</div>
							{#if specs.length}
								<div class="specs">
									{#each specs.slice(0, 8) as s, i (i)}
										<span class="spec" class:red={suitRed(s.suit)}>{SUIT_SYMBOL[s.suit]}{numberCN(s.number)}</span>
									{/each}
									{#if specs.length > 8}<span class="spec more">+{specs.length - 8}</span>{/if}
								</div>
							{/if}
							<p class="desc">{c.description.replace(/<[^>]*>/g, ' ').slice(0, 80)}</p>
							<div class="bottom">{pkgLabel(c.packages[0].package)}</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="empty">加载中…</div>
			{/if}
		</div>
	</section>

	<!-- 移动端：卡牌包筛选抽屉（分组 + 子包单级列表） -->
	{#if drawer}
		<div class="drawer-mask" onclick={() => (drawer = false)} aria-hidden="true"></div>
		<div class="drawer" role="dialog" aria-label="选择卡牌包">
			<div class="drawer-head">
				<span class="drawer-title">选择卡牌包</span>
				<button class="drawer-close" onclick={() => (drawer = false)} aria-label="关闭">✕</button>
			</div>
			<div class="drawer-body">
				<button
					class="navitem"
					class:active={!pkg && !cat}
					onclick={() => { pkg = ''; cat = ''; drawer = false; }}
				>
					全部卡牌
					<span class="count">{cards.length}</span>
				</button>
				{#each cardPkgs as cp, i (cp.name)}
					{#if i === 0 || cardPkgs[i - 1].category !== cp.category}
						<button
							class="navitem group-btn"
							class:active={cat === cp.category}
							onclick={() => { cat = cat === cp.category ? '' : cp.category; pkg = ''; }}
						>
							{CATEGORY_LABEL[cp.category] ?? cp.category}
							{#if countByCat.get(cp.category)}<span class="count">{countByCat.get(cp.category)}</span>{/if}
						</button>
					{/if}
					<button
						class="navitem sub"
						class:active={pkg === cp.name}
						onclick={() => { pkg = pkg === cp.name ? '' : cp.name; cat = ''; drawer = false; }}
					>
						{pkgLabel(cp.name)}
						{#if countByPkg.get(cp.name)}<span class="count">{countByPkg.get(cp.name)}</span>{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		display: grid;
		grid-template-columns: 240px 1fr;
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
			gap: 12px;
		}
		/* 侧栏改为抽屉选择，不再平铺 */
		.pane {
			display: none;
		}
		.mfilter {
			display: flex;
		}
		.content {
			overflow: visible;
		}
		.scroll {
			overflow: visible;
		}
		.grid {
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			gap: 10px;
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
		padding: 8px 12px;
	}
	.pane-body {
		padding: 0 4px 8px;
	}
	/* 分组选项（身份局 / 国战）：可点击的整体筛选 */
	.group-btn {
		font-weight: 600;
		font-size: 13px;
		letter-spacing: 0.08em;
		margin-top: 10px;
		border-top: 1px solid var(--color-ink-wash);
		border-radius: 0 0 8px 8px;
		color: var(--color-graphite);
	}
	.group-btn:first-of-type {
		margin-top: 0;
		border-top: none;
		border-radius: 8px;
	}
	.navitem.sub {
		padding-left: 20px;
		font-size: 13px;
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
		margin-left: auto; /* 右对齐：多个子元素（标签+数量）时数量统一贴右 */
		padding-left: 12px;
	}
	.navitem.active .count {
		color: var(--color-cinnabar);
	}
	.content {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 12px;
		padding: 2px 4px 12px;
		flex-shrink: 0;
	}
	h1 {
		font-size: 24px;
		font-weight: 600;
	}
	.filterbar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 0 4px 14px;
		flex-shrink: 0;
	}
	.chip {
		border: 1px solid var(--color-ash-border);
		background: var(--color-pure-canvas);
		border-radius: 999px;
		padding: 5px 14px;
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-graphite);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.chip:hover {
		border-color: var(--color-gold-hairline);
		color: var(--color-onyx-ink);
	}
	.chip.active {
		background: var(--color-mint-mist);
		border-color: var(--color-emerald-signal);
		color: var(--color-emerald-signal);
		font-weight: 600;
	}
	.chip-count {
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		color: var(--color-gilded);
	}
	.chip.active .chip-count {
		color: var(--color-cinnabar);
	}
	.scroll {
		flex: 1;
		overflow-y: auto;
		min-height: 0;
		padding: 2px 2px 8px;
	}
	.count-label {
		font-size: 12px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 12px;
	}
	.ccard {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px 16px;
		background: var(--color-pure-canvas);
		border: 1px solid var(--color-ash-border);
		border-radius: 10px;
		box-shadow: var(--shadow-subtle);
		transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
	}
	.ccard:hover {
		box-shadow: var(--shadow-card-lift);
		border-color: var(--color-gold-hairline);
		transform: translateY(-2px);
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.cname {
		font-family: var(--font-inter-tight);
		font-size: 18px;
		font-weight: 700;
		color: var(--color-onyx-ink);
		white-space: nowrap;
	}
	.type-pill {
		flex-shrink: 0;
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--color-fog);
		color: var(--color-slate-whisper);
		border: 1px solid var(--color-ash-border);
	}
	.specs {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
	}
	.spec {
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		color: var(--color-graphite);
	}
	.spec.red {
		color: var(--color-crimson-ink);
	}
	.spec.more {
		color: var(--color-zinc-veil);
	}
	.desc {
		flex: 1;
		margin: 0;
		font-size: 12px;
		line-height: 1.6;
		color: var(--color-slate-whisper);
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.bottom {
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--color-gilded);
	}
	.empty {
		color: var(--color-slate-whisper);
		text-align: center;
		padding: 64px 0;
	}

	/* ── 移动端：搜索框 + 卡牌包筛选按钮 + 抽屉 ── */
	@media (min-width: 901px) {
		.mfilter,
		.msearch {
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
		margin-bottom: 12px;
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
	.mfilter-caret {
		flex-shrink: 0;
		color: var(--color-zinc-veil);
		font-size: 12px;
	}
	.msearch {
		margin-bottom: 10px;
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
	.drawer-title {
		flex: 1;
		font-family: var(--font-inter-tight);
		font-size: 15px;
		font-weight: 700;
		text-align: center;
	}
	.drawer-close {
		border: none;
		background: transparent;
		font-family: var(--font-ui);
		font-size: 14px;
		font-weight: 500;
		color: var(--color-zinc-veil);
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 6px;
	}
	.drawer-close:active {
		background: var(--color-fog);
	}
	.drawer-body {
		overflow-y: auto;
		overscroll-behavior: contain; /* 抽屉内滚动到头不再带动背景 */
		padding: 8px;
	}
	.drawer-body .group-btn:first-of-type {
		margin-top: 0;
	}
</style>
