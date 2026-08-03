/**
 * 主窗口创建与配置
 */
import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import { windowManager } from './window-manager'
import { getConfig, setConfigDebounced } from '@db/config'

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

  win.setAlwaysOnTop(config.alwaysOnTop)

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
    // 阶段 1：直接退出（无托盘）
    // 阶段 2 接入托盘后改为：e.preventDefault(); saveBounds(); win.hide()
    saveBounds()
    // 允许关闭 → 触发 window-all-closed → app.quit()
    if ((app as any).__quitting) return
    // 标记正在退出，避免多次 saveBounds
    ;(app as any).__quitting = true
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
