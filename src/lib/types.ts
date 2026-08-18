export interface Skill {
	id: string;
	name: string;
	description: string;
}

export interface General {
	package: string;
	id: string;
	name: string;
	title: string;
	kingdom: string;
	hp: number | null;
	maxHp: number | null;
	gender: string;
	illustrator: string;
	image: string | null;
	skills: Skill[];
}

export interface CardSpec {
	suit: string;
	number: number | null;
}

export interface CardPackVersion {
	package: string;
	type: string;
	specs: CardSpec[];
	skill: string | null;
}

export interface Card {
	id: string;
	name: string;
	subtitle: string;
	description: string;
	packages: CardPackVersion[];
}

export interface GamePackage {
	name: string;
	label: string;
	extensionName?: string;
	mainLabel?: string;
	category?: string;
}
