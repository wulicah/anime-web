/**
 * Cloudflare Pages Function: Bangumi API 代理
 *
 * 路由：/api/bgm/*
 * 转发到：https://api.bgm.tv/*
 *
 * 解决：
 * ① 浏览器 CORS 限制
 * ② 国内浏览器无法直连 api.bgm.tv（CORS + 网络不通）
 * ③ 移动设备 / 国内直连 workers.dev 经常被墙
 *    → 用户访问 fanlu.pages.dev (CF 节点国内可达)
 *    → 代理逻辑在 CF 海外节点执行（能直连 api.bgm.tv）
 *
 * 缓存策略：
 * - GET 请求边缘缓存 5 分钟
 */
interface Env {
  // 预留
}

const BANGUMI_API = 'https://api.bgm.tv'
const CACHE_TTL = 300

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent',
  'Access-Control-Max-Age': '86400',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
}

function jsonError(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: 'PROXY_ERROR', status, message }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    },
  )
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const targetPath = url.pathname.replace(/^\/api\/bgm/, '')
  const targetUrl = `${BANGUMI_API}${targetPath}${url.search}`

  try {
    let body: BodyInit | undefined
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = request.body
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'FanLu/0.1 (https://github.com/wulicah/anime-web)',
        Accept: 'application/json',
      },
      body,
      redirect: 'follow',
    })

    const newResponse = new Response(response.body, response)
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      newResponse.headers.set(k, v)
    }

    if (request.method === 'GET' && response.ok) {
      newResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`)
    }

    return newResponse
  } catch (err) {
    console.error('[API Proxy Error]', targetUrl, err instanceof Error ? err.message : String(err))
    return jsonError(502, '代理服务暂时不可用，请稍后重试')
  }
}
