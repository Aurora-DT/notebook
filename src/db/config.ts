/**
 * 应用配置（持久化到 config.json）
 * - 高频写入（如窗口 resize）走防抖，避免并发写文件
 */
import { AppConfig, DEFAULT_CONFIG } from '@shared/types'
import { readJson, writeJson } from './store'

const FILE = 'config.json'

let cache: AppConfig | null = null
let writeTimer: NodeJS.Timeout | null = null
let pendingPatch: Partial<AppConfig> | null = null

export async function getConfig(): Promise<AppConfig> {
  if (cache) return cache
  cache = await readJson<AppConfig>(FILE, DEFAULT_CONFIG)
  return cache
}

/** 立即写入（用于显式切换：置顶、侧边栏收缩） */
export async function setConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
  if (!cache) cache = await getConfig()
  cache = { ...cache, ...patch }
  await writeJson(FILE, cache)
  return cache
}

/** 防抖写入（用于高频更新：拖拽调整宽度、窗口 bounds） */
export async function setConfigDebounced(patch: Partial<AppConfig>, delay = 300): Promise<AppConfig> {
  if (!cache) cache = await getConfig()
  cache = { ...cache, ...patch }
  pendingPatch = { ...pendingPatch, ...patch }
  if (writeTimer) clearTimeout(writeTimer)
  return new Promise((resolve) => {
    writeTimer = setTimeout(async () => {
      if (cache && pendingPatch) {
        await writeJson(FILE, cache)
        pendingPatch = null
      }
      writeTimer = null
      resolve(cache!)
    }, delay)
  })
}
