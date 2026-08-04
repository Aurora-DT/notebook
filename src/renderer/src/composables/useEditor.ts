/**
 * 编辑器共享：暴露 CodeMirror 实例与查找/替换接口
 * 给 SearchPanel / 快捷键等组件复用
 */
import { shallowRef } from 'vue'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import {
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  openSearchPanel,
  closeSearchPanel
} from '@codemirror/search'

const view = shallowRef<EditorView | null>(null)

export function useEditor() {
  function setView(v: EditorView | null): void {
    view.value = v
  }

  function focus(): void {
    view.value?.focus()
  }

  function openSearch(): void {
    const v = view.value
    if (!v) return
    openSearchPanel(v)
  }

  function closeSearch(): void {
    const v = view.value
    if (!v) return
    closeSearchPanel(v)
  }

  /** 高亮所有匹配并跳到下一个 */
  function runSearch(keyword: string, opts: { caseSensitive?: boolean } = {}): void {
    const v = view.value
    if (!v) return
    const query = new SearchQuery({
      search: keyword,
      caseSensitive: opts.caseSensitive ?? false
    })
    v.dispatch({ effects: setSearchQuery.of(query) })
    findNext(v)
  }

  function runReplace(
    keyword: string,
    replacement: string,
    opts: { caseSensitive?: boolean; regexp?: boolean } = {}
  ): void {
    const v = view.value
    if (!v) return
    const query = new SearchQuery({
      search: keyword,
      replace: replacement,
      caseSensitive: opts.caseSensitive ?? false,
      regexp: opts.regexp ?? false
    })
    v.dispatch({ effects: setSearchQuery.of(query) })
    replaceNext(v)
  }

  function replaceAllOccurrences(
    keyword: string,
    replacement: string,
    opts: { caseSensitive?: boolean; regexp?: boolean } = {}
  ): void {
    const v = view.value
    if (!v) return
    const query = new SearchQuery({
      search: keyword,
      replace: replacement,
      caseSensitive: opts.caseSensitive ?? false,
      regexp: opts.regexp ?? false
    })
    v.dispatch({ effects: setSearchQuery.of(query) })
    replaceAll(v)
  }

  // ===== Markdown 格式化 =====

  /**
   * 用指定标记包裹选中文本（如 **、*、~~、`）。
   * 无选中时插入占位符并选中，方便直接输入。
   * 再次对已包裹的文本触发会取消包裹。
   */
  function wrapSelection(
    before: string,
    after: string = before,
    placeholder = '文本'
  ): void {
    const v = view.value
    if (!v) return
    const { from, to } = v.state.selection.main
    const selected = v.state.sliceDoc(from, to)

    // 检测是否已被相同标记包裹 → 取消包裹
    if (selected.length > 0) {
      const len = before.length
      const afterLen = after.length
      if (
        selected.length >= len + afterLen &&
        selected.slice(0, len) === before &&
        selected.slice(selected.length - afterLen) === after
      ) {
        const inner = selected.slice(len, selected.length - afterLen)
        v.dispatch({
          changes: { from, to, insert: inner },
          selection: EditorSelection.range(from, from + inner.length)
        })
        v.focus()
        return
      }
    }

    const text = selected || placeholder
    v.dispatch({
      changes: { from, to, insert: before + text + after },
      selection: EditorSelection.range(
        from + before.length,
        from + before.length + text.length
      )
    })
    v.focus()
  }

  /**
   * 切换行首前缀（如 "# "、" > "、"- "）。
   * 已存在则移除，不存在则添加。
   */
  function toggleLinePrefix(prefix: string): void {
    const v = view.value
    if (!v) return
    const { from } = v.state.selection.main
    const line = v.state.doc.lineAt(from)
    const indent = line.text.length - line.text.trimStart().length
    const contentStart = line.from + indent
    // 若行首（跳过缩进）已是该前缀，移除
    if (line.text.slice(indent).startsWith(prefix)) {
      v.dispatch({
        changes: {
          from: contentStart,
          to: contentStart + prefix.length,
          insert: ''
        }
      })
    } else {
      v.dispatch({
        changes: { from: contentStart, to: contentStart, insert: prefix }
      })
    }
    v.focus()
  }

  /**
   * 切换标题级别（1-6）。
   * 当前行已是同级标题 → 取消；是其他级标题 → 替换；非标题 → 添加。
   */
  function toggleHeading(level: number): void {
    const v = view.value
    if (!v) return
    const { from } = v.state.selection.main
    const line = v.state.doc.lineAt(from)
    const match = line.text.match(/^(#{1,6})\s+/)
    const target = '#'.repeat(level) + ' '
    if (match) {
      const curStart = line.from
      const curLen = match[0].length
      if (match[1].length === level) {
        // 同级 → 取消标题
        v.dispatch({
          changes: { from: curStart, to: curStart + curLen, insert: '' }
        })
      } else {
        // 其他级 → 替换
        v.dispatch({
          changes: { from: curStart, to: curStart + curLen, insert: target }
        })
      }
    } else {
      toggleLinePrefix(target)
    }
    v.focus()
  }

  /** 在光标处插入文本（无选中时插入，有选中时替换） */
  function insertText(text: string): void {
    const v = view.value
    if (!v) return
    const { from, to } = v.state.selection.main
    v.dispatch({
      changes: { from, to, insert: text },
      selection: EditorSelection.cursor(from + text.length)
    })
    v.focus()
  }

  return {
    view,
    setView,
    focus,
    openSearch,
    closeSearch,
    runSearch,
    runReplace,
    replaceAllOccurrences,
    wrapSelection,
    toggleLinePrefix,
    toggleHeading,
    insertText
  }
}
