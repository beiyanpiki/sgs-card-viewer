// Build-time data extraction: executes FreeKill package lua files with a stubbed
// Fk environment via wasmoon, and emits JSON + copies images into static/.
import { LuaFactory } from 'wasmoon';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../FreeKill-release');
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(SITE, 'src/lib/data');
const IMG_DIR = path.join(SITE, 'static/images');

const EXCLUDED_PACKAGES = new Set([
	'test', '1v1_test', '1v1_test_mode', 'uno', 'poker-games', 'chess-games',
	'freekill-core', 'lunarltk-qsgs-ui', 'lunarltk_skins', 'gamemode', 'utility',
	'brainhole_new', // 脑洞包
	'lunar',         // 新月
	'qsgs',          // 太阳神三国杀
]);

// 卡牌只收录：标+EX、军争、国战相关
const CARD_PACKAGES = new Set([
	'standard_cards', 'standard_ex_cards', // 标准牌堆 + EX 牌（standard_ex 的卡牌与 EX 牌堆重复，不收录）
	'maneuvering',                         // 军争
	'hegemony', 'hegemony_cards', 'strategic_advantage', // 国战
	'nine_variations', 'lord_cards', 'm_lord_cards',
]);

// 武将包排除（按标签）：测试服等
const EXCLUDED_GENERAL_LABELS = ['测试', '单机'];
// 占位/无对应武将的势力，直接排除
const EXCLUDED_KINGDOMS = ['unknown', 'hidden'];

const LABEL_OVERRIDES = {
	hegemony: '国战卡牌',
	// 主扩展组名（子包会去掉与组名重复的前缀）
	__mainLabels: { standard_ex: '界限突破' },
	// 包级标签统一格式：子包名不带主分组前缀；系列子包用「系列·名」
	__packageLabels: {
		hegemony: '国战基础卡牌',
		// 国战
		hegemony_standard: '标准版', hegemony_cards: '标准卡牌',
		formation: '君临天下·阵', momentum: '君临天下·势', transformation: '君临天下·变', power: '君临天下·权',
		lord_ex: '君临天下·EX·不臣篇',
		strategic_advantage: '势备篇', nine_variations: '九变篇',
		lord_cards: '君主', m_lord_cards: '手杀君主',
		zqdl: '紫气东来', jyzs: '金印紫授', zfxp: '紫凤衔佩',
		online_heg: 'OL专属', mobile_heg: '手杀专属', tenyear_heg: '十周年专属', overseas_heg: '国际服专属', offline_heg: '线下',
		// 标准系
		standard: '标准包', standard_cards: '标准卡牌',
		standard_ex: '标准包', standard_ex_cards: '界限突破卡牌',
		// 谋攻篇
		mou_zhi: '知包', mou_shi: '识包', mou_tong: '同包', mou_yu: '虞包', mou_neng: '能包',
		// 手杀
		mobile_bingshi: '兵势篇', mobile_shiji: '始计篇', m_shzl_ex: '界限突破', m_yj_ex: '界一将成名',
		mobile_sp: 'SP', mobile_lxxh: '龙血玄黄', mobile_rare: '稀有专属', mobile_jsrg: '江山如故',
		// OL
		ol_shzl: '神话再临', ol_yj: '一将成名', ol_ex_shzl: '界限突破', ol_exyj: '界一将成名',
		ol_wende: '文德武备', ol_xinghe: '璀璨星河', ol_mou: '谋', ol_mo: '魔', ol_menfa: '门阀士族',
		ol_jsrg: '江山如故', ol_qifu: '祈福', ol_sp_pack: 'SP', ol_other: '其他',
		// 十周年
		tenyear_yj: '一将成名', tenyear_ex: '界一将成名', tenyear_xinghuo: '星火燎原', tenyear_sp: '限定专属',
		tenyear_wei: '威', tenyear_mou: '谋', tenyear_star: '星河璀璨', tenyear_huicui: '群英荟萃', tenyear_other: '其他',
		// 十周年小程序
		tenyear_mini_standard: '标准包', tenyear_mini_shzl: '神话再临', tenyear_mini_xinghuo: '星火燎原', tenyear_mini_huicui: '群英荟萃',
		// 国际服
		overseas_ex: '界限突破', overseas_if: 'IF篇', overseas_wuxia: '武侠篇', overseas_strategizing: '运筹帷幄',
		overseas_sxrm: '蚀心入魔', overseas_sp: 'SP', overseas_rare: '稀有专属', overseas_other: '其他',
		// 小程序
		minisp: '专属', mini_ambition: '志', mini_extreme: '登峰造极', mini_shzl: '神话再临', mini_yj: '一将', mini_re: '万象', mini_other: '其他',
		// 线下
		ofl_other: '官正产品综合', wangzhan: '王者之战', ofl_rare: '珍藏', ofl_mougong: '谋攻篇',
		piracy_e: '官盗E系列', piracy_s: '官盗S系列', espionage_beta: '用间beta', shzj: '山河煮酒', txhy: '太虚幻魇',
		qgzx: '驱鬼逐邪', sixiangfengyin: '四象封印', zcfy: '珍藏封印', assassins: '铜雀台', bgmdiy: '桌游志贴纸',
	},
	// 技能名兜底翻译（源数据 zh_CN 缺失）
	__skillLabels: { m_feiyang: '飞扬', m_bahu: '跋扈' },
	hegemony_cards: '国战标准卡牌',
	strategic_advantage: '国战·势备篇',
	nine_variations: '国战·九变篇',
	lord_cards: '国战·君主',
	m_lord_cards: '国战·手杀君主',
	standard_cards: '标准卡牌',
	maneuvering: '军争篇',
};

