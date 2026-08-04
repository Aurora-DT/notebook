/**
 * UI 状态：置顶、侧边栏宽度/收缩、主题、查找面板、侧边栏视图模式、自定义 prompt 对话框
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ipc } from '../services/ipc'
import { AppConfig, SidebarView, NoteSortField, NoteSortOrder } from '@shared/types'

const SIDEBAR_MIN = 48
const SIDEBAR_MAX = 360

export const useUiStore = defineStore('ui', () => {
  const alwaysOnTop = ref(false)
  const sidebarWidth = ref(220)
  const sidebarCollapsed = ref(false)
  const theme = ref<NonNullable<AppConfig['theme']>>('system')
  const searchOpen = ref(false)
  /** 侧边栏视图：notebooks 主级 / notes 次级 */
  const sidebarView = ref<SidebarView>('notebooks')
  /** 笔记列表排序字段 */
  const noteSortField = ref<NoteSortField>('updatedAt')
  /** 笔记列表排序方向 */
  const noteSortOrder = ref<NoteSortOrder>('desc')

  /** 自定义 prompt 对话框状态（Electron 中原生 prompt 被禁用） */
  const promptState = ref<{
    visible: boolean
    title: string
    placeholder: string
    value: string
    resolve: ((v: string | null) => void) | null
  }>({
    visible: false,
    title: '',
    placeholder: '',
    value: '',
    resolve: null
  })

  /** 自定义 confirm 对话框状态（Electron 中原生 confirm 被禁用） */
  const confirmState = ref<{
    visible: boolean
    title: string
    message: string
    danger: boolean
    resolve: ((v: boolean) => void) | null
  }>({
    visible: false,
    title: '',
    message: '',
    danger: false,
    resolve: null
  })

  /**
   * 弹出自定义输入对话框，返回用户输入的字符串；取消则返回 null。
   * 用法：const name = await ui.prompt('标题', '默认值', '占位符')
   */
  function prompt(title: string, defaultValue = '', placeholder = ''): Promise<string | null> {
    return new Promise((resolve) => {
      promptState.value = {
        visible: true,
        title,
        placeholder,
        value: defaultValue,
        resolve
      }
    })
  }

  /** 确认输入 */
  function resolvePrompt(value: string): void {
    const resolve = promptState.value.resolve
    promptState.value = { visible: false, title: '', placeholder: '', value: '', resolve: null }
    if (resolve) resolve(value)
  }

  /** 取消输入 */
  function cancelPrompt(): void {
    const resolve = promptState.value.resolve
    promptState.value = { visible: false, title: '', placeholder: '', value: '', resolve: null }
    if (resolve) resolve(null)
  }

  /**
   * 弹出自定义确认对话框，返回用户是否确认。
   * 用法：if (await ui.confirm('标题', '提示信息', true))
   */
  function confirm(title: string, message = '', danger = false): Promise<boolean> {
    return new Promise((resolve) => {
      confirmState.value = {
        visible: true,
        title,
        message,
        danger,
        resolve
      }
    })
  }

  /** 确认 */
  function resolveConfirm(value: boolean): void {
    const resolve = confirmState.value.resolve
    confirmState.value = { visible: false, title: '', message: '', danger: false, resolve: null }
    if (resolve) resolve(value)
  }

  async function loadConfig(): Promise<void> {
    const cfg = await ipc.config.get()
    alwaysOnTop.value = cfg.alwaysOnTop
    sidebarWidth.value = cfg.sidebarWidth
    sidebarCollapsed.value = cfg.sidebarCollapsed
    theme.value = cfg.theme
    sidebarView.value = cfg.sidebarView ?? 'notebooks'
    noteSortField.value = cfg.noteSortField ?? 'updatedAt'
    noteSortOrder.value = cfg.noteSortOrder ?? 'desc'
    applyTheme()
  }

  /**
   * 设置笔记列表排序：点击同字段切换升降序，点击新字段则使用该字段（默认降序）
   */
  async function setNoteSort(field: NoteSortField, order?: NoteSortOrder): Promise<void> {
    if (order) {
      noteSortOrder.value = order
    } else if (field === noteSortField.value) {
      noteSortOrder.value = noteSortOrder.value === 'desc' ? 'asc' : 'desc'
    } else {
      noteSortOrder.value = 'desc'
    }
    noteSortField.value = field
    await ipc.config.set({
      noteSortField: noteSortField.value,
      noteSortOrder: noteSortOrder.value
    })
  }

  function applyTheme(): void {
    const root = document.documentElement
    if (theme.value === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', dark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', theme.value)
    }
  }

  async function toggleAlwaysOnTop(): Promise<void> {
    const next = await ipc.win.toggleTop()
    alwaysOnTop.value = next
  }

  async function toggleSidebar(): Promise<void> {
    const collapsed = await ipc.win.toggleSidebar()
    sidebarCollapsed.value = collapsed
  }

  async function setSidebarWidth(px: number): Promise<void> {
    const clamped = Math.max(SIDEBAR_MIN + 60, Math.min(SIDEBAR_MAX, Math.round(px)))
    sidebarWidth.value = clamped
    // 高频拖拽：本地立即更新 + IPC 防抖落盘
    // 主进程 WIN_SET_SIDEBAR 改为防抖写入
    await ipc.win.setSidebar({ sidebarWidth: clamped })
  }

  /** 切换到笔记本列表（主级） */
  async function showNotebooksView(): Promise<void> {
    sidebarView.value = 'notebooks'
    await ipc.config.set({ sidebarView: 'notebooks' })
  }

  /** 切换到笔记列表（次级） */
  async function showNotesView(): Promise<void> {
    sidebarView.value = 'notes'
    await ipc.config.set({ sidebarView: 'notes' })
  }

  function toggleSearch(): void {
    searchOpen.value = !searchOpen.value
  }

  function focusSearch(): void {
    searchOpen.value = true
  }

  return {
    alwaysOnTop,
    sidebarWidth,
    sidebarCollapsed,
    theme,
    searchOpen,
    sidebarView,
    noteSortField,
    noteSortOrder,
    promptState,
    confirmState,
    SIDEBAR_MIN,
    SIDEBAR_MAX,
    loadConfig,
    applyTheme,
    toggleAlwaysOnTop,
    toggleSidebar,
    setSidebarWidth,
    showNotebooksView,
    showNotesView,
    setNoteSort,
    toggleSearch,
    focusSearch,
    prompt,
    resolvePrompt,
    cancelPrompt,
    confirm,
    resolveConfirm
  }
})
