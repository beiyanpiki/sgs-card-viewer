<script lang="ts">
	import { kingdomLabel, kingdomStyle } from '$lib/kingdoms';
	import packages from '$lib/data/packages.json';
	import type { General } from '$lib/types';

	let { data }: { data: { general: General; related: General[] } } = $props();

	const g = $derived(data.general);
	const ks = $derived(kingdomStyle(g.kingdom));
	const pkg = $derived(packages.find((p) => p.name === g.package));
	const hpDisplay = $derived(g.maxHp && g.maxHp !== g.hp ? `${g.hp}/${g.maxHp}` : `${g.hp ?? '?'}`);
</script>

<svelte:head>
	<title>{g.name}（{g.title || pkg?.label || ''}）· 三国杀卡查</title>
	<meta name="description" content="{g.name}：{g.skills.map((s) => s.name).join('、')}" />
</svelte:head>

<div class="detail">
	<div class="portrait">
		{#if g.image}
			<img src={g.image} alt={g.name} />
		{:else}
			<div class="noimg">{g.name}</div>
		{/if}
	</div>

	<div class="main">
		<div class="head">
			<h1>{g.name}</h1>
			{#if g.title}<span class="title">{g.title}</span>{/if}
		</div>
		<div class="meta">
			<span class="pill" style={`background:${ks.bg};color:${ks.fg}`}>{kingdomLabel(g.kingdom)}</span>
			<span class="pill">{g.gender === 'female' ? '女性' : '男性'}</span>
			<span class="pill">体力 {hpDisplay}</span>
			<a class="pill" href={`/generals?main=${pkg?.extensionName ?? ''}&sub=${g.package}`}>{pkg?.label ?? g.package}</a>
			{#if g.illustrator}<span class="pill">画师：{g.illustrator}</span>{/if}
		</div>

		<div class="skills">
			{#each g.skills as s (s.id)}
				<section class="card skill">
					<h2>{s.name}</h2>
					<p>{@html s.description || '暂无描述'}</p>
				</section>
			{:else}
				<p class="muted">暂无技能信息</p>
			{/each}
		</div>

		{#if data.related.length > 1}
			<div class="related">
				<h3>其他版本</h3>
				<div class="rel">
					{#each data.related as r (r.package)}
						{#if r.package !== g.package}
							<a class="pill" href={`/generals/${r.package}/${r.id}`}>
								{packages.find((p) => p.name === r.package)?.label ?? r.package}
							</a>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.detail {
		display: flex;
		gap: 32px;
		padding: 40px 32px 64px;
		max-width: 1200px;
		margin: 0 auto;
		flex-wrap: wrap;
	}
	@media (max-width: 900px) {
		.detail {
			padding: 20px 14px 48px;
			gap: 20px;
		}
		.portrait img {
			width: 100%;
			max-width: 260px;
		}
	}
	.portrait img {
		width: 300px;
		border-radius: 12px;
		border: 1px solid var(--color-ash-border);
		box-shadow: var(--shadow-subtle);
		display: block;
	}
	.noimg {
		width: 300px;
		aspect-ratio: 250/292;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-fog);
		border-radius: 12px;
		font-size: 36px;
		color: var(--color-zinc-veil);
	}
	.main {
		flex: 1;
		min-width: 320px;
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 12px;
	}
	h1 {
		font-size: 36px;
		font-weight: 700;
	}
	.title {
		color: var(--color-slate-whisper);
		font-size: 18px;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 12px 0 24px;
	}
	a.pill:hover {
		box-shadow: var(--shadow-subtle-2);
	}
	.skill {
		padding: 16px 20px;
		margin-bottom: 12px;
	}
	.skill h2 {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-emerald-signal);
		margin-bottom: 4px;
	}
	.skill :global(p) {
		margin: 0;
		font-size: 14px;
		color: var(--color-charcoal);
	}
	.related h3 {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-slate-whisper);
	}
	.rel {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 8px;
	}
</style>
