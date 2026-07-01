<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AnimeCell from '@/components/anime/AnimeCell.vue'
import AnimeCard from '@/components/anime/AnimeCard.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { useQuery } from '@/composables/useQuery'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { bangumiApi } from '@/api/bangumi'
import { getCurrentSeason, nextSeasonInfo } from '@/data/seasonMeta'
import type { BangumiCalendarItem, BangumiSubject, BangumiListItem } from '@/api/types'

/** Calendar 顶部 Grid 用 */
type CalendarItem = Partial<BangumiSubject> & BangumiCalendarItem

/** 当前周几（0=周日, 1=周一, ..., 6=周六） */
const today = new Date().getDay()

/**
 * 初始 Tab：优先用 localStorage 保存的最后选择，否则用今天
 * - 刷新页面后保留用户最后看的 Tab，不重置到周日
 * - 超过 7 天的记录会被忽略（防止陈旧数据）
 */
const STORAGE_KEY = 'fanlu:home-active-day'
const STORAGE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 天

function loadActiveDay(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const { day, ts } = JSON.parse(raw)
      // 校验：必须是 0-6 的数字，且未过期
      if (typeof day === 'number' && day >= 0 && day <= 6 && Date.now() - ts < STORAGE_TTL) {
        return day
      }
    }
  } catch {
    // localStorage 不可用或解析失败，回退到今天
  }
  return today
}

const activeDay = ref<number>(loadActiveDay())

// 监听变化，持久化到 localStorage
watch(activeDay, (day) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ day, ts: Date.now() }))
  } catch {
    // localStorage 不可用，静默失败
  }
})

const tabs = [
  { id: 0, label: '周日', short: '日' },
  { id: 1, label: '周一', short: '一' },
  { id: 2, label: '周二', short: '二' },
  { id: 3, label: '周三', short: '三' },
  { id: 4, label: '周四', short: '四' },
  { id: 5, label: '周五', short: '五' },
  { id: 6, label: '周六', short: '六' },
]

/** 顶部 Grid：按周切（calendar API 字段少但够用） */
const {
  data: calendar,
  status: calStatus,
  error: calError,
  refresh: calRefresh,
} = useQuery({
  key: 'calendar',
  query: () => bangumiApi.calendar(),
  staleTime: 1000 * 60 * 60 * 6,
})

const activeItems = computed<CalendarItem[]>(() => {
  // 前端 activeDay: 0=周日, 1=周一, ..., 6=周六
  // BGM API weekday.id: 1=周一, ..., 6=周六, 7=周日
  // 映射：周日(0) → BGM id=7，其他 activeDay 直接对应
  const bgmWeekdayId = activeDay.value === 0 ? 7 : activeDay.value
  return calendar.value?.find((c) => c.weekday.id === bgmWeekdayId)?.items ?? []
})
const isEmpty = computed(() => calStatus.value === 'success' && activeItems.value.length === 0)

/** 底部 List：按月拉当季全量（带 infobox/meta_tags） */
const curSeason = getCurrentSeason()
const SEASON_MONTHS: Record<string, [number, number]> = {
  Winter: [1, 3], Spring: [4, 6], Summer: [7, 9], Autumn: [10, 12],
}
const [startMonth, endMonth] = SEASON_MONTHS[curSeason.season] ?? [4, 6]

/**
 * 增量渲染：searchBySeason 支持按月回调
 * - 第一个月数据回来就先填充 incrementalData，UI 立即渲染
 * - 3 个月全部完成：useQuery 的 data 被填充（已去重+排序），listItems 自动切换
 * - 二次访问：useQuery 命中缓存，直接显示完整数据
 */
const incrementalData = ref<BangumiListItem[]>([])
const seenIds = new Set<number>()

const {
  data: seasonAnimes,
  status: listStatus,
  error: listError,
  refresh: listRefresh,
} = useQuery<BangumiListItem[]>({
  key: `home-season-${curSeason.year}-${curSeason.season}`,
  query: () =>
    bangumiApi.searchBySeason(curSeason.year, startMonth, endMonth, (monthData) => {
      // 增量 append（去重，避免不同月份重复番剧先显示两次）
      const newItems = monthData.filter((a) => !seenIds.has(a.id))
      newItems.forEach((a) => seenIds.add(a.id))
      if (newItems.length) {
        incrementalData.value = [...incrementalData.value, ...newItems]
      }
    }),
  staleTime: 1000 * 60 * 60 * 12,
})

/**
 * listItems：优先用 useQuery 的完整数据（已去重+排序），否则用增量数据
 * - 首月数据回来：incrementalData 有值，UI 立即渲染
 * - 3 个月全部完成：seasonAnimes 有值，自动切换到完整数据
 */
const listItems = computed<BangumiListItem[]>(() => seasonAnimes.value ?? incrementalData.value)

/** 性能优化：分页加载（每屏 12 个，滚到底再加载） */
const { visible: visibleList, hasMore, sentinel } = useInfiniteScroll<BangumiListItem>(listItems, {
  pageSize: 12,
  rootMargin: '400px',
})

/**
 * 底部 List 延迟渲染：首屏不渲染 List 内容，滚动到位置前 400px 才激活
 * - 首屏完全不发 List 区域的图片请求
 * - API 请求仍然发，但图片懒到 List 进入视口才请求
 */
const listSectionRef = ref<HTMLElement | null>(null)
const listActivated = ref(false)

