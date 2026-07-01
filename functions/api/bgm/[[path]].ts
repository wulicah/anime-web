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
 *    → 用户访问你的 pages.dev 域名 (CF 节点国内可达)
 *    → 代理逻辑在 CF 海外节点执行（能直连 api.bgm.tv）
 *
 * 缓存策略：
 * - GET 请求边缘缓存 5 分钟（bangumi 数据更新不频繁）
 *
 * 部署配置（Cloudflare Pages 后台 → Settings → Environment variables）：
 *   APP_VERSION  = 0.1.0              (可选,用于 User-Agent)
 *   PROJECT_REPO = your-name/anime-web (可选,用于 User-Agent)
 *   不设置则使用下面的默认值
 *   ⚠️ 注意：环境变量保存后必须**重新部署**一次才会生效（CF Pages 限制）
 */
const BANGUMI_API = 'https://api.bgm.tv'
const CACHE_TTL = 300
const MAX_RETRIES = 2
const DEFAULT_APP_VERSION = '0.1.0'
const DEFAULT_PROJECT_REPO = 'your-name/anime-web'

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

async function fetchWithRetry(
  targetUrl: string,
  options: RequestInit,
  retries: number,
): Promise<Response> {
  let lastError: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(targetUrl, options)
      if (response.ok || response.status < 500) {
        return response
      }
      // 5xx 错误，重试
      lastError = new Error(`Upstream ${response.status}`)
    } catch (err) {
      lastError = err
    }
    if (i < retries) {
      await new Promise((r) => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw lastError
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  // User-Agent 标识:从环境变量读,便于开源后 fork 用户自定义
  const appVersion = (env.APP_VERSION as string) || DEFAULT_APP_VERSION
  const projectRepo = (env.PROJECT_REPO as string) || DEFAULT_PROJECT_REPO

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const targetPath = url.pathname.replace(/^\/api\/bgm/, '')
  const targetUrl = `${BANGUMI_API}${targetPath}${url.search}`

  try {
    let body: BodyInit | undefined
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = request.body ?? undefined
    }

    const response = await fetchWithRetry(
      targetUrl,
      {
        method: request.method,
        headers: {
          'User-Agent': `FanLu/${appVersion} (https://github.com/${projectRepo})`,
          Accept: 'application/json',
          ...(request.headers.get('Authorization')
            ? { Authorization: request.headers.get('Authorization')! }
            : {}),
        },
        body,
        redirect: 'follow',
      },
      MAX_RETRIES,
    )

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
