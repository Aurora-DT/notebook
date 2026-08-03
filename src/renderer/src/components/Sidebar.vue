<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/ui'
import { useNotesStore } from '../stores/notes'
import { formatTime } from '../utils'
import NoteList from './NoteList.vue'

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
</script>

<template>
  <aside class="sidebar" :class="sidebarClass" :style="sidebarStyle">
    <div class="sidebar-header">
      <span class="sb-title">笔记 ({{ notes.list.length }})</span>
      <button class="tb-btn" :title="ui.sidebarCollapsed ? '展开' : '收缩'" @click="ui.toggleSidebar()">
        {{ ui.sidebarCollapsed ? '»' : '«' }}
      </button>
    </div>
    <NoteList />
    <div class="sidebar-footer">
      <button class="tb-btn" style="width: 100%; justify-content: center" title="新建笔记" @click="notes.create()">
        ＋ {{ ui.sidebarCollapsed ? '' : '新建笔记' }}
      </button>
    </div>
    <!-- 拖拽调整宽度 -->
    <div class="sidebar-resizer" :class="{ active: dragging }" @mousedown="onResizeStart" />
  </aside>
</template>
