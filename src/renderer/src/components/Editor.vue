<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useNotesStore } from '../stores/notes'
import { useEditor } from '../composables/useEditor'
import { useAutoSave } from '../composables/useAutoSave'
import { ipc } from '../services/ipc'
import { isHTMLContent, markdownToHtml } from '../utils'
import { BigMark, SmallMark, HugeMark, TinyMark, StyledBulletList, SearchReplace } from '../composables/extensions'

const props = defineProps<{ noteId: string | null }>()

const host = ref<HTMLDivElement | null>(null)
const editorCtl = useEditor()
const notes = useNotesStore()
const autosave = useAutoSave()

let editor: Editor | null = null

function buildExtensions() {
  return [
    StarterKit.configure({
      // 移除 Heading 扩展（不再使用标题功能）
      heading: false,
      // 禁用默认 bulletList，用 StyledBulletList 替代以支持多种符号
      bulletList: false
    }),
    Underline,
    Placeholder.configure({ placeholder: '开始记录...' }),
    BigMark,
    SmallMark,
    HugeMark,
    TinyMark,
    StyledBulletList,
    SearchReplace
  ]
}

function createEditor(doc: string): Editor {
  return new Editor({
    element: host.value!,
    extensions: buildExtensions(),
    content: doc,
    autofocus: 'end',
    onUpdate: ({ editor }) => {
      if (!props.noteId) return
      const html = editor.getHTML()
      autosave.onContentChange(props.noteId, html)
    }
  })
}

async function loadNoteContent(id: string): Promise<string> {
  const note = await ipc.note.get(id)
  let content = note?.content ?? ''
  // 旧 Markdown 笔记迁移：转为 HTML
  if (content && !isHTMLContent(content)) {
    content = markdownToHtml(content)
    // 迁移后立即保存，避免下次重复转换
    await ipc.note.update(id, { content })
  }
  return content
}

function ensureEditor(doc: string): void {
  if (!host.value) return
  if (!editor) {
    editor = createEditor(doc)
    editorCtl.setEditor(editor)
  } else {
    const cur = editor.getHTML()
    if (cur !== doc) {
      // suppressUpdate 避免 setContent 触发 onUpdate 写回（防抖内已处理）
      editor.commands.setContent(doc, false)
    }
  }
}

watch(
  () => props.noteId,
  async (id, oldId) => {
    // 切换前对旧笔记强制保存最新 HTML
    if (oldId && editor) {
      await notes.saveContent(oldId, editor.getHTML())
    }
    if (!id) {
      return
    }
    const content = await loadNoteContent(id)
    ensureEditor(content)
  },
  { flush: 'post' }
)

onMounted(async () => {
  await nextTick()
  const content = props.noteId ? await loadNoteContent(props.noteId) : ''
  ensureEditor(content)
})

onBeforeUnmount(async () => {
  if (props.noteId && editor) {
    await notes.saveContent(props.noteId, editor.getHTML())
  }
  editor?.destroy()
  editor = null
  editorCtl.setEditor(null)
})
</script>

<template>
  <div class="editor-host-wrapper" style="flex: 1; min-height: 0; display: flex">
    <div v-if="props.noteId" ref="host" class="editor-host tiptap-host" style="flex: 1" />
    <div v-else class="empty-state">
      选择或新建一条笔记开始记录
    </div>
  </div>
</template>
