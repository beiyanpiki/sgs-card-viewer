export interface KingdomStyle {
	label: string;
	bg: string;
	fg: string;
}

export const KINGDOMS: Record<string, KingdomStyle> = {
	wei: { label: '魏', bg: '#e8eff7', fg: '#2b5c9e' },
	shu: { label: '蜀', bg: '#e9f2e6', fg: '#3f7d4e' },
	wu: { label: '吴', bg: '#f7e9e6', fg: '#a03028' },
	qun: { label: '群', bg: '#eee9dc', fg: '#6b6152' },
	god: { label: '神', bg: '#f5ecd7', fg: '#8a6a12' },
	jin: { label: '晋', bg: '#ebe6f4', fg: '#5d4a8f' },
	wild: { label: '野', bg: '#e6f0ea', fg: '#4e7d62' },
	west: { label: '西', bg: '#f0ebee', fg: '#8f4e5e' },
	evil: { label: '邪', bg: '#eee6f0', fg: '#6e4a8f' },
	qin: { label: '秦', bg: '#f2eee4', fg: '#7d6b3e' },
};

export function kingdomLabel(k: string): string {
	return KINGDOMS[k]?.label ?? k;
}

export function kingdomStyle(k: string): KingdomStyle {
	return KINGDOMS[k] ?? { label: k, bg: '#f4f4f5', fg: '#52525b' };
}

export const SUIT_SYMBOL: Record<string, string> = {
	spade: '♠',
	heart: '♥',
	club: '♣',
	diamond: '♦',
	nosuit: '',
};

export function suitRed(suit: string): boolean {
	return suit === 'heart' || suit === 'diamond';
}

export const CARD_TYPE_LABEL: Record<string, string> = {
	basic: '基本牌',
	trick: '锦囊牌',
	equip: '装备牌',
};

export function typeLabel(t: string): string {
	return CARD_TYPE_LABEL[t] ?? t;
}
