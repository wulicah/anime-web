/**
 * Bangumi 平台字段名 → 中文/全名映射
 * - API 返回的 platform 是简写 "TV" "WEB" "OVA" "Movie" "其他"
 * - 我们展示得更友好
 */
const PLATFORM_NAME: Record<string, string> = {
  TV: '电视播出',
  WEB: '网络播出',
  OVA: 'OVA',
  OAD: 'OAD',
  MOVIE: '剧场版',
  MOV: '剧场版',
  ONA: '网络动画',
  OTHER: '其他',
  其他: '其他',
  欧美: '欧美',
  日文: '日文',
  港台: '港台',
}

/** 把简写平台名转友好显示 */
export function platformName(s: string): string {
  if (!s) return ''
  return PLATFORM_NAME[s.toUpperCase()] ?? PLATFORM_NAME[s] ?? s
}

/**
 * 从 Bangumi subject 的 infobox 里提取"放送"频道数组
 * - 端点：`/v0/subjects/{id}` 返回的 infobox[] 里有"放送"条目
 * - 形如：{ key: "放送", value: [{ v: "TOKYO MX" }, { v: "BS11" }, ...] }
 * - 兼容 value 是 string 或 array 两种情况
 */
export function broadcastChannels(
  infobox: { key: string; value: string | { v: string }[] }[] | undefined,
): string[] {
  if (!infobox || !Array.isArray(infobox)) return []
  const row = infobox.find(
    (r) => r.key === '放送' || r.key === '首播' || r.key === '平台' || r.key === '播放',
  )
  if (!row) return []
  if (typeof row.value === 'string') return row.value ? [row.value] : []
  if (Array.isArray(row.value)) return row.value.map((v) => v.v).filter(Boolean)
  return []
}
