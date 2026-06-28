<script setup lang="ts">
defineProps<{ message?: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="py-12 text-center">
    <p class="text-2xl text-accent mb-2">⚠</p>
    <p class="text-base font-medium mb-1">出错了</p>
    <p class="text-sm text-fg-muted mb-4">{{ message || '未知错误' }}</p>
    <button
      class="text-sm text-link underline-offset-2 hover:underline"
      @click="emit('retry')"
    >
      重试
    </button>
  </div>
</template>
