<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import dayjs from 'dayjs'

/**
 * 归档页
 * - 展示历年春夏秋季新番的入口
 * - 点击进入站内季度页 /archive/:year/:season
 * - 致敬 yuc.wiki 的设计
 */

interface Quarter {
  year: number
  season: 'Winter' | 'Spring' | 'Summer' | 'Autumn'
  start: string
  end: string
}

function getQuarter(date: dayjs.Dayjs): { year: number; season: Quarter['season'] } {
  const m = date.month()
  const y = date.year()
  if (m <= 1 || m === 11) return { year: y, season: 'Winter' }
  if (m <= 4) return { year: y, season: 'Spring' }
  if (m <= 7) return { year: y, season: 'Summer' }
  return { year: y, season: 'Autumn' }
}

const archive = computed<Quarter[]>(() => {
  const now = dayjs()
  const result: Quarter[] = []

  for (let i = 0; i < 12; i++) {
    const d = now.subtract(i * 3, 'month')
    const q = getQuarter(d)
    const seasonIdx = ['Winter', 'Spring', 'Summer', 'Autumn'].indexOf(q.season)
    const start = d.month(seasonIdx * 3).startOf('month')
    const end = start.add(3, 'month').subtract(1, 'day')
    result.push({
      year: q.year,
      season: q.season,
      start: start.format('YYYY-MM-DD'),
      end: end.format('YYYY-MM-DD'),
    })
  }
  return result
})

const grouped = computed(() => {
  const map = new Map<number, Quarter[]>()
  for (const q of archive.value) {
    if (!map.has(q.year)) map.set(q.year, [])
    map.get(q.year)!.push(q)
  }
  return Array.from(map.entries()).sort((a, b) => b[0] - a[0])
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 md:px-6 py-6 md:py-10">
    <header class="mb-8">
      <h1 class="title-display text-3xl md:text-4xl mb-2">归档</h1>
      <p class="text-sm text-fg-muted">历届新番时间表 · 按年份倒序</p>
    </header>

    <section v-for="[year, quarters] in grouped" :key="year" class="mb-10">
      <h2 class="title-display text-2xl mb-4 border-b border-border pb-2">
        {{ year }}
      </h2>
      <ul class="space-y-3">
        <li
          v-for="q in quarters"
          :key="`${q.year}-${q.season}`"
          class="flex items-baseline justify-between"
        >
          <RouterLink
            :to="`/archive/${q.year}/${q.season}`"
            class="text-base md:text-lg hover:text-accent transition-colors"
          >
            {{ q.season }}
          </RouterLink>
          <span class="text-xs font-mono text-fg-muted">
            {{ q.start }} — {{ q.end }}
          </span>
        </li>
      </ul>
    </section>

    <p class="text-xs text-fg-muted mt-10">
      归档页借鉴自 <a href="https://yuc.wiki/archives/" target="_blank" rel="noopener" class="link">yuc.wiki</a>，致敬原创。
    </p>
  </div>
</template>
