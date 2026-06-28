<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useLazyImage, enqueueDownload } from '@/composables/useLazyImage'
import { proxyBangumiImage, buildSrcset, type ImageSet } from '@/composables/useImage'

/**
 * 懒加载图片组件
 * - 进入视口前：显示骨架（灰色渐变）
 * - 进入视口：加入下载队列（最多 4 张同时下载）
 * - 下载完成：淡入显示
 *
 * 用法：
 *   <LazyImage :src="url" :srcset-img="img" :alt="..." width="200" />
 */

const props = withDefaults(
  defineProps<{
    /** 原 URL（未代理） */
    src?: string
    /** ImageSet 对象，用于构建 srcset */
    srcsetImg?: ImageSet
    alt?: string
    /** 期望宽度，传给 weserv 压缩（默认 200） */
    width?: number
    /** 是否在网格布局下（影响占位样式） */
    layout?: 'grid' | 'list'
  }>(),
  { width: 200 },
)

const { visible, loaded, target } = useLazyImage({ rootMargin: '150px 0px' })

const realSrc = computed(() => proxyBangumiImage(props.src, props.width))
const realSrcset = computed(() => buildSrcset(props.srcsetImg))
const id = computed(() => props.src || '')

// 进入视口后加入下载队列
watch(visible, (v) => {
  if (!v || loaded.value || !props.src) return
  enqueueDownload(id.value, async () => {
    // 等图片真正下载完
    await new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = realSrc.value
    })
    loaded.value = true
  })
})
</script>

<template>
  <div ref="target" class="relative w-full h-full overflow-hidden bg-bg-elevated">
    <!-- 占位骨架 -->
    <div
      v-if="!loaded"
      class="absolute inset-0 bg-gradient-to-br from-bg-elevated to-bg-muted/30 animate-pulse"
    ></div>
    <!-- 真正的图片 -->
    <img
      v-if="visible && loaded"
      :src="realSrc"
      :srcset="realSrcset"
      :alt="alt"
      loading="eager"
      decoding="async"
      class="h-full w-full object-cover lazy-img-loaded"
    />
  </div>
</template>

<style scoped>
.lazy-img-loaded {
  animation: lazy-fade-in 0.3s ease-out;
}
@keyframes lazy-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
