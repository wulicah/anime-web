/**
 * Bangumi 图片源工具
 *
 * 国内访问 lain.bgm.tv 被墙/超慢，需要代理：
 * - dev：vite proxy 转发（默认 wsrv.nl，专业图片代理，CDN 缓存）
 * - prod：Cloudflare Pages Functions（functions/img.ts），边缘缓存 30 天
 *
 * URL 格式：
 * - 原：https://lain.bgm.tv/pic/cover/l/3c/36/570584_9w55f.jpg
 * - 代理：/img?url=https%3A%2F%2Flain.bgm.tv%2F...%2F570584_9w55f.jpg&w=400&output=webp&q=70
 */

export interface ImageSet {
  small: string
  grid: string
  common: string
  medium: string
  large: string
}

/**
 * 图片代理路径前缀（相对路径）
 * - dev：vite proxy 转发到 wsrv.nl 或 Cloudflare Worker
 * - prod：部署平台 rewrites 转发
 * 不直连代理域名，避免被墙
 */
const IMG_PREFIX = '/img'

/**
 * 把 Bangumi 图片 URL 转成代理 URL
 * - 用相对路径 /img，由 dev proxy / prod rewrites 转发
 * - wsrv.nl 用 ?w=N 动态出图，比 Bangumi 自带的 /r/N/ 灵活
 * - 已经是代理 URL / data: / blob: 的不重复转
 *
 * URL 格式：
 * - 原：https://lain.bgm.tv/pic/cover/l/3c/36/570584_9w55f.jpg
 * - 代理：/img?url=https%3A%2F%2Flain.bgm.tv%2Fpic%2Fcover%2Fl%2F3c%2F36%2F570584_9w55f.jpg&w=400
 */
function proxyImage(url: string | undefined | null, size = 400): string {
  if (!url) return ''
  // 已经是代理 URL / data: / blob: 不处理
  if (url.startsWith(IMG_PREFIX) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  // 只代理 lain.bgm.tv 域名
  if (!url.startsWith('http://lain.bgm.tv') && !url.startsWith('https://lain.bgm.tv')) {
    return url
  }
  // 升级到 https
  const https = url.replace(/^http:\/\//, 'https://')
  // 用 Bangumi CDN /r/N/ 路径前缀做服务端缩放（原图 938KB → /r/200/ 仅 16KB）
  // 先去掉已有的 /r/N/ 前缀（如有），再插入新的 size
  const baseUrl = https.replace(/^(https:\/\/lain\.bgm\.tv\/)r\/\d+\//, '$1')
  const resized = baseUrl.replace(/^(https:\/\/lain\.bgm\.tv\/)/, `$1r/${size}/`)
  return `${IMG_PREFIX}?url=${encodeURIComponent(resized)}&w=${size}&output=webp&q=70`
}

/** 构建 srcset 字符串（用于 <img srcset>） */
export function buildSrcset(img: ImageSet | undefined): string | undefined {
  if (!img) return undefined
  if (!img.large) return undefined
  // 精简为 3 档：list 容器最大 96px、grid 最大约 200px，2x DPR 下 400px 已足够
  // 避免生成 800w/1200w 触发浏览器按 100vw 选图时下载过多大图
  return [
    `${proxyImage(img.large, 200)} 200w`,
    `${proxyImage(img.large, 400)} 400w`,
    `${proxyImage(img.large, 600)} 600w`,
  ].join(', ')
}

/**
 * 选最佳 url（带代理）
 * - 移动端 1x → 400w
 * - 移动端 2x → 800w
 * - 桌面端 → 1200w
 */
export function pickBest(
  img: ImageSet | undefined,
  options: { dpr?: number; isMobile?: boolean } = {},
): string {
  if (!img) return ''
  const { dpr = 1, isMobile = true } = options
  let chosen: string
  let size = 400
  if (dpr <= 1) {
    chosen = img.large || img.common || img.medium || img.small || ''
    size = 400
  } else if (dpr <= 2) {
    chosen = img.large || img.common || img.medium || ''
    size = isMobile ? 600 : 800
  } else {
    chosen = img.large || img.common || ''
    size = 1200
  }
  return proxyImage(chosen, size)
}

/** 直接代理一个 URL（用于详情页大图、列表小图） */
export function proxyBangumiImage(url: string | undefined | null, size = 600): string {
  // 详情页大图用 600 宽（足够清晰，不会太大）
  // 列表用 200-300 宽，Grid 卡片用 200 宽
  return proxyImage(url, size)
}

/** 加载图片直到 onload（用于预加载） */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = proxyImage(url, 400)
  })
}
