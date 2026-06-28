<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { proxyBangumiImage } from '@/composables/useImage'
import type { LibraryStatus } from '@/db'
import EmptyState from '@/components/common/EmptyState.vue'

const library = useLibraryStore()
onMounted(() => library.load())

const TABS: { value: LibraryStatus; label: string }[] = [
  { value: 'watching', label: '在看' },
  { value: 'planned', label: '想看' },
  { value: 'completed', label: '看过' },
  { value: 'dropped', label: '弃番' },
]

/** 封面也走 weserv 代理（避免国内访问 lain.bgm.tv 慢） */
const cover = (url: string) => proxyBangumiImage(url)

const active = ref<LibraryStatus>('watching')
const list = computed(() => library.items.filter((i) => i.status === active.value))
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-10">
    <header class="mb-6">
      <h1 class="title-display text-3xl md:text-4xl mb-2">我的追番</h1>
      <p class="text-sm text-fg-muted">
        共 {{ library.stats.total }} 部 · 已评分 {{ library.stats.rated }} 部
      </p>
    </header>

    <!-- 状态 Tab -->
    <div role="tablist" class="mb-6 flex flex-wrap gap-1 border-b border-border">
      <button
        v-for="t in TABS"
        :key="t.value"
        role="tab"
        :aria-selected="t.value === active"
        class="px-4 py-2 text-sm transition-colors relative"
        :class="t.value === active ? 'text-accent' : 'text-fg-muted hover:text-fg'"
        @click="active = t.value"
      >
        {{ t.label }}
        <span class="ml-1.5 text-xs font-mono text-fg-muted">
          {{ library.stats[t.value as Exclude<LibraryStatus, 'none'>] }}
        </span>
        <span
          v-if="t.value === active"
          class="absolute -bottom-px left-3 right-3 h-px bg-accent"
        />
      </button>
    </div>

    <!-- 列表 -->
    <ul v-if="list.length" class="divide-y divide-border">
      <li v-for="item in list" :key="item.id">
        <RouterLink
          :to="`/anime/${item.animeId}`"
          class="flex items-center gap-4 py-4 group"
        >
          <div class="shrink-0 w-12 h-16 md:w-14 md:h-20 overflow-hidden bg-bg-elevated">
            <img
              v-if="item.image"
              :src="cover(item.image)"
              :alt="item.name"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm md:text-base font-medium text-ellipsis-2 leading-snug group-hover:text-accent transition-colors">
              {{ item.name || '未命名' }}
            </h3>
            <div class="mt-1 flex items-center gap-3 text-xs text-fg-muted">
              <span v-if="item.rating" class="text-accent font-mono">★ {{ item.rating }}</span>
              <span class="font-mono">
                {{ new Date(item.updatedAt).toLocaleDateString() }}
              </span>
            </div>
            <p v-if="item.note" class="mt-1 text-xs text-fg-muted text-ellipsis-1">
              {{ item.note }}
            </p>
          </div>
        </RouterLink>
      </li>
    </ul>

    <EmptyState
      v-else
      :title="`还没有「${TABS.find((t) => t.value === active)?.label}」的番剧`"
      description="去首页或搜索页找找看吧。"
    >
      <RouterLink to="/" class="text-sm link">回到首页</RouterLink>
    </EmptyState>
  </div>
</template>
