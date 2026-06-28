# 番录 (FanLu) — 技术架构文档

> 文档目的：让面试官（或未来的你）5 分钟内看懂代码为什么这么组织、技术选型背后的考量、关键实现的位置。
> 关联文档：[产品需求文档 (PRD)](./prd.md)

---

## 0. 写在前面：这份文档怎么读

如果你刚接触前端架构，建议按下面顺序看：
1. 第 1 章：用 1 张图看懂整个应用的层次。
2. 第 2 章：搞清楚每个技术选型"为什么用它"。
3. 第 3-5 章：路由、状态、数据三件套是日常开发用到最多的部分。
4. 第 6 章：项目结构，看完再去翻代码就不会迷路。
5. 第 7 章：开发规范，确保你写代码时保持一致。
6. 第 8 章：常见面试题，跟 PRD 第 5 章配套练习。

---

## 1. 架构总览

```mermaid
flowchart TB
    subgraph 用户层
        U[用户浏览器 / PWA]
    end

    subgraph 表现层
        V[Vue 3 Views<br/>8 个页面]
        C[Components<br/>业务组件 + 通用组件]
        S[Stores (Pinia)<br/>追番/主题/搜索]
    end

    subgraph 数据层
        API[API 抽象层<br/>api/bangumi.ts + api/local.ts]
        CACHE[Cache 层<br/>SWR + IndexedDB]
    end

    subgraph 持久化层
        IDB[(IndexedDB<br/>我的追番/评论)]
        LS[(localStorage<br/>偏好/最近搜索)]
    end

    subgraph 外部
        BG[Bangumi.tv API]
        SW[Service Worker<br/>vite-plugin-pwa]
    end

    U --> V
    V --> C
    V --> S
    S --> API
    V --> API
    API --> CACHE
    CACHE -->|fetch| BG
    CACHE -->|read/write| IDB
    CACHE -->|read/write| LS
    SW -.缓存策略.-> CACHE
    SW -.离线壳.-> U
```

**核心思想**：
- **API 抽象层**是整套架构的关键。所有"取数据"都经过 `api/*` 模块，业务层不直接 fetch。这样未来要换数据源（比如加后端）只动一个文件。
- **Pinia 存"用户态"**，不存"数据缓存"（缓存交给 SWR 模式或 IndexedDB），避免 Store 变成"大杂烩"。
- **Service Worker 在最底层**，对所有网络请求做透明缓存/离线降级。

---

## 2. 技术选型

| 技术 | 版本 | 用途 | 为什么选它（面试要点） |
|------|------|------|------------------------|
| **Vue 3** | ^3.5 | 框架 | Composition API 关注点分离、`<script setup>` 简洁；`<Suspense>` + `useTransition` 现代化 |
| **Vite** | ^5 | 构建 | 原生 ESM dev server、HMR 瞬时、Rollup 产物优化、官方 Vue 插件完善 |
| **TypeScript** | ^5.5 | 类型 | 大型项目必备，IDE 智能提示、编译期发现错误；volar 性能比 vetur 快 10x |
| **Pinia** | ^2.2 | 状态管理 | Vue 官方推荐，比 Vuex 轻量、TS 友好、支持 Composition 风格 |
| **Vue Router** | ^4.4 | 路由 | 官方路由，懒加载、导航守卫、动态路由 |
| **VueUse** | ^11 | 工具集 | 复用常用 composable（useStorage / useDebounceFn / useIntersectionObserver），少造轮子 |
| **Tailwind CSS** | ^3.4 | 样式 | utility-first + JIT、按需生成、生产包小；与设计 token 配合做主题 |
| **vite-plugin-pwa** | ^0.20 | PWA | Workbox 封装，开箱即用 |
| **dayjs** | ^1.11 | 日期 | 比 moment 轻、支持国际化、不可变设计 |
| **Dexie.js** | ^4 | IndexedDB 封装 | 比原生 IDB API 简单 10 倍、TS 友好、Promise 化 |

### 不选的技术（避开陷阱）

