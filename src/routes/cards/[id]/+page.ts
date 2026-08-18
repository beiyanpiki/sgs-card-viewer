import { error } from '@sveltejs/kit';
import cards from '$lib/data/cards.json';
import type { Card } from '$lib/types';

const all = cards as Card[];

export function entries() {
	return all.map((c) => ({ id: c.id }));
}

export function load({ params }: { params: { id: string } }) {
	const card = all.find((c) => c.id === params.id);
	if (!card) error(404, '卡牌不存在');
	return { card };
}
