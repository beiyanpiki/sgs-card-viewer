<script lang="ts">
	import generals from '$lib/data/generals.json';
	import cards from '$lib/data/cards.json';
	import packages from '$lib/data/packages.json';

	let q = $state('');

	function go(e: SubmitEvent) {
		e.preventDefault();
		window.location.href = `/generals${q ? `?q=${encodeURIComponent(q)}` : ''}`;
	}

	// 点将：五名标准包武将，扇面即资料库本身
	const featured = ['zhaoyun', 'guanyu', 'zhugeliang', 'caocao', 'diaochan']
		.map((id) => generals.find((g) => g.id === id))
		.filter((g): g is NonNullable<typeof g> => Boolean(g));

	const categories = [
		{ label: '经典', desc: '标准 · 军争 · 神话再临 · 一将成名' },
		{ label: '国战', desc: '君临天下 · 势备篇 · 九变篇' },
		{ label: '线上平台', desc: 'OL · 十周年 · 手杀 · 国际服 · 小程序' },
		{ label: '线下', desc: '珍藏 · 官盗 · 用间 · 山河煮酒' },
	];
</script>

<svelte:head>
	<title>三国杀卡查</title>
	<meta name="description" content="三国杀武将/卡牌查询，基于 FreeKill 数据" />
</svelte:head>