| 技术 | 不选的理由 |
|------|-----------|
| Element Plus / Naive UI | 风格太"中后台"，跟编辑感定位冲突。 |
| Sass / Less | Tailwind 够用，CSS 变量也能复用，多一个预处理器多一份配置。 |
| Axios | 浏览器原生 `fetch` 够用，VueUse 的 `useFetch` 还能自动处理 loading/error。要用也只在封装层。 |
| Nuxt | 我们不需要 SSR（API 公开，无须 SEO），Nuxt 反而增加复杂度。 |
| i18n 多语言首版 | 一期只做中文，预留 `<i18n>` 包裹。 |
| React / Next.js | 你 Vue 栈更熟，写得更深比硬上 React 强。 |

---

## 3. 路由定义

```ts
// src/router/index.ts
const routes = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '番录 · 本季新番' } },
  { path: '/schedule', name: 'schedule', component: () => import('@/views/ScheduleView.vue'), meta: { title: '新番时间表' } },
  { path: '/anime/:id', name: 'anime-detail', component: () => import('@/views/AnimeDetailView.vue'), meta: { title: '番剧详情' } },
  { path: '/library', name: 'library', component: () => import('@/views/LibraryView.vue'), meta: { title: '我的追番', requiresStorage: true } },
  { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue'), meta: { title: '搜索' } },
  { path: '/archive', name: 'archive', component: () => import('@/views/ArchiveView.vue'), meta: { title: '归档' } },
  { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { title: '个人中心' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]
```

**关键设计**：
- 所有页面都用 `() => import(...)` 懒加载，首屏只加载 `Home` 一个 chunk。
- `meta.requiresStorage` 标记需要 IndexedDB 的页面，在 `router.beforeEach` 里检查并给出友好提示。
- 路由切换动画用 `<RouterView v-slot>` + `<Transition>` 实现 12px 上移淡入。

---

## 4. 状态管理 (Pinia)

```ts
// src/stores/
├── library.ts     // 我的追番（4 状态 + 评分 + 备注）
└── preferences.ts // 主题/默认页
```

**Store 设计原则**：
- **小**：一个 Store 一个领域，不做"全局 mega store"。
- **异步放外面**：Pinia 的 action 调 API 抽象层，不在 store 里写 fetch。
- **持久化**：preferences 走 localStorage（`useStorage`），library 走 IndexedDB（Dexie）。

**关键 store 示例**：

```ts
// src/stores/library.ts
export const useLibraryStore = defineStore('library', () => {
  const items = ref<LibraryItem[]>([]) // 从 IndexedDB 加载

  // 初始化：从 IndexedDB 读
  onMounted(async () => {
    items.value = await db.library.toArray()
  })

  // 追番状态变更（4 态循环）
  const setStatus = async (animeId: number, status: LibraryStatus) => {
    const item = items.value.find(i => i.animeId === animeId)
    if (item) {
      item.status = status
      item.updatedAt = Date.now()
    } else {
      items.value.push({ animeId, status, rating: null, note: '', createdAt: Date.now(), updatedAt: Date.now() })
    }
    await persistAll() // 写回 IndexedDB
  }

  // 按状态过滤
  const byStatus = (status: LibraryStatus) => computed(() => items.value.filter(i => i.status === status))

  return { items, setStatus, byStatus, watching: byStatus('watching'), ... }
})
```

---

## 5. 数据层

### 5.1 API 抽象层

```ts
// src/api/bangumi.ts — 公开 API
export const bangumiApi = {
  calendar: () => fetch(`${BASE}/calendar`).then(toJson),                  // 每日新番
  anime: (id: number) => fetch(`${BASE}/v0/subjects/${id}`).then(toJson), // 详情
  search: (q: string) => fetch(`${BASE}/v0/search/subjects?keyword=${q}`).then(toJson),
  episodes: (id: number) => fetch(`${BASE}/v0/subjects/${id}/episodes`).then(toJson),
  // ...
}

// src/api/local.ts — 本地数据
export const localApi = {
  library: {
    list: () => db.library.toArray(),
    upsert: (item: LibraryItem) => db.library.put(item),
    remove: (id: number) => db.library.delete(id),
  },
  // ...
}
```

**核心模式**：`useSWR` 风格的 Composable。

