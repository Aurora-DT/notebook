<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/ui'
import { useNotesStore } from '../stores/notes'
import NoteList from './NoteList.vue'
import NotebookList from './NotebookList.vue'

const ui = useUiStore()
const notes = useNotesStore()

const sidebarClass = computed(() => ({
  expanded: !ui.sidebarCollapsed,
  collapsed: ui.sidebarCollapsed
}))
const sidebarStyle = computed(() => ({
  '--sidebar-w': ui.sidebarWidth + 'px'
}))

// 拖拽调整宽度
const dragging = ref(false)
function onResizeStart(e: MouseEvent) {
  e.preventDefault()
  dragging.value = true
  const startX = e.clientX
  const startW = ui.sidebarWidth
  const move = (ev: MouseEvent) => {
    const dx = ev.clientX - startX
    ui.setSidebarWidth(startW + dx)
  }
  const up = () => {
    dragging.value = false
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
  }
  document.addEventListener('mousemove', move)
  document.addEventListener('mouseup', up)
}

onMounted(() => {
  // 预留：监听主题变化（system 模式下）
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => ui.applyTheme()
  mq.addEventListener('change', onChange)
  onUnmounted(() => mq.removeEventListener('change', onChange))
})

// 切换到笔记本视图（主级）
async function onSwitchToNotebooks() {
  await ui.showNotebooksView()
}
// 在笔记视图新建笔记
async function onCreateNote() {
  await notes.create()
}
// 在笔记本视图新建笔记本
async function onCreateNotebook() {
  const name = await ui.prompt('请输入笔记本名称', '新笔记本', '笔记本名称')
  if (name && name.trim()) {
    await notes.createNotebook(name.trim())
  }
}
</script>

<template>
  <aside class="sidebar" :class="sidebarClass" :style="sidebarStyle">
    <div class="sidebar-header">
      <!-- 左侧：切换到笔记本 / 新建笔记本 -->
      <button
        v-if="ui.sidebarView === 'notes'"
        class="tb-btn header-left"
        title="切换到笔记本"
        @click="onSwitchToNotebooks"
      >
        <span class="ico">📓</span>
        <span v-if="!ui.sidebarCollapsed" class="label">切换到笔记本</span>
      </button>
      <button
        v-else
        class="tb-btn header-left"
        title="新建笔记本"
        @click="onCreateNotebook"
      >
        <span class="ico">＋</span>
        <span v-if="!ui.sidebarCollapsed" class="label">新建笔记本</span>
      </button>
      <!-- 右侧：收缩 -->
      <button class="tb-btn" :title="ui.sidebarCollapsed ? '展开' : '收缩'" @click="ui.toggleSidebar()">
        {{ ui.sidebarCollapsed ? '»' : '«' }}
      </button>
    </div>
    <!-- 主级：笔记本列表；次级：笔记列表 -->
    <NotebookList v-if="ui.sidebarView === 'notebooks'" />
    <NoteList v-else />
    <div v-if="ui.sidebarView === 'notes'" class="sidebar-footer">
      <button class="tb-btn" style="width: 100%; justify-content: center" title="新建笔记" @click="onCreateNote">
        ＋ {{ ui.sidebarCollapsed ? '' : '新建笔记' }}
      </button>
    </div>
    <!-- 拖拽调整宽度 -->
    <div class="sidebar-resizer" :class="{ active: dragging }" @mousedown="onResizeStart" />
  </aside>
</template>
