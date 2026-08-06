/**
 * TipTap 自定义扩展：
 * - BigMark / SmallMark / HugeMark / TinyMark：字号标记
 * - StyledBulletList：带 listStyle 属性的无序列表
 * - TristateTaskItem：三状态任务项（空/勾/叉）
 * - SearchReplace：查找/替换高亮插件
 */
import { Extension, Mark, Node, mergeAttributes, wrappingInputRule } from '@tiptap/core'
import BulletList from '@tiptap/extension-bullet-list'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

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

/**
 * 字体颜色 mark：<span style="color: ...">text</span>
 * 通过 color 属性存储颜色值，渲染时输出 inline style。
 */
export const ColorMark = Mark.create({
  name: 'color',
  inclusive: false,
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color || element.getAttribute('color') || null,
        renderHTML: (attributes) => {
          if (!attributes.color) return {}
          return { style: `color: ${attributes.color}` }
        }
      }
    }
  },
  parseHTML() {
    return [
      { tag: 'span[style*="color:"]' },
      { tag: 'font[color]' }
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  }
})

/**
 * 带 listStyle 属性的无序列表：
 * 通过 data-list-style 在 CSS 中切换符号类型（disc/circle/square/dash/check）
 */
export const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: 'disc',
        parseHTML: (element) => element.getAttribute('data-list-style') || 'disc',
        renderHTML: (attributes) => ({
          'data-list-style': attributes.listStyle as string
        })
      }
    }
  }
})

/** 项目符号样式类型 */
export type BulletStyle = 'disc' | 'circle' | 'square' | 'dash' | 'check'

/** 任务项状态：空 / 勾 / 叉 */
export type TaskState = 'unchecked' | 'checked' | 'crossed'

/**
 * 三状态任务项：支持空/勾/叉三种状态，点击循环切换。
 * 配合 TaskList 使用（TaskList 是容器，不关心 item 状态）。
 */
export const TristateTaskItem = Node.create({
  name: 'taskItem',

  content: 'paragraph+',
  defining: true,

  addAttributes() {
    return {
      state: {
        default: 'unchecked' as TaskState,
        parseHTML: (element) => (element.getAttribute('data-state') as TaskState) || 'unchecked',
        renderHTML: (attributes) => ({ 'data-state': attributes.state as TaskState })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'li[data-type="taskItem"]', priority: 51 }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'li',
      mergeAttributes(HTMLAttributes, { 'data-type': 'taskItem' }),
      ['label', { contenteditable: 'false', class: 'task-checkbox' }, ['span']],
      ['div', 0]
    ]
  },

  addKeyboardShortcuts() {
    return {
      // 回车续项时强制新项为未勾选状态，避免继承父项的 checked/crossed
      Enter: () => this.editor.commands.splitListItem(this.name, { state: 'unchecked' }),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name)
    }
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }: any) => {
      const listItem = document.createElement('li')
      const checkboxWrapper = document.createElement('label')
      const checkboxStyler = document.createElement('span')
      const content = document.createElement('div')

      checkboxWrapper.contentEditable = 'false'
      checkboxWrapper.className = 'task-checkbox'

      // 点击循环切换：unchecked → checked → crossed → unchecked
      checkboxWrapper.addEventListener('click', (event) => {
        event.preventDefault()
        if (!editor.isEditable || typeof getPos !== 'function') return
        const position = getPos()
        if (typeof position !== 'number') return
        // 从编辑器当前状态读取最新状态，避免闭包 node 过期
        const currentNode = editor.state.doc.nodeAt(position)
        if (!currentNode) return
        const current = (currentNode.attrs.state as TaskState) || 'unchecked'
        const next: TaskState =
          current === 'unchecked' ? 'checked' : current === 'checked' ? 'crossed' : 'unchecked'
        const tr = editor.state.tr
        tr.setNodeMarkup(position, undefined, {
          ...currentNode.attrs,
          state: next
        })
        editor.view.dispatch(tr)
        editor.view.focus()
      })

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        listItem.setAttribute(key, value as string)
      })

      listItem.dataset.state = node.attrs.state
      listItem.dataset.type = 'taskItem'

      checkboxWrapper.append(checkboxStyler)
      listItem.append(checkboxWrapper, content)

      return {
        dom: listItem,
        contentDOM: content,
        update: (updatedNode: any) => {
          if (updatedNode.type !== this.type) return false
          listItem.dataset.state = updatedNode.attrs.state
          return true
        }
      }
    }
  },

  addInputRules() {
    return [
      // [ ] → unchecked, [x] → checked, [/] → crossed
      wrappingInputRule({
        find: /^\s*\[([ x/])\]\s$/,
        type: this.type,
        getAttributes: (match) => ({
          state:
            match[1] === 'x' ? 'checked' : match[1] === '/' ? 'crossed' : 'unchecked'
        })
      })
    ]
  }
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