```ts
// src/composables/useAnimeQuery.ts
export function useAnimeQuery(id: MaybeRef<number>) {
  return useQuery({
    key: () => ['anime', unref(id)],
    query: () => bangumiApi.anime(unref(id)),
    staleTime: 1000 * 60 * 60 * 24, // 24h
  })
}
```

### 5.2 IndexedDB（通过 Dexie）

```ts
// src/db/index.ts
import Dexie, { type Table } from 'dexie'

export interface LibraryItem {
  id?: number
  animeId: number
  status: 'watching' | 'planned' | 'completed' | 'dropped'
  rating: number | null
  note: string
  createdAt: number
  updatedAt: number
}

export interface CommentItem {
  id?: number
  animeId: number
  content: string
  createdAt: number
}

class FanLuDB extends Dexie {
  library!: Table<LibraryItem, number>
  comments!: Table<CommentItem, number>

  constructor() {
    super('fanlu')
    this.version(1).stores({
      library: '++id, animeId, status, updatedAt',
      comments: '++id, animeId, createdAt',
    })
  }
}

export const db = new FanLuDB()
```

### 5.3 Service Worker 缓存策略

```ts
// vite.config.ts (pwa 插件配置)
workbox: {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.bgm\.tv\/v0\/subjects\/\d+$/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'anime-detail', expiration: { maxAgeSeconds: 86400 } },
    },
    {
      urlPattern: /^https:\/\/api\.bgm\.tv\/v0\/search/,
      handler: 'NetworkFirst',
      options: { cacheName: 'anime-search', networkTimeoutSeconds: 3 },
    },
    {
      urlPattern: /\.(?:png|jpg|webp|svg)$/,
      handler: 'CacheFirst',
      options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } },
    },
  ],
}
```

---

## 6. 项目结构

