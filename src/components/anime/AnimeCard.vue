<script setup lang="ts">
import { RouterLink } from 'vue-router'
import LazyImage from '@/components/common/LazyImage.vue'
import { proxyBangumiImage } from '@/composables/useImage'

/** 通用 Anime 数据（同 AnimeCell） */
type Item = {
  id: number
  name: string
  name_cn?: string
  images?: { large: string; common: string; medium: string; small: string; grid: string }
  platform?: string | string[]
  meta_tags?: string[]
  air_date?: string
  date?: string
  infobox?: { key: string; value: string | { v: string }[] }[]
  tags?: { name: string; count: number; total_cont?: number }[]
  total_episodes?: number
  eps?: number
  rating?: { score: number; total?: number; rank?: number }
}

defineProps<{
  anime: Item
  layout?: 'list' | 'grid'
}>()

const displayName = (a: Item) => a.name_cn || a.name
const cover = (a: Item) =>
  a.images?.common || a.images?.medium || a.images?.large || a.images?.grid || a.images?.small || ''

const airdate = (a: Item) => (a.air_date || a.date || '').replace(/-/g, '.') || '未定'
const score = (a: Item) => a.rating?.score?.toFixed(1)

const PLATFORM_MAP: Record<string, string> = {
  T: 'TV', TV: 'TV',
  W: 'Web', WEB: 'Web', Web: 'Web',
  O: 'OVA', OVA: 'OVA',
  M: 'Movie', MOVIE: 'Movie',
}
function platformName(s: string): string {
  return PLATFORM_MAP[s.toUpperCase()] || s
}
function displayPlatforms(a: Item): string[] {
  if (Array.isArray(a.platform)) return a.platform.map(platformName)
  if (typeof a.platform === 'string') return [platformName(a.platform)]
  return (a.meta_tags || [])
    .filter((t) => /^(TV|WEB|OVA|MOVIE|MOV|M|其他|欧美|港台)$/i.test(t))
    .map(platformName)
}

const TOPIC_KEYS = new Set(['原创', '漫画改', '小说改', '游戏改', '布袋戏', '动态漫画', '网络动画', '泡面番', '其他'])
function displayTopics(a: Item): string[] {
  return (a.meta_tags || []).filter((t) => TOPIC_KEYS.has(t))
}

const INFOBOX_KEYS: Record<string, string> = {
  '导演': '监督', '监督': '监督', '脚本': '脚本', '系列构成': '系列构成',
  '动画制作': '动画制作', '制作': '动画制作',
  '首播': '首播', '开播': '首播', '放送': '首播', '开始': '首播',
  '声优': 'CV', '主演': 'CV', '主演声优': 'CV',
}

interface CrewRow { key: string; value: string }
/**
 * 需要跳过的冗余 infobox 字段（raw key）
 * - 中文名：与上方主标题（name_cn）完全重复
 * - 首播/开播/放送/开始：会被映射为「首播」，与下方「放送开始」字段重复
 *   （「放送开始」不在该集合中，会保留显示）
 */
const SKIP_INFOBOX_KEYS = new Set(['中文名', '首播', '开播', '放送', '开始'])

function crewInfo(a: Item): CrewRow[] {
  if (!a.infobox || !Array.isArray(a.infobox)) return []
  const result: CrewRow[] = []
  for (const row of a.infobox) {
    // 跳过冗余字段：中文名、首播及其变体
    if (SKIP_INFOBOX_KEYS.has(row.key)) continue
    const label = INFOBOX_KEYS[row.key] || row.key
    let val: string = ''
    if (typeof row.value === 'string') val = row.value
    else if (Array.isArray(row.value)) val = row.value.map((v) => v.v).join(' / ')
    if (val && val.length < 200) result.push({ key: label, value: val })
    if (result.length >= 5) break
  }
  return result
}
</script>

<template>
  <RouterLink
    :to="`/anime/${anime.id}`"
    class="group block transition-colors"
  >
    <!-- 网格模式：竖排封面卡 -->
    <article
      v-if="layout === 'grid'"
      class="flex flex-col"
      style="contain: content"
    >
      <div class="relative aspect-[5/7] overflow-hidden bg-bg-elevated">
        <LazyImage
          v-if="cover(anime)"
          :src="cover(anime)"
          :srcset-img="anime.images"
          :alt="displayName(anime)"
          :width="200"
          layout="grid"
        />
        <div
          v-if="displayPlatforms(anime).length"
          class="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        >
          <div class="flex flex-wrap gap-1">
            <span
              v-for="p in displayPlatforms(anime).slice(0, 3)"
              :key="p"
              class="text-2xs px-1.5 py-0.5 bg-white/15 text-white backdrop-blur-sm"
            >{{ p }}</span>
          </div>
        </div>
      </div>
      <div class="pt-2">
        <h3 class="text-xs font-medium text-ellipsis-2 leading-snug group-hover:text-accent transition-colors min-h-[2.5em]">
          {{ displayName(anime) }}
        </h3>
        <div class="mt-1 flex items-center gap-2 text-2xs text-fg-muted font-mono">
          <span>{{ airdate(anime) }}</span>
          <span v-if="score(anime)" class="text-accent">★ {{ score(anime) }}</span>
        </div>
      </div>
    </article>

    <!-- 列表模式：左封面右详情 -->
    <article
      v-else
      class="flex gap-3 py-2 hover:bg-bg-elevated/30 transition-colors -mx-2 px-2"
      style="contain: content"
    >
      <div class="shrink-0 w-24 sm:w-28 aspect-[5/7] overflow-hidden bg-bg-elevated">
        <LazyImage
          v-if="cover(anime)"
          :src="cover(anime)"
          :srcset-img="anime.images"
          :alt="displayName(anime)"
          :width="160"
          layout="list"
          fit="contain"
        />
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="text-sm sm:text-base font-medium text-ellipsis-2 leading-snug group-hover:text-accent transition-colors">
          {{ displayName(anime) }}
        </h3>
        <p v-if="anime.name && anime.name_cn && anime.name !== anime.name_cn" class="text-2xs text-fg-muted font-mono mt-0.5">
          {{ anime.name }}
        </p>
        <div class="mt-1 flex items-center flex-wrap gap-x-3 gap-y-1 text-2xs text-fg-muted">
          <span v-if="anime.eps || anime.total_episodes" class="font-mono">全 {{ anime.eps || anime.total_episodes }} 集</span>
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            v-for="p in displayPlatforms(anime)"
            :key="`p-${p}`"
            class="text-2xs px-1.5 py-0.5 border border-border text-fg-muted"
          >{{ p }}</span>
          <span
            v-for="t in displayTopics(anime)"
            :key="`t-${t}`"
            class="text-2xs px-1.5 py-0.5 text-accent/80 bg-accent/5 border border-accent/20"
          >{{ t }}</span>
          <span
            v-if="score(anime)"
            class="text-2xs text-accent font-mono ml-auto"
          >★ {{ score(anime) }}</span>
        </div>
        <dl v-if="crewInfo(anime).length" class="mt-1 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-2xs">
          <template v-for="(row, idx) in crewInfo(anime).slice(0, 4)" :key="idx">
            <dt class="text-fg-muted/70 whitespace-nowrap">{{ row.key }}</dt>
            <dd class="text-fg-muted text-ellipsis">{{ row.value }}</dd>
          </template>
        </dl>
      </div>
    </article>
  </RouterLink>
</template>
