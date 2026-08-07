/**
 * IPC 处理器注册入口
 */
import { ipcMain, BrowserWindow, app, dialog } from 'electron'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { IPC, Note, Notebook, NoteChangePayload, NotebookChangePayload, AppConfig, PickedImage } from '@shared/types'
import {
  listNotes,
  listNotesByNotebook,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  deleteNotesByNotebook,
  flush
} from '@db/repository'
import {
  listNotebooks,
  getNotebook,
  createNotebook,
  updateNotebook,
  deleteNotebook
} from '@db/notebook-repository'
import { getConfig, setConfig, setConfigDebounced } from '@db/config'
import { windowManager } from '../window-manager'
import { createNoteWindow } from '../note-window'

export function registerIpc(): void {
  // ===== 笔记 =====
  // 传入 notebookId 时返回该笔记本下的笔记，否则返回全部
  ipcMain.handle(IPC.NOTE_LIST, async (_e, notebookId?: string) =>
    notebookId ? listNotesByNotebook(notebookId) : listNotes()
  )

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

  // ===== 笔记本 =====
  ipcMain.handle(IPC.NOTEBOOK_LIST, async () => listNotebooks())

  ipcMain.handle(IPC.NOTEBOOK_GET, async (_e, id: string) => getNotebook(id))

  ipcMain.handle(IPC.NOTEBOOK_CREATE, async (_e, partial?: Partial<Notebook>) => {
    const nb = await createNotebook(partial)
    windowManager.broadcastNotebook({ type: 'create', notebook: nb })
    return nb
  })

  ipcMain.handle(IPC.NOTEBOOK_UPDATE, async (_e, id: string, patch: Partial<Notebook>) => {
    const nb = await updateNotebook(id, patch)
    if (nb) {
      windowManager.broadcastNotebook({ type: 'update', notebook: nb })
    }
    return nb
  })

  ipcMain.handle(IPC.NOTEBOOK_DELETE, async (_e, id: string) => {
    // 删除笔记本前：连带删除其下所有笔记
    const removedNoteIds = await deleteNotesByNotebook(id)
    const ok = await deleteNotebook(id)
    if (ok) {
      // 广播笔记本删除
      windowManager.broadcastNotebook({ type: 'delete', id })
      // 广播每个笔记的删除（让前端清理列表与关闭对应独立窗口）
      for (const noteId of removedNoteIds) {
        windowManager.broadcast({ type: 'delete', id: noteId })
        const win = windowManager.getNoteWindow(noteId)
        if (win && !win.isDestroyed()) win.close()
      }
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

  // 渲染进程确认可以关闭：标记后真正关闭窗口
  ipcMain.on(IPC.WIN_PROCEED_CLOSE, (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win || win.isDestroyed()) return
    ;(win as any).__closeConfirmed = true
    win.close()
  })

  // 应用强制保存（Ctrl+S）
  ipcMain.handle('app:flush', async () => {
    await flush()
    return true
  })

  // ===== 图片选择 =====
  // 弹出系统文件选择对话框，读取选中图片为 base64 dataURL
  ipcMain.handle(IPC.IMAGE_PICK, async (): Promise<PickedImage | null> => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: '选择图片',
      properties: ['openFile'],
      filters: [
        { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    try {
      const buf = await readFile(filePath)
      const name = basename(filePath)
      // 根据扩展名推断 MIME
      const ext = name.toLowerCase().split('.').pop() || ''
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        bmp: 'image/bmp',
        ico: 'image/x-icon'
      }
      const mime = mimeMap[ext] || 'image/png'
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`
      return { dataUrl, name }
    } catch {
      return null
    }
  })

  // 退出前清理
  app.on('before-quit', async () => {
    await flush()
  })
}
