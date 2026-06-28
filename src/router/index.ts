import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '番录 · 本季新番' },
  },
  {
    path: '/anime/:id',
    name: 'anime-detail',
    component: () => import('@/views/AnimeDetailView.vue'),
    meta: { title: '番剧详情' },
  },
  {
    path: '/library',
    name: 'library',
    component: () => import('@/views/LibraryView.vue'),
    meta: { title: '我的追番' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue'),
    meta: { title: '搜索' },
  },
  {
    path: '/archive',
    name: 'archive',
    component: () => import('@/views/ArchiveView.vue'),
    meta: { title: '归档' },
  },
  {
    path: '/archive/:year/:season',
    name: 'archive-season',
    component: () => import('@/views/ArchiveSeasonView.vue'),
    meta: { title: '季度归档' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '个人中心' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '404' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0, behavior: 'smooth' }
  },
})

// 标题同步 + 滚动归零
router.afterEach((to) => {
  const base = '番录 FanLu'
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
