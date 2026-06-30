# 番录 FanLu

> 个人向动漫追踪与资讯站 · 致敬 [yuc.wiki](https://yuc.wiki/)

季度新番表 + 个人追番库 + 评分 + 评论 + 离线 PWA。
一个为前端求职作品集而做的、零后端、移动优先、可安装的动漫信息站。

![tech](https://img.shields.io/badge/Vue-3.5-42b883)
![tech](https://img.shields.io/badge/Vite-5.4-646cff)
![tech](https://img.shields.io/badge/TypeScript-5.5-3178c6)
![tech](https://img.shields.io/badge/PWA-Ready-ff6e5a)

---

## 🚀 快速开始

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

## ✨ 核心功能

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 当天新番 + 周维度切换 |
| 番剧详情 | `/anime/:id` | 信息头部 + 简介 + 标签 + 追番 + 评分 |
| 我的追番 | `/library` | 4 状态：在看 / 想看 / 看过 / 弃番 |
| 搜索 | `/search` | 300ms 防抖 + 最近搜索历史 |
| 归档 | `/archive` | 历年春夏秋季新番入口（致敬 yuc.wiki） |
| 季度归档 | `/archive/:year/:season` | 按季度浏览番剧列表 |
| 个人中心 | `/profile` | 数据统计 + 主题切换 + 数据导出/清空 |

---

## 🏗️ 技术栈

- **Vue 3.5** + `<script setup>` + Composition API
- **Vite 5** + Rollup + 代码分割
- **TypeScript 5.5** 严格模式
- **Pinia 2** 状态管理（主题、追番库）
- **Vue Router 4** 懒加载路由
- **VueUse 11** Composable 工具集
- **Tailwind CSS 3** 原子化样式 + 设计 token
- **Dexie 4** IndexedDB 封装（追番库本地存储）
- **vite-plugin-pwa** + Workbox 离线策略

**没有用：** React、Nuxt、Element Plus、Axios、Sass（详见 [技术架构文档](.trae/documents/tech-architecture.md) 第 2 章）

---

## 📂 项目结构

```
anime-web/
├── .trae/documents/         # PRD 和技术架构文档
├── functions/               # Cloudflare Pages Functions
│   ├── api/bgm/[[path]].ts  # Bangumi API 代理（CORS + 重试 + 缓存）
│   ├── img.ts               # 图片代理（域名白名单 + 30 天缓存）
│   └── tsconfig.json
├── public/
│   ├── data/seasons.json     # 季度静态补全数据
│   ├── icons/               # PWA 图标
│   └── favicon.svg
├── src/
│   ├── api/                 # API 抽象层
│   │   ├── bangumi.ts       # Bangumi.tv 公开 API
│   │   ├── local.ts         # IndexedDB 本地 API
│   │   ├── platforms.ts     # 播出平台名称映射
│   │   └── types.ts
│   ├── assets/styles/       # 全局样式 + 设计 token
│   ├── components/
│   │   ├── anime/           # 番剧相关组件
│   │   ├── common/          # 通用组件（按钮/骨架/空态/错误）
│   │   ├── layout/          # 头部/TabBar/安装提示
│   │   └── library/         # 追番库相关（评分/状态切换）
│   ├── composables/         # useQuery / useImage / useInfiniteScroll / useLazyImage
│   ├── data/                # 季度元信息
│   ├── db/                  # Dexie 数据库
│   ├── router/              # 路由配置
│   ├── stores/              # Pinia 状态（library / preferences）
│   ├── views/               # 8 个页面 + 404
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── DEPLOY.md                # 部署指南
└── README.md
```

---

## 🎨 设计风格

**日式编辑设计 (Japanese Editorial)** —— 兼具博客的温度感与现代产品的克制。

- 配色：米白 `#F4F1EC` / 朱红 `#E63B2E`（明）· 深黑 `#161616` / 暖橙 `#FF6E5A`（暗）
- 字体：思源宋体 SC（标题）+ 思源黑体 SC（正文）+ JetBrains Mono（数据）
- 圆角：0（保持编辑感），用 1px 细线分割
- 微动效：路由切换 200ms 淡入上移，卡片 hover 边框变红

---

## 🛠️ 开发命令

```bash
npm run dev         # 启动 dev server (HMR)
npm run build       # 类型检查 + 生产构建
npm run preview     # 预览生产构建
npm run typecheck   # 仅类型检查
```

---

## 📊 性能指标（生产构建）

| 指标 | 实测 | 目标 |
|------|------|------|
| main bundle（gzip） | ~5 KB | < 200 KB ✅ |
| vue chunk（gzip） | ~40 KB | — |
| vendor chunk（gzip） | ~36 KB | — |
| 首屏 JS 总计（gzip） | ~80 KB | < 200 KB ✅ |
| PWA precache | 26 项 / 263 KB | — |

---

## 🎓 面试题准备

如果你在写这个项目是为了面试作品集，请先读这两份文档：

- [产品需求文档 (PRD)](.trae/documents/prd.md) — 第 5 章有 7 个常见面试问题及回答思路
- [技术架构文档](.trae/documents/tech-architecture.md) — 第 8 章有 7 个代码细节问题

**最可能被问到的 3 个问题**：

1. **为什么不做后端？**
   产品定位是个人向，用户数据存浏览器本地。IndexedDB 存追番，localStorage 存偏好。导出 JSON 可备份，未来加后端只需替换 `src/api/local.ts`。

2. **怎么保证离线可用？**
   `vite-plugin-pwa` + Workbox 缓存策略：App Shell 预缓存、番剧详情 7 天 SWR、搜索 NetworkFirst 3s 超时降级、图片 CacheFirst 30 天。

3. **性能优化怎么做的？**
   路由懒加载、Tailwind JIT 按需生成、图片 lazy、useQuery 缓存（SWR 模式）、main bundle < 200KB gzipped。

---

## 📝 License

MIT

---

## 🙏 致谢

- 数据源：[Bangumi.tv](https://bgm.tv) 公开 API
- 设计灵感：[yuc.wiki](https://yuc.wiki) 站长 nagatoyuc
- 图标：内联 SVG，参考 Lucide
- 字体：[Google Fonts](https://fonts.google.com)（Noto Serif/Sans SC、Fraunces、JetBrains Mono）
