/**
 * 编辑器共享：暴露 CodeMirror 实例与查找/替换接口
 * 给 SearchPanel / 快捷键等组件复用
 */
import { shallowRef } from 'vue'
import type { EditorView } from '@codemirror/view'
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

  return {
    view,
    setView,
    focus,
    openSearch,
    closeSearch,
    runSearch,
    runReplace,
    replaceAllOccurrences
  }
}
