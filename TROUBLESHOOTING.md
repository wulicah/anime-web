# 踩坑日志 / Troubleshooting Log

> 整理本项目从 0 到 1 过程中真实遇到并解决的问题，按"现象 → 排查思路 → 根因 → 解决方案 → 收获"结构记录。  
> 面试可直接引用每一条的具体场景。

---

## 目录

1. [前端直连 bangumi API 失败](#1-前端直连-bangumi-api-失败)
2. [图片代理选型：wsrv.nl 全部 403](#2-图片代理选型wsrvnl-全部-403)
3. [Bangumi 图片 CDN 缩放规则踩坑](#3-bangumi-图片-cdn-缩放规则踩坑)
4. [srcset 缺 sizes，移动端 ERR_ABORTED](#4-srcset-缺-sizes移动端-err_aborted)
5. [Service Worker 缓存了错误响应](#5-service-worker-缓存了错误响应)
6. [vite-plugin-pwa 与 vite 6 兼容问题](#6-vite-plugin-pwa-与-vite-6-兼容问题)
7. [CF Pages _redirects 触发无限循环](#7-cf-pages-_redirects-触发无限循环)
8. [CF Pages 环境变量改完不生效](#8-cf-pages-环境变量改完不生效)
9. [CORS 公开代理全部不可靠](#9-cors-公开代理全部不可靠)
10. [Bangumi API 端点选错](#10-bangumi-api-端点选错)
11. [代理 Function 路径代理格式选错](#11-代理-function-路径代理格式选错)
12. [Tailwind 与系统字体（不用 Google Fonts）](#12-tailwind-与系统字体不用-google-fonts)
13. [Vite 代理需手动加载 .env](#13-vite-代理需手动加载-env)
14. [GitHub 仓库公开前的脱敏审计](#14-github-仓库公开前的脱敏审计)

---

## 1. 前端直连 bangumi API 失败

**现象**

```
Access to fetch at 'https://api.bgm.tv/v0/subjects/...' from origin 'https://fanlu.pages.dev'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
on the requested resource.
```

部分国内浏览器连 `api.bgm.tv` 直接 `net::ERR_CONNECTION_TIMED_OUT`。

**排查思路**

1. DevTools Network 看响应头，确实没有 CORS 头 → 排除配置错
2. Bangumi 官方 API 是给自家网站用的，没打算给第三方浏览器调用 → 排除协调官方
3. 思路转换：把请求放到服务端转发

**根因**

- `api.bgm.tv` 服务端**不返回** `Access-Control-Allow-Origin`，浏览器直接拦截
- 国内网络对 `api.bgm.tv` 的解析/路由不稳定
- 直接用 `workers.dev` 独立 Worker，移动端又被墙

**解决方案**

`functions/api/bgm/[[path]].ts`（Cloudflare Pages Functions）做边缘代理：

- 路径通配 `[[path]].ts` 匹配 `/api/bgm/v0/subjects/*` 所有子路径
- 用户访问 `fanlu.pages.dev`（国内 CF 节点可达） → Function 在 CF 海外节点执行（能直连 bangumi） → 拿到数据加上 CORS 头回传
- GET 请求边缘缓存 5 分钟
- 5xx 错误重试 2 次，间隔 0.5s/1s

**收获**

- 解决 CORS 的根本思路：浏览器端没法解，就放到**服务端中转**
- 部署平台自带 Functions（Cloudflare Pages / Vercel / Netlify）能同时解决 CORS + 网络可达性 + 鉴权/限流/缓存

---

## 2. 图片代理选型：wsrv.nl 全部 403

**现象**

所有图片通过 wsrv.nl 代理后大批量 403，错误码 `1010`。

```
<Error>
  <Code>1010</Code>
  <Message>The owner of this website has banned your access based on your browser's signature.</Message>
</Error>
```

**排查思路**

1. wsrv.nl 官方文档说支持任意图片压缩 → 排除配置错
2. curl 单独访问也 403 → 排除浏览器侧
3. wsrv.nl 社区 issue 找到原因：站长把 Cloudflare 共享 IP 段拉黑

**根因**

wsrv.nl 站长反爬，把 **Cloudflare Workers / Pages 的共享出口 IP 段**加入了黑名单（因为被滥用）。CF 边缘函数出口的 IP 都是这几个段，命中 1010。

**解决方案**

- 弃用 wsrv.nl
- `functions/img.ts` 直接 `fetch(lain.bgm.tv 原图)`
- `lain.bgm.tv` 本身也在 Cloudflare 上，**CF-to-CF 通信**不会被另一边的反爬黑名单影响
- 加 30 天边缘缓存弥补原图体积大的代价（200-500KB vs wsrv.nl 压缩后 30-50KB）
- 白名单校验：只允许 `lain.bgm.tv` 域名通过该代理（防 SSRF 滥用）

**收获**

- 用第三方公共服务前要充分调研其反爬策略，尤其 CDN 共享 IP 段
- 优先用上游源站 + 自己的边缘缓存，而不是中间商

---

## 3. Bangumi 图片 CDN 缩放规则踩坑

**现象 A**

最初想用代理 Function 的 `?w=N&output=webp&q=70` 参数压缩图片，但写完发现函数根本没生效——原图照样 938KB 返回。

**根因 A**

`functions/img.ts` 当时实现时没解析 `w` / `q` 参数，直接透传 `fetch()` 到 lain.bgm.tv。**CDN 参数必须在 URL 里拼好**，函数侧忘了把 query string 拼到上游。

**现象 B**

改成拼 `lain.bgm.tv/r/150/pic.jpg`（自认为精准匹配移动端 96px 容器），结果 400 Bad Request。

**根因 B**

Bangumi CDN `/r/N/` 路径前缀**只支持预设尺寸**：100 / 200 / 400 / 600 / 800 / 1200，其他值直接 400。

**解决方案**

`src/composables/useImage.ts` 里写 `snapToValidCdnSize()` 函数：

```ts
const VALID_SIZES = [100, 200, 400, 600, 800, 1200]
export function snapToValidCdnSize(w: number): number {
  return VALID_SIZES.find(s => s >= w) ?? 1200
}
```

请求的 150 → 吸附到 200；300 → 400。

**收获**

- 任何"动态参数 API"都要先确认允许的值域
- 自定义中间层时，记得把客户端参数**正确透传到上游**

---

## 4. srcset 缺 sizes，移动端 ERR_ABORTED

**现象**

iPhone 12 Pro 上批量 `net::ERR_ABORTED`，命中率集中在长列表分页加载时。

```
GET https://...lain.bgm.tv/r/800/pic.jpg net::ERR_ABORTED
```

**排查思路**

1. DevTools Network 看是哪个尺寸的请求被中止 → 集中在 800w / 1200w
2. 截图看图片容器实际宽度 → 96px (列表) / 200px (网格)
3. 看 `<img>` 标签源码 → 用了 srcset，**没写 sizes**

**根因**

W3C 规范：缺 `sizes` 时浏览器默认按 `100vw`（视口宽度）选图。iPhone 12 Pro 视口 390px，DPR 3x → 选 1200w。  
**列表容器实际只有 96px**（2x DPR 实际 192px 物理像素），但浏览器请求了 1200w 的源图。  
源站返回慢/连接中断 → 用户切页/滚动 → 浏览器中止请求 → ERR_ABORTED。

**解决方案**

```html
<img
  :src="imageUrl(400)"
  :srcset="`${imageUrl(100)} 100w, ${imageUrl(200)} 200w, ${imageUrl(400)} 400w`"
  sizes="96px"  <!-- 列表 96，网格 200 -->
/>
```

**同时精简 srcset 档位**（按容器实际最大渲染宽度）：

| 场景 | 容器宽度 | DPR 2x 物理像素 | srcset 最高档 |
|---|---|---|---|
| 列表封面 | 96px | 192 | 200w |
| 网格封面 | 200px | 400 | 400w |

**收获**

- 响应式图片的 `srcset` + `sizes` **必须配对**，sizes 是**告诉浏览器当前显示宽度**的关键
- 移动端 2x/3x DPR 下，**实际请求的物理像素 = CSS 宽度 × DPR**，一定要预留好
- ERR_ABORTED 多数是"请求慢了用户已经离开"——根因是**请求了过大的图**

---

## 5. Service Worker 缓存了错误响应

**现象**

某次上游 CDN 抽风返回了 500 错误，结果这个 500 状态**被 Service Worker 永久缓存**，所有用户后续访问该图都是 500 占位。

**排查思路**

1. DevTools → Application → Cache Storage 看到一堆状态码为 500 的 Response
2. 禁用 SW 重新访问 → 正常
3. 启用 SW 访问 → 500

**根因**

最初 PWA 配置的图片缓存策略是 `CacheFirst`：先看缓存，有就用，没有才请求。**但缓存时没校验状态码**，上游一抽风 500 就被永久锁住。

**解决方案**

`vite.config.ts` 中 `workbox.runtimeCaching` 把图片策略从 `CacheFirst` 改为 **`StaleWhileRevalidate`**：

- 立即返回缓存（如果存在）
- 后台异步请求最新版本
- 拿到新响应时**校验 status === 0 或 200** 才写入缓存
- 上游故障时用户仍能看旧图，体验降级而非崩溃

**收获**

- Service Worker 的 cache.put 一定要加**响应有效性校验**
- CacheFirst 适合不变的资源（带 hash 的 JS/CSS），**不适合上游可能抽风的 API/图片**

---

## 6. vite-plugin-pwa 与 vite 6 兼容问题

**现象**

本地 `npm install` 一切正常，push 到 Cloudflare Pages 后构建失败：

```
npm ERR! code ERESOLVE
npm ERR! Could not resolve dependency:
npm ERR! peer vite@"^3.0.0 || ^4.0.0 || ^5.0.0" from vite-plugin-pwa@0.20.5
```

**根因**

当时升级了 `vite@6.0.0`，但 `vite-plugin-pwa@0.20.x` 的 peer dependency 只声明到 vite 5。

**解决方案**

`package.json`：

```json
"vite": "^6.0.0",
"vite-plugin-pwa": "^0.21.1"  // 0.21+ 支持 vite 6
```

**收获**

- CI/CD 跑的是 **clean install（`npm ci`）**，比本地 `npm install` 严格得多
- 升级主版本时一定要**同时升插件链**，别只升 vite

---

## 7. CF Pages _redirects 触发无限循环

**现象**

加 `public/_redirects` 想实现 SPA fallback：

```
/* /index.html 200
```

部署时 CF 报错：

```
Error 100324: Infinite loop detected.
```

**排查思路**

CF 官方文档：`_redirects` 的 `/index.html 200` 会让路径**被规范化** `/index.html → /index → /`，而 `/*` 又匹配到 `/`，死循环。

**根因**

Cloudflare Pages 对 SPA fallback 有**两种机制**：

1. `_redirects` 文件（自定义规则）—— 走规范化逻辑，会循环
2. **自动 fallback**（无 `_redirects` 且无 `404.html`）—— 直接返回 `index.html`，不规范化

**解决方案**

- 删除 `public/_redirects`
- 不创建 `404.html`（有的话 CF 会优先返回 404）
- 让 CF 自动接管 SPA fallback

**收获**

- 用托管平台的"默认行为"比自己写规则更稳
- 看到"infinite loop"先想"我是不是把平台的隐式规则又显式重写了一遍"

---

## 8. CF Pages 环境变量改完不生效

**现象**

后台改了 `ALLOWED_ORIGIN` 环境变量，但线上 API 代理返回的 `Access-Control-Allow-Origin` 还是 `*`。

**排查思路**

1. 反复检查 `.env` 文件和 Cloudflare 后台 → 都没错
2. 反复重新部署 → 仍然 `*`
3. 翻 CF 文档 → 看到 "Environment variables changes require a new deployment"

**根因**

CF Pages 的环境变量**不是热更新**——必须触发一次新的部署（push commit 即可）才会重新打包 Functions。

**解决方案**

- 改完环境变量后，**手动 push 一个 commit**（哪怕是空 commit `git commit --allow-empty -m "trigger deploy"`）触发部署
- 或者在 CF Pages 后台点 "Retry deployment"

**收获**

- Serverless 平台的"环境配置"和"代码部署"经常是**两个独立触发点**
- 修改配置后别忘了手动触发一次部署

---

## 9. CORS 公开代理全部不可靠

**现象**

开发初期想偷懒用公共 CORS 代理（`corsproxy.io` / `allorigins.win` / `codetabs.com`），结果：

- 50% 概率超时
- 部分接口被代理服务器拒绝
- 偶发返回 502

**根因**

公共代理：

- 限流严格（IP 共享）
- 经常被上游 API 反爬
- 服务稳定性无 SLA 保证

**解决方案**

- 自己写 Cloudflare Pages Function 当代理
- 成本：0（CF 免费额度 10 万次/天）
- 收益：完全可控、可缓存、可加白名单

**收获**

- **生产项目别用公共代理**——稳定性 + 安全 + 限速都不达标
- "几分钟能搭" 的方案上线后是长期技术债

---

## 10. Bangumi API 端点选错

**现象**

最初想获取"本季新番"列表，用了：

```
POST https://api.bgm.tv/v0/search/subjects?type=2
```

返回结果完全不是想要的"按时间排的当季新番"。

**根因**

- `POST /v0/search/subjects` 是**全文搜索**接口，按关键字匹配，不是按时间
- 真正的"季度新番"接口是 `GET /v0/subjects?type=2&year=YYYY&month=M&sort=date`

**解决方案**

```
GET /api/bgm/v0/subjects?type=2&year=2026&month=7&sort=date&limit=50
```

`type=2` 动画，`sort=date` 按开播日期排。

**收获**

- 读官方 API 文档要看**完整端点列表**，不要只看搜索结果
- 端点名字相似不等于功能相似

---

## 11. 代理 Function 路径代理格式选错

**现象**

最初代理 Function 写的是**路径代理**：

```
/img/lain.bgm.tv/pic.jpg
```

结果 404。

**根因**

CF Pages Functions 的路径匹配是 `/img/*` → 函数 → 函数里再决定如何处理上游 URL。  
**路径段会被原样传到 URL.pathname**，但上游 `lain.bgm.tv` 看到的请求是 `GET /lain.bgm.tv/pic.jpg` 这种垃圾路径。

**解决方案**

改成**查询字符串代理**：

```
/img?url=https%3A%2F%2Flain.bgm.tv%2Fpic.jpg
```

函数里 `new URL(targetUrl)` 解析后再 fetch。

**收获**

- 代理类接口优先用 **query string** 传目标 URL，路径段留给**框架路由**用
- URL 编码要 `encodeURIComponent`，否则特殊字符（`?`、`&`、`#`）会破坏解析

---

## 12. Tailwind 与系统字体（不用 Google Fonts）

**现象**

设计稿想用思源黑体（Noto Sans SC）做中文 UI，最初方案：

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC');
```

线上 30% 用户首屏 `FOIT`（Flash of Invisible Text）长达 2-3 秒，部分地区直接超时。

**排查思路**

1. WebPageTest 看瀑布流 → 字体文件请求排在关键路径
2. 国内部分网络对 `fonts.googleapis.com` 解析失败

**根因**

Google Fonts 在国内网络环境不稳定，且首屏必阻塞文本渲染。

**解决方案**

`tailwind.config.js` 改为系统字体栈：

```js
fontFamily: {
  sans: ['"PingFang SC"', '"Microsoft YaHei"', '"Songti SC"', 'sans-serif']
}
```

- 0 网络请求
- 用户系统已安装字体，秒开
- iOS / Android / Windows / macOS 各平台都有合适回退

**收获**

- 性能优化第一原则：**能省的网络请求都省**
- 中文字体文件巨大（2-5MB），能不用就别用
- 系统字体栈已经能覆盖 95% 场景

---

## 13. Vite 代理需手动加载 .env

**现象**

本地开发想代理 `/api` 到 CF Pages Function，配置：

```ts
server: {
  proxy: {
    '/api': 'http://localhost:8788'
  }
}
```

启动后 `process.env.VITE_API_TARGET` 拿到的是 `undefined`。

**根因**

Vite 默认只把**带 `VITE_` 前缀**的环境变量注入到 `import.meta.env`。  
而 `server.proxy` 在 Node 端运行，读的是 `process.env`，**不会自动加载 `.env`**。

**解决方案**

`vite.config.ts` 顶部手动加载：

```ts
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    server: {
      proxy: {
        '/api': env.VITE_API_TARGET
      }
    }
  }
})
```

**收获**

- 区分 `import.meta.env`（客户端、Vite 自动注入）和 `process.env`（Node 端、需手动 loadEnv）
- Vite 配置文件**本身就是 Node 代码**，要走 Node 那一套

---

## 14. GitHub 仓库公开前的脱敏审计

**现象**

准备把仓库从 private 转 public 前，担心：

- 历史 commit 里可能有个人邮箱/名字泄漏
- `.env` 文件意外被提交
- 代码里有 hardcode 的 API key / token

**排查思路**

跑了一套审计：

```bash
# 1. 检查 .gitignore 是否包含 .env
cat .gitignore | grep -E '^\.env$'

# 2. 找所有历史 commit 里包含邮箱的
git log --all -p | grep -E '[a-z]+@[a-z]+\.' | head

# 3. 找所有疑似 token / key 的字符串
git log --all -p | grep -E '(api[_-]?key|secret|token|password)' | head

# 4. 检查所有 .env / .env.* 是不是被 ignore
git ls-files | grep -E '^\.env'
```

**解决方案**

1. `.gitignore` 加上 `.env`、`.env.*`（保留 `.env.example`）
2. 创建 `.env.example` 暴露所有需要的变量名（值留空）+ 注释
3. 改 git 全局 user 信息为 GitHub 用户名邮箱（`git filter-branch` 不必要，直接改未来 commit 即可）
4. 写 DEPLOY.md 列出所有环境变量含义 + 哪些必须设

**收获**

- 公开仓库前**永远要审计一遍**——一旦 push 到 public，再删 commit 也会被 fork
- `.env.example` 是开源项目标配
- 凭据不能进 git，一旦进了，立即 rotate（轮换密钥）

---

## 通用方法论

整理这 14 个 case 后，能总结出一些**通用的问题排查思路**，面试时可以提：

1. **现象 → 假设 → 验证 → 根因 → 解决**：不要直接猜原因，先看证据（DevTools、Network、curl、日志）
2. **分层定位**：CORS？网络？代码？配置？权限？缓存？逐层排除
3. **读官方文档**：CF Pages / Bangumi / Vite 的官方文档比 StackOverflow 更准
4. **本地能跑 ≠ 线上能跑**：CI/CD 是更严格的环境
5. **第三方服务都有反爬策略**：wsrv.nl 黑 CF IP、bangumi 没 CORS、公共代理限流
6. **性能优化要量化**：图片从 938KB → 16KB（98.3% 下降），不是"感觉快了"
7. **不要重复造轮子，但要看清轮子**：用 CF Functions 而不是自建 Worker / Express 服务

---

> 最后更新：2026-07-02
