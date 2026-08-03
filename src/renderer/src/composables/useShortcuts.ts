/**
 * 应用内快捷键：在 window 上监听，分发到对应 action
 * - Ctrl+N 新建 / Ctrl+S 保存 / Ctrl+F 查找 / Ctrl+D 删除 / Ctrl+E 聚焦搜索
 * - F11 全屏切换 / Esc 关闭弹层
 * - 编辑器内部按键（B/I/U、H 替换、Z/Y 撤销重做）由 CodeMirror 自身 keymap 处理
 */
import { onMounted, onBeforeUnmount } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useUiStore } from '../stores/ui'
import { useEditor } from './useEditor'

export function useShortcuts() {
  const notes = useNotesStore()
  const ui = useUiStore()
  const editor = useEditor()

  function isEditableTarget(t: EventTarget | null): boolean {
    const el = t as HTMLElement | null
    if (!el) return false
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true
    if (el.isContentEditable) return true
    // CodeMirror 的 contenteditable 容器
    if (el.closest && el.closest('.cm-content')) return true
    return false
  }

  function onKey(e: KeyboardEvent): void {
    const ctrl = e.ctrlKey || e.metaKey

    // Ctrl+N：新建（非输入态优先；输入态让浏览器处理）
    if (ctrl && e.key.toLowerCase() === 'n') {
      e.preventDefault()
      notes.create()
      return
    }

    // Ctrl+S：强制保存（先取编辑器当前内容立即落盘，再 flush 仓库）
    if (ctrl && e.key.toLowerCase() === 's') {
      e.preventDefault()
      const id = notes.currentId
      if (id && editor.view.value) {
        const content = editor.view.value.state.doc.toString()
        notes.saveContent(id, content).then(() => notes.forceSave())
      } else {
        notes.forceSave()
      }
      return
    }

    // Ctrl+F：查找
    if (ctrl && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      ui.focusSearch()
      editor.openSearch()
      return
    }

    // Ctrl+D：删除当前
    if (ctrl && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      if (notes.currentId && confirm('确定删除当前笔记？')) {
        notes.remove(notes.currentId)
      }
      return
    }

    // Ctrl+E：聚焦搜索框（笔记列表筛选 — MVP 暂等同于打开查找）
    if (ctrl && e.key.toLowerCase() === 'e') {
      e.preventDefault()
      ui.focusSearch()
      return
    }

    // Ctrl+,：打开设置（MVP 暂以提示代替）
    if (ctrl && e.key === ',') {
      e.preventDefault()
      alert('设置面板将在阶段 3 推出')
      return
    }

    // F11：全屏切换
    if (e.key === 'F11') {
      e.preventDefault()
      // BrowserWindow 自带 F11 全屏（应用菜单 togglefullscreen）
      // 此处不重复处理，避免冲突
      return
    }

    // Esc：关闭弹层
    if (e.key === 'Escape') {
      if (ui.searchOpen) {
        ui.searchOpen = false
        editor.closeSearch()
      }
    }
  }

  function install(): void {
    window.addEventListener('keydown', onKey, true)
  }
  function uninstall(): void {
    window.removeEventListener('keydown', onKey, true)
  }

  onBeforeUnmount(() => uninstall())

  return { install, uninstall }
}
