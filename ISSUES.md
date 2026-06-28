# 问题跟踪与决策记录

> 开发过程中遇到的关键问题、根因分析和最终决策。

---

## 已修复

### P0：CORS 拦截
- **根因**：浏览器直连 `api.bgm.tv` 被跨域策略拦截
- **方案**：Cloudflare Pages Functions 做反向代理，边缘节点转发请求

### P0：国内无法访问 Bangumi API
- **根因**：`api.bgm.tv` 在国内部分网络环境下不可达
- **方案**：用户访问 `fanlu.pages.dev`（Cloudflare 国内可达节点）→ Pages Function 在海外节点执行 → 直连 `api.bgm.tv`

### P1：归档页 404
- **根因**：Bangumi v0 `/v0/search/subjects` 是 POST 请求，且不支持按季度搜索
- **方案**：改用 `GET /v0/subjects?type=2&year=YYYY&month=M`，按月并行拉取后合并

### P1：播出平台显示为 "TV" 而非中文名
- **根因**：`platform` 字段是 string（"TV"/"WEB"），不是 string[]
- **方案**：新建 `src/api/platforms.ts`，用 `meta_tags` 拆词 + `platformName()` 映射

### P2：PWA meta 警告
- **根因**：缺少 `mobile-web-app-capable` meta 标签
- **方案**：在 `index.html` 补充

---

## 架构决策

### 代理方案：Cloudflare Pages Functions
- **选择**：Pages Functions（`functions/` 目录）
- **原因**：`workers.dev` 域名在国内经常被墙，而 `pages.dev` 可达
- **优势**：随前端一起部署，不需要单独维护

### 图片代理：自建 vs wsrv.nl
- **生产**：自建 Pages Function（`functions/img.ts`），域名白名单 + 30 天缓存
- **开发**：wsrv.nl（免费公共图片代理）
- **原因**：wsrv.nl 曾将本站加入黑名单，生产环境自建更可控

### API 代理重试机制
- **方案**：最多 3 次请求（间隔 500ms → 1000ms 递增）
- **原因**：Bangumi API 偶尔 5xx 或超时，重试可让用户无感知恢复
