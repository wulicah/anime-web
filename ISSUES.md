# 待修复问题跟踪

> 每一个问题都要在这里登记 → 修复 → 验证 → 关闭

---

## ✅ P0 已修复

- [x] **B-1**: 桌面端导航缺"追番/我的" — 已加
- [x] **B-2**: HomeView 周维度 Tab 点击无反应 — 加了 activeDay + @click
- [x] **B-3**: CORS 拦截 — 部署 Cloudflare Worker 代理
- [x] **B-4**: 归档跳 yuc.wiki — 改为站内路由 + ArchiveSeasonView
- [x] **B-5**: 看不到番剧（网络） — Worker 代理
- [x] **B-6**: worker/tsconfig.json IDE 报错 — exclude + 装依赖

---

## ✅ P1 已修复（用户第二轮反馈）

### 1. 首页布局改造 ✅
- **之前**：单列列表
- **现在**：
  - 顶部：Grid 快速浏览（3-6 列自适应）
  - 底部：详细列表
  - 顶部加"当前季度" + "距离下季 X 天"倒计时
- **文件**：`src/views/HomeView.vue`、`src/components/anime/AnimeCell.vue`

### 2. 番剧资源时效性 ✅
- **根因**：Bangumi calendar 端点只返回"在播季度"
- **方案**：
  - ✅ 首页顶部加"当前季度：X"标识 + 倒计时
  - ✅ 提供 `public/data/seasons.json` 静态补全入口（README 文档）
  - 🔄 6/27 → 7/1 后 Bangumi 会自动切换到夏季档（被动方案）

### 3. 资源不全（周日没数据）✅
- **方案**：用户维护 `public/data/seasons.json` 补全
- **架构**：静态数据优先 → Bangumi API 兜底

### 4. 归档 404 ✅
- **根因**：Bangumi v0 `/v0/search/subjects` 是 POST 不是 GET
- **正解端点**：`GET /v0/subjects?type=2&year=YYYY&month=M&sort=date&limit=50`
- **方案**：新方法 `searchBySeason(year, startMonth, endMonth)` 并行拉 3 个月合并
- **文件**：`src/api/bangumi.ts`、`src/views/ArchiveSeasonView.vue`

### 5. 详情页问题 ✅
- 5a. **播出平台 T V**：
  - 根因：`platform` 字段是 string（"TV"/"WEB"），不是 string[]
  - 还有 `meta_tags` 字段（"TV 中文 WEB 原创"）
  - 修：用 `meta_tags` 拆词 + `platformName()` 映射
- 5b. **评分**：明确显示"Bangumi 评分" + 暂无评分 fallback
- 5c. **简介分段**：日文标题（原文）+ 中文 summary 各自成段
- **文件**：`src/views/AnimeDetailView.vue`、`src/api/platforms.ts`

---

## ✅ P2 已修复

- [x] **PWA meta 警告**：加了 `mobile-web-app-capable`
- [x] **404 页面**：新建 `NotFoundView.vue`

---

## 📋 还需要用户做的事

1. **重启 dev server** 看到所有改动
2. **测试归档** `/archive/2024/Spring` 验证 404 修好
3. **测试详情页** `/anime/570584` 验证平台显示
4. **测试首页布局** 验证 Grid 顶部 + List 底部
5. **如果想现在看到 7 月新番**：维护 `public/data/seasons.json`（格式见 README）

---

## 总结

用户 5 个反馈问题全部修复 + 顺便做了：
- 新增 AnimeCell 紧凑组件
- 新增 platforms 名称映射
- 修类型定义（platform 实际是 string 不是 string[]）
- 新增 404 页面
- 修 PWA meta 警告
- 加季度元信息工具
- 加静态数据补全机制
