import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { localApi } from '@/api/local'
import { bangumiApi } from '@/api/bangumi'
import type { LibraryItem, LibraryStatus } from '@/db'

/**
 * 追番库 Store
 * - 状态：内存 ref[] 镜像 IndexedDB
 * - 所有变更先写库，再更新 ref
 * - 启动时从 DB 加载
 */
export const useLibraryStore = defineStore('library', () => {
  const items = ref<LibraryItem[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  /** 启动时加载 */
  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      items.value = await localApi.library.list()
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /** 查找某番的本地记录 */
  function getByAnimeId(animeId: number) {
    return computed(() => items.value.find((i) => i.animeId === animeId) ?? null)
  }

  /** 设置追番状态（4 态循环） */
  async function setStatus(animeId: number, status: LibraryStatus) {
    const existing = items.value.find((i) => i.animeId === animeId)
    if (status === 'none' && existing) {
      // 取消追番 = 删除
      await localApi.library.remove(animeId)
      items.value = items.value.filter((i) => i.animeId !== animeId)
      return
    }
    const base: LibraryItem = existing ?? {
      animeId,
      name: '',
      image: '',
      status: 'watching',
      rating: null,
      note: '',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const next: LibraryItem = { ...base, status, updatedAt: Date.now() }
    // 如果是新增，自动从 Bangumi 拉元数据填充 name/image
    if (!existing) {
      try {
        const detail = await bangumiApi.anime(animeId)
        next.name = detail.name_cn || detail.name
        next.image = detail.images?.common || detail.images?.large || ''
      } catch {
        /* 离线时允许空 name */
      }
    }
    const id = await localApi.library.upsert(next)
    if (existing) {
      Object.assign(existing, next, { id: existing.id })
    } else {
      items.value.unshift({ ...next, id })
    }
  }

  /** 设置评分 */
  async function setRating(animeId: number, rating: number | null) {
    const item = items.value.find((i) => i.animeId === animeId)
    if (!item) return
    item.rating = rating
    item.updatedAt = Date.now()
    await localApi.library.upsert({ ...item })
  }

  /** 设置备注 */
  async function setNote(animeId: number, note: string) {
    const item = items.value.find((i) => i.animeId === animeId)
    if (!item) return
    item.note = note
    item.updatedAt = Date.now()
    await localApi.library.upsert({ ...item })
  }

  /** 按状态过滤 */
  function byStatus(status: LibraryStatus) {
    return computed(() => items.value.filter((i) => i.status === status))
  }

  /** 统计 */
  const stats = computed(() => ({
    total: items.value.length,
    watching: items.value.filter((i) => i.status === 'watching').length,
    planned: items.value.filter((i) => i.status === 'planned').length,
    completed: items.value.filter((i) => i.status === 'completed').length,
    dropped: items.value.filter((i) => i.status === 'dropped').length,
    rated: items.value.filter((i) => i.rating !== null).length,
  }))

  return {
    items,
    loaded,
    loading,
    load,
    getByAnimeId,
    setStatus,
    setRating,
    setNote,
    byStatus,
    stats,
  }
})
