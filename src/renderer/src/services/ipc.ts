/**
 * 渲染进程侧 IPC 调用封装
 * - 统一通过 window.notepad 暴露的 API
 */
import type { Note, Notebook, AppConfig, NoteChangePayload, NotebookChangePayload, PickedImage } from '@shared/types'

type NotepadApi = {
  note: {
    list: (notebookId?: string) => Promise<Note[]>
    get: (id: string) => Promise<Note | null>
    create: (partial?: Partial<Note>) => Promise<Note>
    update: (id: string, patch: Partial<Note>) => Promise<Note | null>
    delete: (id: string) => Promise<boolean>
    onBroadcast: (cb: (payload: NoteChangePayload) => void) => () => void
  }
  notebook: {
    list: () => Promise<Notebook[]>
    get: (id: string) => Promise<Notebook | null>
    create: (partial?: Partial<Notebook>) => Promise<Notebook>
    update: (id: string, patch: Partial<Notebook>) => Promise<Notebook | null>
    delete: (id: string) => Promise<boolean>
    onBroadcast: (cb: (payload: NotebookChangePayload) => void) => () => void
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
  image: {
    pick: () => Promise<PickedImage | null>
  }
}

function getApi(): NotepadApi {
  const api = (window as any).notepad
  if (!api) throw new Error('window.notepad not exposed (preload 未加载)')
  return api as NotepadApi
}

export const ipc = {
  note: {
    list: (notebookId?: string) => getApi().note.list(notebookId),
    get: (id: string) => getApi().note.get(id),
    create: (p?: Partial<Note>) => getApi().note.create(p),
    update: (id: string, patch: Partial<Note>) => getApi().note.update(id, patch),
    delete: (id: string) => getApi().note.delete(id),
    onBroadcast: (cb: (p: NoteChangePayload) => void) => getApi().note.onBroadcast(cb)
  },
  notebook: {
    list: () => getApi().notebook.list(),
    get: (id: string) => getApi().notebook.get(id),
    create: (p?: Partial<Notebook>) => getApi().notebook.create(p),
    update: (id: string, patch: Partial<Notebook>) => getApi().notebook.update(id, patch),
    delete: (id: string) => getApi().notebook.delete(id),
    onBroadcast: (cb: (p: NotebookChangePayload) => void) => getApi().notebook.onBroadcast(cb)
  },
  config: {
    get: () => getApi().config.get(),
    set: (patch: Partial<AppConfig>) => getApi().config.set(patch)
  },
  win: {
    toggleTop: () => getApi().win.toggleTop(),
    setTop: (v: boolean) => getApi().win.setTop(v),
    toggleSidebar: () => getApi().win.toggleSidebar(),
    setSidebar: (patch: Partial<AppConfig>) => getApi().win.setSidebar(patch),
    openNoteWindow: (id: string) => getApi().win.openNoteWindow(id),
    closeNoteWindow: (id: string) => getApi().win.closeNoteWindow(id),
    onFocusSearch: (cb: () => void) => getApi().win.onFocusSearch(cb)
  },
  app: {
    flush: () => getApi().app.flush()
  },
  image: {
    pick: () => getApi().image.pick()
  }
}