/* =========================================================================
 * 图片节点 ImageBlock
 * - block 类型，atom + draggable，可整块选中
 * - 属性：src / width / height / align
 * - 自定义 NodeView：4 个角等比缩放手柄 + 工具条（对齐/裁剪/删除）
 * - 拖拽移动：dragstart 时记录节点 pos，配合 ProseMirror 自带的拖拽处理
 * - 裁剪：通过 openCropDialog 弹出模态对话框，输出裁剪后的 dataURL
 * ========================================================================= */

type ImageAlign = 'left' | 'center'

export const ImageBlock = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.querySelector('img')?.getAttribute('src') || null,
        renderHTML: () => ({}) as Record<string, string>
      },
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const w = element.querySelector('img')?.getAttribute('width')
          return w ? Number(w) : null
        },
        renderHTML: () => ({}) as Record<string, string>
      },
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const h = element.querySelector('img')?.getAttribute('height')
          return h ? Number(h) : null
        },
        renderHTML: () => ({}) as Record<string, string>
      },
      align: {
        default: 'center' as ImageAlign,
        parseHTML: (element: HTMLElement) =>
          (element.getAttribute('data-align') as ImageAlign) || 'center',
        renderHTML: (attributes: any) =>
          ({ 'data-align': attributes.align || 'center' }) as Record<string, string>
      }
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-type="image-block"]' }]
  },
  renderHTML({ node }: any) {
    const { src, width, height, align } = node.attrs
    const imgAttrs: Record<string, string> = { src: src || '' }
    if (width) imgAttrs.width = String(width)
    if (height) imgAttrs.height = String(height)
    return [
      'div',
      { 'data-type': 'image-block', 'data-align': align || 'center' },
      ['img', imgAttrs]
    ]
  },
  addNodeView() {
    return ({ node, getPos, editor }: any) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'image-block-wrapper'
      wrapper.setAttribute('data-type', 'image-block')
      wrapper.setAttribute('data-align', node.attrs.align || 'center')

      const img = document.createElement('img')
      img.src = node.attrs.src
      img.draggable = false
      img.alt = ''
      applyImgSize(img, node.attrs.width, node.attrs.height)
      wrapper.append(img)

      // ===== 工具条（悬浮感应式：鼠标进入图片/工具条区域显示，离开延迟隐藏） =====
      const toolbar = document.createElement('div')
      toolbar.className = 'image-toolbar'
      toolbar.contentEditable = 'false'

      const cropBtn = makeToolBtn('✂', '裁剪')
      const deleteBtn = makeToolBtn('✕', '删除图片', true)
      toolbar.append(cropBtn, deleteBtn)
      wrapper.append(toolbar)

      // ===== 4 个角 resize 手柄 =====
      const corners = ['tl', 'tr', 'bl', 'br'] as const
      const handles: HTMLDivElement[] = []
      corners.forEach((c) => {
        const h = document.createElement('div')
        h.className = `resize-handle resize-${c}`
        h.contentEditable = 'false'
        wrapper.append(h)
        handles.push(h)
        h.addEventListener('mousedown', (e) => startResize(e, c))
      })

      // ===== 悬浮感应式显示/隐藏（JS 控制，替代 CSS :hover） =====
      let hideTimer: ReturnType<typeof setTimeout> | null = null
      const showControls = () => {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
        toolbar.style.display = 'flex'
        handles.forEach((h) => (h.style.display = 'block'))
      }
      const scheduleHideControls = () => {
        if (hideTimer) clearTimeout(hideTimer)
        hideTimer = setTimeout(() => {
          toolbar.style.display = 'none'
          handles.forEach((h) => (h.style.display = 'none'))
        }, 200)
      }
      // 初始隐藏
      toolbar.style.display = 'none'
      handles.forEach((h) => (h.style.display = 'none'))
      // 鼠标进入图片块或工具条 → 显示
      wrapper.addEventListener('mouseenter', showControls)
      toolbar.addEventListener('mouseenter', showControls)
      // 鼠标离开图片块或工具条 → 延迟隐藏（让鼠标有时间从图片移到工具条）
      wrapper.addEventListener('mouseleave', scheduleHideControls)
      toolbar.addEventListener('mouseleave', scheduleHideControls)

      // ===== 选中（点击 wrapper 触发 NodeSelection） =====
      wrapper.addEventListener('mousedown', (e) => {
        // 点击工具条 / resize 手柄 不触发选中切换
        if ((e.target as HTMLElement).closest('.image-toolbar, .resize-handle')) return
        if (typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        // 仅在非选中状态下设置 NodeSelection
        const sel = editor.state.selection
        if (sel.from !== pos || sel.to !== pos + node.nodeSize) {
          editor.commands.setNodeSelection(pos)
        }
      })

      // ===== 删除 =====
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        editor.chain().focus().setNodeSelection(pos).deleteSelection().run()
      })

      // ===== 裁剪 =====
      cropBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const src = node.attrs.src
        if (!src) return
        openCropDialog(src, (dataUrl, w, h) => {
          updateAttrs({ src: dataUrl, width: w, height: h })
        })
      })

      // ===== 拖拽移动：依赖 ProseMirror 对 atom draggable 节点的默认拖拽支持
      // （drop 时自动计算位置并移动节点，无需在此手动处理） =====

      // ===== 工具方法 =====
      function updateAttrs(patch: Record<string, unknown>): void {
        if (typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        const tr = editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...patch })
        editor.view.dispatch(tr)
        editor.view.focus()
      }

      function startResize(e: MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br'): void {
        e.preventDefault()
        e.stopPropagation()
        const startX = e.clientX
        const startY = e.clientY
        const startW = img.offsetWidth || img.naturalWidth || 200
        const startH = img.offsetHeight || img.naturalHeight || 150
        const ratio = startW / startH || 1

        function onMove(ev: MouseEvent): void {
          const dx = ev.clientX - startX
          const dy = ev.clientY - startY
          let newW = startW
          if (corner === 'br') newW = Math.max(40, startW + dx)
          else if (corner === 'bl') newW = Math.max(40, startW - dx)
          else if (corner === 'tr') newW = Math.max(40, startW + dx)
          else if (corner === 'tl') newW = Math.max(40, startW - dx)
          // 等比缩放：取主方向 dx 和 dy 中影响更大的那个
          // 这里简化为按宽度等比缩放
          let newH = Math.round(newW / ratio)
          // 允许 shift 自由拉伸
          if (ev.shiftKey) {
            newH = Math.max(40, startH + (corner.startsWith('t') ? -dy : dy))
          }
          img.style.width = newW + 'px'
          img.style.height = newH + 'px'
        }
        function onUp(): void {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onUp)
          updateAttrs({ width: img.offsetWidth, height: img.offsetHeight })
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
      }

      return {
        dom: wrapper,
        contentDOM: undefined,
        ignoreMutation: () => true,
        // resize 手柄 / 工具条按钮事件一律拦截，不让 ProseMirror 接管；
        // 拖拽事件由 ProseMirror 默认机制接管，以支持节点在文档中移动
        stopEvent: (e: Event) => {
          const target = e.target as HTMLElement
          if (target.closest('.resize-handle, .image-toolbar')) return true
          return false
        },
        selectNode() {
          wrapper.classList.add('selected')
        },
        deselectNode() {
          wrapper.classList.remove('selected')
        },
        update(updatedNode: any) {
          if (updatedNode.type !== this.type) return false
          if (updatedNode.attrs.src !== node.attrs.src) {
            img.src = updatedNode.attrs.src
          }
          applyImgSize(img, updatedNode.attrs.width, updatedNode.attrs.height)
          wrapper.setAttribute('data-align', updatedNode.attrs.align || 'center')
          // 同步内部 node 引用（避免后续闭包使用旧 attrs）
          Object.assign(node.attrs, updatedNode.attrs)
          return true
        }
      }
    }
  }
})

