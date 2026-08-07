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
  /** 所属笔记本 ID（旧数据缺省时归入默认笔记本） */
  notebookId?: string
  /** 标题是否由用户自定义（true 时保存内容不再自动重生成标题） */
  titleCustom?: boolean
}

export interface Notebook {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

/** 侧边栏视图模式：notebooks=笔记本列表（主级），notes=笔记列表（次级） */
export type SidebarView = 'notebooks' | 'notes'

/** 笔记列表排序字段 */
export type NoteSortField = 'updatedAt' | 'createdAt' | 'title'
/** 笔记列表排序方向 */
export type NoteSortOrder = 'asc' | 'desc'

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
  /** 当前激活的笔记本 ID */
  currentNotebookId?: string
  /** 侧边栏当前视图模式 */
  sidebarView: SidebarView
  /** 笔记列表排序字段 */
  noteSortField?: NoteSortField
  /** 笔记列表排序方向 */
  noteSortOrder?: NoteSortOrder
}

export const DEFAULT_CONFIG: AppConfig = {
  alwaysOnTop: false,
  sidebarWidth: 220,
  sidebarCollapsed: false,
  autoSaveDelay: 2000,
  theme: 'system',
  sidebarView: 'notebooks',
  noteSortField: 'updatedAt',
  noteSortOrder: 'desc'
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
  // 笔记本
  NOTEBOOK_LIST: 'notebook:list',
  NOTEBOOK_GET: 'notebook:get',
  NOTEBOOK_CREATE: 'notebook:create',
  NOTEBOOK_UPDATE: 'notebook:update',
  NOTEBOOK_DELETE: 'notebook:delete',
  NOTEBOOK_BROADCAST: 'notebook:broadcast',
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
  WIN_NOTIFY_TITLE: 'win:notify-title',
  // 关闭前确认（主进程 → 渲染进程询问是否有未保存内容）
  WIN_CONFIRM_CLOSE: 'win:confirm-close',
  // 渲染进程确认可以关闭（渲染进程 → 主进程）
  WIN_PROCEED_CLOSE: 'win:proceed-close',
  // 图片
  IMAGE_PICK: 'image:pick'
} as const

/** 图片选择结果：dataURL（base64）与原始文件名 */
export interface PickedImage {
  dataUrl: string
  name: string
}

/** 笔记变更广播 payload */
export interface NoteChangePayload {
  type: 'create' | 'update' | 'delete'
  note?: Note
  id?: string
}

/** 笔记本变更广播 payload */
export interface NotebookChangePayload {
  type: 'create' | 'update' | 'delete'
  notebook?: Notebook
  id?: string
}