```
anime-web/
├── .trae/
│   └── documents/         # PRD 和技术文档
├── functions/             # Cloudflare Pages Functions
│   ├── api/bgm/[[path]].ts # Bangumi API 代理
│   ├── img.ts             # 图片代理
│   └── tsconfig.json
├── public/
│   ├── data/seasons.json  # 季度静态补全数据
│   ├── icons/             # PWA 图标
│   └── favicon.svg
├── src/
│   ├── api/               # API 抽象层
│   │   ├── bangumi.ts
│   │   ├── local.ts
│   │   ├── platforms.ts   # 播出平台名称映射
│   │   └── types.ts
│   ├── assets/
│   │   └── styles/
│   │       ├── tokens.css       # 设计 token（CSS 变量）
│   │       ├── base.css         # 重置 + 基础样式
│   │       └── tailwind.css
│   ├── components/
│   │   ├── anime/         # AnimeCard / AnimeSchedule / PlatformBadge
│   │   ├── common/        # Button / Card / 骨架 / 空态
│   │   ├── library/       # LibraryItem / StatusPicker / RatingStars
│   │   └── layout/        # AppHeader / MobileTabBar
│   ├── composables/       # useQuery / useImage / useInfiniteScroll / useLazyImage
│   ├── data/              # 季度元信息
│   ├── db/                # Dexie 数据库
│   ├── router/
│   ├── stores/            # library / preferences
│   ├── views/             # 8 个页面 + 404
│   ├── App.vue
│   ├── main.ts
│   └── env.d.ts
├── worker/                # Cloudflare Worker（备选部署方案）
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### 6.1 文件命名规范
- 组件：PascalCase（`AnimeCard.vue`）
- Composable：camelCase 以 `use` 开头（`useAnimeQuery.ts`）
- Store：camelCase 以领域名（`library.ts`）
- 常量：UPPER_SNAKE_CASE（`BASE_URL`）
- 类型/接口：PascalCase（`LibraryItem`）

### 6.2 路径别名
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

## 7. 开发规范

### 7.1 Git 工作流
- **分支**：`main`（受保护）/ `feat/*` / `fix/*` / `chore/*`
- **提交**：Conventional Commits（`feat: 新增追番状态切换` / `fix: 修复移动端 TabBar 抖动`）
- **PR**：每完成一个 M 阶段开一个 PR，自查后请求合并

### 7.2 编码风格
- `<script setup lang="ts">` 必写，props/emits 用 type-only
- 组件 props 必填校验，emit 必填声明
- 业务组件不带样式（除布局外），样式走 Tailwind utility class
- 任何 async 函数 try/catch 包裹并 toast 错误

### 7.3 性能预算
- main bundle < 200KB gzipped
- 首屏 LCP < 2.5s（4G 模拟）
- 路由切换 < 200ms
- 图片全部 WebP + lazy

### 7.4 错误处理
- 全局 `app.config.errorHandler` 兜底
- API 错误 → 友好 toast + 重试按钮
- 路由 404 → 友好页 + 跳转首页按钮
- IndexedDB 不可用（隐私模式）→ 顶部警告条

---

## 8. 常见面试题（与 PRD 第 5 章配套）

> 这些问题是"代码细节"层面，PRD 那章是"决策"层面。一起练习，面试无敌。

### Q：你的 API 抽象层为什么不直接用 Axios？

- 原生 `fetch` 足够，VueUse 的 `useFetch` 已经处理了响应/错误。
- 少一个依赖、产物体积更小、TypeScript 友好（`fetch` 自带 `RequestInit` / `Response` 类型）。
- 如果未来需要拦截器/重试，封装一个 `fetcher<T>()` 函数即可，成本远低于引入 Axios。

### Q：为什么用 Pinia 而不是 Vuex？

- Pinia 是 Vue 官方推荐，Vuex 4 已不推荐新项目使用。
- Pinia 的 setup store 写法与 `<script setup>` 风格统一，无 mutations、无 modules 嵌套，TS 推断完整。
- 体积小 50%，API 表面更小。

### Q：Vite 和 Webpack 的本质区别？

- Webpack 走"全量打包 + dev 启动慢但稳"，Vite 走"原生 ESM + 按需编译"，dev 几乎瞬时启动。
- 生产构建 Vite 用 Rollup，产物质量与生态插件与 Webpack 持平。
- Vite 的痛点：旧项目迁移成本（CommonJS 依赖需额外配置），我们的项目新写，没这问题。

### Q：PWA 离线策略怎么设计的？

- App Shell (HTML/JS/CSS) 用 **precache**，确保首屏能离线打开。
- 番剧列表/详情用 **StaleWhileRevalidate**，先返回缓存保证速度，后台更新。
- 搜索用 **NetworkFirst** + 3s 超时降级，超时返回空状态 + 提示"当前离线"。
- 图片用 **CacheFirst** + 30 天过期，避免重复下载。

### Q：IndexedDB 怎么保证数据一致性？

- 用 Dexie 事务（`db.transaction('rw', db.library, db.comments, async () => { ... })`）。
- 所有 upsert 操作都更新 `updatedAt`，方便做"按时间同步"。
- 启动时跑一次完整性检查（schema 字段是否存在）。

### Q：移动端适配你用了什么技术？

- Tailwind 的断点系统（`sm / md / lg`）+ 设计 token。
- iOS 安全区：`env(safe-area-inset-top/bottom)`，底部 TabBar 用 `padding-bottom: calc(env(safe-area-inset-bottom) + 12px)`。
- 1px 边框：用 `transform: scale(0.5)` 或 `box-shadow: 0 0 0 0.5px` 解决 retina 真 1px 问题。
- 300ms 点击延迟：用 `touch-action: manipulation` 解决。

### Q：TypeScript 给你带来的最大好处是什么？

- 重构安全：改名/改类型时 IDE 实时标红所有调用点。
- 业务模型显式：`LibraryItem` 接口一旦定下来，整个项目都是契约驱动。
- API 边界清楚：API 返回类型 vs 内部 store 类型分开，中间用 mapper 转换，防止后端字段变化导致雪崩。

---

## 9. 上线 Checklist

- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 95
- [ ] Lighthouse Best Practices > 95
- [ ] Lighthouse SEO > 90
- [ ] PWA Installable
- [ ] 移动端真机（iPhone 12 Pro）测试通过
- [ ] 桌面端 Chrome / Safari / Firefox 测试通过
- [ ] 暗色模式对比度达标
- [ ] README 含项目介绍、截图、运行步骤、技术栈
- [ ] LICENSE（MIT）
- [ ] GitHub Actions 自动部署到 Vercel / Netlify / Cloudflare Pages
