<script setup lang="ts">
import { ref, onMounted } from 'vue'

/**
 * PWA 安装提示
 * - 监听 beforeinstallprompt 事件，捕获后展示
 * - 用户安装后不再展示（localStorage 记录）
 */
const showPrompt = ref(false)
const deferredPrompt = ref<any>(null)

onMounted(() => {
  // 已安装过则不再提示
  if (localStorage.getItem('fanlu:pwa-installed') === 'true') return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    // 延迟 3s 展示，避免干扰首屏体验
    setTimeout(() => {
      showPrompt.value = true
    }, 3000)
  })

  window.addEventListener('appinstalled', () => {
    localStorage.setItem('fanlu:pwa-installed', 'true')
    showPrompt.value = false
  })
})

async function install() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    localStorage.setItem('fanlu:pwa-installed', 'true')
  }
  showPrompt.value = false
  deferredPrompt.value = null
}

function dismiss() {
  showPrompt.value = false
  // 一周内不再提示
  localStorage.setItem('fanlu:pwa-dismissed', String(Date.now()))
}
</script>

<template>
  <Transition name="prompt">
    <div
      v-if="showPrompt"
      class="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40 border border-border bg-bg-elevated p-4 shadow-elev"
    >
      <div class="flex items-start gap-3">
        <div class="text-2xl shrink-0">📲</div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-medium mb-1">安装番录到主屏幕</h3>
          <p class="text-xs text-fg-muted leading-relaxed mb-3">
            像 App 一样使用，离线也能查看。
          </p>
          <div class="flex items-center gap-3">
            <button
              class="text-sm text-accent hover:underline"
              @click="install"
            >
              安装
            </button>
            <button
              class="text-xs text-fg-muted hover:text-fg"
              @click="dismiss"
            >
              稍后
            </button>
          </div>
        </div>
        <button
          class="text-fg-muted hover:text-fg text-lg leading-none"
          aria-label="关闭"
          @click="dismiss"
        >×</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.prompt-enter-active,
.prompt-leave-active {
  transition: all 300ms ease;
}
.prompt-enter-from,
.prompt-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
