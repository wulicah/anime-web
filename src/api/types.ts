/**
 * Bangumi.tv API 类型定义
 * @see https://bangumi.github.io/api/
 */

/**
 * 番剧详情（`GET /v0/subjects/{id}` 端点）
 * - platform 是 string（"TV"/"WEB"/"OVA"/"Movie" 等简写）
 * - 详细播出频道在 infobox[] 的 "放送" 条目里（string[]，如 ["TOKYO MX", "BS11"]）
 * - summary 只有中文，没有日文版（yuc.wiki 的日文是站长手写）
 */
export interface BangumiSubject {
  id: number
  type: SubjectType
  name: string
  name_cn: string
  summary: string
  air_date: string
  air_weekday: number
  rating: { total: number; score: number; count: { [key: string]: number } }
  rank: number
  images: { large: string; common: string; medium: string; small: string; grid: string }
  collection: { wish: number; collect: number; doing: number; on_hold: number; dropped: number }
  tags: { name: string; count: number }[]
  eps: number
  volumes: number
  series: boolean
  /** 平台简写（"TV"/"WEB"），详细频道在 infobox */
  platform: string
  total_episodes: number
  /** 制作人员表 + 详细放送频道 */
  infobox: { key: string; value: string | { v: string }[] }[]
}

export type SubjectType = 1 | 2 | 3 | 4 | 6
// 1=书籍 2=动画 3=音乐 4=游戏 6=三次元

/**
 * 番剧列表项（`GET /v0/subjects?year=&month=` 端点）
 * - platform 是 string（简写如 "TV" "WEB" "OVA" "其他"）
 * - meta_tags 是 string[] 数组
 * - 字段名是 `date` 而非 `air_date`
 * - **infobox** 是 {key, value}[]，即"制作人员表"（导演、脚本、动画制作、放送等）
 */
export interface BangumiListItem {
  id: number
  type: SubjectType
  name: string
  name_cn: string
  summary: string
  date: string
  rating: { rank: number; total: number; count: { [key: string]: number }; score: number }
  rank: number
  images: BangumiSubject['images']
  collection: BangumiSubject['collection']
  tags: { name: string; count: number; total_cont: number }[]
  eps: number
  volumes: number
  series: boolean
  /** 平台简写 */
  platform: string
  /** 简化标签数组 */
  meta_tags: string[]
  /** 制作人员表（导演、动画制作、放送等） */
  infobox: { key: string; value: string | { v: string }[] }[]
  total_episodes: number
  locked: boolean
  nsfw: boolean
}

/** Calendar 每日新番（`GET /calendar` 端点）— 只有 id/name/name_cn/air_weekday/images */
export interface BangumiCalendarItem {
  id: number
  name: string
  name_cn: string
  air_weekday: number
  images: BangumiSubject['images']
}

export interface BangumiCalendar {
  weekday: { en: string; cn: string; ja: string; id: number }
  items: BangumiCalendarItem[]
}

/** 搜索结果（`POST /v0/search/subjects` 响应体） */
export interface BangumiSearchResponse {
  total: number
  limit: number
  offset: number
  data: BangumiListItem[]
}

/** 剧集 */
export interface BangumiEpisode {
  id: number
  type: number
  name: string
  name_cn: string
  sort: number
  airdate: string
  duration: string
  ep: number | null
  subject_id: number
  comment: number
  desc: string
}
