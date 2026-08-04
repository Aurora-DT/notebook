<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { EditorState, Compartment, Transaction } from '@codemirror/state'
import { EditorView, keymap, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap
} from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import { useNotesStore } from '../stores/notes'
import { useEditor } from '../composables/useEditor'
import { markdownDecorations, cleanupEmptyMarks } from '../composables/useMarkdownDecorations'
import { useAutoSave } from '../composables/useAutoSave'
import { ipc } from '../services/ipc'

const props = defineProps<{ noteId: string | null }>()

const host = ref<HTMLDivElement | null>(null)
const editor = useEditor()
const notes = useNotesStore()
const autosave = useAutoSave()

let view: EditorView | null = null
const langComp = new Compartment()

function buildState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      history(),
      highlightActiveLine(),
      foldGutter(),
      bracketMatching(),
      indentOnInput(),
      highlightSelectionMatches(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      markdownDecorations,
      langComp.of(markdown()),
      keymap.of([
        // Markdown 格式化快捷键（放在 defaultKeymap 前，避免被浏览器默认行为抢占）
        { key: 'Mod-b', run: () => { editor.wrapSelection('**'); return true } },
        { key: 'Mod-i', run: () => { editor.wrapSelection('*'); return true } },
        { key: 'Mod-u', run: () => { editor.wrapSelection('<u>', '</u>', '下划线'); return true } },
        { key: 'Mod-Shift-`', run: () => { editor.wrapSelection('`'); return true } },
        { key: 'Mod-Shift-x', run: () => { editor.wrapSelection('~~'); return true } },
        { key: 'Mod-Shift-1', run: () => { editor.toggleHeading(1); return true } },
        { key: 'Mod-Shift-2', run: () => { editor.toggleHeading(2); return true } },
        { key: 'Mod-Shift-3', run: () => { editor.toggleHeading(3); return true } },
        { key: 'Mod-l', run: () => { editor.toggleLinePrefix('- '); return true } },
        { key: 'Mod-q', run: () => { editor.toggleLinePrefix('> '); return true } },
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...foldKeymap,
        indentWithTab
      ]),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': {
          backgroundColor: 'var(--bg)',
          color: 'var(--text)'
        },
        '.cm-content': {
          caretColor: 'var(--accent)'
        },
        '.cm-gutters': {
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--text-muted)'
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(255,255,255,0.04)'
        },
        '&.cm-focused': {
          outline: 'none'
        }
      }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && props.noteId) {
          autosave.onContentChange(props.noteId, u.state.doc.toString())
        }
        // 仅在删除操作后清理空格式标记，避免影响格式化插入（如加粗）
        if (u.docChanged) {
          const isDelete = u.transactions.some(
            (tr) => tr.annotation(Transaction.userEvent)?.includes('delete')
          )
          if (isDelete) {
            setTimeout(() => {
              if (view) cleanupEmptyMarks(view)
            }, 0)
          }
        }
      }),
    ]
  })
}

function ensureView(doc: string): void {
  if (!host.value) return
  if (!view) {
    view = new EditorView({
      state: buildState(doc),
      parent: host.value
    })
    editor.setView(view)
  } else {
    const cur = view.state.doc.toString()
    if (cur !== doc) {
      view.dispatch({
        changes: { from: 0, to: cur.length, insert: doc }
      })
    }
  }
}

async function loadNoteContent(id: string): Promise<string> {
  const note = await ipc.note.get(id)
  return note?.content ?? ''
}

watch(
  () => props.noteId,
  async (id, oldId) => {
    // 切换前对旧笔记强制保存
    if (oldId && view) {
      await notes.saveContent(oldId, view.state.doc.toString())
    }
    if (!id) return
    const content = await loadNoteContent(id)
    ensureView(content)
  },
  // post: 在 DOM 更新后执行，确保 v-if 切换后 host.value 已赋值，
  // 否则首次从 null→有值时 host 还未挂载，ensureView 会直接 return
  { flush: 'post' }
)

onMounted(async () => {
  await nextTick()
  const content = props.noteId ? await loadNoteContent(props.noteId) : ''
  ensureView(content)
})

onBeforeUnmount(async () => {
  if (props.noteId && view) {
    await notes.saveContent(props.noteId, view.state.doc.toString())
  }
  view?.destroy()
  view = null
  editor.setView(null)
})
</script>

<template>
  <div class="editor-host-wrapper" style="flex: 1; min-height: 0; display: flex">
    <div v-if="props.noteId" ref="host" class="editor-host" style="flex: 1" />
    <div v-else class="empty-state">
      选择或新建一条笔记开始记录
    </div>
  </div>
</template>
