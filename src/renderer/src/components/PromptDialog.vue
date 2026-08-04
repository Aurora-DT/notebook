<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useUiStore } from '../stores/ui'

const ui = useUiStore()
const inputRef = ref<HTMLInputElement | null>(null)

// 对话框打开时自动聚焦并选中文字
watch(
  () => ui.promptState.visible,
  async (visible) => {
    if (visible) {
      await nextTick()
      if (inputRef.value) {
        inputRef.value.focus()
        inputRef.value.select()
      }
    }
  }
)

function onConfirm(): void {
  const v = ui.promptState.value.trim()
  if (v) ui.resolvePrompt(v)
}

function onCancel(): void {
  ui.cancelPrompt()
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault()
    onConfirm()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    onCancel()
  }
}
</script>

<template>
  <div v-if="ui.promptState.visible" class="prompt-overlay" @click.self="onCancel">
    <div class="prompt-dialog">
      <div class="prompt-title">{{ ui.promptState.title }}</div>
      <input
        ref="inputRef"
        v-model="ui.promptState.value"
        :placeholder="ui.promptState.placeholder"
        class="prompt-input"
        @keydown="onKey"
      />
      <div class="prompt-actions">
        <button class="prompt-btn" @click="onCancel">取消</button>
        <button class="prompt-btn primary" @click="onConfirm">确定</button>
      </div>
    </div>
  </div>
</template>