// 扩展（大包）展示顺序：分类 → 发售先后 → 平台专属
const EXTENSION_ORDER = [
	'standard', 'standard_cards', 'standard_ex', // 标准包 / 标准卡牌 / 界限突破
	'maneuvering',                                // 军争篇
	'shzl',                                       // 神话再临
	'yj',                                         // 一将成名
	'sp',                                         // SP
	'jsrg',                                       // 江山如故
	'sxrm',                                       // 蚀心入魔
	'offline_new',                                // 线下
	'hegemony',                                   // 国战
	'mougong',                                    // 谋攻篇(OL 起源)
	'ol', 'tenyear', 'tenyear_mini', 'mobile', 'overseas', 'mini', // 各平台
];

// 扩展内部小包的发售顺序（未列出的按名称排序，排最后）
const PACK_ORDER = {
	standard: ['standard', 'standard_cards'],
	standard_ex: ['standard_ex', 'standard_ex_cards'],
	shzl: ['wind', 'fire', 'forest', 'mountain', 'shadow', 'thunder', 'shzl_god'],
	jsrg: ['beginning', 'continue', 'transition', 'conclusion', 'decline', 'rise'],
	mougong: ['mou_zhi', 'mou_shi', 'mou_tong', 'mou_yu', 'mou_neng'],
	sxrm: ['suspicion', 'pride', 'rage'],
	hegemony: [
		'hegemony_standard', 'hegemony_cards', 'hegemony', // 国战标准
		'formation', 'momentum', 'transformation', 'power', // 君临天下·阵势变权
		'lord_ex', 'strategic_advantage', 'nine_variations', 'lord_cards',
		'zqdl', 'jyzs', 'zfxp',                           // 紫气东来 / 金印紫授 / 紫凤衔佩
		'online_heg', 'mobile_heg', 'tenyear_heg', 'overseas_heg', 'm_lord_cards',
		'offline_heg',
	],
};

// 大包分类（用于前端淡色分组标题）
const EXTENSION_CATEGORY = {
	standard: '经典', standard_cards: '经典', standard_ex: '经典',
	maneuvering: '经典', shzl: '经典', yj: '经典', sp: '经典',
	jsrg: '经典', sxrm: '经典', mougong: '线上平台',
	hegemony: '国战',
	ol: '线上平台', tenyear: '线上平台', tenyear_mini: '线上平台',
	mobile: '线上平台', overseas: '线上平台', mini: '线上平台',
	offline_new: '线下',
};

const SUITS = { 0: 'nosuit', 1: 'spade', 2: 'heart', 3: 'club', 4: 'diamond' };
const CARD_TYPES = { 1: 'basic', 2: 'trick', 3: 'equip' };

const state = {
	generals: [],      // {package, id, kingdom, hp, maxHp, gender, skills: []}
	cards: {},         // id -> {package, id, type, specs: []}
	translations: {},  // merged default/zh_CN table
	packages: {},      // name -> {name}
	warnings: 0,
};

function fileExists(p) {
	try { return fs.statSync(p).isFile(); } catch { return false; }
}

