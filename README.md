# 三国杀卡查（SGS Card Viewer）

一个基于 [FreeKill](https://github.com/Notify-ctrl/FreeKill) 游戏数据的静态卡牌查询站点：浏览与搜索全部扩展包中的**武将**与**卡牌**，查看技能描述、体力、势力、插画等详情。纯静态构建，可部署到任意静态托管（GitHub Pages / Vercel / Nginx…），并支持 **PWA 安装**为桌面/手机应用。

![Tech](https://img.shields.io/badge/SvelteKit-2-f14148?logo=svelte&logoColor=white) ![Tech](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white) ![PWA](https://img.shields.io/badge/PWA-5a0fc8?logo=pwa&logoColor=white)

## 功能

- **武将查询**：按扩展系列 → 子包两级筛选，按势力（魏/蜀/吴/群/神/晋…）过滤，支持名称/称号/技能全文搜索
- **卡牌查询**：按卡牌包 / 分组（身份局/国战）筛选，按类型（基本/锦囊/装备）过滤，展示花色点数分布
- **详情页**：武将技能、体力、插画师、多版本跳转；卡牌效果与所属包
- **移动端适配**：底部抽屉式筛选、响应式卡片网格、背景滚动锁定
- **PWA**：可安装为独立应用（Chrome/Edge「安装应用」、iOS 添加到主屏幕），数据与图片本地缓存
- **设计**：宣纸画布 + 朱砂印章 + 鎏金线的三国杀主题设计系统

## 技术栈

- [SvelteKit 2](https://kit.svelte.dev)（adapter-static，纯静态输出）+ Svelte 5 runes
- TypeScript、Vite
- 数据提取：Node 脚本内嵌 [wasmoon](https://github.com/ceifa/wasmoon)（WASM Lua）执行 FreeKill 扩展包 Lua，导出结构化 JSON

## 目录结构

```
site/
├── scripts/extract.mjs   # 从 FreeKill Lua 包提取数据 → JSON + 图片
├── src/
│   ├── lib/              # 领域类型、势力样式、提取后的数据 (data/*.json)
│   ├── routes/           # 首页 / 武将列表+详情 / 卡牌列表+详情
│   └── service-worker.js # PWA 缓存
└── static/               # manifest、图标（data/ 与 images/ 为生成产物）
```

## 开发

```sh
npm install
npm run dev          # 开发服务器
npm run check        # svelte-check 类型检查
```

### 数据提取

数据来自 FreeKill 游戏发行包（含全部官方扩展），需将其解压到仓库旁边的 `../FreeKill-release`：

```sh
npm run build:data   # 生成 src/lib/data/*.json 与 static/{data,images}/
```

提取过程在 WASM Lua 中加载各扩展包的 `lua/lib`，记录武将/卡牌/技能注册信息，再合并翻译文件输出 JSON，并复制武将原画。

### 构建与部署

```sh
npm run build        # 输出到 build/，可直接托管
```

推送到 `v*` tag 时，GitHub Actions 会自动构建并将产物发布到对应的 [Releases](../../releases)。

## License

本项目基于 [FreeKill](https://github.com/Notify-ctrl/FreeKill) 及其扩展包数据构建，其中使用了 [qsgs-fans/tenyear](https://gitee.com/qsgs-fans/tenyear)（GPL-3.0）等内容，故本项目代码与数据同样以 [GPL-3.0](./LICENSE) 发布。

游戏名称、武将插画等素材版权归原厂所有，仅供学习交流使用。
