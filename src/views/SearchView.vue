<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { bangumiApi } from '@/api/bangumi'
import AnimeCard from '@/components/anime/AnimeCard.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const keyword = ref('')
const results = ref<Awaited<ReturnType<typeof bangumiApi.search>>['data']>([])
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const error = ref<Error | null>(null)

// 搜索历史（localStorage）
const HISTORY_KEY = 'fanlu:search-history'
const history = ref<string[]>(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'))

const doSearch = useDebounceFn(async (q: string) => {
  if (!q.trim()) {
    results.value = []
    status.value = 'idle'
    return
  }
  status.value = 'loading'
  try {
    const res = await bangumiApi.search(q)
    results.value = res.data
    status.value = 'success'
    // 写入历史
    if (!history.value.includes(q)) {
      history.value = [q, ...history.value].slice(0, 10)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
    }
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e))
    status.value = 'error'
  }
}, 300)

watch(keyword, (q) => doSearch(q))

function clearHistory() {
  history.value = []
  localStorage.removeItem(HISTORY_KEY)
}

function useHistoryItem(q: string) {
  keyword.value = q
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 md:px-6 py-6 md:py-10">
    <h1 class="title-display text-3xl md:text-4xl mb-6">搜索</h1>

    <!-- 搜索框 -->
    <div class="relative mb-8">
      <svg
        class="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        v-model="keyword"
        type="search"
        placeholder="番剧名、声优、tag..."
        class="w-full h-12 pl-11 pr-4 bg-bg-elevated border border-border text-base focus:border-accent outline-none transition-colors"
        autofocus
      />
    </div>

    <!-- 搜索历史 -->
    <section v-if="!keyword && history.length" class="mb-8">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs uppercase tracking-widest text-fg-muted">最近搜索</h2>
        <button class="text-xs text-fg-muted hover:text-fg" @click="clearHistory">清空</button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="h in history"
          :key="h"
          class="text-xs px-3 py-1.5 border border-border hover:border-accent hover:text-accent transition-colors"
          @click="useHistoryItem(h)"
        >{{ h }}</button>
      </div>
    </section>

    <!-- 加载/错误 -->
    <SkeletonList
      v-if="status === 'loading'"
      layout="grid"
      :count="6"
      cols="grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
    />
    <p v-else-if="status === 'error'" class="text-sm text-accent">
      搜索失败：{{ error?.message }}
    </p>

    <!-- 结果 -->
    <ul v-else-if="results.length" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
      <li v-for="anime in results" :key="anime.id">
        <AnimeCard :anime="anime" layout="grid" />
      </li>
    </ul>
    <EmptyState
      v-else-if="keyword && status === 'success'"
      title="没有匹配结果"
      description="试试其他关键词。"
    />
  </div>
</template>
