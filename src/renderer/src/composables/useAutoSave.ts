/**
 * 自动保存 composable：
 * - 内容变更后按 10 分钟节流落盘（期间持续编辑只保留最新内容）
 * - 暴露 saveStatus 给状态栏
 */
import { useNotesStore } from '../stores/notes'

/** 自动保存间隔：10 分钟 */
const SAVE_INTERVAL_MS = 10 * 60 * 1000

export function useAutoSave() {
  const notes = useNotesStore()

  // 待保存的最新内容（id + html）
  let pending: { id: string; content: string } | null = null
  // 节流定时器
  let timer: ReturnType<typeof setInterval> | null = null

  /** 节流触发：若有待保存内容则落盘 */
  function tick(): void {
    if (!pending) return
    const { id, content } = pending
    pending = null
    notes.saveContent(id, content)
  }

  function onContentChange(id: string, content: string): void {
    notes.saveStatus = 'unsaved'
    pending = { id, content }
    // 首次变更时启动节流定时器，之后每 10 分钟检查一次
    if (!timer) {
      timer = setInterval(tick, SAVE_INTERVAL_MS)
    }
  }

  /** 立即保存待落盘内容并清空定时器（用于手动保存 / 退出前保存） */
  async function forceSave(): Promise<void> {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (pending) {
      const { id, content } = pending
      pending = null
      await notes.saveContent(id, content)
    }
    await notes.forceSave()
  }

  return {
    onContentChange,
    forceSave
  }
}
