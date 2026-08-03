/**
 * 简易 JSON 文件存储：自封装的低依赖数据层
 * - 读时：文件不存在返回默认数据
 * - 写时：原子写入（tmp + rename）+ 友好的格式化
 */
import { app } from 'electron'
import { mkdir, readFile, writeFile, rename } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'

function dataRoot(): string {
  return app.getPath('userData')
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  const full = join(dataRoot(), file)
  if (!existsSync(full)) return fallback
  try {
    const buf = await readFile(full, 'utf8')
    const parsed = JSON.parse(buf)
    return { ...fallback, ...parsed } as T
  } catch (err) {
    console.error('[store] read failed:', full, err)
    return fallback
  }
}

export async function writeJson<T>(file: string, data: T): Promise<void> {
  const full = join(dataRoot(), file)
  await mkdir(dirname(full), { recursive: true })
  // 唯一 tmp 文件名：避免并发写入时 rename 冲突
  const tmp = `${full}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`
  const text = JSON.stringify(data, null, 2)
  await writeFile(tmp, text, 'utf8')
  await rename(tmp, full)
}

export function dataPath(file: string): string {
  return join(dataRoot(), file)
}
