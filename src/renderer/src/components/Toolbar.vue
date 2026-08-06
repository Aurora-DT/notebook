<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useUiStore } from '../stores/ui'
import { useEditor } from '../composables/useEditor'

const notes = useNotesStore()
const ui = useUiStore()
const editor = useEditor()
// 格式刷状态与切换（解构为顶层绑定以保证模板响应式）
const { painterState, togglePainter } = editor

// “编辑”次级菜单：展开后显示在主菜单栏下方一行
const editMenuOpen = ref(false)
const wrapRef = ref<HTMLElement | null>(null)

// 字号下拉菜单：点击 Aa 按钮触发，position: fixed 跟随按钮
const sizeMenuOpen = ref(false)
const sizeBtnRef = ref<HTMLElement | null>(null)
const sizeMenuPos = ref({ x: 0, y: 0 })

// 项目符号下拉菜单：点击 ☰ 按钮触发
const bulletMenuOpen = ref(false)
const bulletBtnRef = ref<HTMLElement | null>(null)
const bulletMenuPos = ref({ x: 0, y: 0 })

function toggleEditMenu(): void {
  editMenuOpen.value = !editMenuOpen.value
}
function closeEditMenu(): void {
  editMenuOpen.value = false
}

function onDocClick(e: MouseEvent): void {
  const target = e.target as Node | null
  // 编辑次级菜单：点击外部不关闭，仅通过再次点击「编辑」按钮收起
  // 字号下拉菜单：点击菜单项内部不关闭（由 runSize 关闭），点击其他位置关闭
  if (sizeMenuOpen.value) {
    const sizeMenuEl = document.querySelector('.size-menu')
    if (sizeMenuEl && target && !sizeMenuEl.contains(target) &&
        !(sizeBtnRef.value && sizeBtnRef.value.contains(target))) {
      closeSizeMenu()
    }
  }
  // 项目符号下拉菜单：同上
  if (bulletMenuOpen.value) {
    const bulletMenuEl = document.querySelector('.bullet-menu')
    if (bulletMenuEl && target && !bulletMenuEl.contains(target) &&
        !(bulletBtnRef.value && bulletBtnRef.value.contains(target))) {
      closeBulletMenu()
    }
  }
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    closeSizeMenu()
    closeBulletMenu()
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

// 次级菜单项：点击后执行，菜单保持展开（仅「编辑」按钮可收起）
function runEdit(fn: () => void): void {
  fn()
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
function runSize(size: 'tiny' | 'small' | 'normal' | 'big' | 'huge'): void {
  editor.setFontSize(size)
  closeSizeMenu()
}

// 项目符号菜单
async function toggleBulletMenu(): Promise<void> {
  if (bulletMenuOpen.value) {
    closeBulletMenu()
    return
  }
  const btn = bulletBtnRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  bulletMenuPos.value = { x: rect.left, y: rect.bottom }
  bulletMenuOpen.value = true
  await nextTick()
}
function closeBulletMenu(): void {
  bulletMenuOpen.value = false
}
/** 选择项目符号样式：若当前无列表，先创建列表再设样式 */
function runBullet(style: 'disc' | 'circle' | 'square' | 'dash' | 'check'): void {
  // 若当前不在列表中，先创建一个默认 disc 列表，再切换样式
  const ed = editor.getEditor()
  if (ed && !ed.isActive('bulletList')) {
    editor.toggleBulletList()
  }
  editor.setBulletStyle(style)
  closeBulletMenu()
}
/** 切换为数字编号列表 */
function runOrdered(): void {
  editor.toggleOrderedList()
  closeBulletMenu()
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
      <button
        title="格式刷：复制当前格式并应用到下一选区"
        class="painter"
        :class="{ active: painterState.active }"
        @click="togglePainter"
      >
        <svg class="painter-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M18 4V3c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V6h1v4H9v11c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-9h8V4h-3z"/>
        </svg>
      </button>
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

      <button
        ref="bulletBtnRef"
        title="项目符号"
        class="bullet"
        :class="{ active: bulletMenuOpen }"
        @click="toggleBulletMenu"
      >☰</button>
      <button title="勾选框" @click="runEdit(() => editor.toggleTaskList())">☑</button>
      <button title="引用 (Ctrl+Q)" @click="runEdit(() => editor.toggleBlockquote())">❝</button>
    </div>

    <!-- 项目符号下拉菜单：与字号菜单风格一致 -->
    <div
      v-if="bulletMenuOpen"
      class="ctx-menu bullet-menu"
      :style="{ left: bulletMenuPos.x + 'px', top: bulletMenuPos.y + 'px' }"
    >
      <div class="ctx-item bullet-item" @click="runBullet('disc')">
        <span class="bullet-preview bullet-disc">•</span>圆点
      </div>
      <div class="ctx-item bullet-item" @click="runBullet('circle')">
        <span class="bullet-preview bullet-circle">○</span>圆圈
      </div>
      <div class="ctx-item bullet-item" @click="runBullet('square')">
        <span class="bullet-preview bullet-square">▪</span>方块
      </div>
      <div class="ctx-item bullet-item" @click="runBullet('dash')">
        <span class="bullet-preview bullet-dash">—</span>短横
      </div>
      <div class="ctx-item bullet-item" @click="runBullet('check')">
        <span class="bullet-preview bullet-check">✓</span>对勾
      </div>
      <div class="ctx-item bullet-item" @click="runOrdered">
        <span class="bullet-preview bullet-ordered">1.</span>数字
      </div>
    </div>

    <!-- 字号下拉菜单：position fixed 跟随按钮，与右键菜单风格一致 -->
    <div
      v-if="sizeMenuOpen"
      class="ctx-menu size-menu"
      :style="{ left: sizeMenuPos.x + 'px', top: sizeMenuPos.y + 'px' }"
    >
      <div class="ctx-item" @click="runSize('huge')">超大</div>
      <div class="ctx-item" @click="runSize('big')">大</div>
      <div class="ctx-item" @click="runSize('normal')">正常</div>
      <div class="ctx-item" @click="runSize('small')">小</div>
      <div class="ctx-item" @click="runSize('tiny')">超小</div>
    </div>
  </div>
</template>
