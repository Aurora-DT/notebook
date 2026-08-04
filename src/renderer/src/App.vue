<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useUiStore } from './stores/ui'
import { useNotesStore } from './stores/notes'
import { currentRoute } from './router'
import Toolbar from './components/Toolbar.vue'
import Sidebar from './components/Sidebar.vue'
import Editor from './components/Editor.vue'
import StatusBar from './components/StatusBar.vue'
import SearchPanel from './components/SearchPanel.vue'
import PromptDialog from './components/PromptDialog.vue'
import { useShortcuts } from './composables/useShortcuts'
import { ipc } from './services/ipc'

const ui = useUiStore()
const notes = useNotesStore()
const { install } = useShortcuts()

const route = currentRoute
const isNoteWindow = computed(() => route.value.path === '/note/:id')
const noteWindowId = computed(() => route.value.params.id ?? null)

onMounted(async () => {
  await ui.loadConfig()
  await notes.load()
  // 若是独立笔记窗口，则切换到对应笔记
  if (isNoteWindow.value && noteWindowId.value) {
    await notes.select(noteWindowId.value)
  }
  // 监听主进程触发的「聚焦搜索框」
  ipc.win.onFocusSearch(() => ui.focusSearch())
  install()
})
</script>

<template>
  <div class="app-layout" :data-theme="ui.theme === 'system' ? '' : ui.theme">
    <div class="app-body">
      <!-- 独立笔记窗口不显示侧边栏 -->
      <Sidebar v-if="!isNoteWindow" />
      <div class="editor-area">
        <Toolbar />
        <div class="editor-host" style="position: relative">
          <Editor :note-id="notes.currentId" />
          <SearchPanel v-if="ui.searchOpen" />
        </div>
        <StatusBar />
      </div>
    </div>
    <!-- 全局自定义 prompt 对话框 -->
    <PromptDialog />
  </div>
</template>
