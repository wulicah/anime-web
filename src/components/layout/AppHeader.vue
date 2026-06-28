<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { usePreferencesStore } from '@/stores/preferences'
import IconTheme from '@/components/common/IconTheme.vue'

const route = useRoute()
const preferences = usePreferencesStore()

const navItems = [
  { name: 'home', label: '首页', to: '/' },
  { name: 'library', label: '追番', to: '/library' },
  { name: 'archive', label: '归档', to: '/archive' },
  { name: 'profile', label: '我的', to: '/profile' },
]

const isActive = (to: string) => {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

// 循环切换主题：light → dark → system → light
const themeLabel = computed(() => {
  return { light: '浅色', dark: '深色', system: '跟随系统' }[preferences.theme]
})

function cycleTheme() {
  const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
  const i = order.indexOf(preferences.theme)
  preferences.theme = order[(i + 1) % order.length]
}
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md pt-safe"
  >
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:h-16 md:px-6">
      <!-- 站标 -->
      <RouterLink
        to="/"
        class="title-display text-2xl md:text-3xl text-fg hover:text-accent transition-colors"
      >
        番录
        <span class="ml-1 text-xs font-sans font-normal text-fg-muted tracking-widest">
          FANLU
        </span>
      </RouterLink>

      <!-- 桌面端导航 -->
      <nav class="hidden md:flex items-center gap-8 text-sm">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="item.to"
          class="relative py-1 transition-colors"
          :class="isActive(item.to) ? 'text-accent' : 'text-fg hover:text-accent'"
        >
          {{ item.label }}
          <span
            v-if="isActive(item.to)"
            class="absolute -bottom-0.5 left-0 right-0 h-px bg-accent"
          />
        </RouterLink>
      </nav>

      <!-- 右侧：主题 + 搜索入口 -->
      <div class="flex items-center gap-2">
        <button
          class="inline-flex h-9 items-center gap-1.5 px-2 text-xs text-fg-muted hover:text-fg transition-colors rounded-sm hover:bg-bg-elevated"
          :title="`主题：${themeLabel}`"
          @click="cycleTheme"
        >
          <IconTheme :theme="preferences.theme" />
          <span class="hidden sm:inline">{{ themeLabel }}</span>
        </button>
        <RouterLink
          to="/search"
          class="inline-flex h-9 w-9 items-center justify-center text-fg-muted hover:text-fg transition-colors rounded-sm hover:bg-bg-elevated"
          aria-label="搜索"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </RouterLink>
      </div>
    </div>
  </header>
</template>
