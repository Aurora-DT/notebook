/**
 * 渲染进程侧 window.notepad 类型声明
 * 与 preload 暴露的 API 形状保持一致（避免跨进程类型耦合）
 */
import type { Note, AppConfig, NoteChangePayload } from '@shared/types'

interface NotepadApi {
  note: {
    list: () => Promise<Note[]>
    get: (id: string) => Promise<Note | null>
    create: (partial?: Partial<Note>) => Promise<Note>
    update: (id: string, patch: Partial<Note>) => Promise<Note | null>
    delete: (id: string) => Promise<boolean>
    onBroadcast: (cb: (payload: NoteChangePayload) => void) => () => void
  }
  config: {
    get: () => Promise<AppConfig>
    set: (patch: Partial<AppConfig>) => Promise<AppConfig>
  }
  win: {
    toggleTop: () => Promise<boolean>
    setTop: (value: boolean) => Promise<boolean>
    toggleSidebar: () => Promise<boolean>
    setSidebar: (patch: Partial<AppConfig>) => Promise<AppConfig>
    openNoteWindow: (noteId: string) => Promise<boolean>
    closeNoteWindow: (noteId: string) => Promise<boolean>
    onFocusSearch: (cb: () => void) => () => void
  }
  app: {
    flush: () => Promise<boolean>
  }
}

declare global {
  interface Window {
    notepad: NotepadApi
  }
}

export {}
