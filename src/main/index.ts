/**
 * 主进程入口
 */
import { app, BrowserWindow, Menu } from 'electron'
import { createMainWindow } from './window'
import { registerIpc } from './ipc'
import { registerGlobalShortcuts, unregisterAll } from './shortcut'
import { windowManager } from './window-manager'

// 单实例锁：必须在 app.ready 之前请求
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  // 已有实例运行，直接退出
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = windowManager.getMainWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
}

let mainWindow: BrowserWindow | null = null

async function bootstrap(): Promise<void> {
  registerIpc()

  mainWindow = await createMainWindow()
  registerGlobalShortcuts()
  // 阶段 2 接入系统托盘（F9），届时取消下行注释
  // createTray()

  // 设置应用菜单（最小化）
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))
}

app.whenReady().then(bootstrap).catch((err) => {
  console.error('[main] bootstrap failed:', err)
})

app.on('window-all-closed', () => {
  // macOS 上保留应用活动，Windows/Linux 直接退出
  if (process.platform === 'darwin') {
    return
  }
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

app.on('will-quit', () => {
  unregisterAll()
})

export {}
