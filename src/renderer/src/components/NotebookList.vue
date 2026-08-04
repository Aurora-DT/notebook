<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useUiStore } from '../stores/ui'
import { formatTime } from '../utils'

const notes = useNotesStore()
const ui = useUiStore()

// 右键上下文菜单
const ctxMenu = ref<{ visible: boolean; x: number; y: number; id: string | null }>({
  visible: false,
  x: 0,
  y: 0,
  id: null
})

function onContextMenu(e: MouseEvent, id: string): void {
  e.preventDefault()
  ctxMenu.value = { visible: true, x: e.clientX, y: e.clientY, id }
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

async function onCtxRename(): Promise<void> {
  const id = ctxMenu.value.id
  closeCtxMenu()
  if (!id) return
  const nb = notes.notebooks.find((n) => n.id === id)
  const name = await ui.prompt('请输入新的笔记本名称', nb?.name ?? '', '笔记本名称')
  if (name && name.trim()) {
    await notes.renameNotebook(id, name.trim())
  }
}

async function onCtxDelete(): Promise<void> {
  const id = ctxMenu.value.id
  closeCtxMenu()
  if (!id) return
  const nb = notes.notebooks.find((n) => n.id === id)
  // 统计该笔记本下的笔记数量
  const count = notes.list.filter((n) => n.notebookId === id).length
  const msg =
    count > 0
      ? `此操作将永久删除笔记本「${nb?.name ?? ''}」及其下的 ${count} 条笔记，且无法恢复。`
      : `此操作将永久删除笔记本「${nb?.name ?? ''}」，且无法恢复。`
  const ok = await ui.confirm('删除笔记本', msg, true)
  if (!ok) return
  await notes.removeNotebook(id)
}

// 点击笔记本：进入该笔记本的笔记列表（次级视图）
async function openNotebook(id: string): Promise<void> {
  await notes.selectNotebook(id)
  await ui.showNotesView()
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
  <div class="notebook-list">
    <div
      v-for="nb in notes.notebooks"
      :key="nb.id"
      class="notebook-item"
      :class="{ active: nb.id === notes.currentNotebookId }"
      :title="nb.name"
      @dblclick="openNotebook(nb.id)"
      @contextmenu="onContextMenu($event, nb.id)"
    >
      <div class="nb-icon">📓</div>
      <div class="nb-meta">
        <div class="nb-name">{{ nb.name }}</div>
        <div class="nb-time">{{ formatTime(nb.updatedAt) }}</div>
      </div>
    </div>
    <div v-if="notes.notebooks.length === 0" class="notebook-item" style="cursor: default">
      <div class="nb-icon">📓</div>
      <div class="nb-meta">
        <div class="nb-name" style="color: var(--text-muted)">暂无笔记本</div>
      </div>
    </div>

    <!-- 右键上下文菜单 -->
    <div
      v-if="ctxMenu.visible"
      class="ctx-menu"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
    >
      <button class="ctx-item" @click="onCtxRename">✏ 重命名</button>
      <button class="ctx-item danger" @click="onCtxDelete">🗑 删除笔记本</button>
    </div>
  </div>
</template>
