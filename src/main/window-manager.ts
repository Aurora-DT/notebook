/**
 * 窗口管理器：维护主窗口 + 多个独立笔记窗口的注册表
 * - 笔记变更后向所有打开该笔记的窗口广播
 * - 支持批量操作（全部置顶 / 全部收起）
 */
import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { IPC, NoteChangePayload, NotebookChangePayload } from '@shared/types'

class WindowManager {
  private mainWindow: BrowserWindow | null = null
  /** 独立笔记窗口：noteId -> BrowserWindow */
  private noteWindows = new Map<string, BrowserWindow>()

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  registerNoteWindow(noteId: string, win: BrowserWindow): void {
    this.noteWindows.set(noteId, win)
    win.on('closed', () => {
      this.noteWindows.delete(noteId)
    })
  }

  getNoteWindow(noteId: string): BrowserWindow | null {
    return this.noteWindows.get(noteId) ?? null
  }

  hasNoteWindow(noteId: string): boolean {
    return this.noteWindows.has(noteId)
  }

  focusNoteWindow(noteId: string): boolean {
    const win = this.noteWindows.get(noteId)
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore()
      win.focus()
      return true
    }
    return false
  }

  /** 广播笔记变更到主窗口与对应独立窗口 */
  broadcast(payload: NoteChangePayload): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC.NOTE_BROADCAST, payload)
    }
    const target = payload.note?.id ?? payload.id
    if (target) {
      const win = this.noteWindows.get(target)
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.NOTE_BROADCAST, payload)
      }
    }
  }

  /** 广播笔记本变更到主窗口与所有独立窗口 */
  broadcastNotebook(payload: NotebookChangePayload): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC.NOTEBOOK_BROADCAST, payload)
    }
    for (const win of this.noteWindows.values()) {
      if (!win.isDestroyed()) win.webContents.send(IPC.NOTEBOOK_BROADCAST, payload)
    }
  }

  /** 全部置顶切换 */
  setAllAlwaysOnTop(value: boolean): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.setAlwaysOnTop(value)
    }
    for (const win of this.noteWindows.values()) {
      if (!win.isDestroyed()) win.setAlwaysOnTop(value)
    }
  }

  /** 全部最小化到托盘 */
  hideAll(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide()
    }
    for (const win of this.noteWindows.values()) {
      if (!win.isDestroyed()) win.hide()
    }
  }

  allWindows(): BrowserWindow[] {
    const arr: BrowserWindow[] = []
    if (this.mainWindow && !this.mainWindow.isDestroyed()) arr.push(this.mainWindow)
    for (const win of this.noteWindows.values()) {
      if (!win.isDestroyed()) arr.push(win)
    }
    return arr
  }

  applyWindowOptions(target: 'main' | 'note', options: BrowserWindowConstructorOptions): BrowserWindowConstructorOptions {
    return options
  }
}

export const windowManager = new WindowManager()
