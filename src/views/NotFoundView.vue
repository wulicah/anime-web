<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
    <h1 class="title-display text-7xl md:text-9xl text-accent mb-2">404</h1>
    <p class="text-base md:text-lg text-fg-muted mb-6">页面去番剧世界冒险了</p>
    <RouterLink
      to="/"
      class="text-sm px-4 py-2 border border-border hover:border-accent hover:text-accent transition-colors"
    >
      回到首页
    </RouterLink>
  </div>
</template>
