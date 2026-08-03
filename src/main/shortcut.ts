/**
 * 全局快捷键：应用未激活时也可触发
 * - Ctrl+Shift+N：唤起/隐藏主窗口（MVP 先注册，详见阶段 3）
 * - Ctrl+Shift+T：新建临时笔记
 */
import { globalShortcut } from 'electron'
import { windowManager } from './window-manager'
import { createNote } from '@db/repository'
import { IPC } from '@shared/types'

export function registerGlobalShortcuts(): void {
  // 唤起/隐藏主窗口
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    const win = windowManager.getMainWindow()
    if (!win) return
    if (win.isVisible() && win.isFocused()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })

  // 新建临时笔记
  globalShortcut.register('CommandOrControl+Shift+T', async () => {
    const note = await createNote()
    const main = windowManager.getMainWindow()
    if (main) {
      main.webContents.send(IPC.NOTE_BROADCAST, { type: 'create', note })
      main.show()
      main.focus()
    }
  })
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll()
}