<section class="hero">
	<div class="left">
		<div class="titleblock">
			<h1>三国杀卡查</h1>
			<span class="seal" aria-hidden="true">卡<br />查</span>
		</div>
		<p class="tagline">基于 FreeKill 数据的武将 · 卡牌资料库</p>
		<form onsubmit={go}>
			<div class="searchbar">
				<span class="glyph">⌕</span>
				<input placeholder="搜索武将 / 技能…" bind:value={q} />
				<button class="btn-primary" type="submit">搜索</button>
			</div>
		</form>
		<nav class="entries" aria-label="资料库入口">
			<a class="entry" href="/generals">
				<span class="entry-name">武将</span>
				<span class="entry-count">{generals.length} 名</span>
				<span class="entry-arrow">→</span>
			</a>
			<a class="entry" href="/cards">
				<span class="entry-name">卡牌</span>
				<span class="entry-count">{cards.length} 种</span>
				<span class="entry-arrow">→</span>
			</a>
		</nav>
	</div>

	<div class="fan" aria-hidden="true">
		{#each featured as g, i (g.id)}
			<a class="fancard" href={`/generals/${g.package}/${g.id}`} style="--i:{i};--n:{featured.length}">
				<img src={g.image} alt={g.name} loading="eager" />
				<span class="fanname">{g.name}</span>
			</a>
		{/each}
	</div>
</section>

<section class="shelves">
	<div class="shelves-head">
		<h2>收录范围</h2>
		<span class="muted">{packages.length} 个扩展包 · 四大分类</span>
	</div>
	<div class="shelves-grid">
		{#each categories as c (c.label)}
			<a class="shelf" href={`/generals`}>
				<span class="shelf-name">{c.label}</span>
				<span class="shelf-desc">{c.desc}</span>
			</a>
		{/each}
	</div>
</section>

<style>
	.hero {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 48px;
		max-width: 1080px;
		margin: 0 auto;
		padding: 88px 32px 56px;
	}
	.left {
		max-width: 520px;
	}

	/* 竖排题签：宋体积墨 + 朱砂印 */
	.titleblock {
		display: flex;
		align-items: flex-start;
		justify-content: flex-end;
		flex-direction: row-reverse;
		gap: 18px;
	}
	h1 {
		writing-mode: vertical-rl;
		font-size: clamp(56px, 8vw, 84px);
		font-weight: 700;
		line-height: 1.08;
		letter-spacing: 0.18em;
		color: var(--color-onyx-ink);
		margin: 0;
	}
	.seal {
		background: var(--color-seal-red);
		color: #f8f5ee;
		border-radius: 5px;
		padding: 8px 5px;
		font-family: var(--font-inter-tight);
		font-size: 13px;
		font-weight: 700;
		line-height: 1.3;
		text-align: center;
		letter-spacing: 0.08em;
		box-shadow: inset 0 0 0 1.5px rgba(248, 245, 238, 0.35);
		transform: rotate(2deg);
	}
	.tagline {
		font-size: 15px;
		color: var(--color-graphite);
		margin: 22px 0 26px;
		letter-spacing: 0.06em;
	}

	.searchbar {
		display: flex;
		align-items: center;
		border: 1px solid var(--color-ash-border);
		border-radius: 12px;
		padding: 4px 4px 4px 16px;
		gap: 8px;
		background: var(--color-pure-canvas);
		box-shadow: var(--shadow-subtle);
	}
	.searchbar:focus-within {
		border-color: var(--color-emerald-signal);
		box-shadow: 0 0 0 3px rgba(180, 35, 24, 0.1);
	}
	.glyph {
		color: var(--color-slate-whisper);
		font-size: 16px;
	}
	input {
		border: none;
		flex: 1;
		font-size: 16px;
		font-family: var(--font-ui);
		color: var(--color-onyx-ink);
		background: transparent;
		min-width: 0;
	}
	input:focus {
		outline: none;
	}

	/* 入档入口：数字即导航 */
	.entries {
		display: flex;
		gap: 12px;
		margin-top: 26px;
	}
	.entry {
		flex: 1;
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 14px 16px;
		border: 1px solid var(--color-ash-border);
		border-radius: 10px;
		background: var(--color-pure-canvas);
		box-shadow: var(--shadow-subtle);
		transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
	}
	.entry:hover {
		border-color: var(--color-gold-hairline);
		box-shadow: var(--shadow-card-lift);
		transform: translateY(-2px);
	}
	.entry-name {
		font-family: var(--font-inter-tight);
		font-size: 19px;
		font-weight: 700;
	}
	.entry-count {
		font-size: 13px;
		color: var(--color-gilded);
		font-variant-numeric: tabular-nums;
	}
	.entry-arrow {
		margin-left: auto;
		color: var(--color-zinc-veil);
		font-size: 14px;
	}
	.entry:hover .entry-arrow {
		color: var(--color-emerald-signal);
	}

	/* 签名元素：点将扇面 */
	.fan {
		position: relative;
		width: 380px;
		height: 420px;
		flex-shrink: 0;
	}
	.fancard {
		position: absolute;
		left: 50%;
		bottom: 0;
		width: 168px;
		transform-origin: 50% 130%;
		transform: translateX(-50%)
			rotate(calc((var(--i) - (var(--n) - 1) / 2) * 9deg));
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--color-ash-border);
		box-shadow: var(--shadow-card-lift);
		background: var(--color-fog);
		animation: deal 0.6s cubic-bezier(0.2, 0.7, 0.3, 1.1) backwards;
		animation-delay: calc(var(--i) * 0.09s + 0.15s);
		transition: transform 0.22s ease, box-shadow 0.22s ease;
	}
	.fancard img {
		width: 100%;
		aspect-ratio: 250/292;
		object-fit: cover;
		display: block;
	}
	.fanname {
		position: absolute;
		left: 8px;
		bottom: 8px;
		writing-mode: vertical-rl;
		font-family: var(--font-inter-tight);
		font-size: 15px;
		font-weight: 700;
		color: #f8f5ee;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
		letter-spacing: 0.14em;
	}
	.fancard:hover {
		transform: translateX(-50%) translateY(-14px) rotate(0deg);
		box-shadow: 0 14px 28px -10px rgba(33, 29, 23, 0.35);
		z-index: 2;
	}
	@keyframes deal {
		from {
			transform: translateX(-50%) rotate(0deg) translateY(40px);
			opacity: 0;
		}
	}

	/* 收录范围：分类导览 */
	.shelves {
		max-width: 1080px;
		margin: 0 auto;
		padding: 0 32px 72px;
	}
	.shelves-head {
		display: flex;
		align-items: baseline;
		gap: 14px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--color-ink-wash);
	}
	.shelves-head h2 {
		font-size: 18px;
	}
	.shelves-head .muted {
		font-size: 12px;
	}
	.shelves-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
		padding-top: 16px;
	}
	.shelf {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 16px 18px;
		border-left: 3px solid var(--color-gold-hairline);
		border-radius: 0 8px 8px 0;
		background: var(--color-pure-canvas);
		box-shadow: var(--shadow-subtle);
		transition: border-color 0.15s, transform 0.15s;
	}
	.shelf:hover {
		border-left-color: var(--color-cinnabar);
		transform: translateX(3px);
	}
	.shelf-name {
		font-family: var(--font-inter-tight);
		font-size: 16px;
		font-weight: 700;
	}
	.shelf-desc {
		font-size: 12px;
		color: var(--color-slate-whisper);
		line-height: 1.6;
	}

	@media (prefers-reduced-motion: reduce) {
		.fancard {
			animation: none;
		}
		.fancard,
		.entry,
		.shelf {
			transition: none;
		}
	}
	@media (max-width: 900px) {
		.hero {
			flex-direction: column;
			gap: 36px;
			padding: 48px 18px 40px;
		}
		.left {
			max-width: none;
			width: 100%;
		}
		.titleblock {
			justify-content: flex-start;
			flex-direction: row;
		}
		h1 {
			font-size: 52px;
		}
		.fan {
			width: 100%;
			max-width: 380px;
			height: 330px;
			margin: 0 auto;
		}
		.fancard {
			width: 140px;
		}
		.shelves {
			padding: 0 18px 56px;
		}
	}
</style>