function makeToolBtn(text: string, title: string, danger = false): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = text
  b.title = title
  b.className = danger ? 'img-tool danger' : 'img-tool'
  return b
}

function applyImgSize(img: HTMLImageElement, w: number | null, h: number | null): void {
  if (w) img.style.width = w + 'px'
  else img.style.width = ''
  if (h) img.style.height = h + 'px'
  else img.style.height = ''
}

/* =========================================================================
 * 裁剪对话框：纯 DOM 实现的模态框
 * - 显示原图到 canvas
 * - 一个可拖动 + 4 角调整大小的裁剪框
 * - 确认后输出裁剪区域为新 dataURL
 * ========================================================================= */

interface CropRect { x: number; y: number; w: number; h: number }

function openCropDialog(
  src: string,
  onConfirm: (dataUrl: string, w: number, h: number) => void
): void {
  const overlay = document.createElement('div')
  overlay.className = 'crop-overlay'

  const dialog = document.createElement('div')
  dialog.className = 'crop-dialog'

  const title = document.createElement('div')
  title.className = 'crop-title'
  title.textContent = '裁剪图片'

  const stageWrap = document.createElement('div')
  stageWrap.className = 'crop-stage-wrap'

  const canvas = document.createElement('canvas')
  canvas.className = 'crop-canvas'

  const selBox = document.createElement('div')
  selBox.className = 'crop-sel'

  // 4 个角的调整手柄
  const selHandles = ['tl', 'tr', 'bl', 'br'] as const
  selHandles.forEach((c) => {
    const h = document.createElement('div')
    h.className = `crop-handle crop-handle-${c}`
    h.dataset.corner = c
    selBox.append(h)
  })

  stageWrap.append(canvas, selBox)

  const info = document.createElement('div')
  info.className = 'crop-info'
  info.textContent = '拖动选区调整裁剪范围，按住角点等比缩放'

  const btnRow = document.createElement('div')
  btnRow.className = 'crop-btn-row'
  const cancelBtn = document.createElement('button')
  cancelBtn.type = 'button'
  cancelBtn.textContent = '取消'
  cancelBtn.className = 'crop-cancel'
  const confirmBtn = document.createElement('button')
  confirmBtn.type = 'button'
  confirmBtn.textContent = '确认裁剪'
  confirmBtn.className = 'crop-confirm'
  btnRow.append(cancelBtn, confirmBtn)

  dialog.append(title, stageWrap, info, btnRow)
  overlay.append(dialog)
  document.body.append(overlay)

  const img = new Image()
  img.onload = () => {
    // 限制 canvas 显示尺寸（最大宽度 600）
    const maxW = 600
    const maxH = 420
    let dispW = img.naturalWidth
    let dispH = img.naturalHeight
    const scaleW = dispW > maxW ? maxW / dispW : 1
    const scaleH = dispH > maxH ? maxH / dispH : 1
    const scale = Math.min(scaleW, scaleH)
    dispW = Math.round(dispW * scale)
    dispH = Math.round(dispH * scale)
    canvas.width = dispW
    canvas.height = dispH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, dispW, dispH)

    // 初始裁剪框：覆盖中间 80%
    const initW = Math.round(dispW * 0.8)
    const initH = Math.round(dispH * 0.8)
    const rect: CropRect = {
      x: Math.round((dispW - initW) / 2),
      y: Math.round((dispH - initH) / 2),
      w: initW,
      h: initH
    }
    renderSel()

    function renderSel(): void {
      selBox.style.left = rect.x + 'px'
      selBox.style.top = rect.y + 'px'
      selBox.style.width = rect.w + 'px'
      selBox.style.height = rect.h + 'px'
      info.textContent = `裁剪范围：${Math.round(rect.w / scale)} × ${Math.round(rect.h / scale)} px`
    }

    function clampRect(): void {
      rect.w = Math.max(20, Math.min(rect.w, dispW))
      rect.h = Math.max(20, Math.min(rect.h, dispH))
      rect.x = Math.max(0, Math.min(rect.x, dispW - rect.w))
      rect.y = Math.max(0, Math.min(rect.y, dispH - rect.h))
    }

    // ===== 拖动整体选区 =====
    selBox.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).classList.contains('crop-handle')) return
      e.preventDefault()
      const startX = e.clientX
      const startY = e.clientY
      const origX = rect.x
      const origY = rect.y
      function onMove(ev: MouseEvent): void {
        rect.x = origX + (ev.clientX - startX)
        rect.y = origY + (ev.clientY - startY)
        clampRect()
        renderSel()
      }
      function onUp(): void {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })

    // ===== 4 角调整大小 =====
    selBox.querySelectorAll('.crop-handle').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const corner = (el as HTMLElement).dataset.corner as 'tl' | 'tr' | 'bl' | 'br'
        const startX = e.clientX
        const startY = e.clientY
        const orig = { ...rect }
        function onMove(ev: MouseEvent): void {
          const dx = ev.clientX - startX
          const dy = ev.clientY - startY
          if (corner === 'br') {
            rect.w = Math.max(20, orig.w + dx)
            rect.h = Math.max(20, orig.h + dy)
          } else if (corner === 'tr') {
            rect.w = Math.max(20, orig.w + dx)
            rect.h = Math.max(20, orig.h - dy)
            rect.y = orig.y + (orig.h - rect.h)
          } else if (corner === 'bl') {
            rect.w = Math.max(20, orig.w - dx)
            rect.h = Math.max(20, orig.h + dy)
            rect.x = orig.x + (orig.w - rect.w)
          } else if (corner === 'tl') {
            rect.w = Math.max(20, orig.w - dx)
            rect.h = Math.max(20, orig.h - dy)
            rect.x = orig.x + (orig.w - rect.w)
            rect.y = orig.y + (orig.h - rect.h)
          }
          // shift 等比
          if (ev.shiftKey) {
            const ratio = orig.w / orig.h || 1
            if (Math.abs(dx) > Math.abs(dy)) {
              rect.h = rect.w / ratio
              if (corner.startsWith('t')) rect.y = orig.y + (orig.h - rect.h)
            } else {
              rect.w = rect.h * ratio
              if (corner.endsWith('l')) rect.x = orig.x + (orig.w - rect.w)
            }
          }
          clampRect()
          renderSel()
        }
        function onUp(): void {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
      })
    })

    // ===== 确认裁剪 =====
    confirmBtn.addEventListener('click', () => {
      const sx = rect.x / scale
      const sy = rect.y / scale
      const sw = rect.w / scale
      const sh = rect.h / scale
      const out = document.createElement('canvas')
      out.width = Math.round(sw)
      out.height = Math.round(sh)
      const octx = out.getContext('2d')!
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height)
      const dataUrl = out.toDataURL('image/png')
      onConfirm(dataUrl, out.width, out.height)
      cleanup()
    })
  }
  img.onerror = () => {
    info.textContent = '图片加载失败'
    confirmBtn.disabled = true
  }
  img.src = src

  function cleanup(): void {
    overlay.remove()
  }

  cancelBtn.addEventListener('click', cleanup)
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) cleanup()
  })
  document.addEventListener('keydown', function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && document.body.contains(overlay)) {
      cleanup()
      document.removeEventListener('keydown', onKey)
    } else if (!document.body.contains(overlay)) {
      document.removeEventListener('keydown', onKey)
    }
  })
}
