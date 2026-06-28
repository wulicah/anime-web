import Dexie, { type Table } from 'dexie'

/**
 * 追番状态：4 态循环
 *  - none: 未追
 *  - watching: 在看
 *  - planned: 想看
 *  - completed: 看过
 *  - dropped: 弃番
 */
export type LibraryStatus = 'none' | 'watching' | 'planned' | 'completed' | 'dropped'

export interface LibraryItem {
  /** 自增主键 */
  id?: number
  /** Bangumi subject id */
  animeId: number
  /** 冗余存储：番剧名（用于离线展示） */
  name: string
  /** 冗余存储：封面 */
  image: string
  /** 状态 */
  status: LibraryStatus
  /** 个人评分 1-10，null=未评 */
  rating: number | null
  /** 备注 */
  note: string
  /** 标签（自定义） */
  tags: string[]
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
}

export interface CommentItem {
  id?: number
  animeId: number
  content: string
  createdAt: number
}

/**
 * 缓存条目：用于 useQuery 的 SWR 持久化
 * - key: useQuery 的 key
 * - data: 序列化后的响应
 * - ts: 时间戳（用于 staleTime 判断）
 */
export interface CacheItem {
  key: string
  data: unknown
  ts: number
}

/**
 * FanLu 本地数据库
 * - 库名: fanlu
 * - 版本: 2
 * - 表: library（追番）、comments（评论）、cache（SWR 缓存）
 */
class FanLuDB extends Dexie {
  library!: Table<LibraryItem, number>
  comments!: Table<CommentItem, number>
  cache!: Table<CacheItem, string>

  constructor() {
    super('fanlu')
    this.version(1).stores({
      library: '++id, animeId, status, updatedAt',
      comments: '++id, animeId, createdAt',
    })
    this.version(2).stores({
      library: '++id, animeId, status, updatedAt',
      comments: '++id, animeId, createdAt',
      cache: '&key, ts',
    })
  }
}

export const db = new FanLuDB()
