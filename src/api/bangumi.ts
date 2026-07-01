import type {
  BangumiCalendar,
  BangumiSearchResponse,
  BangumiSubject,
  BangumiListItem,
  BangumiEpisode,
} from './types'

// dev / prod 统一走相对路径 /api/bgm
//   - dev: Vite proxy 转发
//   - prod: Cloudflare Pages Functions 转发（节点在国内可达，避免直连 workers.dev 被墙）
// 设置 VITE_BANGUMI_BASE_URL 可覆盖默认路径
const BASE_URL = (import.meta.env.VITE_BANGUMI_BASE_URL as string) || '/api/bgm'

/**
 * 通用 fetcher：处理 JSON 解析、错误抛出、UA 头、超时重试
 * - UA：Bangumi API 强制要求 User-Agent 头，否则 403
 * - 错误统一抛出，前端 catch 后展示
 * - 失败自动重试 1 次（解决网络瞬时抖动）
 * - 请求去重：同 URL 并发只发一次（避免归档页同时点开多个）
 */
const inFlight = new Map<string, Promise<unknown>>()

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  // 请求去重：相同 URL + method + body 在飞中复用 Promise（POST 搜索需区分不同关键词）
  const inflightKey = `${init?.method || 'GET'} ${url} ${init?.body || ''}`
  const existing = inFlight.get(inflightKey) as Promise<T> | undefined
  if (existing) return existing

  const promise = doFetch<T>(url, init)
  inFlight.set(inflightKey, promise)
  try {
    return await promise
  } finally {
    // 请求完成后从 inFlight 移除（让下次能重新发请求，配合 useQuery 缓存）
    inFlight.delete(inflightKey)
  }
}

async function doFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const fullUrl = `${BASE_URL}${url}`
  const doFetch = async (): Promise<Response> => {
    const controller = new AbortController()
    // 8s 超时：原 15s 太长，首屏用户等待 15s 已经放弃
    // 8s 足够 Bangumi API + CF Pages 代理链路（实测 P95 < 5s）
    // 配合下方重试 1 次，总等待最长 ~16s，比原 30s 体验好
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      return await fetch(fullUrl, {
        ...init,
        signal: controller.signal,
        // Bangumi API 要求 User-Agent 头，由代理层（Pages Functions / Vite proxy）处理
        headers: {
          Accept: 'application/json',
          ...(init?.headers || {}),
        },
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  let lastErr: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await doFetch()
      if (!res.ok) {
        if (res.status === 404) throw new Error('资源不存在')
        if (res.status === 429) throw new Error('请求过于频繁，请稍后再试')
        if (res.status === 502) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message || 'API 代理错误（502），请检查 .env 的 VITE_BANGUMI_BASE_URL')
        }
        throw new Error(`请求失败: ${res.status} ${res.statusText}`)
      }
      return res.json() as Promise<T>
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      // 重试一次（仅对网络错误/超时）
      if (attempt === 0 && (e instanceof TypeError || (e as any)?.name === 'AbortError')) {
        console.warn(`[Fetcher] ${url} 失败，重试 1 次:`, lastErr.message)
        continue
      }
      throw lastErr
    }
  }
  throw lastErr!
}

/**
 * Bangumi 公开 API 封装
 * @see https://bangumi.github.io/api/
 */
export const bangumiApi = {
  /**
   * 获取每日新番（按周几分组）
   */
  calendar: () => fetcher<BangumiCalendar[]>('/calendar'),

  /**
   * 获取番剧详情
   */
  anime: (id: number) => fetcher<BangumiSubject>(`/v0/subjects/${id}`),

  /**
   * 搜索番剧
   * - 端点：`POST /v0/search/subjects`（GET 该端点不存在，会返回 404 默认响应）
   * - 请求体：`{ keyword, filter: { type: [2] }, size, offset }`，type=2 表示动画
   * - 支持中文子串匹配，如搜"超市"/"吸烟"可命中"在超市后门吸烟的二人"
   */
  search: (keyword: string, limit = 20, offset = 0) =>
    fetcher<BangumiSearchResponse>('/v0/search/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword,
        filter: { type: [2] },
        size: limit,
        offset,
      }),
    }),

  /**
   * 按月份浏览番剧
   * - 端点：`GET /v0/subjects?type=2&year=YYYY&month=M&sort=date&limit=50`
   * - 返回的字段名是 `date` 而非 `air_date`，platform 是 string
   */
  browseSubjects: (params: { type?: number; year: number; month: number; sort?: 'date' | 'rank'; limit?: number }) => {
    const q = new URLSearchParams({
      type: String(params.type ?? 2),
      year: String(params.year),
      month: String(params.month),
      sort: params.sort ?? 'date',
      limit: String(params.limit ?? 50),
    })
    return fetcher<{ total: number; limit: number; offset: number; data: BangumiListItem[] }>(
      `/v0/subjects?${q.toString()}`,
    )
  },

  /**
   * 按季度查找番剧（拼接 3 个月数据 + 去重 + 排序）
   * - 用于"归档"页
   * - 增量加载：onMonthLoaded 回调让 UI 先渲染首月数据
   * - 3 个月并行请求，谁先回来谁先回调
   */
  searchBySeason: async (
    year: number,
    startMonth: number,
    endMonth: number,
    onMonthLoaded?: (monthData: BangumiListItem[], month: number) => void,
  ): Promise<BangumiListItem[]> => {
    const promises: Promise<{ data: BangumiListItem[]; month: number }>[] = []
    for (let m = startMonth; m <= endMonth; m++) {
      promises.push(
        bangumiApi
          .browseSubjects({ year, month: m, sort: 'date', limit: 50 })
          .then((r) => ({ data: r.data, month: m })),
      )
    }

    // 谁先回来先回调，UI 可以增量渲染
    if (onMonthLoaded) {
      promises.forEach((p) =>
        p.then((r) => onMonthLoaded(r.data, r.month)).catch(() => {}),
      )
    }

    const results = await Promise.all(promises)
    const seen = new Set<number>()
    return results
      .flatMap((r) => r.data)
      .filter((a) => (seen.has(a.id) ? false : seen.add(a.id)))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  },

  /**
   * 获取剧集列表
   */
  episodes: (id: number, limit = 100) =>
    fetcher<{ total: number; data: BangumiEpisode[] }>(`/v0/subjects/${id}/episodes?limit=${limit}`),
}
