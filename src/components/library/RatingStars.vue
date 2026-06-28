<script setup lang="ts">
import { ref, computed } from 'vue'

/**
 * 1-10 星评分组件
 * - 视觉上 1-5 颗星，每颗星代表 2 分
 * - 支持 hover 预览
 */
const props = defineProps<{
  modelValue: number | null
  readonly?: boolean
  size?: 'sm' | 'md'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const hover = ref<number | null>(null)

const display = computed(() => hover.value ?? props.modelValue ?? 0)

function starStates(score: number) {
  // 返回 5 个星，每星 on/off
  return Array.from({ length: 5 }, (_, i) => {
    const threshold = (i + 1) * 2
    return score >= threshold - 1
  })
}

const stars = computed(() => starStates(display.value))

function set(n: number) {
  if (props.readonly) return
  emit('update:modelValue', n)
}
</script>

<template>
  <div
    class="inline-flex items-center gap-1"
    :class="readonly ? 'pointer-events-none' : 'cursor-pointer'"
    @mouseleave="hover = null"
  >
    <button
      v-for="(on, i) in stars"
      :key="i"
      type="button"
      class="transition-transform hover:scale-110"
      :class="size === 'sm' ? 'text-base' : 'text-xl'"
      :aria-label="`评分 ${(i + 1) * 2} 分`"
      @mouseenter="hover = (i + 1) * 2"
      @click="set((i + 1) * 2)"
    >
      <svg
        viewBox="0 0 24 24"
        :fill="on ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="1.5"
        :class="on ? 'text-accent' : 'text-border'"
      >
        <path d="M12 2l2.39 7.36H22l-6.18 4.5L18.21 21 12 16.5 5.79 21l2.39-7.14L2 9.36h7.61L12 2z" />
      </svg>
    </button>
    <span v-if="modelValue" class="ml-2 text-sm font-mono text-fg-muted">
      {{ modelValue }}
    </span>
  </div>
</template>
