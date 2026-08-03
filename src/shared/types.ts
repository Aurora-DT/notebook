/**
 * 主进程 / 渲染进程 / preload 共享的类型定义
 */

export interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  pinned?: boolean
  tags?: string[]
}

export interface AppConfig {
  /** 窗口置顶状态 */
  alwaysOnTop: boolean
  /** 侧边栏宽度（px） */
  sidebarWidth: number
  /** 侧边栏是否收缩（仅图标条） */
  sidebarCollapsed: boolean
  /** 自动保存延迟（ms） */
  autoSaveDelay: number
  /** 主题：light / dark / system */
  theme: 'light' | 'dark' | 'system'
  /** 窗口尺寸 */
  windowBounds?: { width: number; height: number; x?: number; y?: number }
}

export const DEFAULT_CONFIG: AppConfig = {
  alwaysOnTop: false,
  sidebarWidth: 220,
  sidebarCollapsed: false,
  autoSaveDelay: 2000,
  theme: 'system'
}

/** IPC 通道名常量 */
export const IPC = {
  // 笔记
  NOTE_LIST: 'note:list',
  NOTE_GET: 'note:get',
  NOTE_CREATE: 'note:create',
  NOTE_UPDATE: 'note:update',
  NOTE_DELETE: 'note:delete',
  NOTE_BROADCAST: 'note:broadcast',
  // 配置
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  // 窗口
  WIN_TOGGLE_TOP: 'win:toggle-top',
  WIN_SET_TOP: 'win:set-top',
  WIN_TOGGLE_SIDEBAR: 'win:toggle-sidebar',
  WIN_SET_SIDEBAR: 'win:set-sidebar',
  WIN_OPEN_NOTE: 'win:open-note',
  WIN_CLOSE_NOTE: 'win:close-note',
  WIN_FOCUS_SEARCH: 'win:focus-search',
  WIN_NOTIFY_TITLE: 'win:notify-title'
} as const

/** 笔记变更广播 payload */
export interface NoteChangePayload {
  type: 'create' | 'update' | 'delete'
  note?: Note
  id?: string
}
