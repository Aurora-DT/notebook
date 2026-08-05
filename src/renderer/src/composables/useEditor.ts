/**
 * 编辑器共享：暴露 TipTap 实例与查找/替换/格式化接口
 * 供 SearchPanel / Toolbar / 快捷键等组件复用
 */
import { shallowRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import {
  setSearchState,
  getSearchState,
  type BulletStyle
} from './extensions'

const editorRef = shallowRef<Editor | null>(null)

export function useEditor() {
  function setEditor(e: Editor | null): void {
    editorRef.value = e
  }

  function getEditor(): Editor | null {
    return editorRef.value
  }

  function focus(): void {
    editorRef.value?.commands.focus()
  }

  // ===== 查找/替换 =====

  function openSearch(): void {
    // 搜索面板由 Vue 状态控制，这里仅聚焦
    focus()
  }

  function closeSearch(): void {
    const e = editorRef.value
    if (!e) return
    setSearchState(e.view, { query: '', matches: [], currentIndex: -1 })
  }

  /** 设置查询并跳到第一个匹配 */
  function runSearch(keyword: string, opts: { caseSensitive?: boolean } = {}): void {
    const e = editorRef.value
    if (!e) return
    const next = setSearchState(e.view, {
      query: keyword,
      caseSensitive: opts.caseSensitive ?? false,
      regexp: false
    })
    jumpToCurrent(next)
  }

  function findNext(): void {
    const e = editorRef.value
    if (!e) return
    const s = getSearchState(e.view)
    if (s.matches.length === 0) return
    const idx = (s.currentIndex + 1) % s.matches.length
    const next = setSearchState(e.view, () => ({ currentIndex: idx }))
    jumpToCurrent(next)
  }

  function findPrev(): void {
    const e = editorRef.value
    if (!e) return
    const s = getSearchState(e.view)
    if (s.matches.length === 0) return
    const idx = (s.currentIndex - 1 + s.matches.length) % s.matches.length
    const next = setSearchState(e.view, () => ({ currentIndex: idx }))
    jumpToCurrent(next)
  }

  /** 替换当前匹配，并跳到下一个 */
  function runReplace(
    keyword: string,
    replacement: string,
    opts: { caseSensitive?: boolean; regexp?: boolean } = {}
  ): void {
    const e = editorRef.value
    if (!e) return
    // 确保查询状态最新（用户可能直接点替换未先搜索）
    let s = getSearchState(e.view)
    if (s.query !== keyword || s.caseSensitive !== (opts.caseSensitive ?? false) || s.regexp !== (opts.regexp ?? false)) {
      s = setSearchState(e.view, {
        query: keyword,
        caseSensitive: opts.caseSensitive ?? false,
        regexp: opts.regexp ?? false
      })
    }
    if (s.currentIndex < 0 || s.currentIndex >= s.matches.length) return
    const m = s.matches[s.currentIndex]
    // 替换当前匹配范围
    e.chain().focus().insertContentAt({ from: m.from, to: m.to }, replacement).run()
    // 重新计算匹配并跳到下一个（位置已变，重新搜索）
    const next = setSearchState(e.view, { query: keyword, caseSensitive: opts.caseSensitive ?? false, regexp: opts.regexp ?? false })
    jumpToCurrent(next)
  }

  function replaceAllOccurrences(
    keyword: string,
    replacement: string,
    opts: { caseSensitive?: boolean; regexp?: boolean } = {}
  ): void {
    const e = editorRef.value
    if (!e) return
    // 先确保搜索状态最新
    let s = getSearchState(e.view)
    if (s.query !== keyword || s.caseSensitive !== (opts.caseSensitive ?? false) || s.regexp !== (opts.regexp ?? false)) {
      s = setSearchState(e.view, {
        query: keyword,
        caseSensitive: opts.caseSensitive ?? false,
        regexp: opts.regexp ?? false
      })
    }
    if (s.matches.length === 0) return
    // 倒序替换避免位置偏移：在一个 transaction 里完成
    const sorted = [...s.matches].sort((a, b) => b.from - a.from)
    const tr = e.state.tr
    sorted.forEach((m) => {
      tr.insertText(replacement, m.from, m.to)
    })
    e.view.dispatch(tr)
    setSearchState(e.view, { query: keyword, caseSensitive: opts.caseSensitive ?? false, regexp: opts.regexp ?? false })
  }

  function jumpToCurrent(s: ReturnType<typeof setSearchState>): void {
    const e = editorRef.value
    if (!e) return
    if (s.currentIndex < 0 || s.currentIndex >= s.matches.length) return
    const m = s.matches[s.currentIndex]
    e.chain().focus().setTextSelection({ from: m.from, to: m.to }).run()
    // 滚动到可视区
    const view = e.view
    view.dispatch(view.state.tr.scrollIntoView())
  }

  // ===== Markdown 格式化（保持与旧 API 兼容的命令名） =====

  function toggleBold(): void {
    editorRef.value?.chain().focus().toggleBold().run()
  }
  function toggleItalic(): void {
    editorRef.value?.chain().focus().toggleItalic().run()
  }
  function toggleUnderline(): void {
    editorRef.value?.chain().focus().toggleUnderline().run()
  }
  function toggleStrike(): void {
    editorRef.value?.chain().focus().toggleStrike().run()
  }

  function toggleBulletList(): void {
    editorRef.value?.chain().focus().toggleBulletList().run()
  }

  /** 切换为数字编号列表 */
  function toggleOrderedList(): void {
    editorRef.value?.chain().focus().toggleOrderedList().run()
  }

  /** 设置当前选区所在列表的项目符号样式（disc/circle/square/dash/check） */
  function setBulletStyle(style: BulletStyle): void {
    const e = editorRef.value
    if (!e) return
    const { state } = e
    const tr = state.tr
    let changed = false
    state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
      if (node.type.name === 'bulletList' && node.attrs.listStyle !== style) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, listStyle: style })
        changed = true
      }
    })
    if (changed) e.view.dispatch(tr)
  }

  function toggleBlockquote(): void {
    editorRef.value?.chain().focus().toggleBlockquote().run()
  }

  /** 字号：tiny / small / normal / big / huge */
  type FontSize = 'tiny' | 'small' | 'normal' | 'big' | 'huge'
  function setFontSize(size: FontSize): void {
    const e = editorRef.value
    if (!e) return
    const all = ['tiny', 'small', 'big', 'huge']
    if (size === 'normal') {
      // 移除所有字号 mark
      const chain = e.chain().focus()
      all.forEach((m) => chain.unsetMark(m))
      chain.run()
    } else {
      // 先 unset 其他字号，再 toggle 目标字号
      const chain = e.chain().focus()
      all.filter((m) => m !== size).forEach((m) => chain.unsetMark(m))
      chain.toggleMark(size).run()
    }
  }

  /** 在光标处插入文本（无选中时插入，有选中时替换） */
  function insertText(text: string): void {
    editorRef.value?.chain().focus().insertContent(text).run()
  }

  return {
    editor: editorRef,
    setEditor,
    getEditor,
    focus,
    openSearch,
    closeSearch,
    runSearch,
    findNext,
    findPrev,
    runReplace,
    replaceAllOccurrences,
    // 格式化（兼容旧名）
    wrapSelection: toggleBold, // 占位，Toolbar 不再使用
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrike,
    toggleBulletList,
    toggleOrderedList,
    setBulletStyle,
    toggleBlockquote,
    setFontSize,
    insertText
  }
}