onMounted(() => {
  if (!listSectionRef.value) return
  const obs = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        listActivated.value = true
        obs.disconnect()
      }
    },
    { rootMargin: '400px 0px' },
  )
  obs.observe(listSectionRef.value)
})

/** 当季标识 + 下一季倒计时 */
const currentSeason = computed(() => getCurrentSeason())
const next = computed(() => nextSeasonInfo())

function airTimeFor(day: number): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day] || ''
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 md:px-6">
    <!-- 季度标识 + 倒计时 -->
    <div class="pt-4 md:pt-6 pb-2 flex items-baseline justify-between gap-4">
      <div>
        <h1 class="title-display text-2xl md:text-3xl">
          {{ currentSeason.year }} · {{ currentSeason.season }}
        </h1>
        <p class="text-xs text-fg-muted font-mono mt-0.5">
          距离 {{ next.year }} · {{ next.season }} 开播还有
          <span v-if="next.daysUntil > 0" class="text-accent">{{ next.daysUntil }}</span>
          <span v-else>0</span>
          天
        </p>
      </div>
      <span class="text-2xs text-fg-muted/60 uppercase tracking-widest hidden md:inline">
        本季新番
      </span>
    </div>

    <!-- 周维度切换 Tab -->
    <div class="sticky top-14 md:top-16 z-20 -mx-4 md:-mx-6 border-b border-border bg-bg/95 backdrop-blur-md">
      <div class="mx-auto max-w-7xl px-4 md:px-6">
        <div role="tablist" class="flex gap-1 overflow-x-auto py-2">
          <button
            v-for="t in tabs"
            :key="t.id"
            role="tab"
            type="button"
            :aria-selected="t.id === activeDay"
            class="shrink-0 px-3 md:px-4 py-2 text-xs md:text-sm transition-colors relative"
            :class="t.id === activeDay ? 'text-accent' : 'text-fg-muted hover:text-fg'"
            @click="activeDay = t.id"
          >
            <span class="md:hidden">{{ t.short }}</span>
            <span class="hidden md:inline">{{ t.label }}</span>
            <span
              v-if="t.id === activeDay"
              class="absolute -bottom-2 left-2 right-2 md:left-3 md:right-3 h-px bg-accent"
            />
            <span
              v-if="t.id === today"
              class="ml-1 text-2xs"
              :class="t.id === activeDay ? 'text-accent/70' : 'text-fg-muted/50'"
            >·今日</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 上半部：Grid 快速浏览（按周） -->
    <section class="py-6">
      <SkeletonList
        v-if="calStatus === 'loading'"
        layout="grid"
        :count="6"
        cols="grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
      />
      <ErrorState
        v-else-if="calStatus === 'error'"
        :message="calError?.message || '加载失败'"
        @retry="calRefresh"
      />
      <EmptyState
        v-else-if="isEmpty"
        title="这一天没有数据"
        :description="activeDay === today ? '可能是 Bangumi 暂未收录。切换到其他日期看看。' : '切换到其他日期看看。'"
      />
      <template v-else>
        <header class="mb-3 flex items-baseline justify-between">
          <h2 class="text-sm uppercase tracking-widest text-fg-muted">
            {{ airTimeFor(activeDay) }} · 快速浏览
          </h2>
          <span class="text-2xs text-fg-muted/60 font-mono">
            {{ activeItems.length }} 部
          </span>
        </header>
        <ul class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
          <li v-for="anime in activeItems" :key="`cell-${anime.id}`">
            <AnimeCell
              :anime="anime"
              :air-time="airTimeFor(activeDay)"
            />
          </li>
        </ul>
      </template>
    </section>

    <!-- 下半部：详细 List（按月，展示制作人员） -->
    <section ref="listSectionRef" class="py-6 border-t border-border">
      <header class="mb-3 flex items-baseline justify-between">
        <div>
          <h2 class="text-sm uppercase tracking-widest text-fg-muted">
            本季新番 · 详细列表
          </h2>
          <p class="text-xs text-fg-muted/70 mt-0.5 font-mono">
            {{ currentSeason.year }} · {{ currentSeason.season }} · 全季共 {{ listItems.length }} 部
          </p>
        </div>
      </header>

      <!-- 首屏未激活时只显示提示，不渲染 List 内容 -->
      <div v-if="!listActivated" class="py-12 text-center">
        <span class="text-2xs text-fg-muted/50 font-mono">滚动到此处加载详细列表</span>
      </div>
      <template v-else>
        <SkeletonList
          v-if="listStatus === 'loading' && !listItems.length"
          layout="list"
          :count="6"
        />
        <ErrorState
          v-else-if="listStatus === 'error'"
          :message="listError?.message || '加载失败'"
          @retry="listRefresh"
        />
        <EmptyState
          v-else-if="!listItems.length"
          title="本季暂无数据"
          description="Bangumi 暂未收录本季新番"
        />
        <ul v-else class="divide-y divide-border">
          <li v-for="anime in visibleList" :key="`list-${anime.id}`">
            <AnimeCard :anime="anime" layout="list" />
          </li>
          <li v-if="hasMore" ref="sentinel" class="py-6 text-center">
            <span class="text-2xs text-fg-muted/50 font-mono">加载中…</span>
          </li>
          <li v-else-if="listItems.length > 12" class="py-6 text-center">
            <span class="text-2xs text-fg-muted/50 font-mono">— 已显示全部 {{ listItems.length }} 部 —</span>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>
