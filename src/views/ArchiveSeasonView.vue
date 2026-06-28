<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useQuery } from '@/composables/useQuery'
import { bangumiApi } from '@/api/bangumi'
import AnimeCard from '@/components/anime/AnimeCard.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { Season } from '@/data/seasonMeta'
import type { BangumiListItem } from '@/api/types'

const route = useRoute()
const year = computed(() => Number(route.params.year))
const season = computed<Season>(() => String(route.params.season) as Season)

const monthRange = computed(() => {
  const m: Record<Season, [number, number]> = {
    Winter: [1, 3], Spring: [4, 6], Summer: [7, 9], Autumn: [10, 12],
  }
  return m[season.value] ?? [1, 3]
})

const dateLabel = computed(() => {
  const [sm, em] = monthRange.value
  return `${year.value}-${String(sm).padStart(2, '0')} — ${year.value}-${String(em).padStart(2, '0')}`
})

/** 已加载的月份列表（用于显示进度） */
const loadedMonths = ref<number[]>([])

/** 增量数据：每月份单独累积，UI 先渲染已返回的月份 */
const incrementalData = ref<BangumiListItem[]>([])

const { data, status, error, refresh } = useQuery<BangumiListItem[]>({
  key: () => `archive-${year.value}-${season.value}`,
  query: () =>
    bangumiApi.searchBySeason(
      year.value,
      monthRange.value[0],
      monthRange.value[1],
      (monthData, month) => {
        // 每月份回来就追加到 incrementalData（去重）
        const seen = new Set(incrementalData.value.map((a) => a.id))
        const newItems = monthData.filter((a) => !seen.has(a.id))
        incrementalData.value = [...incrementalData.value, ...newItems]
        loadedMonths.value = [...loadedMonths.value, month].sort((a, b) => a - b)
      },
    ),
  // 归档季度数据不变，缓存 30 天
  staleTime: 1000 * 60 * 60 * 24 * 30,
})

// 最终数据：useQuery 完成后用 data（已去重排序），过程中用 incrementalData
const items = computed<BangumiListItem[]>(() => {
  if (data.value && data.value.length) return data.value
  return incrementalData.value
})

// 路由切换时重置增量状态
watch(
  () => `${year.value}-${season.value}`,
  () => {
    incrementalData.value = []
    loadedMonths.value = []
  },
)
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
    <RouterLink
      to="/archive"
      class="text-xs text-fg-muted hover:text-fg transition-colors mb-6 inline-block"
    >
      ← 返回归档
    </RouterLink>

    <header class="mb-8">
      <h1 class="title-display text-4xl md:text-6xl mb-2">
        {{ year }} · {{ season }}
      </h1>
      <p class="text-sm text-fg-muted font-mono">
        {{ dateLabel }} · 共 {{ items.length }} 部
        <span v-if="status === 'loading' && loadedMonths.length" class="ml-2 text-accent">
          · 已加载 {{ loadedMonths.length }}/3 月
        </span>
      </p>
    </header>

    <SkeletonList v-if="status === 'loading' && !items.length" :count="8" />
    <ErrorState
      v-else-if="status === 'error'"
      :message="error?.message || '加载失败'"
      @retry="refresh"
    />
    <EmptyState
      v-else-if="status !== 'loading' && !items.length"
      title="该季度没有数据"
      description="可能是 Bangumi 未收录，或 API 暂时不可用。"
    />
    <template v-else>
      <ul class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        <li v-for="anime in items" :key="anime.id">
          <AnimeCard :anime="anime" layout="grid" />
        </li>
      </ul>
      <div v-if="status === 'loading'" class="py-6 text-center">
        <span class="text-2xs text-fg-muted/50 font-mono">
          加载其他月份中… ({{ loadedMonths.length }}/3)
        </span>
      </div>
    </template>
  </div>
</template>
