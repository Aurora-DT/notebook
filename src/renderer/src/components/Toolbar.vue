<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useUiStore } from '../stores/ui'
import { useEditor } from '../composables/useEditor'

const notes = useNotesStore()
const ui = useUiStore()
const editor = useEditor()

// “编辑”次级菜单：展开后显示在主菜单栏下方一行
const editMenuOpen = ref(false)
const wrapRef = ref<HTMLElement | null>(null)

// 字号下拉菜单：点击 Aa 按钮触发，position: fixed 跟随按钮
const sizeMenuOpen = ref(false)
const sizeBtnRef = ref<HTMLElement | null>(null)
const sizeMenuPos = ref({ x: 0, y: 0 })

function toggleEditMenu(): void {
  editMenuOpen.value = !editMenuOpen.value
}
function closeEditMenu(): void {
  editMenuOpen.value = false
}

function onDocClick(e: MouseEvent): void {
  const target = e.target as Node | null
  // 编辑次级菜单：点击外部关闭
  if (editMenuOpen.value && wrapRef.value && target && !wrapRef.value.contains(target)) {
    closeEditMenu()
  }
  // 字号下拉菜单：点击菜单项内部不关闭（由 runSize 关闭），点击其他位置关闭
  if (sizeMenuOpen.value) {
    const sizeMenuEl = document.querySelector('.size-menu')
    if (sizeMenuEl && target && !sizeMenuEl.contains(target) &&
        !(sizeBtnRef.value && sizeBtnRef.value.contains(target))) {
      closeSizeMenu()
    }
  }
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    closeSizeMenu()
    closeEditMenu()
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

// 次级菜单项：点击后执行并收起
function runEdit(fn: () => void): void {
  fn()
  closeEditMenu()
}

// 字号菜单：点击 Aa 按钮时定位并展开
async function toggleSizeMenu(): Promise<void> {
  if (sizeMenuOpen.value) {
    closeSizeMenu()
    return
  }
  const btn = sizeBtnRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  sizeMenuPos.value = { x: rect.left, y: rect.bottom }
  sizeMenuOpen.value = true
  await nextTick()
}
function closeSizeMenu(): void {
  sizeMenuOpen.value = false
}
function runSize(size: 'small' | 'normal' | 'big'): void {
  editor.setFontSize(size)
  closeSizeMenu()
}

function onSave() {
  if (notes.currentId) notes.forceSave()
}
function onSearch() {
  ui.toggleSearch()
}
function onPopOut() {
  if (notes.currentId) notes.openInNewWindow(notes.currentId)
}
</script>

<template>
  <div ref="wrapRef" class="toolbar-wrap">
    <!-- 一级主菜单栏 -->
    <div class="toolbar">
      <button title="保存 (Ctrl+S)" @click="onSave">💾 保存</button>
      <button title="查找 (Ctrl+F)" @click="onSearch">🔍 查找</button>
      <button
        title="编辑格式 (Ctrl+B/I/U 等)"
        :class="{ active: editMenuOpen }"
        @click="toggleEditMenu"
      >
        ✎ 编辑
      </button>
      <button title="在新窗口打开" @click="onPopOut">⤴ 弹出</button>
    </div>

    <!-- 二级次级菜单栏：展开时出现在主菜单栏下方，样式与主菜单一致 -->
    <div v-if="editMenuOpen" class="subtoolbar">
      <button title="粗体 (Ctrl+B)" class="bold" @click="runEdit(() => editor.toggleBold())">B</button>
      <button title="斜体 (Ctrl+I)" class="italic" @click="runEdit(() => editor.toggleItalic())">I</button>
      <button title="下划线 (Ctrl+U)" class="underline" @click="runEdit(() => editor.toggleUnderline())">U</button>
      <button title="删除线 (Ctrl+Shift+X)" class="strikethrough" @click="runEdit(() => editor.toggleStrike())">S</button>
      <button
        ref="sizeBtnRef"
        title="切换文字大小"
        class="size"
        :class="{ active: sizeMenuOpen }"
        @click="toggleSizeMenu"
      >Aa</button>

      <span class="toolbar-divider" />

      <button title="一级标题 (Ctrl+Shift+1)" @click="runEdit(() => editor.toggleHeading(1))">H1</button>
      <button title="二级标题 (Ctrl+Shift+2)" @click="runEdit(() => editor.toggleHeading(2))">H2</button>
      <button title="三级标题 (Ctrl+Shift+3)" @click="runEdit(() => editor.toggleHeading(3))">H3</button>
      <button title="无序列表 (Ctrl+L)" @click="runEdit(() => editor.toggleBulletList())">•</button>
      <button title="引用 (Ctrl+Q)" @click="runEdit(() => editor.toggleBlockquote())">❝</button>
    </div>

    <!-- 字号下拉菜单：position fixed 跟随按钮，与右键菜单风格一致 -->
    <div
      v-if="sizeMenuOpen"
      class="ctx-menu size-menu"
      :style="{ left: sizeMenuPos.x + 'px', top: sizeMenuPos.y + 'px' }"
    >
      <div class="ctx-item" @click="runSize('big')">大</div>
      <div class="ctx-item" @click="runSize('normal')">正常</div>
      <div class="ctx-item" @click="runSize('small')">小</div>
    </div>
  </div>
</template>
