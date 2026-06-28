<script setup lang="ts">
defineProps<{ count?: number }>()
</script>

<template>
  <ul class="space-y-3">
    <li
      v-for="i in count ?? 5"
      :key="i"
      class="flex items-center gap-4 border-b border-border py-3 animate-pulse-slow"
    >
      <div class="w-12 h-16 md:w-14 md:h-20 bg-border/40" />
      <div class="flex-1 space-y-2">
        <div class="h-4 w-3/4 bg-border/40" />
        <div class="h-3 w-1/3 bg-border/30" />
      </div>
    </li>
  </ul>
</template>
