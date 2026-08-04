<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useNotesStore } from '../stores/notes'
import { formatTime } from '../utils'

const notes = useNotesStore()

// 右键上下文菜单
const ctxMenu = ref<{ visible: boolean; x: number; y: number; noteId: string | null }>({
  visible: false,
  x: 0,
  y: 0,
  noteId: null
})

function onContextMenu(e: MouseEvent, noteId: string): void {
  e.preventDefault()
  ctxMenu.value = { visible: true, x: e.clientX, y: e.clientY, noteId }
}

function closeCtxMenu(): void {
  ctxMenu.value.visible = false
}

function onDocClick(e: MouseEvent): void {
  if (!ctxMenu.value.visible) return
  const target = e.target as Node | null
  const menu = document.querySelector('.ctx-menu')
  if (menu && target && menu.contains(target)) return
  closeCtxMenu()
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeCtxMenu()
}

function onCtxDelete(): void {
  const id = ctxMenu.value.noteId
  closeCtxMenu()
  if (id && confirm('确定删除该笔记？')) {
    notes.remove(id)
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick, true)
  document.addEventListener('keydown', onKey, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick, true)
  document.removeEventListener('keydown', onKey, true)
})
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
      @contextmenu="onContextMenu($event, n.id)"
    >
      <div class="ni-title">{{ n.title || '无标题' }}</div>
      <div class="ni-meta">{{ formatTime(n.updatedAt) }}</div>
    </div>
    <div v-if="notes.list.length === 0" class="note-item" style="cursor: default">
      <div class="ni-title" style="color: var(--text-muted)">暂无笔记</div>
    </div>

    <!-- 右键上下文菜单 -->
    <div
      v-if="ctxMenu.visible"
      class="ctx-menu"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
    >
      <button class="ctx-item danger" @click="onCtxDelete">🗑 删除笔记</button>
    </div>
  </div>
</template>
