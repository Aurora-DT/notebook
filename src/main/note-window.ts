/**
 * 独立笔记窗口：每条笔记可单独弹出为可置顶浮动窗口
 */
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { windowManager } from './window-manager'
import { IPC } from '@shared/types'

const DEV_URL = process.env['ELECTRON_RENDERER_URL'] as string | undefined

export async function createNoteWindow(noteId: string): Promise<BrowserWindow> {
  // 已存在则聚焦
  if (windowManager.focusNoteWindow(noteId)) {
    return windowManager.getNoteWindow(noteId)!
  }

  const win = new BrowserWindow({
    width: 520,
    height: 600,
    minWidth: 320,
    minHeight: 280,
    show: false,
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#1e1e1e',
    title: '笔记窗口',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [`--note-id=${noteId}`]
    }
  })

  // 无条件永远置顶
  win.setAlwaysOnTop(true)

  win.on('ready-to-show', () => {
    win.show()
  })

  win.on('close', (e) => {
    // 已确认关闭：允许关闭
    if ((win as any).__closeConfirmed) return
    // 首次关闭：阻止，询问渲染进程是否有未保存内容
    e.preventDefault()
    win.webContents.send(IPC.WIN_CONFIRM_CLOSE)
  })

  win.on('closed', () => {
    // 由 windowManager 处理
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (DEV_URL) {
    win.loadURL(`${DEV_URL}#/note/${noteId}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: `/note/${noteId}`
    })
  }

  windowManager.registerNoteWindow(noteId, win)
  return win
}
