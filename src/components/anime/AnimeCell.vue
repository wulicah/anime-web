<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { proxyBangumiImage } from '@/composables/useImage'

/** 通用 Anime 数据（同 AnimeCard） */
type Item = {
  id: number
  name: string
  name_cn?: string
  images?: { large: string; common: string; medium: string; small: string; grid: string }
}

defineProps<{
  anime: Item
  airTime?: string
  platforms?: string[]
  episode?: string
}>()

const displayName = (a: Item) => a.name_cn || a.name
/** 封面：优先 large（清晰），再 common（中），最后 medium（小），全部走 weserv 代理 */
const cover = (a: Item) =>
  proxyBangumiImage(
    a.images?.large || a.images?.common || a.images?.medium || a.images?.grid || a.images?.small || '',
  )
</script>

<template>
  <RouterLink
    :to="`/anime/${anime.id}`"
    class="group block transition-colors"
  >
    <article class="flex flex-col">
      <!-- 封面：5:7 比例（匹配 Bangumi 原图，避免 object-cover 切割） -->
      <div class="relative aspect-[5/7] overflow-hidden bg-bg-elevated">
        <img
          v-if="cover(anime)"
          :src="cover(anime)"
          :alt="displayName(anime)"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <!-- 顶部播出时间（如果有） -->
        <div
          v-if="airTime"
          class="absolute top-0 left-0 right-0 px-2 py-1 bg-gradient-to-b from-black/60 to-transparent"
        >
          <span class="text-2xs font-mono text-white/90">{{ airTime }}</span>
        </div>
        <!-- 底部平台标签 -->
        <div
          v-if="platforms && platforms.length"
          class="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        >
          <div class="flex flex-wrap gap-1">
            <span
              v-for="p in platforms.slice(0, 3)"
              :key="p"
              class="text-2xs px-1.5 py-0.5 bg-white/15 text-white backdrop-blur-sm"
            >{{ p }}</span>
          </div>
        </div>
      </div>
      <!-- 文字区 -->
      <div class="pt-2">
        <h3 class="text-xs md:text-sm font-medium text-ellipsis-2 leading-snug group-hover:text-accent transition-colors min-h-[2.5em]">
          {{ displayName(anime) }}
        </h3>
        <div v-if="episode" class="mt-1 text-2xs font-mono text-fg-muted">
          {{ episode }}
        </div>
      </div>
    </article>
  </RouterLink>
</template>
