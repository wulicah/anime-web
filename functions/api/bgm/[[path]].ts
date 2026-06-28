/**
 * Cloudflare Pages Function: Bangumi API 代理
 *
 * 路由：/api/bgm/*
 * 转发到：https://api.bgm.tv/*
 *
 * 解决：
 * ① 国内浏览器无法直连 api.bgm.tv（CORS + 网络不通）
 * ② 用户访问的是 *.pages.dev 域名（国内 CF 节点可达）
 * ③ 代理逻辑在 CF 海外节点执行（能直连 api.bgm.tv）
 *
 * 缓存策略：
 * - GET 请求边缘缓存 5 分钟（bangumi 数据更新不频繁）
 * - 用户可以在浏览器开发者工具看到 age / cf-cache-status
 */

interface Env {
  // 预留：如需鉴权可加环境变量
}

const BANGUMI_API = 'https://api.bgm.tv'
const CACHE_TTL = 300 // 5 分钟

const ALLOWED_ORIGIN = 'https://fanlu.pages.dev'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent',
  'Access-Control-Max-Age': '86400',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
}

function jsonError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ error: 'PROXY_ERROR', status, message, ...extra }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    },
  )
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context
  const url = new URL(request.url)

  // OPTIONS 预检直接放行
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // 构造目标 URL：/api/bgm/v0/subjects?type=2 → https://api.bgm.tv/v0/subjects?type=2
  const targetPath = url.pathname.replace(/^\/api\/bgm/, '')
  const targetUrl = `${BANGUMI_API}${targetPath}${url.search}`

  try {
    // 透传 body（POST/PUT 等需要）
    let body: BodyInit | undefined
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = request.body
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        // Bangumi API 强制要求 User-Agent 头，否则 403
        'User-Agent': 'FanLu/0.1 (https://github.com/fanlu/anime-web)',
        Accept: 'application/json',
        // 透传 Authorization（如有用户 token）
        ...(request.headers.get('Authorization')
          ? { Authorization: request.headers.get('Authorization')! }
          : {}),
      },
      body,
      // 不跟随重定向，让 bangumi 自己的重定向透传
      redirect: 'follow',
    })

    // 复制响应内容 + 头
    const newResponse = new Response(response.body, response)

    // 覆盖 CORS 头
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      newResponse.headers.set(k, v)
    }

    // 仅 GET 请求加缓存头
    if (request.method === 'GET' && response.ok) {
      newResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`)
    }

    return newResponse
  } catch (err) {
    console.error('[API Proxy Error]', targetUrl, err instanceof Error ? err.message : String(err))
    return jsonError(502, '代理服务暂时不可用，请稍后重试')
  }
}
