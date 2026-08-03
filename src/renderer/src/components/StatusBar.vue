<script setup lang="ts">
import { computed } from 'vue'
import { useNotesStore } from '../stores/notes'
import { wordCount, formatTime } from '../utils'

const notes = useNotesStore()

const stats = computed(() => {
  const content = notes.current?.content ?? ''
  return wordCount(content)
})
const updatedAt = computed(() => {
  const ts = notes.current?.updatedAt
  return ts ? formatTime(ts) : '--'
})
const statusText = computed(() => {
  switch (notes.saveStatus) {
    case 'saved':
      return '已保存'
    case 'saving':
      return '保存中...'
    case 'unsaved':
      return '未保存'
    default:
      return ''
  }
})
</script>

<template>
  <div class="statusbar">
    <span class="status-dot" :class="notes.saveStatus" />
    <span>{{ statusText }}</span>
    <span>·</span>
    <span>字数 {{ stats.chars }}</span>
    <span>·</span>
    <span>行 {{ stats.lines }}</span>
    <span class="sb-right">已更新 {{ updatedAt }}</span>
  </div>
</template>
