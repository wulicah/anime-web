<script setup lang="ts">
defineProps<{ title?: string; description?: string }>()
</script>

<template>
  <div class="py-12 text-center">
    <p class="text-2xl text-fg-muted mb-2">∅</p>
    <p v-if="title" class="text-base font-medium mb-1">{{ title }}</p>
    <p v-if="description" class="text-sm text-fg-muted">{{ description }}</p>
  </div>
</template>
