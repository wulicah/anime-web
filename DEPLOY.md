# 部署番录到生产环境

> **本指南只讲一件事：让 api.bgm.tv 在国内也能访问**
>
> 如果你能直接访问 `https://api.bgm.tv`（港澳台用户），那么**只需要做"生产部署"，dev 环境已经能跑了**。
> 如果你**在国内连不上 api.bgm.tv**，那么**必须先做"代理层部署"**，dev 和生产才能看到番剧。

---

## 0. 先判断：你能直连 api.bgm.tv 吗？

打开 PowerShell 跑：

```powershell
curl https://api.bgm.tv/v0/subjects/1 -H "User-Agent: test" -UseBasicParsing
```

| 结果 | 怎么办 |
|------|--------|
| 看到一堆 JSON（200 OK） | ✅ 你能直连，跳到"第 2 步：生产部署" |
| `无法连接到远程服务器` / 超时 | ❌ 需要代理，先做"第 1 步：代理层部署" |

---

## 1. 代理层部署（仅国内用户需要）

本项目使用 **Cloudflare Pages Functions**（`functions/` 目录）作为生产代理方案：

- `functions/api/bgm/[[path]].ts` — Bangumi API 代理（CORS + 自动重试 + 边缘缓存）
- `functions/img.ts` — 图片代理（域名白名单 + 30 天缓存）

Pages Functions 随前端一起部署，**不需要单独部署**。只要把项目部署到 Cloudflare Pages，代理自动生效。

### 开发环境代理

dev 环境用 Vite proxy 转发。在 `.env` 中配置：

```bash
# .env（参考 .env.example）
VITE_PROXY_TARGET=https://your-cors-proxy.example.com   # API 代理
VITE_IMG_PROXY_TARGET=https://your-img-proxy.example.com # 图片代理（可选）
```

不配置时，dev 图片代理默认走 `wsrv.nl`（免费公共图片代理）。

---

## 2. 生产部署（前端静态站 + Pages Functions）

### 推荐：Cloudflare Pages（免费，代理自动生效）

**① 推送代码到 GitHub**

```powershell
git add .
git commit -m "feat: 番录初始版本"
git push
```

**② Cloudflare Pages 导入项目**

1. 打开 https://dash.cloudflare.com → Workers & Pages → Create
2. 连接 GitHub 仓库，选择 `anime-web`
3. 构建配置：
   - 框架：Vite
   - 构建命令：`npm run build`
   - 输出目录：`dist`
4. 点 Deploy

约 1-2 分钟后部署完成。Pages Functions 自动部署，无需额外配置。

**③ 验证代理是否工作**

浏览器打开：

```
https://你的项目名.pages.dev/api/bgm/v0/subjects/1
```

应该看到 JSON（番剧详情），说明代理生效了。

### 备选：Vercel / Netlify

如果部署到 Vercel 或 Netlify，需要用平台的 rewrites/redirects 功能替代 Pages Functions。

在项目根目录创建 `vercel.json`：

```json
{
  "rewrites": [
    {
      "source": "/api/bgm/:path*",
      "destination": "https://api.bgm.tv/:path*"
    }
  ]
}
```

前端代码会走相对路径 `/api/bgm`，由 Vercel 代理转发到 Bangumi API。

---

## 3. 费用总览

| 服务 | 费用 |
|------|------|
| Cloudflare Pages | **免费** 无限流量 + Pages Functions |
| Vercel | **免费** 100GB 流量/月 |
| Netlify | **免费** 100GB 流量/月 |

**结论：100% 免费，没有任何隐藏费用。**

---

## 4. 常见问题

### Q: 部署成功但看不到番剧（502）？

A: Bangumi API 服务器偶尔宕机。项目已内置自动重试（最多 3 次），但如果服务器完全挂了，只能等它恢复。

### Q: 想换数据源（比如用 next.bgm.tv）？

A: 编辑 `functions/api/bgm/[[path]].ts` 第 17 行：

```ts
const BANGUMI_API = 'https://next.bgm.tv'
```

重新部署即可。

### Q: 图片加载不出来？

A: 检查 `functions/img.ts` 中的域名白名单。默认只代理 `lain.bgm.tv`，如果 Bangumi 换了 CDN 域名需要同步更新。

### Q: 修改了 Cloudflare Pages 的环境变量，但好像没生效？

A: **Cloudflare Pages 的环境变量在保存后必须重新触发一次部署才会生效**。这是 CF Pages 的限制。

操作路径：
1. Cloudflare Pages → 你的项目 → Settings → Environment variables
2. 修改 / 添加变量后保存
3. **Deployments → 找到最新一次部署 → ⋯ → Retry deployment**(或者推一次空 commit 触发重新部署)

不会自动重新部署，必须手动触发。

---

## 5. 部署后简历怎么写

"独立设计并部署了基于 Cloudflare Pages Functions 的边缘 API 代理层，零成本解决了 CORS 跨域与国内网络访问问题，并通过 Workbox 实现 PWA 离线缓存策略。"
