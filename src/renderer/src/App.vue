<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { useUiStore } from './stores/ui'
import { useNotesStore } from './stores/notes'
import { useEditor } from './composables/useEditor'
import { currentRoute } from './router'
import Toolbar from './components/Toolbar.vue'
import Sidebar from './components/Sidebar.vue'
import Editor from './components/Editor.vue'
import StatusBar from './components/StatusBar.vue'
import SearchPanel from './components/SearchPanel.vue'
import PromptDialog from './components/PromptDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { useShortcuts } from './composables/useShortcuts'
import { ipc } from './services/ipc'

const ui = useUiStore()
const notes = useNotesStore()
const editorCtl = useEditor()
const { install } = useShortcuts()

const route = currentRoute
const isNoteWindow = computed(() => route.value.path === '/note/:id')
const noteWindowId = computed(() => route.value.params.id ?? null)

let unsubConfirmClose: (() => void) | null = null
let unsubFocusSearch: (() => void) | null = null

/** 关闭前确认：若有未保存内容，弹窗询问是否保存后退出 */
async function handleConfirmClose(): Promise<void> {
  if (notes.saveStatus === 'unsaved') {
    const ok = await ui.confirm(
      '未保存提示',
      '当前笔记有未保存的修改，是否保存后退出？',
      false
    )
    if (!ok) return // 用户取消，不关闭窗口
    // 立即保存当前编辑器内容
    const id = notes.currentId
    const ed = editorCtl.getEditor()
    if (id && ed) {
      await notes.saveContent(id, ed.getHTML())
    }
    await notes.forceSave()
  }
  ipc.win.proceedClose()
}

onMounted(async () => {
  await ui.loadConfig()
  await notes.load()
  // 若是独立笔记窗口，则切换到对应笔记
  if (isNoteWindow.value && noteWindowId.value) {
    await notes.select(noteWindowId.value)
  }
  // 监听主进程触发的「聚焦搜索框」
  unsubFocusSearch = ipc.win.onFocusSearch(() => ui.focusSearch())
  // 监听主进程触发的「关闭前确认」
  unsubConfirmClose = ipc.win.onConfirmClose(handleConfirmClose)
  install()
})

onBeforeUnmount(() => {
  unsubFocusSearch?.()
  unsubConfirmClose?.()
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
    <!-- 全局自定义 confirm 对话框 -->
    <ConfirmDialog />
  </div>
</template>
