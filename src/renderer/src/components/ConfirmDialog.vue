<script setup lang="ts">
import { useUiStore } from '../stores/ui'

const ui = useUiStore()

function onConfirm(): void {
  ui.resolveConfirm(true)
}

function onCancel(): void {
  ui.resolveConfirm(false)
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
  <div v-if="ui.confirmState.visible" class="confirm-overlay" @click.self="onCancel">
    <div class="confirm-dialog">
      <div class="confirm-title">{{ ui.confirmState.title }}</div>
      <div v-if="ui.confirmState.message" class="confirm-message">
        {{ ui.confirmState.message }}
      </div>
      <div class="confirm-actions">
        <button class="confirm-btn" @click="onCancel">取消</button>
        <button
          class="confirm-btn"
          :class="{ danger: ui.confirmState.danger }"
          @click="onConfirm"
          @keydown="onKey"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>
