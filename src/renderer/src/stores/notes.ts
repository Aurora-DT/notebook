/**
 * 笔记状态：列表 + 当前选中笔记 + CRUD
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ipc } from '../services/ipc'
import { Note, NoteChangePayload } from '@shared/types'
import { titleFromContent } from '../utils'

export type SaveStatus = 'saved' | 'saving' | 'unsaved'

export const useNotesStore = defineStore('notes', () => {
  const list = ref<Note[]>([])
  const currentId = ref<string | null>(null)
  const current = computed<Note | null>(
    () => list.value.find((n) => n.id === currentId.value) ?? null
  )
  const saveStatus = ref<SaveStatus>('saved')

  let unsub: (() => void) | null = null

  async function load(): Promise<void> {
    list.value = await ipc.note.list()
    if (!currentId.value && list.value.length > 0) {
      currentId.value = list.value[0].id
    }
    // 订阅广播
    if (!unsub) {
      unsub = ipc.note.onBroadcast(handleBroadcast)
    }
  }

  function handleBroadcast(p: NoteChangePayload): void {
    if (p.type === 'create' && p.note) {
      if (!list.value.find((n) => n.id === p.note!.id)) {
        list.value.unshift(p.note)
      }
    } else if (p.type === 'update' && p.note) {
      const idx = list.value.findIndex((n) => n.id === p.note!.id)
      if (idx !== -1) {
        list.value[idx] = p.note
      } else {
        list.value.unshift(p.note)
      }
      // 同步当前笔记内容（避免覆盖正在编辑的输入）
      if (currentId.value === p.note.id) {
        // 仅在内容来自外部更新时刷新（此处简化：始终刷新）
      }
    } else if (p.type === 'delete' && p.id) {
      const idx = list.value.findIndex((n) => n.id === p.id)
      if (idx !== -1) list.value.splice(idx, 1)
      if (currentId.value === p.id) {
        currentId.value = list.value[0]?.id ?? null
      }
    }
  }

  async function select(id: string): Promise<void> {
    currentId.value = id
    saveStatus.value = 'saved'
  }

  async function create(): Promise<Note | null> {
    const note = await ipc.note.create()
    list.value.unshift(note)
    currentId.value = note.id
    saveStatus.value = 'saved'
    return note
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
    const title = titleFromContent(content)
    await ipc.note.update(id, { content, title })
    saveStatus.value = 'saved'
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
    load,
    select,
    create,
    saveContent,
    forceSave,
    remove,
    openInNewWindow,
    patchLocal
  }
})
