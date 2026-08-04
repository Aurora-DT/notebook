import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  EditorView,
  type ViewUpdate
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

interface DecoRange {
  from: number
  to: number
  value: Decoration
}

/**
 * Markdown 所见即所得装饰：
 * 隐藏标记符号（** * ~~ ` #），并给内容应用实际字体样式
 */
function buildDecorations(view: EditorView): DecorationSet {
  const decos: DecoRange[] = []

  for (const range of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from: range.from,
      to: range.to,
      enter(node) {
        const t = node.type.name
        const from = node.from
        const to = node.to

        if (
          t === 'StrongEmphasis' ||
          t === 'Emphasis' ||
          t === 'InlineCode'
        ) {
          const first = node.node.firstChild
          const last = node.node.lastChild
          if (!first || !last || first === last) return
          if (first.from >= last.to) return
          // 隐藏首尾标记符号
          decos.push({ from: first.from, to: first.to, value: Decoration.replace({}) })
          decos.push({ from: last.from, to: last.to, value: Decoration.replace({}) })
          const cls =
            t === 'StrongEmphasis'
              ? 'md-bold'
              : t === 'Emphasis'
                ? 'md-italic'
                : 'md-code'
          if (first.to < last.from) {
            decos.push({ from: first.to, to: last.from, value: Decoration.mark({ class: cls }) })
          }
        } else if (t === 'ATXHeading') {
          const markChild = node.node.firstChild
          if (markChild && markChild.type.name === 'HeaderMark') {
            // 隐藏 # 标记
            decos.push({ from: markChild.from, to: markChild.to, value: Decoration.replace({}) })
            // 隐藏标记后的空格
            if (markChild.to < to) {
              const next = view.state.doc.sliceString(markChild.to, markChild.to + 1)
              if (next === ' ') {
                decos.push({ from: markChild.to, to: markChild.to + 1, value: Decoration.replace({}) })
              }
            }
            const level = view.state.doc.sliceString(markChild.from, markChild.to).length
            decos.push({
              from,
              to,
              value: Decoration.mark({ class: `md-heading md-h${Math.min(level, 6)}` })
            })
          }
        }
      }
    })

    // 处理 <u></u> 下划线和 ~~删除线~~（标准 markdown 默认不解析，用正则匹配）
    const startLine = view.state.doc.lineAt(range.from).number
    const endLine = view.state.doc.lineAt(range.to).number
    for (let i = startLine; i <= endLine; i++) {
      const line = view.state.doc.line(i)
      // 下划线 <u>...</u>
      const reU = /<u>([\s\S]*?)<\/u>/g
      let m: RegExpExecArray | null
      while ((m = reU.exec(line.text)) !== null) {
        const tagFrom = line.from + m.index
        const contentFrom = tagFrom + 3
        const contentTo = contentFrom + m[1].length
        const endTo = contentTo + 4
        decos.push({ from: tagFrom, to: contentFrom, value: Decoration.replace({}) })
        decos.push({ from: contentTo, to: endTo, value: Decoration.replace({}) })
        if (contentFrom < contentTo) {
          decos.push({ from: contentFrom, to: contentTo, value: Decoration.mark({ class: 'md-underline' }) })
        }
      }
      // 删除线 ~~...~~
      const reS = /~~([\s\S]*?)~~/g
      while ((m = reS.exec(line.text)) !== null) {
        const tagFrom = line.from + m.index
        const contentFrom = tagFrom + 2
        const contentTo = contentFrom + m[1].length
        const endTo = contentTo + 2
        decos.push({ from: tagFrom, to: contentFrom, value: Decoration.replace({}) })
        decos.push({ from: contentTo, to: endTo, value: Decoration.replace({}) })
        if (contentFrom < contentTo) {
          decos.push({ from: contentFrom, to: contentTo, value: Decoration.mark({ class: 'md-strike' }) })
        }
      }
    }
  }

  return Decoration.set(decos.map((d) => d.value.range(d.from, d.to)), true)
}

export const markdownDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }
    update(u: ViewUpdate): void {
      if (u.docChanged || u.viewportChanged) {
        this.decorations = buildDecorations(u.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)

/**
 * 清理空的格式标记：当格式包裹的内容被删空时（如 `****`、`**`、`~~~~`、`<u></u>`、`` `` ``），
 * 自动删除残留的配对标记符号，避免用户需要手动二次删除。
 * 全文档扫描：清理任意位置的空标记残留。
 * 不强制设置光标位置，由 CodeMirror 随 changes 自动映射。
 * 返回是否执行了清理。
 */
let cleaning = false
export function cleanupEmptyMarks(view: EditorView): boolean {
  if (cleaning) return false
  const ranges: { from: number; to: number }[] = []

  const doc = view.state.doc
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const text = line.text
    const base = line.from
    let m: RegExpExecArray | null

    // 先收集非空粗体 **A** 的范围（保护集），避免误清理其 ** 标记
    const boldRanges: { from: number; to: number }[] = []
    const reBoldAll = /\*\*[\s\S]+?\*\*/g
    while ((m = reBoldAll.exec(text)) !== null) {
      boldRanges.push({ from: base + m.index, to: base + m.index + m[0].length })
    }
    const inBold = (pos: number, len: number): boolean =>
      boldRanges.some((r) => pos >= r.from && pos + len <= r.to)

    // 空粗体：成对 **...** 中间无内容（含 ****）
    const reB = /\*\*([\s\S]*?)\*\*/g
    while ((m = reB.exec(text)) !== null) {
      if (m[1] === '') {
        ranges.push({ from: base + m.index, to: base + m.index + m[0].length })
      }
    }
    // 空斜体残留：*A* 删空后变成 **（两个相邻星号，前后无 *）
    // 用保护集排除非空粗体 **A** 的 ** 标记
    const reI = /(?<!\*)\*\*(?!\*)/g
    while ((m = reI.exec(text)) !== null) {
      const pos = base + m.index
      if (!inBold(pos, 2)) {
        ranges.push({ from: pos, to: pos + 2 })
      }
    }
    // 空删除线：成对 ~~...~~ 中间无内容
    const reS = /~~([\s\S]*?)~~/g
    while ((m = reS.exec(text)) !== null) {
      if (m[1] === '') {
        ranges.push({ from: base + m.index, to: base + m.index + m[0].length })
      }
    }
    // 空下划线 <u></u>
    const reU = /<u>([\s\S]*?)<\/u>/g
    while ((m = reU.exec(text)) !== null) {
      if (m[1] === '') {
        ranges.push({ from: base + m.index, to: base + m.index + m[0].length })
      }
    }
    // 空行内代码：成对 `...` 中间无内容
    const reC = /`([^`]*?)`/g
    while ((m = reC.exec(text)) !== null) {
      if (m[1] === '') {
        ranges.push({ from: base + m.index, to: base + m.index + m[0].length })
      }
    }
  }

  if (ranges.length === 0) return false

  // 按位置倒序排列，避免删除时位置偏移
  ranges.sort((a, b) => b.from - a.from)
  cleaning = true
  view.dispatch({
    changes: ranges.map((r) => ({ from: r.from, to: r.to, insert: '' })),
    userEvent: 'delete'
  })
  cleaning = false
  return true
}
