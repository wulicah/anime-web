<script setup lang="ts">
/**
 * 追番状态切换器
 * - 4 态：在看 / 想看 / 看过 / 弃番 / (未追)
 * - 单击循环切换，长按打开菜单
 */
import { ref } from 'vue'
import type { LibraryStatus } from '@/db'

const props = defineProps<{
  status: LibraryStatus
}>()

const emit = defineEmits<{
  change: [status: LibraryStatus]
}>()

const STATUSES: { value: LibraryStatus; label: string }[] = [
  { value: 'watching', label: '在看' },
  { value: 'planned', label: '想看' },
  { value: 'completed', label: '看过' },
  { value: 'dropped', label: '弃番' },
]

const showMenu = ref(false)

function cycle() {
  if (props.status === 'none') {
    emit('change', 'watching')
    return
  }
  const i = STATUSES.findIndex((s) => s.value === props.status)
  const next = STATUSES[(i + 1) % STATUSES.length]
  emit('change', next.value)
}

function pick(s: LibraryStatus) {
  emit('change', s)
  showMenu.value = false
}
</script>

<template>
  <div class="relative inline-block">
    <button
      class="px-4 py-2 text-sm border transition-colors min-w-24"
      :class="
        status === 'none'
          ? 'border-accent text-accent hover:bg-accent hover:text-bg-elevated'
          : 'border-fg text-fg hover:bg-fg hover:text-bg'
      "
      @click="cycle"
      @contextmenu.prevent="showMenu = !showMenu"
    >
      {{
        status === 'none' ? '+ 追番' : STATUSES.find((s) => s.value === status)?.label
      }}
    </button>
    <button
      v-if="status !== 'none'"
      class="ml-1 px-2 py-2 text-xs text-fg-muted hover:text-fg"
      title="选择其他状态"
      @click="showMenu = !showMenu"
    >
      ▾
    </button>

    <!-- 弹层 -->
    <div
      v-if="showMenu"
      class="absolute z-10 mt-1 right-0 min-w-32 border border-border bg-bg-elevated shadow-elev"
    >
      <button
        v-for="s in STATUSES"
        :key="s.value"
        class="block w-full text-left px-4 py-2 text-sm hover:bg-bg transition-colors"
        :class="s.value === status ? 'text-accent' : 'text-fg'"
        @click="pick(s.value)"
      >
        {{ s.label }}
      </button>
      <button
        class="block w-full text-left px-4 py-2 text-sm text-fg-muted hover:bg-bg border-t border-border transition-colors"
        @click="pick('none'); showMenu = false"
      >
        取消追番
      </button>
    </div>
  </div>
</template>
