/**
 * 工具函数
 */
import { marked } from 'marked'

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

/**
 * 判断内容是否已经是 HTML 格式（TipTap 保存的样式）。
 * 启发式：以常见块级标签开头，或包含 TipTap 典型标签结构。
 */
export function isHTMLContent(content: string): boolean {
  if (!content) return false
  // 以 < 开头并匹配块级标签
  if (/^\s*<(p|h[1-6]|ul|ol|li|blockquote|pre|div|table)\b/i.test(content)) return true
  // 包含闭合的 TipTap 常见标签
  if (/<\/(p|h[1-6]|ul|ol|li|blockquote|pre)>/i.test(content)) return true
  return false
}

/** 将 Markdown 转换为 HTML（用于旧笔记迁移） */
export function markdownToHtml(md: string): string {
  if (!md) return ''
  marked.setOptions({ gfm: true, breaks: false })
  return marked.parse(md) as string
}

/**
 * 从 HTML 内容提取首个非空文本作为标题。
 * 用于自动生成笔记标题（当用户未自定义标题时）。
 */
export function titleFromContent(content: string): string {
  if (!content) return '无标题'
  // 若是 HTML，用 DOMParser 提取首个非空文本节点
  if (isHTMLContent(content)) {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(content, 'text/html')
      const blocks = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div')
      for (const b of Array.from(blocks)) {
        const text = b.textContent?.trim()
        if (text) return text.slice(0, 60)
      }
      const all = doc.body.textContent?.trim()
      if (all) return all.slice(0, 60)
      return '无标题'
    } catch {
      // 降级处理
    }
  }
  // 旧 Markdown 或纯文本
  const line = content.split('\n').find((l) => l.trim().length > 0)
  if (!line) return '无标题'
  return line.replace(/^#+\s*/, '').replace(/[*_~`<>]/g, '').slice(0, 60) || '无标题'
}

/** 字数统计（从 HTML 提取纯文本后统计） */
export function wordCount(text: string): { chars: number; lines: number } {
  let plain = text
  if (isHTMLContent(text)) {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/html')
      plain = doc.body.textContent ?? ''
    } catch {
      // 降级
    }
  }
  return {
    chars: plain.length,
    lines: plain.split('\n').length
  }
}
