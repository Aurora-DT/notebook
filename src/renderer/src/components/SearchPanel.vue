<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/ui'
import { useEditor } from '../composables/useEditor'

const ui = useUiStore()
const editor = useEditor()

const keyword = ref('')
const replaceText = ref('')
const useRegex = ref(false)
const caseSensitive = ref(false)

function close() {
  ui.searchOpen = false
  editor.closeSearch()
}

function doSearch() {
  editor.runSearch(keyword.value, { caseSensitive: caseSensitive.value })
}

function doReplace() {
  editor.runReplace(keyword.value, replaceText.value, {
    caseSensitive: caseSensitive.value,
    regexp: useRegex.value
  })
}

function doReplaceAll() {
  editor.replaceAllOccurrences(keyword.value, replaceText.value, {
    caseSensitive: caseSensitive.value,
    regexp: useRegex.value
  })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="search-panel">
    <div class="row">
      <input v-model="keyword" placeholder="查找..." @input="doSearch" autofocus />
      <button class="close-btn" title="关闭 (Esc)" @click="close">×</button>
    </div>
    <div class="row">
      <input v-model="replaceText" placeholder="替换为..." />
      <button title="替换当前" @click="doReplace">替换</button>
      <button title="替换全部" @click="doReplaceAll">全部替换</button>
    </div>
    <div class="row" style="font-size: 11px; gap: 8px">
      <label><input type="checkbox" v-model="caseSensitive" @change="doSearch" /> 区分大小写</label>
      <label><input type="checkbox" v-model="useRegex" @change="doSearch" /> 正则</label>
    </div>
  </div>
</template>
