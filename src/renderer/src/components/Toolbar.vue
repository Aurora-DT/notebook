<script setup lang="ts">
import { useNotesStore } from '../stores/notes'
import { useUiStore } from '../stores/ui'

const notes = useNotesStore()
const ui = useUiStore()

function onNew() {
  notes.create()
}
function onSave() {
  if (notes.currentId) notes.forceSave()
}
function onSearch() {
  ui.toggleSearch()
}
function onDelete() {
  if (notes.currentId && confirm('确定删除当前笔记？')) {
    notes.remove(notes.currentId)
  }
}
function onPopOut() {
  if (notes.currentId) notes.openInNewWindow(notes.currentId)
}
</script>

<template>
  <div class="toolbar">
    <button title="新建笔记 (Ctrl+N)" @click="onNew">＋ 新建</button>
    <button title="保存 (Ctrl+S)" @click="onSave">💾 保存</button>
    <button title="查找 (Ctrl+F)" @click="onSearch">🔍 查找</button>
    <button title="删除笔记 (Ctrl+D)" class="danger" @click="onDelete">🗑 删除</button>
    <button title="在新窗口打开" @click="onPopOut">⤴ 弹出</button>
  </div>
</template>
