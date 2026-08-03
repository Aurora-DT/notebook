/**
 * 极简 hash 路由：主窗口走 / ，独立笔记窗口走 /note/:id
 */
import { ref } from 'vue'

interface Route {
  path: string
  params: Record<string, string>
}

const current = ref<Route>({ path: '/', params: {} })

function parse(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/'
  const m = hash.match(/^\/note\/(.+)$/)
  if (m) {
    return { path: '/note/:id', params: { id: decodeURIComponent(m[1]) } }
  }
  return { path: '/', params: {} }
}

current.value = parse()
window.addEventListener('hashchange', () => {
  current.value = parse()
})

export const currentRoute = current

export const router = {
  current,
  go(path: string) {
    window.location.hash = path
  }
}
