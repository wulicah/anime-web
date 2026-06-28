/**
 * Cloudflare Worker - Bangumi API + 图片代理
 *
 * 作用：
 *   1. API 代理（/api/bgm/*）：解决 CORS + 国内访问 api.bgm.tv 不通
 *   2. 图片代理（/img?url=xxx）：解决 CORS + 国内访问 lain.bgm.tv 不通
 *      - query string 传 URL，避免路径编码问题
 *      - 边缘缓存 30 天（Cloudflare CDN，第二次访问 < 50ms）
 *
 * 部署（5 分钟，零费用）：
 *   1. 注册 Cloudflare：https://dash.cloudflare.com/sign-up
 *   2. 安装 wrangler：npm install -g wrangler
 *   3. 登录：wrangler login
 *   4. 部署：cd worker && wrangler deploy
 *   5. 拿到 URL：例如 https://fanlu-bgm.你的名字.workers.dev
 *   6. 修改项目根目录 .env（如需）：
 *        VITE_PROXY_TARGET=https://fanlu-bgm.你的名字.workers.dev/api/bgm
 *        VITE_IMG_PROXY_TARGET=https://fanlu-bgm.你的名字.workers.dev
 *   7. 重启 dev server
 *
 * 免费额度：10 万请求/天（个人作品集绰绰有余）
 */

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    // 1. 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      })
    }

    const url = new URL(request.url)

    // 2. 路由分发
    //    - /img?url=xxx  → 图片代理
    //    - /api/bgm/*    → API 代理
    //    - 其他          → 404
    if (url.pathname === '/img' || url.pathname.startsWith('/img/')) {
      return handleImageProxy(request, ctx)
    }

    if (url.pathname.startsWith('/api/bgm')) {
      return handleApiProxy(request)
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders() })
  },
}

/**
 * 图片代理：/img?url=<encoded bangumi image url>
 * - 只允许 lain.bgm.tv 域名（防止被滥用做开放代理）
 * - 用 Cloudflare Cache API 缓存 30 天
 */
async function handleImageProxy(request: Request, ctx: ExecutionContext): Promise<Response> {
  const imgUrl = new URL(request.url).searchParams.get('url')
  if (!imgUrl) {
    return new Response('Missing url param', { status: 400, headers: corsHeaders() })
  }

  // 只代理 bangumi 图片域名，防止被滥用
  if (!imgUrl.startsWith('http://lain.bgm.tv') && !imgUrl.startsWith('https://lain.bgm.tv')) {
    return new Response('Domain not allowed', { status: 403, headers: corsHeaders() })
  }

  // 用 GET URL 作为 cache key（POST 等不缓存）
  const cacheKey = new Request(imgUrl, { method: 'GET' })
  const cache = caches.default

  // 命中缓存直接返回
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  try {
    const upstream = await fetch(imgUrl, {
      headers: {
        'User-Agent': 'FanLu/0.1 (https://github.com/fanlu)',
        'Accept': 'image/*,*/*',
      },
    })

    if (!upstream.ok) {
      return new Response(`Upstream ${upstream.status}`, {
        status: upstream.status,
        headers: corsHeaders(),
      })
    }

    // 复制响应 + 加 CORS + 30 天缓存
    const newHeaders = new Headers(upstream.headers)
    Object.entries(corsHeaders()).forEach(([k, v]) => newHeaders.set(k, v))
    newHeaders.set('Cache-Control', 'public, max-age=2592000, s-maxage=2592000')

    const response = new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: newHeaders,
    })

    // 异步写入缓存（不阻塞响应）
    ctx.waitUntil(cache.put(cacheKey, response.clone()))

    return response
  } catch (err) {
    console.error('[IMG_UPSTREAM_ERROR]', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ error: 'IMG_UPSTREAM_ERROR', message: '图片代理暂时不可用，请稍后重试' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      },
    )
  }
}

/**
 * API 代理：/api/bgm/xxx → https://api.bgm.tv/xxx
 */
async function handleApiProxy(request: Request): Promise<Response> {
  const url = new URL(request.url)

  // 路径转换：/api/bgm/xxx → https://api.bgm.tv/xxx
  const targetPath = url.pathname.replace(/^\/api\/bgm/, '')
  const targetUrl = `https://api.bgm.tv${targetPath}${url.search}`

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'FanLu/0.1 (https://github.com/fanlu)',
        'Accept': 'application/json',
      },
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    })

    const newHeaders = new Headers(upstream.headers)
    Object.entries(corsHeaders()).forEach(([k, v]) => newHeaders.set(k, v))
    newHeaders.set('Cache-Control', 'public, max-age=300')

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: newHeaders,
    })
  } catch (err) {
    console.error('[UPSTREAM_ERROR]', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ error: 'UPSTREAM_ERROR', message: '服务暂时不可用，请稍后重试' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      },
    )
  }
}

const ALLOWED_ORIGIN = 'https://fanlu.pages.dev'

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  }
}
