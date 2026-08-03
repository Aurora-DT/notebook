/**
 * UI 状态：置顶、侧边栏宽度/收缩、主题、查找面板
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ipc } from '../services/ipc'
import { AppConfig } from '@shared/types'

const SIDEBAR_MIN = 48
const SIDEBAR_MAX = 360

export const useUiStore = defineStore('ui', () => {
  const alwaysOnTop = ref(false)
  const sidebarWidth = ref(220)
  const sidebarCollapsed = ref(false)
  const theme = ref<NonNullable<AppConfig['theme']>>('system')
  const searchOpen = ref(false)

  async function loadConfig(): Promise<void> {
    const cfg = await ipc.config.get()
    alwaysOnTop.value = cfg.alwaysOnTop
    sidebarWidth.value = cfg.sidebarWidth
    sidebarCollapsed.value = cfg.sidebarCollapsed
    theme.value = cfg.theme
    applyTheme()
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
    SIDEBAR_MIN,
    SIDEBAR_MAX,
    loadConfig,
    applyTheme,
    toggleAlwaysOnTop,
    toggleSidebar,
    setSidebarWidth,
    toggleSearch,
    focusSearch
  }
})
