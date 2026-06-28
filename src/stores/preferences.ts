import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'system'
export type DefaultPage = 'home' | 'library' | 'archive'

/**
 * 用户偏好 Store
 * - 主题（明/暗/跟随系统）
 * - 默认首页
 * - 持久化到 localStorage
 */
export const usePreferencesStore = defineStore('preferences', () => {
  // 主题
  const theme = ref<Theme>((localStorage.getItem('fanlu:theme') as Theme) || 'system')

  // 默认首页
  const defaultPage = ref<DefaultPage>(
    (localStorage.getItem('fanlu:defaultPage') as DefaultPage) || 'home',
  )

  // 是否开启桌面推送
  const notificationsEnabled = ref<boolean>(
    localStorage.getItem('fanlu:notifications') === 'true',
  )

  // 监听变化 → 持久化
  watch(theme, (v) => {
    localStorage.setItem('fanlu:theme', v)
    applyTheme()
  })
  watch(defaultPage, (v) => localStorage.setItem('fanlu:defaultPage', v))
  watch(notificationsEnabled, (v) =>
    localStorage.setItem('fanlu:notifications', String(v)),
  )

  /**
   * 应用主题到 <html>
   * - 跟随系统：监听 prefers-color-scheme
   * - 手动锁定：直接加/去 .dark
   */
  function applyTheme() {
    const root = document.documentElement
    const isDark =
      theme.value === 'dark' ||
      (theme.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', isDark)
  }

  // 监听系统主题变化（仅在 system 模式下响应）
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    if (theme.value === 'system') applyTheme()
  })

  return {
    theme,
    defaultPage,
    notificationsEnabled,
    applyTheme,
  }
})
