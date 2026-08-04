<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useUiStore } from '../stores/ui'
import { formatTime } from '../utils'
import { Note } from '@shared/types'

const notes = useNotesStore()
const ui = useUiStore()

// 根据当前排序字段和方向生成有序列表
const sortedList = computed<Note[]>(() => {
  const arr = [...notes.list]
  const field = ui.noteSortField
  const dir = ui.noteSortOrder === 'desc' ? -1 : 1
  arr.sort((a, b) => {
    let cmp = 0
    if (field === 'title') {
      cmp = (a.title || '无标题').localeCompare(b.title || '无标题', 'zh-CN')
    } else if (field === 'createdAt') {
      cmp = a.createdAt - b.createdAt
    } else {
      cmp = a.updatedAt - b.updatedAt
    }
    return cmp * dir
  })
  return arr
})

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

async function onCtxDelete(): Promise<void> {
  const id = ctxMenu.value.noteId
  closeCtxMenu()
  if (!id) return
  const ok = await ui.confirm('删除笔记', '此操作将永久删除该笔记，且无法恢复。', true)
  if (ok) {
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
      v-for="n in sortedList"
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
    <div v-if="sortedList.length === 0" class="note-item" style="cursor: default">
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
