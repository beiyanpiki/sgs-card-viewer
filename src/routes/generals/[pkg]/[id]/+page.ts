import { error } from '@sveltejs/kit';
import generals from '$lib/data/generals.json';
import type { General } from '$lib/types';

const all = generals as General[];

export function entries() {
	return all.map((g) => ({ pkg: g.package, id: g.id }));
}

export function load({ params }: { params: { pkg: string; id: string } }) {
	const general = all.find((g) => g.package === params.pkg && g.id === params.id);
	if (!general) error(404, '武将不存在');
	const related = all.filter((g) => g.id === params.id);
	return { general, related };
}
