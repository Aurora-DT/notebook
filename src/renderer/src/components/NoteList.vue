<script setup lang="ts">
import { useNotesStore } from '../stores/notes'
import { formatTime } from '../utils'

const notes = useNotesStore()
</script>

<template>
  <div class="note-list">
    <div
      v-for="n in notes.list"
      :key="n.id"
      class="note-item"
      :class="{ active: n.id === notes.currentId }"
      :title="n.title"
      @click="notes.select(n.id)"
    >
      <div class="ni-title">{{ n.title || '无标题' }}</div>
      <div class="ni-meta">{{ formatTime(n.updatedAt) }}</div>
    </div>
    <div v-if="notes.list.length === 0" class="note-item" style="cursor: default">
      <div class="ni-title" style="color: var(--text-muted)">暂无笔记</div>
    </div>
  </div>
</template>
