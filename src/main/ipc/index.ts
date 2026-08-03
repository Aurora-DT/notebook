/**
 * IPC 处理器注册入口
 */
import { ipcMain, BrowserWindow, app } from 'electron'
import { IPC, Note, NoteChangePayload, AppConfig } from '@shared/types'
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  flush
} from '@db/repository'
import { getConfig, setConfig, setConfigDebounced } from '@db/config'
import { windowManager } from '../window-manager'
import { createNoteWindow } from '../note-window'

export function registerIpc(): void {
  // ===== 笔记 =====
  ipcMain.handle(IPC.NOTE_LIST, async () => listNotes())

  ipcMain.handle(IPC.NOTE_GET, async (_e, id: string) => getNote(id))

  ipcMain.handle(IPC.NOTE_CREATE, async (_e, partial?: Partial<Note>) => {
    const note = await createNote(partial)
    windowManager.broadcast({ type: 'create', note })
    return note
  })

  ipcMain.handle(IPC.NOTE_UPDATE, async (_e, id: string, patch: Partial<Note>) => {
    const note = await updateNote(id, patch)
    if (note) {
      const payload: NoteChangePayload = { type: 'update', note }
      windowManager.broadcast(payload)
    }
    return note
  })

  ipcMain.handle(IPC.NOTE_DELETE, async (_e, id: string) => {
    const ok = await deleteNote(id)
    if (ok) {
      windowManager.broadcast({ type: 'delete', id })
      // 关闭可能存在的独立窗口
      const win = windowManager.getNoteWindow(id)
      if (win && !win.isDestroyed()) win.close()
    }
    return ok
  })

  // ===== 配置 =====
  ipcMain.handle(IPC.CONFIG_GET, async () => getConfig())
  ipcMain.handle(IPC.CONFIG_SET, async (_e, patch: Partial<AppConfig>) => setConfig(patch))

  // ===== 窗口控制 =====
  ipcMain.handle(IPC.WIN_TOGGLE_TOP, async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return false
    const next = !win.isAlwaysOnTop()
    win.setAlwaysOnTop(next)
    await setConfig({ alwaysOnTop: next })
    return next
  })

  ipcMain.handle(IPC.WIN_SET_TOP, async (e, value: boolean) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return value
    win.setAlwaysOnTop(value)
    await setConfig({ alwaysOnTop: value })
    return value
  })

  ipcMain.handle(IPC.WIN_TOGGLE_SIDEBAR, async () => {
    const cfg = await getConfig()
    const next = !cfg.sidebarCollapsed
    await setConfig({ sidebarCollapsed: next })
    return next
  })

  ipcMain.handle(IPC.WIN_SET_SIDEBAR, async (_e, patch: Partial<AppConfig>) => {
    // 高频拖拽：防抖写入
    const cfg = await setConfigDebounced(patch)
    return cfg
  })

  ipcMain.handle(IPC.WIN_OPEN_NOTE, async (_e, noteId: string) => {
    await createNoteWindow(noteId)
    return true
  })

  ipcMain.handle(IPC.WIN_CLOSE_NOTE, async (_e, noteId: string) => {
    const win = windowManager.getNoteWindow(noteId)
    if (win && !win.isDestroyed()) win.close()
    return true
  })

  // 应用强制保存（Ctrl+S）
  ipcMain.handle('app:flush', async () => {
    await flush()
    return true
  })

  // 退出前清理
  app.on('before-quit', async () => {
    await flush()
  })
}
