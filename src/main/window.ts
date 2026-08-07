/**
 * 主窗口创建与配置
 */
import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import { windowManager } from './window-manager'
import { getConfig, setConfigDebounced } from '@db/config'
import { IPC } from '@shared/types'

const DEV_URL = process.env['ELECTRON_RENDERER_URL'] as string | undefined

export async function createMainWindow(): Promise<BrowserWindow> {
  const config = await getConfig()

  const win = new BrowserWindow({
    width: config.windowBounds?.width ?? 960,
    height: config.windowBounds?.height ?? 640,
    x: config.windowBounds?.x,
    y: config.windowBounds?.y,
    minWidth: 640,
    minHeight: 420,
    show: false,
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#1e1e1e',
    title: '桌面记事本',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // 无条件永远置顶
  win.setAlwaysOnTop(true)

  win.on('ready-to-show', () => {
    win.show()
  })

  // 持久化窗口尺寸（防抖）
  const saveBounds = () => {
    if (win.isDestroyed() || !win.isVisible()) return
    setConfigDebounced({ windowBounds: win.getBounds() })
  }
  win.on('resize', saveBounds)
  win.on('move', saveBounds)

  win.on('close', (e) => {
    saveBounds()
    // 已确认关闭或正在退出：允许关闭
    if ((win as any).__closeConfirmed || (app as any).__quitting) return
    // 首次关闭：阻止，询问渲染进程是否有未保存内容
    e.preventDefault()
    win.webContents.send(IPC.WIN_CONFIRM_CLOSE)
  })

  // 外链在系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (DEV_URL) {
    win.loadURL(DEV_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  windowManager.setMainWindow(win)
  return win
}
