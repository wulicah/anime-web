/**
 * Cloudflare Pages Function: Bangumi 图片代理
 *
 * 路由：/img?url=encoded_lain.bgm.tv_url&w=400&output=webp&q=70
 * 转发到：lain.bgm.tv 原图（CF 节点间直连，不被 wsrv.nl 黑名单影响）
 *
 * 解决：
 * ① 国内浏览器无法直连 lain.bgm.tv（CORS + 被墙）
 * ② CF Pages 出口是 CF 共享 IP，wsrv.nl 站长会屏蔽 → 直接拉 lain.bgm.tv
 * ③ CF Pages 边缘缓存 30 天，第二次访问秒开
 *
 * 为什么不用 wsrv.nl：
 * - 之前试过用 wsrv.nl 压缩图片（?w=N 缩放 + webp 转换）
 * - 但 wsrv.nl 站长把 Cloudflare Workers/Pages 的共享 IP 段加入了黑名单
 *   （错误码 1010 "The owner of this website has banned your access based on
 *   your browser's signature"）→ 所有图片 403
 * - 改用 lain.bgm.tv 原图是 CF-to-CF 通信，不被黑名单影响
 *
 * 代价：原图约 200-500KB，wsrv.nl 压缩后约 30-50KB
 * 解决：边缘缓存 30 天，二次访问秒开
 *
 * 部署配置（Cloudflare Pages 后台 → Settings → Environment variables）：
 *   ALLOWED_ORIGIN = https://your-domain.pages.dev
 *   不设置则默认 * (仅适合开发调试)
 */

const CACHE_TTL = 2592000 // 30 天
const DEFAULT_ALLOWED_ORIGIN = '*'
const ALLOWED_IMAGE_HOST = 'lain.bgm.tv'

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  // 允许的来源域名,从环境变量读取
  const allowedOrigin = (env.ALLOWED_ORIGIN as string) || DEFAULT_ALLOWED_ORIGIN

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 取出原始图片 URL
  const targetUrl = url.searchParams.get('url')
  if (!targetUrl) {
    return new Response('Missing "url" query parameter', {
      status: 400,
      headers: corsHeaders,
    })
  }

  // 安全校验：只允许代理 lain.bgm.tv 的图片
  let parsedTarget: URL
  try {
    parsedTarget = new URL(targetUrl)
  } catch {
    return new Response('Invalid "url" parameter', {
      status: 400,
      headers: corsHeaders,
    })
  }
  if (parsedTarget.hostname !== ALLOWED_IMAGE_HOST) {
    return new Response(
      `Forbidden: only ${ALLOWED_IMAGE_HOST} allowed, got "${parsedTarget.hostname}"`,
      {
        status: 403,
        headers: corsHeaders,
      },
    )
  }

  try {
    // 直接 fetch lain.bgm.tv 原图
    // lain.bgm.tv 也在 Cloudflare 上，CF-to-CF 通信不会被 wsrv.nl 那样的黑名单拦截
    // 响应会原样转发给浏览器（CF Pages Function 在 CF 节点间传输）
    const response = await fetch(targetUrl, {
      headers: {
        // 用浏览器 UA 避免 lain.bgm.tv 端 CF 误判
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      return new Response(`Upstream ${ALLOWED_IMAGE_HOST} returned ${response.status}`, {
        status: response.status,
        headers: corsHeaders,
      })
    }

    // 复制响应内容
    const newResponse = new Response(response.body, response)
    for (const [k, v] of Object.entries(corsHeaders)) {
      newResponse.headers.set(k, v)
    }
    // 30 天边缘缓存
    newResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}, immutable`)

    return newResponse
  } catch (err) {
    console.error('[Img Proxy Error]', err instanceof Error ? err.message : String(err))
    return new Response('图片代理暂时不可用，请稍后重试', {
      status: 502,
      headers: corsHeaders,
    })
  }
}
