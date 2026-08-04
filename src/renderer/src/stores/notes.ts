/**
 * 笔记状态：列表 + 当前选中笔记 + CRUD
 * - 笔记列表按当前笔记本 currentNotebookId 过滤
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ipc } from '../services/ipc'
import { Note, Notebook, NoteChangePayload, NotebookChangePayload } from '@shared/types'
import { titleFromContent } from '../utils'

export type SaveStatus = 'saved' | 'saving' | 'unsaved'

export const useNotesStore = defineStore('notes', () => {
  const list = ref<Note[]>([])
  const currentId = ref<string | null>(null)
  const current = computed<Note | null>(
    () => list.value.find((n) => n.id === currentId.value) ?? null
  )
  const saveStatus = ref<SaveStatus>('saved')

  // 笔记本
  const notebooks = ref<Notebook[]>([])
  const currentNotebookId = ref<string | null>(null)
  const currentNotebook = computed<Notebook | null>(
    () => notebooks.value.find((n) => n.id === currentNotebookId.value) ?? null
  )

  let unsubNote: (() => void) | null = null
  let unsubNotebook: (() => void) | null = null

  /** 加载笔记本列表 */
  async function loadNotebooks(): Promise<void> {
    notebooks.value = await ipc.notebook.list()
    if (!currentNotebookId.value && notebooks.value.length > 0) {
      currentNotebookId.value = notebooks.value[0].id
    }
    if (!unsubNotebook) {
      unsubNotebook = ipc.notebook.onBroadcast(handleNotebookBroadcast)
    }
  }

  /** 切换到指定笔记本，并加载其下笔记 */
  async function selectNotebook(id: string): Promise<void> {
    currentNotebookId.value = id
    currentId.value = null
    list.value = []
    await loadNotes()
  }

  /** 加载当前笔记本下的笔记 */
  async function loadNotes(): Promise<void> {
    if (currentNotebookId.value) {
      list.value = await ipc.note.list(currentNotebookId.value)
    } else {
      list.value = await ipc.note.list()
    }
    if (!currentId.value && list.value.length > 0) {
      currentId.value = list.value[0].id
    }
    if (!unsubNote) {
      unsubNote = ipc.note.onBroadcast(handleBroadcast)
    }
  }

  /** 兼容旧调用：同时加载笔记本与笔记 */
  async function load(): Promise<void> {
    await loadNotebooks()
    await loadNotes()
  }

  function handleBroadcast(p: NoteChangePayload): void {
    // 只处理当前笔记本范围内的笔记
    const inScope = (n?: Note) => n && (!currentNotebookId.value || n.notebookId === currentNotebookId.value)

    if (p.type === 'create' && p.note) {
      if (!inScope(p.note)) return
      if (!list.value.find((n) => n.id === p.note!.id)) {
        list.value.unshift(p.note)
      }
    } else if (p.type === 'update' && p.note) {
      const idx = list.value.findIndex((n) => n.id === p.note!.id)
      if (idx !== -1) {
        // 若笔记被移到其他笔记本，从当前列表移除
        if (currentNotebookId.value && p.note.notebookId !== currentNotebookId.value) {
          list.value.splice(idx, 1)
          if (currentId.value === p.note.id) {
            currentId.value = list.value[0]?.id ?? null
          }
        } else {
          list.value[idx] = p.note
        }
      } else if (inScope(p.note)) {
        list.value.unshift(p.note)
      }
    } else if (p.type === 'delete' && p.id) {
      let i = list.value.length
      while (i--) {
        if (list.value[i].id === p.id) list.value.splice(i, 1)
      }
      if (currentId.value === p.id) {
        currentId.value = list.value[0]?.id ?? null
      }
    }
  }

  function handleNotebookBroadcast(p: NotebookChangePayload): void {
    if (p.type === 'create' && p.notebook) {
      if (!notebooks.value.find((n) => n.id === p.notebook!.id)) {
        notebooks.value.push(p.notebook)
      }
    } else if (p.type === 'update' && p.notebook) {
      const idx = notebooks.value.findIndex((n) => n.id === p.notebook!.id)
      if (idx !== -1) {
        notebooks.value[idx] = p.notebook
      }
    } else if (p.type === 'delete' && p.id) {
      const idx = notebooks.value.findIndex((n) => n.id === p.id)
      if (idx !== -1) {
        notebooks.value.splice(idx, 1)
      }
      // 若删除的是当前笔记本，切回第一个
      if (currentNotebookId.value === p.id) {
        const next = notebooks.value[0]
        if (next) {
          selectNotebook(next.id)
        } else {
          currentNotebookId.value = null
          list.value = []
          currentId.value = null
        }
      }
    }
  }

  async function select(id: string): Promise<void> {
    currentId.value = id
    saveStatus.value = 'saved'
  }

  /** 在当前笔记本下新建笔记 */
  async function create(): Promise<Note | null> {
    const note = await ipc.note.create({ notebookId: currentNotebookId.value ?? undefined })
    // 广播可能已先到达并添加了该笔记，这里做去重，避免重复
    if (!list.value.find((n) => n.id === note.id)) {
      list.value.unshift(note)
    }
    currentId.value = note.id
    saveStatus.value = 'saved'
    return note
  }

  async function createNotebook(name?: string): Promise<Notebook | null> {
    const nb = await ipc.notebook.create({ name })
    if (!notebooks.value.find((n) => n.id === nb.id)) {
      notebooks.value.push(nb)
    }
    return nb
  }

  async function renameNotebook(id: string, name: string): Promise<void> {
    await ipc.notebook.update(id, { name })
  }

  async function removeNotebook(id: string): Promise<void> {
    const ok = await ipc.notebook.delete(id)
    if (!ok) return
    // 广播会处理列表移除与切换
  }

  /** 内容变更（防抖自动保存由 composable 调用） */
  function patchLocal(id: string, patch: Partial<Note>): void {
    const idx = list.value.findIndex((n) => n.id === id)
    if (idx !== -1) {
      list.value[idx] = { ...list.value[idx], ...patch }
    }
  }

  async function saveContent(id: string, content: string): Promise<void> {
    saveStatus.value = 'saving'
    // 若标题已由用户自定义，则保留自定义标题，不根据内容重生成
    // 注意：list 可能在切换笔记本时被临时清空，此时找不到 existing，
    // 为避免误覆盖自定义标题，找不到时也不重生成标题（DB 中已有权威值）
    const existing = list.value.find((n) => n.id === id)
    const patch: Partial<Note> = { content }
    if (existing && !existing.titleCustom) {
      patch.title = titleFromContent(content)
    }
    await ipc.note.update(id, patch)
    patchLocal(id, patch)
    saveStatus.value = 'saved'
  }

  /** 重命名笔记（仅修改标题，不影响内容；标记为自定义标题） */
  async function renameNote(id: string, title: string): Promise<void> {
    await ipc.note.update(id, { title, titleCustom: true })
    patchLocal(id, { title, titleCustom: true })
  }

  async function forceSave(): Promise<void> {
    await ipc.app.flush()
    saveStatus.value = 'saved'
  }

  async function remove(id: string): Promise<void> {
    const ok = await ipc.note.delete(id)
    if (ok) {
      // 广播会处理 list 移除
      if (currentId.value === id) {
        currentId.value = list.value[0]?.id ?? null
      }
    } else {
      // DB 中已不存在（可能是历史残留的重复项），本地兜底清理
      let i = list.value.length
      let removed = false
      while (i--) {
        if (list.value[i].id === id) {
          list.value.splice(i, 1)
          removed = true
        }
      }
      if (removed && currentId.value === id) {
        currentId.value = list.value[0]?.id ?? null
      }
    }
  }

  async function openInNewWindow(id: string): Promise<void> {
    await ipc.win.openNoteWindow(id)
  }

  return {
    list,
    currentId,
    current,
    saveStatus,
    notebooks,
    currentNotebookId,
    currentNotebook,
    load,
    loadNotebooks,
    loadNotes,
    selectNotebook,
    select,
    create,
    createNotebook,
    renameNotebook,
    removeNotebook,
    saveContent,
    renameNote,
    forceSave,
    remove,
    openInNewWindow,
    patchLocal
  }
})
