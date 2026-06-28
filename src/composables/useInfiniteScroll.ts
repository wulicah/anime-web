import { ref, computed, onMounted, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'

export interface UseInfiniteScrollOptions {
  /** 每页大小 */
  pageSize?: number
  /** 距离底部多少像素时触发（提前加载） */
  rootMargin?: string
}

/**
 * 无限滚动 / 分页加载 composable
 * - 用 IntersectionObserver 监听 sentinel，滚到底自动加载
 * - 只渲染 visible 部分，DOM 节点少 → 不卡
 * - 解决"番剧多页面卡顿"的关键
 */
export function useInfiniteScroll<T>(
  list: Ref<T[]> | ComputedRef<T[]>,
  options: UseInfiniteScrollOptions = {},
) {
  const { pageSize = 12, rootMargin = '300px' } = options
  const visibleCount = ref(pageSize)
  const sentinel = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null

  const visible = computed(() => list.value.slice(0, visibleCount.value))
  const hasMore = computed(() => visibleCount.value < list.value.length)

  function loadMore() {
    visibleCount.value = Math.min(visibleCount.value + pageSize, list.value.length)
  }

  function setupObserver(el: HTMLElement | null) {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    if (!el) return
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin },
    )
    observer.observe(el)
  }

  onMounted(() => {
    setupObserver(sentinel.value)
  })

  watch(sentinel, (el) => {
    setupObserver(el)
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return { visible, hasMore, loadMore, sentinel, visibleCount }
}
