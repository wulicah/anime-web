# 番录 FanLu

> 个人向动漫追踪与资讯站 · 致敬 [yuc.wiki](https://yuc.wiki/)

季度新番表 + 个人追番库 + 评分 + 离线 PWA。
一个为前端求职作品集而做的、零后端、移动优先、可安装的动漫信息站。

![tech](https://img.shields.io/badge/Vue-3.5-42b883)
![tech](https://img.shields.io/badge/Vite-6.0-646cff)
![tech](https://img.shields.io/badge/TypeScript-5.5-3178c6)
![tech](https://img.shields.io/badge/PWA-Ready-ff6e5a)
![license](https://img.shields.io/badge/license-MIT-blue)

[English](#english) | 中文

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# → http://localhost:5173

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

> 需要 Node 18+（推荐 20 / 22）。

---

## 核心功能

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 本季新番 · 周维度切换 Grid 浏览 + 详细 List |
| 番剧详情 | `/anime/:id` | 信息头部 + 简介 + 标签 + 追番操作 + 评分 |
| 搜索 | `/search` | 全局搜索 · 300ms 防抖 + 搜索历史 |
| 我的追番 | `/library` | 4 种状态：在看 / 想看 / 看过 / 弃番 |
| 归档 | `/archive` | 历年季度新番入口（致敬 yuc.wiki） |
| 季度归档 | `/archive/:year/:season` | 按季度浏览番剧列表 |
| 个人中心 | `/profile` | 数据统计 + 主题切换 + 数据导出/清空 |
| 离线 PWA | Service Worker | 静态资源预缓存 + 图片 StaleWhileRevalidate + 可安装 |

### 基础设施

- **Bangumi API 代理** — Cloudflare Pages Functions 转发 `/api/bgm/*`，解决 CORS 与网络可达性，支持 12s 超时 + 3 次自动重试 + 增量加载
- **图片代理** — 边缘函数 `/img?url=` 代理 lain.bgm.tv 图片，域名白名单校验 + 30 天缓存，支持 CDN 路径缩放（`/r/200/`）、srcset 响应式档位与 IntersectionObserver 懒加载（6 并发限制）

---

## 技术栈

- **Vue 3.5** + `<script setup>` + Composition API
- **Vite 6** + Rollup + 代码分割
- **TypeScript 5.5** 严格模式
- **Pinia 2** 状态管理（主题、追番库）
- **Vue Router 4** 懒加载路由
- **VueUse 11** Composable 工具集
- **dayjs** 日期处理（季度数据生成、归档页面）
- **Tailwind CSS 3** 原子化样式 + 设计 token
- **Dexie 4** IndexedDB 封装（追番库本地存储）
- **vite-plugin-pwa 0.21** + Workbox（预缓存 + StaleWhileRevalidate 图片策略）
- **Cloudflare Pages Functions** 边缘 API 代理（Bangumi 代理 + 图片代理）

**没有用：** React、Nuxt、Element Plus、Axios、Sass、Google Fonts。

---

## 项目结构

```
anime-web/
├── functions/                  # Cloudflare Pages Functions
│   ├── api/bgm/[[path]].ts     # Bangumi API 代理（CORS + 重试 + 缓存）
│   ├── img.ts                  # 图片代理（域名白名单 + 30 天缓存）
│   └── tsconfig.json
├── public/
│   ├── data/seasons.json       # 季度静态补全数据
│   ├── icons/                  # PWA SVG 图标
│   └── favicon.svg
├── src/
│   ├── api/                    # API 抽象层
│   │   ├── bangumi.ts          #   bangumi 接口封装（calendar / search / anime / seasonal）
│   │   ├── local.ts            #   本地化类型标注
│   │   ├── platforms.ts        #   平台名称映射 & 放送渠道
│   │   └── types.ts            #   Bangumi 类型定义
│   ├── assets/styles/
│   │   └── main.css            # 全局样式 + CSS 变量设计 token
│   ├── components/
│   │   ├── anime/              #   AnimeCard（grid + list 双模式）、AnimeCell（Grid 封面）
│   │   ├── common/             #   EmptyState / ErrorState / ErrorBoundary / SkeletonList / LazyImage / IconTheme
│   │   ├── layout/             #   AppHeader / MobileTabBar / InstallPrompt
│   │   └── library/            #   StatusPicker（追番状态选择器）、RatingStars（星级评分）
│   ├── composables/
│   │   ├── useQuery.ts         #   数据请求（缓存 + 过期 + 刷新）
│   │   ├── useImage.ts         #   图片代理 URL 转换
│   │   ├── useInfiniteScroll.ts #   增量分页（IntersectionObserver）
│   │   └── useLazyImage.ts     #   图片懒加载（6 并发）
│   ├── data/
│   │   └── seasonMeta.ts       # 季度元信息 & 当季计算
│   ├── db/
│   │   └── index.ts            # Dexie IndexedDB 追番库
│   ├── router/
│   │   └── index.ts            # Vue Router 懒加载配置
│   ├── stores/
│   │   ├── library.ts          #   追番库 Pinia store
│   │   └── preferences.ts     #   主题偏好 Pinia store
│   ├── views/
│   │   ├── HomeView.vue        #   首页（Grid + List）
│   │   ├── AnimeDetailView.vue #   番剧详情
│   │   ├── SearchView.vue      #   搜索
│   │   ├── LibraryView.vue     #   我的追番
│   │   ├── ArchiveView.vue     #   归档入口
│   │   ├── ArchiveSeasonView.vue # 季度归档
│   │   ├── ProfileView.vue     #   个人中心
│   │   └── NotFoundView.vue    #   404
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── DEPLOY.md                   # 部署指南
├── LICENSE                     # MIT
└── README.md
```

---

## 设计风格

**日式编辑设计 (Japanese Editorial)** —— 兼具博客的温度感与现代产品的克制。

- 配色：米白 / 深黑（浅色）· 深黑 / 暖橙（深色），通过 CSS 变量实现双主题
- 字体：系统字体（PingFang SC / 思源宋体 SC / Microsoft YaHei / JetBrains Mono），零网络请求
- 圆角：0（保持编辑感），用 1px 细线分割
- 微动效：路由切换 200ms 淡入上移，卡片 hover 强调色过渡

---

## 开发命令

```bash
npm run dev         # 启动 dev server (HMR)
npm run build       # 类型检查 + 生产构建
npm run preview     # 预览生产构建
npm run typecheck   # 仅类型检查
```

---

## 部署

详见 [DEPLOY.md](./DEPLOY.md)。TL;DR：

1. 推送代码到 GitHub
2. Cloudflare Pages 导入项目
3. 构建命令：`npm run build`，输出目录：`dist`
4. Pages Functions 随前端自动部署（无需额外配置）
5. SPA 路由靠 CF Pages 自动回退（无需 `_redirects`）

**可选环境变量**（Cloudflare Pages → Settings → Environment variables，保存后需手动重新部署）：

- `ALLOWED_ORIGIN` — 图片代理 CORS 来源（默认 `*`）
- `APP_VERSION` — User-Agent 版本标识
- `PROJECT_REPO` — User-Agent 仓库路径（如 `wulicah/anime-web`）

---

## License

MIT — 详见 [LICENSE](./LICENSE) 文件。

---

## 致谢

- 数据源：[Bangumi.tv](https://bgm.tv) 公开 API
- 设计灵感：[yuc.wiki](https://yuc.wiki) 站长 nagatoyuc
- 图标：内联 SVG，参考 Lucide
- 字体：系统字体（PingFang SC / 思源宋体 SC / Microsoft YaHei 等），不依赖网络

---

<a id="english"></a>

## English

> A personal anime tracking & information site, inspired by [yuc.wiki](https://yuc.wiki/).
> Seasonal anime schedule + personal library + ratings + offline PWA.
> A zero-backend, mobile-first, installable anime info site built as a frontend portfolio piece.

### Quick Start

```bash
npm install        # install deps
npm run dev        # → http://localhost:5173
npm run build      # type-check + production build
npm run preview    # preview production build
```

Requires Node 18+ (20 / 22 recommended).

### Core Features

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Seasonal anime + weekly grid + detailed list |
| Detail | `/anime/:id` | Header + synopsis + tags + tracking + rating |
| Search | `/search` | Global search with 300ms debounce + history |
| Library | `/library` | 4 states: watching / want / watched / dropped |
| Archive | `/archive` | Historical seasonal anime (tribute to yuc.wiki) |
| Season | `/archive/:year/:season` | Browse by season |
| Profile | `/profile` | Stats + theme switch + data export/clear |

#### Infrastructure

- **Bangumi API Proxy** — Cloudflare Pages Functions forward `/api/bgm/*` with CORS, 12s timeout, 3 retries, incremental loading
- **Image Proxy** — Edge function `/img?url=` proxies lain.bgm.tv images with domain whitelist, 30-day cache, CDN path scaling, srcset responsive breakpoints, and IntersectionObserver lazy loading (6-concurrent limit)

### Tech Stack

- **Vue 3.5** + `<script setup>` + Composition API
- **Vite 6** + Rollup + code splitting
- **TypeScript 5.5** strict mode
- **Pinia 2** state management (theme, library)
- **Vue Router 4** lazy-loaded routes
- **VueUse 11** composable utilities
- **dayjs** date handling (season metadata, archive pages)
- **Tailwind CSS 3** utility-first + design tokens
- **Dexie 4** IndexedDB wrapper (local library)
- **vite-plugin-pwa 0.21** + Workbox (precache + StaleWhileRevalidate image strategy)
- **Cloudflare Pages Functions** edge API proxy (Bangumi proxy + image proxy)

**Not used:** React, Nuxt, Element Plus, Axios, Sass, Google Fonts.

### Design Style

**Japanese Editorial** — combining the warmth of a blog with the restraint of a modern product.

- Palette: CSS custom properties for light/dark themes
- Typography: system fonts only (zero network requests)
- Border radius: 0 (editorial feel), 1px hairlines for separation
- Micro-interactions: 200ms route fade-in, card hover accent transition

### Development Commands

```bash
npm run dev         # dev server with HMR
npm run build       # type-check + production build
npm run preview     # preview production build
npm run typecheck   # type-check only
```

### Deployment

See [DEPLOY.md](./DEPLOY.md) for the full guide. TL;DR:
1. Push to GitHub
2. Import repo in Cloudflare Pages
3. Build command: `npm run build`, output dir: `dist`
4. Pages Functions auto-deploy with the frontend (no extra config)
5. SPA routing via CF Pages automatic fallback (no `_redirects` needed)

**Optional environment variables** (set in Cloudflare Pages → Settings → Environment variables; re-deployment required after saving):
- `ALLOWED_ORIGIN` — image proxy CORS origin (default `*`)
- `APP_VERSION` — version string for User-Agent
- `PROJECT_REPO` — GitHub repo path for User-Agent (e.g. `wulicah/anime-web`)

### License

MIT — see [LICENSE](./LICENSE) file for details.

### Credits

- Data: [Bangumi.tv](https://bgm.tv) public API
- Design inspiration: [yuc.wiki](https://yuc.wiki) by nagatoyuc
- Icons: inline SVG, inspired by Lucide
- Fonts: system fonts (no network dependency)
