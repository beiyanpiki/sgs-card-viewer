<script lang="ts">
	import { SUIT_SYMBOL, suitRed, typeLabel } from '$lib/kingdoms';
	import packages from '$lib/data/packages.json';
	import type { Card } from '$lib/types';

	let { data }: { data: { card: Card } } = $props();

	const c = $derived(data.card);
	const pkgLabel = (name: string) => packages.find((p) => p.name === name)?.label ?? name;
	const numberCN = (n: number | null) => (n === null ? '' : n <= 10 ? String(n) : ['J', 'Q', 'K'][n - 11] ?? String(n));
	const first = $derived(c.packages.find((p) => p.specs.length)?.specs[0]);
</script>

<svelte:head>
	<title>{c.name} · 三国杀卡查</title>
	<meta name="description" content="{c.name}：{c.subtitle}" />
</svelte:head>

<div class="detail">
	<div class="cardface">
		<div class="corner">
			<span class="num">{numberCN(first?.number ?? null)}</span>
			<span class="suit" class:red={suitRed(first?.suit ?? '')}>{SUIT_SYMBOL[first?.suit ?? '']}</span>
		</div>
		<div class="cname">{c.name}</div>
		<div class="csub">{c.subtitle}</div>
	</div>

	<div class="main">
		<div class="head">
			<h1>{c.name}</h1>
			{#if c.subtitle}<span class="sub">{c.subtitle}</span>{/if}
		</div>
		<div class="card desc">
			{@html c.description || '暂无描述'}
		</div>

		{#each c.packages as p (p.package)}
			<section class="card pkgsec">
				<h2>
					{pkgLabel(p.package)}
					{#if p.type}<span class="pill">{typeLabel(p.type)}</span>{/if}
				</h2>
				<div class="specs">
					{#each p.specs as s, i (i)}
						<span class="pill spec" class:red={suitRed(s.suit)}>{SUIT_SYMBOL[s.suit]}{numberCN(s.number)}</span>
					{/each}
				</div>
			</section>
		{/each}
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
	}
	.cardface {
		width: 220px;
		height: 308px;
		border-radius: 12px;
		background: var(--color-fog);
		border: 1px solid var(--color-ash-border);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-subtle);
	}
	.corner {
		position: absolute;
		top: 10px;
		left: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		font-size: 22px;
		line-height: 1.1;
	}
	.num {
		font-weight: 600;
	}
	.red {
		color: var(--color-crimson-ink);
	}
	.cname {
		font-family: var(--font-inter-tight);
		font-size: 60px;
		writing-mode: vertical-rl;
		font-weight: 700;
		color: var(--color-onyx-ink);
		letter-spacing: 8px;
	}
	.csub {
		position: absolute;
		bottom: 12px;
		color: var(--color-slate-whisper);
		font-size: 12px;
	}
	.main {
		flex: 1;
		min-width: 320px;
	}
	h1 {
		font-size: 36px;
		font-weight: 700;
	}
	h1 .sub {
		font-size: 18px;
		color: var(--color-slate-whisper);
		margin-left: 10px;
	}
	.desc {
		margin: 14px 0 24px;
		padding: 16px 20px;
		font-size: 14px;
		color: var(--color-charcoal);
	}
	.pkgsec {
		padding: 16px 20px;
		margin-bottom: 12px;
	}
	.pkgsec h2 {
		font-size: 18px;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}
	.specs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.spec {
		font-size: 13px;
	}
</style>
