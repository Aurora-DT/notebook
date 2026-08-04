<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useUiStore } from '../stores/ui'
import { useEditor } from '../composables/useEditor'

const notes = useNotesStore()
const ui = useUiStore()
const editor = useEditor()

// “编辑”下拉菜单
const editMenuOpen = ref(false)
const editMenuRef = ref<HTMLElement | null>(null)

function toggleEditMenu(): void {
  editMenuOpen.value = !editMenuOpen.value
}
function closeEditMenu(): void {
  editMenuOpen.value = false
}

function onDocClick(e: MouseEvent): void {
  if (!editMenuOpen.value) return
  const target = e.target as Node | null
  if (editMenuRef.value && target && !editMenuRef.value.contains(target)) {
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

// 编辑菜单项：点击后执行并收起
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
  <div class="toolbar">
    <button title="新建笔记 (Ctrl+N)" @click="onNew">＋ 新建</button>
    <button title="保存 (Ctrl+S)" @click="onSave">💾 保存</button>
    <button title="查找 (Ctrl+F)" @click="onSearch">🔍 查找</button>

    <div ref="editMenuRef" class="menu-wrap">
      <button
        title="编辑格式 (Ctrl+B/I/U 等)"
        class="menu-trigger"
        :class="{ active: editMenuOpen }"
        @click="toggleEditMenu"
      >
        ✎ 编辑
        <span class="caret">▾</span>
      </button>
      <div v-if="editMenuOpen" class="menu-dropdown">
        <div class="menu-group-label">行内格式</div>
        <button class="menu-item" title="粗体 (Ctrl+B)" @click="runEdit(() => editor.wrapSelection('**'))">
          <span class="mi-icon bold">B</span><span class="mi-text">粗体</span><span class="mi-key">Ctrl+B</span>
        </button>
        <button class="menu-item" title="斜体 (Ctrl+I)" @click="runEdit(() => editor.wrapSelection('*'))">
          <span class="mi-icon italic">I</span><span class="mi-text">斜体</span><span class="mi-key">Ctrl+I</span>
        </button>
        <button class="menu-item" title="下划线 (Ctrl+U)" @click="runEdit(() => editor.wrapSelection('<u>', '</u>', '下划线'))">
          <span class="mi-icon underline">U</span><span class="mi-text">下划线</span><span class="mi-key">Ctrl+U</span>
        </button>
        <button class="menu-item" title="删除线 (Ctrl+Shift+X)" @click="runEdit(() => editor.wrapSelection('~~'))">
          <span class="mi-icon strikethrough">S</span><span class="mi-text">删除线</span><span class="mi-key">Ctrl+Shift+X</span>
        </button>
        <button class="menu-item" title="行内代码 (Ctrl+Shift+`)" @click="runEdit(() => editor.wrapSelection('`'))">
          <span class="mi-icon mono">&lt;/&gt;</span><span class="mi-text">行内代码</span><span class="mi-key">Ctrl+Shift+`</span>
        </button>

        <div class="menu-sep" />
        <div class="menu-group-label">段落</div>
        <button class="menu-item" title="一级标题 (Ctrl+Shift+1)" @click="runEdit(() => editor.toggleHeading(1))">
          <span class="mi-icon">H1</span><span class="mi-text">一级标题</span><span class="mi-key">Ctrl+Shift+1</span>
        </button>
        <button class="menu-item" title="二级标题 (Ctrl+Shift+2)" @click="runEdit(() => editor.toggleHeading(2))">
          <span class="mi-icon">H2</span><span class="mi-text">二级标题</span><span class="mi-key">Ctrl+Shift+2</span>
        </button>
        <button class="menu-item" title="三级标题 (Ctrl+Shift+3)" @click="runEdit(() => editor.toggleHeading(3))">
          <span class="mi-icon">H3</span><span class="mi-text">三级标题</span><span class="mi-key">Ctrl+Shift+3</span>
        </button>
        <button class="menu-item" title="无序列表 (Ctrl+L)" @click="runEdit(() => editor.toggleLinePrefix('- '))">
          <span class="mi-icon">•</span><span class="mi-text">无序列表</span><span class="mi-key">Ctrl+L</span>
        </button>
        <button class="menu-item" title="引用 (Ctrl+Q)" @click="runEdit(() => editor.toggleLinePrefix('> '))">
          <span class="mi-icon">❝</span><span class="mi-text">引用</span><span class="mi-key">Ctrl+Q</span>
        </button>
      </div>
    </div>

    <button title="删除笔记 (Ctrl+D)" class="danger" @click="onDelete">🗑 删除</button>
    <button title="在新窗口打开" @click="onPopOut">⤴ 弹出</button>
  </div>
</template>
