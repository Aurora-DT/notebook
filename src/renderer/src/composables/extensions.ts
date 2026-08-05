/**
 * TipTap 自定义扩展：
 * - BigMark / SmallMark：字号标记，对应 <big> / <small> 标签，与旧 Markdown 内嵌 HTML 兼容
 * - SearchReplace：查找/替换高亮插件
 * - HeadingShortcuts：Ctrl+Shift+1/2/3 切换标题
 */
import { Extension, Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/** Ctrl+Shift+1/2/3 切换标题级别 */
export const HeadingShortcuts = Extension.create({
  name: 'headingShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-Shift-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-Shift-3': () => this.editor.commands.toggleHeading({ level: 3 })
    }
  }
})

/** 大字号 mark：<big>text</big> */
export const BigMark = Mark.create({
  name: 'big',
  inclusive: false,
  excludes: 'tiny small huge',
  parseHTML: () => [{ tag: 'big' }],
  renderHTML: ({ HTMLAttributes }) => ['big', mergeAttributes(HTMLAttributes), 0]
})

/** 小字号 mark：<small>text</small> */
export const SmallMark = Mark.create({
  name: 'small',
  inclusive: false,
  excludes: 'tiny big huge',
  parseHTML: () => [{ tag: 'small' }],
  renderHTML: ({ HTMLAttributes }) => ['small', mergeAttributes(HTMLAttributes), 0]
})

/** 超大字号 mark：<huge>text</huge> */
export const HugeMark = Mark.create({
  name: 'huge',
  inclusive: false,
  excludes: 'tiny small big',
  parseHTML: () => [{ tag: 'huge' }],
  renderHTML: ({ HTMLAttributes }) => ['huge', mergeAttributes(HTMLAttributes), 0]
})

/** 超小字号 mark：<tiny>text</tiny> */
export const TinyMark = Mark.create({
  name: 'tiny',
  inclusive: false,
  excludes: 'small big huge',
  parseHTML: () => [{ tag: 'tiny' }],
  renderHTML: ({ HTMLAttributes }) => ['tiny', mergeAttributes(HTMLAttributes), 0]
})

export interface SearchMatch {
  from: number
  to: number
}

interface SearchState {
  query: string
  caseSensitive: boolean
  regexp: boolean
  matches: SearchMatch[]
  currentIndex: number
}

const searchKey = new PluginKey<SearchState>('searchReplace')

const EMPTY: SearchState = {
  query: '',
  caseSensitive: false,
  regexp: false,
  matches: [],
  currentIndex: -1
}

function buildRegex(query: string, opts: { caseSensitive: boolean; regexp: boolean }): RegExp | null {
  if (!query) return null
  let pattern: string
  if (opts.regexp) {
    pattern = query
  } else {
    pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  try {
    return new RegExp(pattern, opts.caseSensitive ? 'g' : 'gi')
  } catch {
    return null
  }
}

/** 遍历文档收集所有匹配范围（按 textblock 分组，避免跨段落匹配） */
function collectMatches(doc: any, regex: RegExp): SearchMatch[] {
  const matches: SearchMatch[] = []
  const walk = (node: any, basePos: number) => {
    if (node.isTextblock) {
      let text = ''
      const positions: number[] = []
      node.forEach((child: any, childOffset: number) => {
        if (child.isText) {
          for (let i = 0; i < child.text.length; i++) {
            positions.push(basePos + childOffset + i)
          }
          text += child.text
        } else if (child.isTextblock) {
          walk(child, basePos + childOffset)
        }
      })
      if (text) {
        regex.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = regex.exec(text)) !== null) {
          if (m[0].length === 0) {
            regex.lastIndex++
            continue
          }
          const from = positions[m.index]
          const to = positions[m.index + m[0].length - 1] + 1
          if (from !== undefined && to !== undefined) {
            matches.push({ from, to })
          }
        }
      }
    } else if (node.isBlock) {
      node.forEach((child: any, childOffset: number) => {
        walk(child, basePos + childOffset)
      })
    }
  }
  walk(doc, 0)
  return matches
}

/** 重新计算匹配（文档变化后） */
function recalc(state: SearchState, doc: any): SearchState {
  if (!state.query) return { ...state, matches: [], currentIndex: -1 }
  const regex = buildRegex(state.query, state)
  if (!regex) return { ...state, matches: [], currentIndex: -1 }
  const matches = collectMatches(doc, regex)
  // 文档变化后保留当前索引范围
  const idx = matches.length > 0 ? Math.min(state.currentIndex, matches.length - 1) : -1
  return { ...state, matches, currentIndex: idx }
}

export const SearchReplace = Extension.create({
  name: 'searchReplace',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchKey,
        state: {
          init: () => EMPTY,
          apply(tr, old) {
            const meta = tr.getMeta(searchKey)
            if (meta) return meta
            if (tr.docChanged) return recalc(old, tr.doc)
            return old
          }
        },
        props: {
          decorations: (state) => {
            const s = searchKey.getState(state)
            if (!s || s.matches.length === 0) return DecorationSet.empty
            const decos = s.matches.map((m, i) => {
              const cls = i === s.currentIndex ? 'search-current' : 'search-match'
              return Decoration.inline(m.from, m.to, { class: cls })
            })
            return DecorationSet.create(state.doc, decos)
          }
        }
      })
    ]
  }
})

/** 对外暴露：通过 dispatch 更新搜索状态 */
export function setSearchState(
  view: any,
  patch: Partial<SearchState> | ((s: SearchState) => Partial<SearchState>)
): SearchState {
  const cur = searchKey.getState(view.state) ?? EMPTY
  const next: SearchState = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) }
  // 若 query/选项变化，重新匹配
  if (
    next.query !== cur.query ||
    next.caseSensitive !== cur.caseSensitive ||
    next.regexp !== cur.regexp
  ) {
    const regex = buildRegex(next.query, next)
    next.matches = regex ? collectMatches(view.state.doc, regex) : []
    next.currentIndex = next.matches.length > 0 ? 0 : -1
  }
  const tr = view.state.tr.setMeta(searchKey, next)
  view.dispatch(tr)
  return next
}

export function getSearchState(view: any): SearchState {
  return searchKey.getState(view.state) ?? EMPTY
}
