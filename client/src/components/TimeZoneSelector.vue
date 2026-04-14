<script setup>
import { computed, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Number, String, null],
    default: null,
  },
  autoDetect: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const offsets = Array.from({ length: 25 }, (_, index) => index - 12)

const normalizedValue = computed(() => {
  if (props.modelValue === '' || props.modelValue == null) {
    return ''
  }

  const offset = Number(props.modelValue)
  if (!Number.isFinite(offset)) {
    return ''
  }

  return clampOffset(Math.round(offset))
})

onMounted(() => {
  if (!props.autoDetect) {
    return
  }

  if (props.modelValue !== '' && props.modelValue != null) {
    return
  }

  emit('update:modelValue', detectTimeZoneOffset())
})

function detectTimeZoneOffset() {
  const minutes = new Date().getTimezoneOffset()
  const utcOffset = -minutes / 60
  return clampOffset(Math.round(utcOffset))
}

function clampOffset(offset) {
  return Math.min(12, Math.max(-12, offset))
}

function formatOffsetLabel(offset) {
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  return `UTC${sign}${String(abs).padStart(2, '0')}:00`
}

function onChange(event) {
  const nextValue = Number(event.target.value)
  emit('update:modelValue', nextValue)
  emit('change', nextValue)
}
</script>

<template>
  <select :value="normalizedValue" @change="onChange" class="timezone-select">
    <option v-for="offset in offsets" :key="offset" :value="offset">
      {{ formatOffsetLabel(offset) }}
    </option>
  </select>
</template>

<style scoped>
.timezone-select {
  width: 100%;
  padding: 0.6rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background-color: var(--bg-0);
  color: var(--text-0);
  transition: 0.3s;
}

.timezone-select:focus {
  outline: none;
  border-color: var(--primary);
}
</style>
