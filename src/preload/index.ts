/**
 * Preload：通过 contextBridge 暴露受限 API 给渲染进程
 */
import { contextBridge, ipcRenderer } from 'electron'
import { IPC, Note, Notebook, AppConfig, NoteChangePayload, NotebookChangePayload, PickedImage } from '@shared/types'

const api = {
  // ===== 笔记 =====
  note: {
    list: (notebookId?: string): Promise<Note[]> =>
      ipcRenderer.invoke(IPC.NOTE_LIST, notebookId),
    get: (id: string): Promise<Note | null> => ipcRenderer.invoke(IPC.NOTE_GET, id),
    create: (partial?: Partial<Note>): Promise<Note> =>
      ipcRenderer.invoke(IPC.NOTE_CREATE, partial),
    update: (id: string, patch: Partial<Note>): Promise<Note | null> =>
      ipcRenderer.invoke(IPC.NOTE_UPDATE, id, patch),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.NOTE_DELETE, id),
    onBroadcast: (cb: (payload: NoteChangePayload) => void): (() => void) => {
      const handler = (_e: unknown, payload: NoteChangePayload) => cb(payload)
      ipcRenderer.on(IPC.NOTE_BROADCAST, handler as any)
      return () => ipcRenderer.removeListener(IPC.NOTE_BROADCAST, handler as any)
    }
  },
  // ===== 笔记本 =====
  notebook: {
    list: (): Promise<Notebook[]> => ipcRenderer.invoke(IPC.NOTEBOOK_LIST),
    get: (id: string): Promise<Notebook | null> => ipcRenderer.invoke(IPC.NOTEBOOK_GET, id),
    create: (partial?: Partial<Notebook>): Promise<Notebook> =>
      ipcRenderer.invoke(IPC.NOTEBOOK_CREATE, partial),
    update: (id: string, patch: Partial<Notebook>): Promise<Notebook | null> =>
      ipcRenderer.invoke(IPC.NOTEBOOK_UPDATE, id, patch),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.NOTEBOOK_DELETE, id),
    onBroadcast: (cb: (payload: NotebookChangePayload) => void): (() => void) => {
      const handler = (_e: unknown, payload: NotebookChangePayload) => cb(payload)
      ipcRenderer.on(IPC.NOTEBOOK_BROADCAST, handler as any)
      return () => ipcRenderer.removeListener(IPC.NOTEBOOK_BROADCAST, handler as any)
    }
  },
  // ===== 配置 =====
  config: {
    get: (): Promise<AppConfig> => ipcRenderer.invoke(IPC.CONFIG_GET),
    set: (patch: Partial<AppConfig>): Promise<AppConfig> =>
      ipcRenderer.invoke(IPC.CONFIG_SET, patch)
  },
  // ===== 窗口控制 =====
  win: {
    toggleTop: (): Promise<boolean> => ipcRenderer.invoke(IPC.WIN_TOGGLE_TOP),
    setTop: (value: boolean): Promise<boolean> => ipcRenderer.invoke(IPC.WIN_SET_TOP, value),
    toggleSidebar: (): Promise<boolean> => ipcRenderer.invoke(IPC.WIN_TOGGLE_SIDEBAR),
    setSidebar: (patch: Partial<AppConfig>): Promise<AppConfig> =>
      ipcRenderer.invoke(IPC.WIN_SET_SIDEBAR, patch),
    openNoteWindow: (noteId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC.WIN_OPEN_NOTE, noteId),
    closeNoteWindow: (noteId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC.WIN_CLOSE_NOTE, noteId),
    onFocusSearch: (cb: () => void): (() => void) => {
      const handler = () => cb()
      ipcRenderer.on(IPC.WIN_FOCUS_SEARCH, handler)
      return () => ipcRenderer.removeListener(IPC.WIN_FOCUS_SEARCH, handler)
    }
  },
  // ===== 应用 =====
  app: {
    flush: (): Promise<boolean> => ipcRenderer.invoke('app:flush')
  },
  // ===== 图片 =====
  image: {
    pick: (): Promise<PickedImage | null> => ipcRenderer.invoke(IPC.IMAGE_PICK)
  }
}

contextBridge.exposeInMainWorld('notepad', api)

// 渲染进程类型声明（同目录下 .d.ts 提供给 Vue 用）
export type NotepadApi = typeof api
