/**
 * 自动保存 composable：
 * - 内容变更后 2s 防抖落盘
 * - 暴露 saveStatus 给状态栏
 */
import { useNotesStore } from '../stores/notes'
import { debounce } from '../utils'

export function useAutoSave() {
  const notes = useNotesStore()

  const save = debounce(async (id: string, content: string) => {
    await notes.saveContent(id, content)
  }, 2000)

  function onContentChange(id: string, content: string): void {
    notes.saveStatus = 'unsaved'
    save(id, content)
  }

  async function forceSave(): Promise<void> {
    await notes.forceSave()
  }

  return {
    onContentChange,
    forceSave
  }
}
