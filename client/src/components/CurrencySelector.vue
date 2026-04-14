<script setup>
import { computed } from 'vue'
import { COMMON_CURRENCIES, COMMON_CURRENCY_CODES } from '@/constants/currencies'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const normalizedValue = computed(() => {
  if (!props.modelValue) {
    return ''
  }

  const code = String(props.modelValue).toUpperCase()
  return COMMON_CURRENCY_CODES.includes(code) ? code : ''
})

function onChange(event) {
  const nextValue = String(event.target.value)
  emit('update:modelValue', nextValue)
  emit('change', nextValue)
}
</script>

<template>
  <select
    :value="normalizedValue"
    :name="name || undefined"
    :id="id || undefined"
    :disabled="disabled"
    :required="required"
    @change="onChange"
    class="currency-select"
  >
    <option v-if="placeholder" value="" disabled>
      {{ placeholder }}
    </option>
    <option v-for="currency in COMMON_CURRENCIES" :key="currency.code" :value="currency.code">
      {{ currency.code }} ({{ currency.symbol }}) - {{ currency.name }}
    </option>
  </select>
</template>

<style scoped>
.currency-select {
  width: 100%;
  padding: 0.6rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background-color: var(--bg-0);
  color: var(--text-0);
  transition: 0.3s;
}

.currency-select:focus {
  outline: none;
  border-color: var(--primary);
}

.currency-select:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
