<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { usePreferencesStore, type Theme } from '@/stores/preferences'
import { localApi } from '@/api/local'

const library = useLibraryStore()
const preferences = usePreferencesStore()

onMounted(async () => {
  await library.load()
})

const themes: { value: Theme; label: string; desc: string }[] = [
  { value: 'light', label: '浅色', desc: '米白编辑感' },
  { value: 'dark', label: '深色', desc: '深黑+暖橙' },
  { value: 'system', label: '跟随系统', desc: '自动切换' },
]

/** 导出 */
async function exportData() {
  const data = await localApi.export()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fanlu-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 清空 */
async function clearData() {
  if (!confirm('确定清空所有本地数据？此操作不可恢复。')) return
  await localApi.clearAll()
  await library.load()
  alert('本地数据已清空')
}

const storageUsage = ref<string>('计算中...')
onMounted(async () => {
  if (navigator.storage?.estimate) {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    storageUsage.value = `${(usage / 1024).toFixed(1)} KB / ${(quota / 1024 / 1024).toFixed(0)} MB`
  } else {
    storageUsage.value = '不支持'
  }
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 md:px-6 py-6 md:py-10">
    <h1 class="title-display text-3xl md:text-4xl mb-6">个人中心</h1>

    <!-- 数据统计 -->
    <section class="mb-10">
      <h2 class="text-sm uppercase tracking-widest text-fg-muted mb-4">数据</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="border border-border p-4">
          <div class="text-2xl title-display">{{ library.stats.total }}</div>
          <div class="text-xs text-fg-muted mt-1">已追番剧</div>
        </div>
        <div class="border border-border p-4">
          <div class="text-2xl title-display">{{ library.stats.watching }}</div>
          <div class="text-xs text-fg-muted mt-1">在看</div>
        </div>
        <div class="border border-border p-4">
          <div class="text-2xl title-display">{{ library.stats.completed }}</div>
          <div class="text-xs text-fg-muted mt-1">已看完</div>
        </div>
        <div class="border border-border p-4">
          <div class="text-2xl title-display text-accent">{{ library.stats.rated }}</div>
          <div class="text-xs text-fg-muted mt-1">评分</div>
        </div>
      </div>
    </section>

    <!-- 主题 -->
    <section class="mb-10">
      <h2 class="text-sm uppercase tracking-widest text-fg-muted mb-4">主题</h2>
      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="t in themes"
          :key="t.value"
          class="border p-4 text-left transition-colors"
          :class="
            preferences.theme === t.value
              ? 'border-accent text-accent'
              : 'border-border text-fg hover:border-fg'
          "
          @click="preferences.theme = t.value"
        >
          <div class="text-base font-medium">{{ t.label }}</div>
          <div class="text-xs text-fg-muted mt-1">{{ t.desc }}</div>
        </button>
      </div>
    </section>

    <!-- 数据管理 -->
    <section class="mb-10">
      <h2 class="text-sm uppercase tracking-widest text-fg-muted mb-4">数据</h2>
      <div class="space-y-3 text-sm">
        <div class="flex items-center justify-between border border-border p-3">
          <div>
            <div class="font-medium">本地存储用量</div>
            <div class="text-xs text-fg-muted mt-0.5 font-mono">{{ storageUsage }}</div>
          </div>
        </div>
        <div class="flex items-center justify-between border border-border p-3">
          <div>
            <div class="font-medium">导出 JSON 备份</div>
            <div class="text-xs text-fg-muted mt-0.5">下载所有追番和评分数据</div>
          </div>
          <button class="text-link" @click="exportData">导出</button>
        </div>
        <div class="flex items-center justify-between border border-accent/30 p-3">
          <div>
            <div class="font-medium text-accent">清空本地数据</div>
            <div class="text-xs text-fg-muted mt-0.5">不可恢复，请先导出</div>
          </div>
          <button class="text-accent hover:underline" @click="clearData">清空</button>
        </div>
      </div>
    </section>

    <!-- 关于 -->
    <section class="mb-10 text-xs text-fg-muted leading-6">
      <h2 class="text-sm uppercase tracking-widest text-fg-muted mb-4">关于</h2>
      <p>番录 FanLu v0.1 · 致敬 yuc.wiki</p>
      <p>所有番剧数据来自 <a href="https://bgm.tv" target="_blank" rel="noopener" class="link">Bangumi.tv</a> 公开 API</p>
    </section>
  </div>
</template>
