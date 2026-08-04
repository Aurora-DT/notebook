/**
 * 笔记本仓库：CRUD + 列表
 * 数据文件：notebooks.json
 */
import { Notebook } from '@shared/types'
import { readJson, writeJson } from './store'

const FILE = 'notebooks.json'

interface NotebooksData {
  notebooks: Notebook[]
}

const FALLBACK: NotebooksData = { notebooks: [] }

let cache: NotebooksData | null = null

/** 默认笔记本 ID（首次启动时创建） */
export const DEFAULT_NOTEBOOK_ID = 'default-notebook'

async function load(): Promise<NotebooksData> {
  if (cache) return cache
  cache = await readJson<NotebooksData>(FILE, FALLBACK)
  if (cache.notebooks.length === 0) {
    // 首次启动：创建默认笔记本
    const now = Date.now()
    const def: Notebook = {
      id: DEFAULT_NOTEBOOK_ID,
      name: '默认笔记本',
      createdAt: now,
      updatedAt: now
    }
    cache.notebooks.push(def)
    await writeJson(FILE, cache)
  }
  return cache
}

async function persist(): Promise<void> {
  if (!cache) return
  await writeJson(FILE, cache)
}

export async function listNotebooks(): Promise<Notebook[]> {
  const data = await load()
  return [...data.notebooks].sort((a, b) => a.createdAt - b.createdAt)
}

export async function getNotebook(id: string): Promise<Notebook | null> {
  const data = await load()
  return data.notebooks.find((n) => n.id === id) ?? null
}

export async function createNotebook(partial?: Partial<Notebook>): Promise<Notebook> {
  const data = await load()
  const now = Date.now()
  const nb: Notebook = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: partial?.name ?? '新笔记本',
    createdAt: now,
    updatedAt: now
  }
  data.notebooks.push(nb)
  await persist()
  return nb
}

export async function updateNotebook(
  id: string,
  patch: Partial<Pick<Notebook, 'name'>>
): Promise<Notebook | null> {
  const data = await load()
  const idx = data.notebooks.findIndex((n) => n.id === id)
  if (idx === -1) return null
  const next: Notebook = { ...data.notebooks[idx], ...patch, updatedAt: Date.now() }
  data.notebooks[idx] = next
  await persist()
  return next
}

export async function deleteNotebook(id: string): Promise<boolean> {
  const data = await load()
  // 默认笔记本不可删除
  if (id === DEFAULT_NOTEBOOK_ID) return false
  const idx = data.notebooks.findIndex((n) => n.id === id)
  if (idx === -1) return false
  data.notebooks.splice(idx, 1)
  await persist()
  return true
}
