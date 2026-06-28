import { ref, shallowRef, computed, type Ref, type ShallowRef, type MaybeRefOrGetter, toValue } from 'vue'
import { db } from '@/db'

/**
 * useQuery 状态
 */
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseQueryResult<T> {
  data: ShallowRef<T | null>
  error: Ref<Error | null>
  status: Ref<QueryStatus>
  refresh: () => Promise<void>
}

/**
 * 轻量级 SWR 风格 Composable + IndexedDB 持久化
 * - 内存缓存：同 key 复用，避免重复请求
 * - 持久化缓存：跨浏览器会话保留
 * - staleTime：超过则后台重新拉取但仍展示旧数据
 */
const memCache = new Map<string, { data: unknown; ts: number }>()

/** 从 IndexedDB 读取缓存 */
async function loadFromIdb(key: string): Promise<{ data: unknown; ts: number } | null> {
  try {
    const row = await db.cache.get(key)
    if (!row) return null
    return { data: row.data, ts: row.ts }
  } catch {
    return null
  }
}

/** 写回 IndexedDB（fire-and-forget） */
function saveToIdb(key: string, data: unknown) {
  db.cache
    .put({ key, data, ts: Date.now() })
    .catch(() => {
      /* 失败也不影响主流程 */
    })
}

export interface UseQueryOptions<T> {
  key: MaybeRefOrGetter<string>
  query: () => Promise<T>
  /** 缓存时间（ms），超过则重新拉取但仍展示旧数据 */
  staleTime?: number
  /** 立即执行 */
  immediate?: boolean
  /** 是否持久化到 IndexedDB（默认 true） */
  persist?: boolean
}

export function useQuery<T>(opts: UseQueryOptions<T>): UseQueryResult<T> {
  const keyRef = computed(() => toValue(opts.key))
  const persist = opts.persist ?? true
  const data = shallowRef<T | null>((memCache.get(keyRef.value)?.data as T) ?? null) as ShallowRef<T | null>
  const error = ref<Error | null>(null)
  const status = ref<QueryStatus>(data.value ? 'success' : 'idle')
  const staleTime = opts.staleTime ?? 1000 * 60 * 5

  // 启动时从 IndexedDB 加载持久化缓存
  if (persist && !data.value) {
    loadFromIdb(keyRef.value).then((cached) => {
      if (cached && !data.value) {
        data.value = cached.data as T
        memCache.set(keyRef.value, cached)
        status.value = 'success'
        // 持久化缓存算过期则后台刷新
        if (Date.now() - cached.ts > staleTime) {
          run()
        }
      }
    })
  }

  const run = async () => {
    const key = keyRef.value
    status.value = 'loading'
    try {
      const result = await opts.query()
      data.value = result
      memCache.set(key, { data: result, ts: Date.now() })
      if (persist) saveToIdb(key, result)
      error.value = null
      status.value = 'success'
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      status.value = 'error'
    }
  }

  if (data.value) {
    const cached = memCache.get(keyRef.value)
    if (cached && Date.now() - cached.ts > staleTime) {
      run()
    }
  } else if (opts.immediate !== false) {
    run()
  }

  return { data, error, status, refresh: run }
}

/** 清空所有缓存（用于主题切换或强制刷新） */
export function clearQueryCache() {
  memCache.clear()
  db.cache.clear().catch(() => {
    /* ignore */
  })
}
