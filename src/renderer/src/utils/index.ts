/**
 * 工具函数
 */

/** 防抖 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }) as T
}

/** 格式化时间 */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (sameDay) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 从内容推断标题（首个非空行） */
export function titleFromContent(content: string): string {
  const line = content.split('\n').find((l) => l.trim().length > 0)
  if (!line) return '无标题'
  return line.replace(/^#+\s*/, '').slice(0, 60) || '无标题'
}

/** 字数统计 */
export function wordCount(text: string): { chars: number; lines: number } {
  return {
    chars: text.length,
    lines: text.split('\n').length
  }
}
