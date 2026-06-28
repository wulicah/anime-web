<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { usePreferencesStore } from '@/stores/preferences'
import AppHeader from '@/components/layout/AppHeader.vue'
import MobileTabBar from '@/components/layout/MobileTabBar.vue'
import InstallPrompt from '@/components/layout/InstallPrompt.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'

const preferences = usePreferencesStore()

// 启动时应用主题（避免闪烁）
onMounted(() => {
  preferences.applyTheme()
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <ErrorBoundary>
      <main class="flex-1 pb-20 md:pb-0">
        <RouterView v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>
    </ErrorBoundary>
    <MobileTabBar />
    <InstallPrompt />
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
