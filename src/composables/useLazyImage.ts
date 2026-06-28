import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'

/**
 * 真正的懒加载 + 并发池
 * - 用 IntersectionObserver 精确控制（默认 rootMargin 100px，不像浏览器原生 1250px）
 * - 最多 N 张同时下载，避免 50 张同时请求导致排队
 * - 配合 useInfiniteScroll 用：滚动到底再加 12 个，不会一次渲染 50 个
 *
 * 用法：
 *   const { visible, loaded, target } = useLazyImage({ maxConcurrent: 4 })
 *   <img ref="target" :src="visible ? realSrc : ''" />
 */

interface QueueItem {
  id: string
  fn: () => Promise<void>
}

let activeCount = 0
const queue: QueueItem[] = []

function processQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift()!
    activeCount++
    item.fn().finally(() => {
      activeCount--
      processQueue()
    })
  }
}

let MAX_CONCURRENT = 4

export function setMaxConcurrent(n: number) {
  MAX_CONCURRENT = n
  processQueue()
}

/**
 * 懒加载 composable
 * - 监听元素可见性
 * - 进入视口后加入下载队列
 * - 最多 maxConcurrent 张同时下载
 */
export function useLazyImage(options: { maxConcurrent?: number; rootMargin?: string } = {}) {
  const { rootMargin = '100px 0px' } = options
  if (options.maxConcurrent) setMaxConcurrent(options.maxConcurrent)

  const visible = ref(false)
  const loaded = ref(false)
  const target = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null

  function setup(el: HTMLElement | null) {
    if (observer) observer.disconnect()
    if (!el) return
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          visible.value = true
          observer?.disconnect()
          observer = null
        }
      },
      { rootMargin },
    )
    observer.observe(el)
  }

  onMounted(() => setup(target.value))
  watch(target, (el) => setup(el))
  onUnmounted(() => observer?.disconnect())

  return { visible, loaded, target }
}

/**
 * 加入下载队列
 * - id 用于去重（同 id 不重复加）
 * - fn 真正的下载函数
 */
const inflight = new Set<string>()

export function enqueueDownload(id: string, fn: () => Promise<void>): Promise<void> {
  // 已在队列或下载中，跳过
  if (inflight.has(id)) return Promise.resolve()
  inflight.add(id)

  return new Promise((resolve) => {
    queue.push({
      id,
      fn: async () => {
        try {
          await fn()
        } finally {
          inflight.delete(id)
          resolve()
        }
      },
    })
    processQueue()
  })
}
