/**
 * 系统托盘：最小化到托盘 + 托盘菜单
 */
import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import { windowManager } from './window-manager'
import { createNote } from '@db/repository'
import { IPC } from '@shared/types'

let tray: Tray | null = null

export function createTray(): Tray {
  // 使用 1x1 透明图占位（实际项目替换 resources/icon.png）
  let img = nativeImage.createEmpty()
  const iconPath = join(process.resourcesPath ?? app.getAppPath(), 'resources', 'tray.png')
  try {
    img = nativeImage.createFromPath(iconPath)
    if (img.isEmpty()) img = nativeImage.createEmpty()
  } catch {
    /* ignore */
  }

  tray = new Tray(img)
  tray.setToolTip('桌面记事本')

  const rebuild = () => {
    const menu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          const win = windowManager.getMainWindow()
          if (win) {
            win.show()
            win.focus()
          }
        }
      },
      {
        label: '新建临时笔记',
        click: async () => {
          const note = await createNote()
          const main = windowManager.getMainWindow()
          if (main) {
            main.webContents.send(IPC.NOTE_BROADCAST, { type: 'create', note })
            main.show()
            main.focus()
          }
        }
      },
      { type: 'separator' },
      {
        label: '全部置顶切换',
        click: () => {
          const main = windowManager.getMainWindow()
          const top = main?.isAlwaysOnTop() ?? false
          windowManager.setAllAlwaysOnTop(!top)
        }
      },
      {
        label: '全部收起',
        click: () => windowManager.hideAll()
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit()
        }
      }
    ])
    tray?.setContextMenu(menu)
  }

  rebuild()
  tray.on('click', () => {
    const win = windowManager.getMainWindow()
    if (win) {
      if (win.isVisible()) {
        win.hide()
      } else {
        win.show()
        win.focus()
      }
    }
  })

  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
