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
| 看到一堆 JSON（200 OK） | ✅ 你能直连，跳到"第 1 步：生产部署" |
| `无法连接到远程服务器` / 超时 | ❌ 需要代理，先做"代理层部署"（推荐 Cloudflare Worker） |

---

## 1. 代理层部署（仅国内用户需要）

### 推荐：Cloudflare Worker（免费，5 分钟）

**Cloudflare 免费额度**：
- 10 万请求/天
- 足够个人作品集使用
- 全球 200+ 边缘节点，比直连还快

#### 部署步骤

**① 注册 Cloudflare**（如已有跳过）

打开 https://dash.cloudflare.com/sign-up ，用邮箱注册（不需要信用卡）

**② 安装命令行工具 wrangler**

打开项目根目录的 PowerShell：

```powershell
cd "c:\Users\DZL\Desktop\ANIME WEB\worker"
npm install
```

（这会装 wrangler，约 30 秒）

**③ 登录 Cloudflare**

```powershell
npx wrangler login
```

会自动打开浏览器让你授权，授权后回 PowerShell 看 "Successfully logged in"。

**④ 部署 Worker**

```powershell
npx wrangler deploy
```

跑完后会显示：

```
Published fanlu-bgm (X.XX sec)
  https://fanlu-bgm.你的名字.workers.dev
```

**把这个 URL 复制下来**（后面要用）。

**⑤ 配置项目用上 Worker**

回到项目根目录：

```powershell
cd "c:\Users\DZL\Desktop\ANIME WEB"
```

编辑 `.env`（没有就新建），加一行：

```
VITE_BANGUMI_BASE_URL=https://fanlu-bgm.你的名字.workers.dev/api/bgm
```

把 `你的名字` 换成你实际的 Cloudflare 子域名。

**⑥ 重启 dev server**

```powershell
# 在跑着 dev 的终端按 Ctrl+C
npm run dev
```

现在应该能看到番剧了。

#### 验证 Worker 是否工作

浏览器打开：

```
https://fanlu-bgm.你的名字.workers.dev/api/bgm/v0/subjects/1
```

应该看到一堆 JSON（番剧详情），说明 Worker 跑起来了。

---

## 2. 生产部署（前端静态站）

前端代码就是一堆静态文件（HTML/CSS/JS），可以部署到任何静态托管。

### 推荐：Vercel（免费，最快）

**① 注册 Vercel**（用 GitHub 账号最方便）

https://vercel.com/signup

**② 推送代码到 GitHub**

如果你还没有 GitHub 仓库，先创建：
1. 在 GitHub 上点 "New repository"
2. 名字随便起，比如 `fanlu`
3. 不要勾 "Initialize with README"

然后回到 PowerShell（项目根目录）：

```powershell
cd "c:\Users\DZL\Desktop\ANIME WEB"
git init
git add .
git commit -m "feat: 番录 v0.1 初始版本"
git branch -M main
git remote add origin https://github.com/你的用户名/fanlu.git
git push -u origin main
```

**③ Vercel 导入项目**

1. 进 https://vercel.com/new
2. 选择你的 `fanlu` 仓库 → Import
3. 框架选择 "Vite"
4. **环境变量** 添加：
   - `VITE_BANGUMI_BASE_URL` = `https://fanlu-bgm.你的名字.workers.dev/api/bgm`
5. 点 Deploy

约 1-2 分钟后部署完成，会给你一个 `xxx.vercel.app` 域名。

**④ （可选）配 Vercel 代理**

如果你不想用 Worker，可以在 Vercel 项目根加 `vercel.json`：

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

然后把 `.env` 的 `VITE_BANGUMI_BASE_URL` 改成 `/api/bgm`，让前端走 Vercel 代理。

**优点**：部署简单，不用单独维护 Worker
**缺点**：Vercel Functions 冷启动比 Worker 慢

---

## 3. 费用总览

| 服务 | 费用 |
|------|------|
| Cloudflare Worker | **免费** 10 万请求/天（个人作品集用不完） |
| Cloudflare Pages | **免费** 无限流量 |
| Vercel | **免费** 100GB 流量/月 |
| Netlify | **免费** 100GB 流量/月 |
| GitHub Pages | **免费** |

**结论：100% 免费，没有任何隐藏费用。**

---

## 4. 常见问题

### Q: Worker 部署失败？

A: 99% 是 wrangler login 没成功。重新跑 `npx wrangler login`，看到 "Successfully logged in" 再 deploy。

### Q: Worker 部署成功但还是超时？

A: 检查 .env 里的 URL 有没有写错（带不带 /api/bgm 后缀）。打开 `https://你的worker域名/api/bgm/calendar` 应该能看到 JSON。

### Q: 想换数据源（比如用 next.bgm.tv）？

A: 编辑 `worker/src/index.ts` 第 40 行：
```ts
const targetUrl = `https://next.bgm.tv${targetPath}${url.search}`
```
然后 `npx wrangler deploy` 重新部署。

### Q: 不想用 Cloudflare？

A: 用 Vercel + 上面提到的 `vercel.json` rewrites 方案。

---

## 5. 部署后简历怎么写

"独立设计并部署了基于 Cloudflare Workers 的边缘 API 代理层，零成本解决了 CORS 跨域与国内网络访问问题，并通过 Workbox 实现 PWA 离线缓存策略。"
