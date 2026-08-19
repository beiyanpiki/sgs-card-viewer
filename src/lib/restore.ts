// 列表页状态恢复：筛选条件走 URL 查询参数，滚动位置与分页状态走 sessionStorage，
// 使「进入详情页 → 返回」后仍能回到原来的筛选结果与滚动位置。
const storageKey = (k: string) => `sgs:list:${k}`;

// 与页面 CSS 的断点保持一致：≤900px 时由 window 滚动，桌面端由 .scroll 容器滚动
export function isMobileLayout(): boolean {
	return window.matchMedia('(max-width: 900px)').matches;
}

export function saveListState(k: string, data: Record<string, unknown>): void {
	try {
		sessionStorage.setItem(storageKey(k), JSON.stringify(data));
	} catch {
		// sessionStorage 不可用（隐私模式等）时静默降级
	}
}

export function loadListState(k: string): Record<string, unknown> | null {
	try {
		const raw = sessionStorage.getItem(storageKey(k));
		return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

// 把筛选状态写入当前历史条目的 URL（不产生新记录），
// 浏览器返回时 onMount 重新读取查询参数即可还原筛选
export function syncFiltersToUrl(params: Record<string, string>): void {
	const sp = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
	const s = sp.toString();
	history.replaceState(null, '', s ? `?${s}` : location.pathname);
}
