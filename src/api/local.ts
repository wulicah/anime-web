import { db, type LibraryItem, type LibraryStatus, type CommentItem } from '@/db'

/**
 * 把任意对象深拷贝为普通对象
 * 解决 Vue 3 reactive Proxy 传给 IndexedDB 时的 DataCloneError
 * - IndexedDB 的 structured clone 算法不支持 Proxy
 * - 必须先剥掉响应式包装，否则 update/put 失败
 * - LibraryItem/CommentItem 都是 JSON 安全类型（string/number/null/string[]）
 *   所以 JSON.parse(JSON.stringify(x)) 就够了
 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/**
 * 本地数据 API（IndexedDB）
 * - 所有写操作都先 toPlain 剥掉 Vue Proxy，避免 DataCloneError
 * - 后续如果加后端，把这个文件替换成 http.ts 即可
 */
export const localApi = {
  library: {
    /** 列表（按更新时间倒序） */
    list: async (): Promise<LibraryItem[]> => {
      return db.library.orderBy('updatedAt').reverse().toArray()
    },

    /** 按状态过滤 */
    byStatus: async (status: LibraryStatus): Promise<LibraryItem[]> => {
      return db.library.where('status').equals(status).reverse().sortBy('updatedAt')
    },

    /** 查找单条 */
    get: async (animeId: number): Promise<LibraryItem | undefined> => {
      return db.library.where('animeId').equals(animeId).first()
    },

    /** 写入（不存在则新增） */
    upsert: async (item: LibraryItem): Promise<number> => {
      // 关键：必须先 toPlain，否则传 Proxy 给 db.library.update/add 会报 DataCloneError
      const plain = toPlain(item)
      const existing = await db.library.where('animeId').equals(plain.animeId).first()
      if (existing) {
        await db.library.update(existing.id!, { ...plain, updatedAt: Date.now() })
        return existing.id!
      } else {
        return db.library.add({ ...plain, createdAt: Date.now(), updatedAt: Date.now() })
      }
    },

    /** 删除 */
    remove: async (animeId: number): Promise<void> => {
      await db.library.where('animeId').equals(animeId).delete()
    },

    /** 清空 */
    clear: async (): Promise<void> => {
      await db.library.clear()
    },
  },

  comments: {
    list: async (animeId: number): Promise<CommentItem[]> => {
      return db.comments.where('animeId').equals(animeId).reverse().sortBy('createdAt')
    },
    add: async (item: Omit<CommentItem, 'id' | 'createdAt'>): Promise<number> => {
      // 同样需要 toPlain
      return db.comments.add({ ...toPlain(item), createdAt: Date.now() })
    },
    remove: async (id: number): Promise<void> => {
      await db.comments.delete(id)
    },
  },

  /** 导出全部数据为 JSON */
  export: async () => {
    const [library, comments] = await Promise.all([db.library.toArray(), db.comments.toArray()])
    return { library, comments, exportedAt: new Date().toISOString() }
  },

  /** 清空全部数据 */
  clearAll: async (): Promise<void> => {
    await Promise.all([db.library.clear(), db.comments.clear()])
  },
}