function resolveFromRoot(rel) {
	const clean = rel.replace(/^\.?\//, '');
	const p = path.join(ROOT, clean);
	if (fileExists(p)) return p;
	const init = path.join(ROOT, clean, 'init.lua');
	if (fileExists(init)) return init;
	return null;
}

const PREAMBLE = `
local function magic(name)
  local t = {}
  t = setmetatable(t, {
    __index = function(_, k)
      local v = magic(name .. "." .. tostring(k))
      rawset(t, k, v)
      return v
    end,
    __call = function(_, ...) return magic(name .. "()") end,
    __tostring = function() return name end,
  })
  return t
end

-- permissive environment: any unknown global becomes a magic stub
setmetatable(_G, {
  __index = function(_, k)
    local v = magic("global." .. tostring(k))
    rawset(_G, k, v)
    return v
  end,
})

Card = {
  TypeBasic = 1, TypeTrick = 2, TypeEquip = 3,
  Spade = 1, Heart = 2, Club = 3, Diamond = 4, NoSuit = 0,
  HeartSuit = 2,
}

General = { Male = 1, Female = 2, Big = 3, Deputy = 4 }
-- old-style direct calls: General(extension, "id", ...)
setmetatable(General, { __call = function(_, ...) return General:new(...) end })

-- user code: General:new(extension, "caocao", "wei", 4, [maxHp], [gender])
function General:new(extension, id, kingdom, hp, maxHp, gender, ...)
  local pkg = type(extension) == "table" and rawget(extension, "__pkgname") or current_pkg()
  __record_general(pkg, id, kingdom, hp, maxHp, gender)
  -- chainable permissive object that records addSkill*-style calls
  local g = {}
  g = setmetatable(g, {
    __index = function(_, k)
      local function method(self, ...)
        local arg = ...
        if (k == "addSkills" or k == "addRelatedSkills" or k == "addSkill") and type(arg) == "table" then
          local list = {}
          for _, v in ipairs(arg) do list[#list+1] = tostring(v) end
          __record_general_skills(pkg, id, table.concat(list, ","))
        elseif type(arg) == "string" and (k == "addSkill" or k == "addRelatedSkill") then
          __record_general_skills(pkg, id, arg)
        end
        return g
      end
      rawset(g, k, method)
      return method
    end,
    __call = function() return g end,
  })
  return g
end

Package = {}
__packages_registry = {}
function Package:new(name)
  local p = { __pkgname = name }
  setmetatable(p, {
    __index = function(_, k)
      local function method(...)
        local args = {...}
        if k == "addCardSpec" then
          local cname, csuit, cnum = args[1], args[2], args[3]
          if type(cname) ~= "string" then cname, csuit, cnum = args[2], args[3], args[4] end
          __record_card_spec(name, cname, csuit, cnum)
        elseif k == "loadSkillSkelsByPath" or k == "loadCardSkelsByPath" then
          local dir = type(args[1]) == "string" and args[1] or args[2]
          if type(dir) == "string" then loadskilldir(dir) end
        end
        -- loadSkillSkels / loadCardSkels / addGameMode etc: no-op
        return p
      end
      rawset(p, k, method)
      return method
    end,
    __newindex = function(t, k, v)
      if k == "extensionName" and type(v) == "string" then
        __record_ext_name(name, v)
      end
      rawset(t, k, v)
    end,
  })
  __record_package(name)
  __packages_registry[name] = p
  return p
end
-- old-style direct calls: Package("name")
setmetatable(Package, { __call = function(_, ...) return Package:new(...) end })

fk = {}
setmetatable(fk, {
  __index = function(_, k)
    local v = magic("fk." .. tostring(k))
    rawset(fk, k, v)
    return v
  end,
})
-- make a user table chainable/permissive for method calls like t:addEffect(...)
local function permissive(t)
  if type(t) ~= "table" then return t end
  return setmetatable(t, {
    __index = function(tt, k)
      local function method(...) return tt end
      rawset(tt, k, method)
      return method
    end,
  })
end

function fk.CreateSkill(t)
  if type(t) == "table" and rawget(t, "name") then __record_skill(rawget(t, "name")) end
  return permissive(t)
end
function fk.CreateCard(t)
  if type(t) == "table" and rawget(t, "name") then
    __record_card(current_pkg(), t)
  end
  return permissive(t)
end
function fk.CreateGameMode(t) return t end

Fk = {}
setmetatable(Fk, {
  __index = function(_, k)
    local v = magic("Fk." .. tostring(k))
    rawset(Fk, k, v)
    return v
  end,
})
function Fk:loadTranslationTable(t, lang)
  if type(t) ~= "table" then return end
  if lang ~= nil and lang ~= "zh_CN" then return end
  for k, v in pairs(t) do
    if type(k) == "string" and type(v) == "string" then
      __record_translation(k, v)
    end
  end
end

package = { loaded = {} }
-- extra Util-lib helpers used by package code
table.insertIfNeed = function(t, v)
  if type(t) == "table" then for _, x in ipairs(t) do if x == v then return end end t[#t+1] = v end
  return t
end
table.simpleClone = function(t)
  if type(t) ~= "table" then return t end
  local r = {}
  for k, v in pairs(t) do r[k] = v end
  return r
end

function require(modname)
  if package.loaded[modname] ~= nil then return package.loaded[modname] end
  if type(modname) ~= "string" then return magic("require.notastring") end
  -- engine/UI modules that don't exist on disk: hand out a permissive stub
  if modname:sub(1, 6) == "ui_emu" or modname:sub(1, 3) == "ltk" then
    local stub = magic(modname)
    package.loaded[modname] = stub
    return stub
  end
  local base = modname:gsub("%.", "/")
  local src = __readfile(base .. "/init.lua") or __readfile(base .. ".lua")
  if not src then error("module not found: " .. modname, 2) end
  local chunk, err = load(src, "@" .. modname, "t")
  if not chunk then error("compile error in " .. modname .. ": " .. tostring(err), 2) end
  local ok, result = pcall(chunk)
  if not ok then
    __log("require failed: " .. modname .. ": " .. tostring(result))
    return nil
  end
  package.loaded[modname] = result == nil and true or result
  return package.loaded[modname]
end

-- execute every .lua file in a directory (used to emulate path-based skill loaders)
function loadskilldir(dirpath)
  local files = __list_dir(dirpath)
  if not files then return end
  for _, f in ipairs(files) do
    local src = __readfile(f)
    if src then
      local chunk, err = load(src, "@" .. f, "t")
      if chunk then
        local ok, r = pcall(chunk)
        if not ok then __log("file failed: " .. f .. ": " .. tostring(r)) end
      else
        __log("compile failed: " .. f .. ": " .. tostring(err))
      end
    end
  end
end

current_pkg_name = "__none__"
function current_pkg() return current_pkg_name end

-- build flags that gate require-path prefixes; must be real false, not magic stubs
UsingNewCore = false

function dofile(path)
  local src = __readfile(path)
  if not src then error("cannot open " .. tostring(path), 2) end
  local chunk, err = load(src, "@" .. tostring(path), "t")
  if not chunk then error(tostring(err), 2) end
  return chunk()
end
`;

let currentPkg = null;
let generalIndex = new Map(); // "pkg/id" -> general object

function ensureCard(pkg, id) {
	if (typeof id !== 'string') return null;
	const key = `${pkg || currentPkg || ''}|${id}`;
	if (!state.cards[key]) {
		state.cards[key] = { package: pkg || currentPkg || '', id, type: '', specs: [] };
	}
	return state.cards[key];
}

async function main() {
	const only = process.argv[2]; // optional single-package debug mode
	const factory = new LuaFactory();
	const lua = await factory.createEngine();

	const bridge = {
		__record_general: (pkg, id, kingdom, hp, maxHp, gender) => {
			const g = {
				package: pkg || currentPkg, id, kingdom: String(kingdom ?? ''),
				hp: hp ?? null, maxHp: maxHp ?? null,
				gender: gender === 2 ? 'female' : 'male',
				skills: [],
			};
			const key = `${g.package}/${id}`;
			if (generalIndex.has(key)) {
				// redefinition: replace in place
				const old = generalIndex.get(key);
				Object.assign(old, g);
				return;
			}
			generalIndex.set(key, g);
			state.generals.push(g);
		},
		__record_general_skills: (pkg, id, csv) => {
			const g = generalIndex.get(`${pkg}/${id}`);
			if (g && csv) g.skills.push(...csv.split(',').filter(Boolean));
		},
		__record_card_spec: (pkg, name, suit, number) => {
			const card = ensureCard(pkg, name);
			card.specs.push({ suit: SUITS[suit] ?? `suit_${suit}`, number: number ?? null });
		},
		__record_card: (pkg, t) => {
			if (!t || typeof t !== 'object') return;
			const get = (k) => (typeof t.get === 'function' ? t.get(k) : t[k]);
			const name = get('name');
			if (typeof name !== 'string') return;
			const card = ensureCard(pkg, name);
			if (!card) return;
			const type = get('type');
			if (typeof type === 'number') card.type = CARD_TYPES[type] ?? `type_${type}`;
			const skill = get('skill');
			if (typeof skill === 'string') card.skill = skill;
		},
		__record_skill: () => {}, // skill descriptions come from translations; ids attached via addSkills
		__record_translation: (k, v) => { state.translations[k] = v; },
		__record_package: (name) => {
			if (!state.packages[name]) state.packages[name] = { name };
		},
		__record_ext_name: (name, ext) => {
			if (state.packages[name]) state.packages[name].extensionName = ext;
		},
		__readfile: (p) => {
			if (typeof p !== 'string') return false;
			let target = null;
			if (path.isAbsolute(p) && fileExists(p)) target = p;
			else target = resolveFromRoot(p);
			if (!target) return false;
			try { return fs.readFileSync(target, 'utf8'); } catch { return false; }
		},
		__list_dir: (p) => {
			if (typeof p !== 'string') return false;
			const full = p.startsWith('/') ? p : path.join(ROOT, p.replace(/^\.?\//, ''));
			try {
				return fs.readdirSync(full, { withFileTypes: true })
					.filter((d) => d.isFile() && d.name.endsWith('.lua'))
					.map((d) => path.join(full, d.name));
			} catch { return false; }
		},
		__log: (msg) => { state.warnings++; if (state.warnings < 20) console.warn("[lua]", String(msg).slice(0,200)); },
	};
	for (const [k, v] of Object.entries(bridge)) lua.global.set(k, v);

	await lua.doString(PREAMBLE);

	const pkgDirs = fs.readdirSync(path.join(ROOT, 'packages'), { withFileTypes: true })
		.filter((d) => d.isDirectory() && !EXCLUDED_PACKAGES.has(d.name)
			&& fs.existsSync(path.join(ROOT, 'packages', d.name, 'init.lua')))
		.map((d) => d.name)
		.filter((p) => !only || p === only);

	for (const pkg of pkgDirs) {
		currentPkg = pkg;
		await lua.doString(`current_pkg_name = ${JSON.stringify(pkg)}`);
		const src = fs.readFileSync(path.join(ROOT, 'packages', pkg, 'init.lua'), 'utf8');
		try {
			await lua.doString(`local ok, err = pcall(function()\n${src}\nend); if not ok then __log("${pkg} init: " .. tostring(err)) end`);
		} catch (e) {
			console.warn(`[${pkg}] error:`, e.message?.slice(0, 200));
		}
	}

	buildOutputs(pkgDirs);
	lua.global.close();
}

function stripLinks(s) {
	return String(s).replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1').replace(/<\/?a\b[^>]*>/gi, '');
}

function buildOutputs(pkgDirs) {
	const T = state.translations;

	const labelOf = (name) => LABEL_OVERRIDES[name] ?? T[name] ?? name;
	const excludedLabel = (name) => {
		const l = labelOf(name);
		return EXCLUDED_GENERAL_LABELS.some((bad) => l.includes(bad));
	};

	const generals = state.generals.map((g) => {
		const pkgMeta = state.packages[g.package];
		const extName = pkgMeta?.extensionName || g.package;
		const hasImg = fs.existsSync(path.join(ROOT, 'packages', extName, 'image/generals', `${g.id}.jpg`))
			|| fs.existsSync(path.join(ROOT, 'packages', extName, 'image/generals', `${g.id}.png`));
		return {
			...g,
			skills: [...new Set(g.skills)].map((sid) => ({
				id: sid,
				name: LABEL_OVERRIDES.__skillLabels[sid] ?? T[sid] ?? sid,
				description: stripLinks(T[`:${sid}`] ?? ''),
			})),
			name: T[g.id] ?? g.id,
			title: T[`#${g.id}`] ?? '',
			illustrator: T[`illustrator:${g.id}`] ?? '',
			image: hasImg ? `/images/generals/${extName}/${g.id}.jpg` : null,
		};
	}).filter((g) => g.name !== g.id && !excludedLabel(g.package) // drop untranslated junk
		&& !EXCLUDED_KINGDOMS.includes(g.kingdom)); // drop placeholder kingdoms (未知/隐)

	// merge same-id cards defined by multiple packages; only whitelisted card packs
	const cardById = new Map();
	for (const c of Object.values(state.cards)) {
		if (!c || !c.id) continue;
		if (!CARD_PACKAGES.has(c.package)) continue;
		if (!cardById.has(c.id)) {
			cardById.set(c.id, {
				id: c.id,
				name: T[c.id] ?? c.id,
				subtitle: T[`#${c.id}`] ?? '',
				description: stripLinks(T[`:${c.id}`] ?? ''),
				packages: [],
			});
		}
		const entry = cardById.get(c.id);
		entry.packages.push({ package: c.package, type: c.type, specs: c.specs, skill: c.skill ?? null });
	}
	const cards = [...cardById.values()].filter((c) => c.name !== c.id || c.packages.some((p) => p.specs.length > 0));

	const usedPkgs = new Set([
		...generals.map((g) => g.package),
		...cards.flatMap((c) => c.packages.map((p) => p.package)),
	]);
	// 卡牌可能引用未注册 Package 的包名（如国战基础卡牌挂在 hegemony 名下）：补注册，避免前端显示英文原名
	for (const name of usedPkgs) {
		if (!state.packages[name]) state.packages[name] = { name, extensionName: name };
	}
	const extRank = (ext) => {
		const i = EXTENSION_ORDER.indexOf(ext);
		return i === -1 ? EXTENSION_ORDER.length : i;
	};
	const packRank = (p) => {
		const order = PACK_ORDER[p.extensionName || p.name];
		const i = order ? order.indexOf(p.name) : -1;
		return i === -1 ? (order ? order.length : 0) : i;
	};
	const packages = Object.values(state.packages)
		.filter((p) => usedPkgs.has(p.name))
		.map((p) => {
			const ext = p.extensionName || p.name;
			return {
				name: p.name,
				label: LABEL_OVERRIDES.__packageLabels[p.name] ?? labelOf(p.name),
				extensionName: ext,
				mainLabel: LABEL_OVERRIDES.__mainLabels[ext] ?? LABEL_OVERRIDES[ext] ?? T[ext] ?? labelOf(ext),
				category: EXTENSION_CATEGORY[ext] ?? '其他',
			};
		})
		.sort((a, b) =>
			extRank(a.extensionName) - extRank(b.extensionName)
			|| packRank(a) - packRank(b)
			|| a.name.localeCompare(b.name));

	fs.mkdirSync(DATA_DIR, { recursive: true });
	fs.writeFileSync(path.join(DATA_DIR, 'generals.json'), JSON.stringify(generals));
	fs.writeFileSync(path.join(DATA_DIR, 'cards.json'), JSON.stringify(cards));
	fs.writeFileSync(path.join(DATA_DIR, 'packages.json'), JSON.stringify(packages));
	// client-fetchable copies for list pages
	const staticData = path.join(SITE, 'static/data');
	fs.mkdirSync(staticData, { recursive: true });
	fs.writeFileSync(path.join(staticData, 'generals.json'), JSON.stringify(generals));
	fs.writeFileSync(path.join(staticData, 'cards.json'), JSON.stringify(cards));
	fs.writeFileSync(path.join(staticData, 'packages.json'), JSON.stringify(packages));

	// Copy general portraits (from parent extension dirs, e.g. tenyear/image/generals)
	let copied = 0;
	for (const p of packages) {
		const extName = p.extensionName || p.name;
		const srcDir = path.join(ROOT, 'packages', extName, 'image/generals');
		if (!fs.existsSync(srcDir)) continue;
		const dstDir = path.join(IMG_DIR, 'generals', extName);
		fs.mkdirSync(dstDir, { recursive: true });
		for (const f of fs.readdirSync(srcDir)) {
			if (!/\.(jpe?g|png)$/i.test(f)) continue;
			fs.copyFileSync(path.join(srcDir, f), path.join(dstDir, f));
			copied++;
		}
	}
	// Card UI assets (suit / number / frames)
	copyDir(path.join(ROOT, 'image/card/suit'), path.join(IMG_DIR, 'card/suit'));
	copyDir(path.join(ROOT, 'image/card/number'), path.join(IMG_DIR, 'card/number'));
	copyDir(path.join(ROOT, 'image/card/general'), path.join(IMG_DIR, 'card/frame'));

	console.log(`generals: ${generals.length}, cards: ${cards.length}, packages: ${packages.length}, images: ${copied}, lua warnings: ${state.warnings}`);
}

function copyDir(src, dst) {
	try {
		fs.mkdirSync(dst, { recursive: true });
		for (const f of fs.readdirSync(src, { withFileTypes: true })) {
			if (f.isFile()) fs.copyFileSync(path.join(src, f.name), path.join(dst, f.name));
		}
	} catch { /* missing dirs ok */ }
}

main().catch((e) => { console.error(e); process.exit(1); });
