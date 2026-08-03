/**
 * 笔记仓库：CRUD + 列表
 * 数据文件：notes.json
 */
import { Note } from '@shared/types'
import { readJson, writeJson } from './store'

const FILE = 'notes.json'

interface NotesData {
  notes: Note[]
}

const FALLBACK: NotesData = { notes: [] }

let cache: NotesData | null = null
let writeTimer: NodeJS.Timeout | null = null
let dirty = false

async function load(): Promise<NotesData> {
  if (cache) return cache
  cache = await readJson<NotesData>(FILE, FALLBACK)
  if (cache.notes.length === 0) {
    // 首次启动：创建一条欢迎笔记
    const now = Date.now()
    const welcome: Note = {
      id: genId(),
      title: '欢迎使用桌面记事本',
      content: [
        '# 欢迎使用桌面记事本',
        '',
        '- 点击左上角 [+] 新建笔记',
        '- Ctrl+N 新建，Ctrl+S 保存，Ctrl+F 查找',
        '- 标题栏 [置顶▣] 可将窗口固定在最前',
        '- 侧边栏可拖拽边缘调整宽度，点击按钮收缩',
        '',
        '所有内容会自动保存到本地。'
      ].join('\n'),
      createdAt: now,
      updatedAt: now
    }
    cache.notes.push(welcome)
    await persist()
  }
  return cache
}

/** 同步持久化（立即写盘） */
async function persist(): Promise<void> {
  if (!cache) return
  await writeJson(FILE, cache)
  dirty = false
}

/** 防抖持久化：高频 update 调用合并为一次写盘 */
function schedulePersist(delay = 400): void {
  if (writeTimer) clearTimeout(writeTimer)
  dirty = true
  writeTimer = setTimeout(() => {
    persist().catch((e) => console.error('[repo] persist failed:', e))
    writeTimer = null
  }, delay)
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function listNotes(): Promise<Note[]> {
  const data = await load()
  return [...data.notes].sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getNote(id: string): Promise<Note | null> {
  const data = await load()
  return data.notes.find((n) => n.id === id) ?? null
}

export async function createNote(partial?: Partial<Note>): Promise<Note> {
  const data = await load()
  const now = Date.now()
  const note: Note = {
    id: genId(),
    title: partial?.title ?? '无标题',
    content: partial?.content ?? '',
    createdAt: now,
    updatedAt: now,
    pinned: false,
    tags: []
  }
  data.notes.push(note)
  await persist()
  return note
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<Note, 'title' | 'content' | 'pinned' | 'tags'>>
): Promise<Note | null> {
  const data = await load()
  const idx = data.notes.findIndex((n) => n.id === id)
  if (idx === -1) return null
  const next: Note = { ...data.notes[idx], ...patch, updatedAt: Date.now() }
  data.notes[idx] = next
  schedulePersist() // 自动保存走防抖
  return next
}

/** 立即落盘（强制保存，如 Ctrl+S） */
export async function flush(): Promise<void> {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }
  if (dirty) await persist()
}

export async function deleteNote(id: string): Promise<boolean> {
  const data = await load()
  const idx = data.notes.findIndex((n) => n.id === id)
  if (idx === -1) return false
  data.notes.splice(idx, 1)
  await persist()
  return true
}
