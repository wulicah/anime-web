/**
 * 季度元信息 + 维护工具
 *
 * 设计思路：
 * - Bangumi calendar API 只返回"在播季度"的番剧，且有时数据不全
 * - 我们支持两种数据源：
 *   1. 用户维护的静态数据 public/data/seasons.json（用于未来季度、补充缺失）
 *   2. Bangumi calendar API（兜底）
 * - 静态数据优先；命中后不再请求 API
 */

import dayjs from 'dayjs'

export type Season = 'Winter' | 'Spring' | 'Summer' | 'Autumn'

/** 季度起止月份（0-indexed） */
const SEASON_MONTHS: Record<Season, [number, number]> = {
  Winter: [0, 2],   // 1-3 月
  Spring: [3, 5],   // 4-6 月
  Summer: [6, 8],   // 7-9 月
  Autumn: [9, 11],  // 10-12 月
}

/** 根据日期算出当前是哪个季度 */
export function getCurrentSeason(date = dayjs()): { year: number; season: Season } {
  const m = date.month()
  const y = date.year()
  let season: Season = 'Winter'
  if (m >= 0 && m <= 2) season = 'Winter'
  else if (m >= 3 && m <= 5) season = 'Spring'
  else if (m >= 6 && m <= 8) season = 'Summer'
  else season = 'Autumn'
  return { year: y, season }
}

/** 季度 key，如 "2026-Summer" */
export function seasonKey(year: number, season: Season): string {
  return `${year}-${season}`
}

/** 季度起止日期 */
export function seasonDateRange(year: number, season: Season): { start: string; end: string } {
  const [sm, em] = SEASON_MONTHS[season]
  const start = dayjs(new Date(year, sm, 1)).format('YYYY-MM-DD')
  const end = dayjs(new Date(year, em + 1, 0)).format('YYYY-MM-DD')
  return { start, end }
}

/** 下一季 + 开播日 */
export function nextSeasonInfo(date = dayjs()): { year: number; season: Season; startDate: string; daysUntil: number } {
  const cur = getCurrentSeason(date)
  const [sm] = SEASON_MONTHS[cur.season]
  const nextStart = dayjs(new Date(cur.year, sm + 3, 1))
  const daysUntil = nextStart.diff(date, 'day')
  // 季度切换逻辑（4 季度循环）
  const order: Season[] = ['Winter', 'Spring', 'Summer', 'Autumn']
  const idx = order.indexOf(cur.season)
  const nextSeason = order[(idx + 1) % 4]
  const nextYear = idx === 3 ? cur.year + 1 : cur.year
  return { year: nextYear, season: nextSeason, startDate: nextStart.format('YYYY-MM-DD'), daysUntil }
}
