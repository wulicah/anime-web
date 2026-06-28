<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useQuery } from '@/composables/useQuery'
import { bangumiApi } from '@/api/bangumi'
import { platformName, broadcastChannels } from '@/api/platforms'
import { proxyBangumiImage } from '@/composables/useImage'
import { useLibraryStore } from '@/stores/library'
import SkeletonList from '@/components/common/SkeletonList.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import StatusPicker from '@/components/library/StatusPicker.vue'
import RatingStars from '@/components/library/RatingStars.vue'
import type { LibraryStatus } from '@/db'

const route = useRoute()
const library = useLibraryStore()
const id = computed(() => Number(route.params.id))

onMounted(() => library.load())

const { data: anime, status, error, refresh } = useQuery({
  key: () => `anime-${id.value}`,
  query: () => bangumiApi.anime(id.value),
  staleTime: 1000 * 60 * 60 * 24,
})

const local = computed(() => library.getByAnimeId(id.value).value)

const name = computed(() => anime.value?.name_cn || anime.value?.name || local.value?.name || '...')
const nameOriginal = computed(() => anime.value?.name || '')
const cover = computed(() =>
  proxyBangumiImage(
    anime.value?.images?.large || anime.value?.images?.common || local.value?.image || '',
  ),
)
const score = computed(() => anime.value?.rating?.score?.toFixed(1))
const eps = computed(() => anime.value?.total_episodes || anime.value?.eps || 0)
const airdate = computed(() => {
  const a = anime.value as any
  return a?.air_date?.replace(/-/g, '.') || a?.date?.replace(/-/g, '.') || '未定'
})

/**
 * 平台显示
 * - 优先：infobox 里的"放送"频道（TOKYO MX、BS11 这样的全名）
 * - 兜底：platform 字段（"TV"/"WEB" 简写）
 */
const platforms = computed(() => {
  const a = anime.value
  if (!a) return [] as string[]
  const channels = broadcastChannels(a.infobox)
  if (channels.length) return channels
  return a.platform ? [platformName(a.platform)] : []
})

/** 平台类型简写（"TV"/"WEB"），用于"网络播放"标签 */
const platformType = computed(() => {
  const p = anime.value?.platform
  return p ? platformName(p) : ''
})

const tags = computed(() => anime.value?.tags ?? [])
const status_ = computed<LibraryStatus>(() => local.value?.status ?? 'none')

/** 简介（Bangumi 只有中文） */
const summary = computed(() => anime.value?.summary?.trim() || '')

/** 制作人员表（前 5 条） */
const crew = computed<{ key: string; value: string }[]>(() => {
  if (!anime.value?.infobox) return []
  const out: { key: string; value: string }[] = []
  for (const row of anime.value.infobox) {
    if (out.length >= 6) break
    let val: string = ''
    if (typeof row.value === 'string') val = row.value
    else if (Array.isArray(row.value)) val = row.value.map((v) => v.v).join(' / ')
    if (!val || val.length > 200) continue
    if (row.key === '放送' || row.key === '首播' || row.key === '平台' || row.key === '播放') continue
    out.push({ key: row.key, value: val })
  }
  return out
})

async function changeStatus(s: LibraryStatus) {
  await library.setStatus(id.value, s)
}

