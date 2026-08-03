<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../stores/ui'
import { useNotesStore } from '../stores/notes'

const ui = useUiStore()
const notes = useNotesStore()

const title = computed(() => {
  const n = notes.current
  if (!n) return '桌面记事本'
  return `${n.title} - 桌面记事本`
})
</script>

<template>
  <div class="titlebar">
    <button
      class="tb-btn"
      :class="{ active: ui.alwaysOnTop }"
      :title="ui.alwaysOnTop ? '取消置顶' : '窗口置顶'"
      @click="ui.toggleAlwaysOnTop()"
    >
      <span style="font-size: 14px">{{ ui.alwaysOnTop ? '📌' : '📍' }}</span>
      <span v-if="ui.alwaysOnTop" style="font-size: 11px; color: var(--accent)">置顶</span>
    </button>
    <div class="tb-title selectable">{{ title }}</div>
  </div>
</template>
