<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

/**
 * 错误边界
 * - 捕获后代组件渲染错误
 * - 展示友好提示 + 重置按钮
 */
const error = ref<Error | null>(null)

onErrorCaptured((err) => {
  console.error('[FanLu ErrorBoundary]', err)
  error.value = err instanceof Error ? err : new Error(String(err))
  return false // 阻止继续冒泡
})

function reset() {
  error.value = null
  // 简单粗暴：刷新页面
  window.location.reload()
}
</script>

<template>
  <div
    v-if="error"
    class="mx-auto max-w-xl px-4 py-20 text-center"
  >
    <p class="text-5xl mb-4">⚠</p>
    <h1 class="text-xl mb-2">组件出错了</h1>
    <p class="text-sm text-fg-muted mb-1">已经记录到控制台</p>
    <p class="text-xs text-fg-muted font-mono mb-6 break-all">
      {{ error.message }}
    </p>
    <button
      class="px-4 py-2 text-sm border border-accent text-accent hover:bg-accent hover:text-bg-elevated transition-colors"
      @click="reset"
    >
      重新加载
    </button>
  </div>
  <slot v-else />
</template>