async function changeRating(n: number | null) {
  await library.setRating(id.value, n)
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-10">
    <RouterLink to="/" class="text-xs text-fg-muted hover:text-fg transition-colors mb-6 inline-block">
      ← 返回
    </RouterLink>

    <SkeletonList v-if="status === 'loading'" :count="1" />
    <ErrorState
      v-else-if="status === 'error'"
      :message="error?.message || '加载失败'"
      @retry="refresh"
    />

    <article v-else-if="anime || local">
      <!-- 信息头部 -->
      <div class="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 md:gap-10">
        <div class="aspect-[5/7] overflow-hidden bg-bg-elevated">
          <img v-if="cover" :src="cover" :alt="name" class="h-full w-full object-cover" />
        </div>
        <div>
          <h1 class="title-display text-3xl md:text-5xl mb-2">{{ name }}</h1>
          <p v-if="nameOriginal && nameOriginal !== name" class="text-sm text-fg-muted mb-4 font-mono">
            {{ nameOriginal }}
          </p>

          <dl class="grid grid-cols-2 gap-y-3 gap-x-6 text-sm mb-6">
            <div>
              <dt class="text-fg-muted text-xs uppercase tracking-wider mb-0.5">集数</dt>
              <dd class="font-mono">{{ eps || '—' }}</dd>
            </div>
            <div>
              <dt class="text-fg-muted text-xs uppercase tracking-wider mb-0.5">首播</dt>
              <dd class="font-mono">{{ airdate }}</dd>
            </div>
            <div>
              <dt class="text-fg-muted text-xs uppercase tracking-wider mb-0.5">Bangumi 评分</dt>
              <dd v-if="score" class="font-mono text-accent">★ {{ score }}</dd>
              <dd v-else class="text-fg-muted">暂无评分</dd>
            </div>
            <div v-if="anime?.rank">
              <dt class="text-fg-muted text-xs uppercase tracking-wider mb-0.5">排名</dt>
              <dd class="font-mono">#{{ anime.rank }}</dd>
            </div>
          </dl>

          <!-- 平台 -->
          <div v-if="platforms.length" class="mb-6">
            <p class="text-xs uppercase tracking-wider text-fg-muted mb-2">播出平台</p>
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="platformType"
                class="text-xs px-2.5 py-1 border border-accent/40 text-accent bg-accent/5"
              >{{ platformType }}</span>
              <span
                v-for="p in platforms"
                :key="p"
                class="text-xs px-2.5 py-1 border border-border bg-bg-elevated"
              >{{ p }}</span>
            </div>
          </div>

          <!-- 个人操作区 -->
          <div class="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
            <StatusPicker :status="status_" @change="changeStatus" />
            <div v-if="status_ !== 'none'" class="flex items-center gap-3">
              <span class="text-xs text-fg-muted">我的评分</span>
              <RatingStars :model-value="local?.rating ?? null" @update:model-value="changeRating" />
            </div>
            <div v-if="local?.rating" class="flex items-center gap-2 text-xs text-fg-muted">
              <span>已评</span>
              <span class="text-accent font-mono">★ {{ local.rating }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 简介 -->
      <section v-if="anime" class="mt-10">
        <h2 class="text-sm uppercase tracking-widest text-fg-muted mb-3">简介</h2>
        <p v-if="summary" class="text-sm leading-7 whitespace-pre-line">{{ summary }}</p>
        <p v-else class="text-sm leading-7 text-fg-muted">暂无简介</p>
      </section>

      <!-- 制作人员表 -->
      <section v-if="crew.length" class="mt-10">
        <h2 class="text-sm uppercase tracking-widest text-fg-muted mb-3">制作人员</h2>
        <dl class="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <template v-for="(row, idx) in crew" :key="idx">
            <dt class="text-fg-muted text-xs uppercase tracking-wider whitespace-nowrap pt-0.5">{{ row.key }}</dt>
            <dd class="text-ellipsis text-fg">{{ row.value }}</dd>
          </template>
        </dl>
      </section>

      <!-- 标签 -->
      <section v-if="tags.length" class="mt-10">
        <h2 class="text-sm uppercase tracking-widest text-fg-muted mb-3">标签</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="t in tags.slice(0, 12)"
            :key="t.name"
            class="text-xs px-2.5 py-1 border border-border text-fg-muted bg-bg-elevated"
          >
            {{ t.name }} <span class="text-2xs text-fg-muted/60">{{ t.count }}</span>
          </span>
        </div>
      </section>
    </article>
  </div>
</template>
