<script setup lang="ts">
/**
 * 番剧列表骨架屏
 * - layout="grid"：竖排封面卡，尺寸匹配 AnimeCard(grid) / AnimeCell（aspect-[5/7] 封面 + 标题）
 * - layout="list"：左封面右详情，尺寸匹配 AnimeCard(list)（w-32 sm:w-36 封面 + 多行文字）
 * - cols：grid 模式下的列数类名，需与实际列表的 grid-cols 一致以保证占位对齐
 * 对比度从 bg-border/40 提升至 /60、/50、/35，保证浅深色主题下均清晰可见
 */
withDefaults(
  defineProps<{
    count?: number
    layout?: 'grid' | 'list'
    cols?: string
  }>(),
  {
    count: 6,
    layout: 'list',
    cols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  },
)
</script>

<template>
  <!-- grid 模式：竖排封面卡骨架（匹配 AnimeCard grid / AnimeCell） -->
  <ul v-if="layout === 'grid'" :class="['grid gap-3 md:gap-4', cols]">
    <li
      v-for="i in count"
      :key="i"
      class="flex flex-col animate-pulse-slow"
    >
      <!-- 5:7 封面占位（与 AnimeCard/AnimeCell 一致） -->
      <div class="relative aspect-[5/7] bg-border/60" />
      <!-- 标题 + 日期/评分占位 -->
      <div class="pt-2 space-y-1.5">
        <div class="h-3 w-full bg-border/50" />
        <div class="h-3 w-2/3 bg-border/35" />
        <div class="mt-1.5 h-2 w-1/2 bg-border/35" />
      </div>
    </li>
  </ul>

  <!-- list 模式：左封面右详情骨架（匹配 AnimeCard list） -->
  <ul v-else class="divide-y divide-border">
    <li
      v-for="i in count"
      :key="i"
      class="flex gap-3 py-2 animate-pulse-slow"
    >
      <!-- 左封面：与 AnimeCard list 完全一致 w-32 sm:w-36 h-[8.4rem] sm:h-[9.8rem] -->
      <div class="shrink-0 w-32 sm:w-36 h-[8.4rem] sm:h-[9.8rem] bg-border/60" />
      <!-- 右详情：标题 / 副名 / 集数 / 标签 / 制作信息 -->
      <div class="min-w-0 flex-1 py-1 space-y-2">
        <div class="h-4 w-3/4 bg-border/50" />
        <div class="h-3 w-1/3 bg-border/35" />
        <div class="h-2.5 w-1/4 bg-border/35" />
        <div class="flex gap-1.5 pt-1">
          <div class="h-4 w-10 bg-border/50" />
          <div class="h-4 w-12 bg-border/35" />
          <div class="h-4 w-10 bg-border/35" />
        </div>
        <div class="space-y-1 pt-1">
          <div class="h-2.5 w-full bg-border/35" />
          <div class="h-2.5 w-4/5 bg-border/35" />
        </div>
      </div>
    </li>
  </ul>
</template>
