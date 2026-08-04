<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useUiStore } from '../stores/ui'
import { useEditor } from '../composables/useEditor'

const notes = useNotesStore()
const ui = useUiStore()
const editor = useEditor()

// “编辑”次级菜单：展开后显示在主菜单栏下方一行
const editMenuOpen = ref(false)
const wrapRef = ref<HTMLElement | null>(null)

function toggleEditMenu(): void {
  editMenuOpen.value = !editMenuOpen.value
}
function closeEditMenu(): void {
  editMenuOpen.value = false
}

function onDocClick(e: MouseEvent): void {
  if (!editMenuOpen.value) return
  const target = e.target as Node | null
  if (wrapRef.value && target && !wrapRef.value.contains(target)) {
    closeEditMenu()
  }
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeEditMenu()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick, true)
  document.addEventListener('keydown', onKey, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick, true)
  document.removeEventListener('keydown', onKey, true)
})

// 次级菜单项：点击后执行并收起
function runEdit(fn: () => void): void {
  fn()
  closeEditMenu()
}

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
  <div ref="wrapRef" class="toolbar-wrap">
    <!-- 一级主菜单栏 -->
    <div class="toolbar">
      <button title="新建笔记 (Ctrl+N)" @click="onNew">＋ 新建</button>
      <button title="保存 (Ctrl+S)" @click="onSave">💾 保存</button>
      <button title="查找 (Ctrl+F)" @click="onSearch">🔍 查找</button>
      <button
        title="编辑格式 (Ctrl+B/I/U 等)"
        :class="{ active: editMenuOpen }"
        @click="toggleEditMenu"
      >
        ✎ 编辑
      </button>
      <button title="删除笔记 (Ctrl+D)" class="danger" @click="onDelete">🗑 删除</button>
      <button title="在新窗口打开" @click="onPopOut">⤴ 弹出</button>
    </div>

    <!-- 二级次级菜单栏：展开时出现在主菜单栏下方，样式与主菜单一致 -->
    <div v-if="editMenuOpen" class="subtoolbar">
      <button title="粗体 (Ctrl+B)" class="bold" @click="runEdit(() => editor.wrapSelection('**'))">B 粗体</button>
      <button title="斜体 (Ctrl+I)" class="italic" @click="runEdit(() => editor.wrapSelection('*'))">I 斜体</button>
      <button title="下划线 (Ctrl+U)" class="underline" @click="runEdit(() => editor.wrapSelection('<u>', '</u>', '下划线'))">U 下划线</button>
      <button title="删除线 (Ctrl+Shift+X)" class="strikethrough" @click="runEdit(() => editor.wrapSelection('~~'))">S 删除线</button>
      <button title="行内代码 (Ctrl+Shift+`)" class="mono" @click="runEdit(() => editor.wrapSelection('`'))">&lt;/&gt; 代码</button>

      <span class="toolbar-divider" />

      <button title="一级标题 (Ctrl+Shift+1)" @click="runEdit(() => editor.toggleHeading(1))">H1</button>
      <button title="二级标题 (Ctrl+Shift+2)" @click="runEdit(() => editor.toggleHeading(2))">H2</button>
      <button title="三级标题 (Ctrl+Shift+3)" @click="runEdit(() => editor.toggleHeading(3))">H3</button>
      <button title="无序列表 (Ctrl+L)" @click="runEdit(() => editor.toggleLinePrefix('- '))">• 列表</button>
      <button title="引用 (Ctrl+Q)" @click="runEdit(() => editor.toggleLinePrefix('> '))">❝ 引用</button>
    </div>
  </div>
</template>
