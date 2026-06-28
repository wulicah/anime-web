<script setup lang="ts">
import { ref, computed } from 'vue'
import AnimeCard from '@/components/anime/AnimeCard.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { useQuery } from '@/composables/useQuery'
import { bangumiApi } from '@/api/bangumi'
import type { BangumiCalendarItem } from '@/api/types'

const activeDay = ref(new Date().getDay()) // 默认今天
const { data, status, error, refresh } = useQuery({
  key: 'schedule-calendar',
  query: () => bangumiApi.calendar(),
  staleTime: 1000 * 60 * 60 * 6,
})

const dayItems = computed<BangumiCalendarItem[]>(() => {
  return data.value?.find((c) => c.weekday.id === activeDay.value)?.items ?? []
})

const weekdays = [
  { id: 0, label: '周日' },
  { id: 1, label: '周一' },
  { id: 2, label: '周二' },
  { id: 3, label: '周三' },
  { id: 4, label: '周四' },
  { id: 5, label: '周五' },
  { id: 6, label: '周六' },
]
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
    <header class="mb-6">
      <h1 class="title-display text-3xl md:text-4xl mb-2">新番时间表</h1>
      <p class="text-sm text-fg-muted">按星期分组的本季度新番一览</p>
    </header>

    <!-- 周维度切换 -->
    <div role="tablist" class="mb-6 flex flex-wrap gap-1 border-b border-border">
      <button
        v-for="d in weekdays"
        :key="d.id"
        role="tab"
        :aria-selected="d.id === activeDay"
        class="px-4 py-2 text-sm transition-colors relative"
        :class="d.id === activeDay ? 'text-accent' : 'text-fg-muted hover:text-fg'"
        @click="activeDay = d.id"
      >
        {{ d.label }}
        <span
          v-if="d.id === activeDay"
          class="absolute -bottom-px left-2 right-2 h-px bg-accent"
        />
      </button>
    </div>

    <SkeletonList v-if="status === 'loading'" :count="8" />
    <ErrorState
      v-else-if="status === 'error'"
      :message="error?.message || '加载失败'"
      @retry="refresh"
    />
    <ul v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <li v-for="anime in dayItems" :key="anime.id">
        <AnimeCard :anime="anime" layout="grid" />
      </li>
    </ul>
  </div>
</template>
