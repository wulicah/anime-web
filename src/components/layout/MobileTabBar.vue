<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const items = [
  { name: 'home', label: '首页', to: '/', icon: 'home' },
  { name: 'library', label: '追番', to: '/library', icon: 'bookmark' },
  { name: 'profile', label: '我的', to: '/profile', icon: 'user' },
]

const isActive = (to: string) => {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

const tabbarHeight = computed(() => 'h-16')
</script>

<template>
  <!-- 仅移动端显示 -->
  <nav
    class="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-bg/95 backdrop-blur-md pb-safe"
  >
    <ul class="flex" :class="tabbarHeight">
      <li v-for="item in items" :key="item.name" class="flex-1">
        <RouterLink
          :to="item.to"
          class="flex h-full flex-col items-center justify-center gap-0.5 text-xs transition-colors"
          :class="isActive(item.to) ? 'text-accent' : 'text-fg-muted'"
        >
          <svg
            v-if="item.icon === 'home'"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="m3 11 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2v-9z" />
          </svg>
          <svg
            v-else-if="item.icon === 'calendar'"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <rect x="3" y="5" width="18" height="16" rx="1.5" />
            <path d="M3 9h18M8 3v4M16 3v4" />
          </svg>
          <svg
            v-else-if="item.icon === 'bookmark'"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M6 4h12v17l-6-4-6 4V4z" />
          </svg>
          <svg
            v-else
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
          <span>{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
