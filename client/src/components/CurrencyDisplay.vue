<script setup>
import { computed } from 'vue'
import { useGroupStore } from '@/stores/group'
import { COMMON_CURRENCIES, COMMON_CURRENCY_CODES } from '@/constants/currencies'

const props = defineProps({
  amount: {
    type: [Number, String],
    default: 0,
  },
  currency: {
    type: String,
    default: '',
  },
  locale: {
    type: String,
    default: 'ja-JP',
  },
})

const groupStore = useGroupStore()

const normalizedAmount = computed(() => {
  const value = Number(props.amount)
  return Number.isFinite(value) ? value : null
})

const resolvedCurrency = computed(() => {
  const fromProp = String(props.currency || '').toUpperCase()
  if (COMMON_CURRENCY_CODES.includes(fromProp)) {
    return fromProp
  }

  const fromGroup = String(groupStore.option.currency || '').toUpperCase()
  if (COMMON_CURRENCY_CODES.includes(fromGroup)) {
    return fromGroup
  }

  return 'JPY'
})

const symbolByCode = Object.fromEntries(
  COMMON_CURRENCIES.map((currency) => [currency.code, currency.symbol]),
)

const fractionDigits = computed(() => {
  try {
    const options = new Intl.NumberFormat(props.locale, {
      style: 'currency',
      currency: resolvedCurrency.value,
    }).resolvedOptions()

    return options.maximumFractionDigits
  } catch {
    return 2
  }
})

const formattedAmount = computed(() => {
  if (normalizedAmount.value == null) {
    return '-'
  }

  try {
    return new Intl.NumberFormat(props.locale, {
      style: 'currency',
      currency: resolvedCurrency.value,
      currencyDisplay: 'symbol',
      minimumFractionDigits: fractionDigits.value,
      maximumFractionDigits: fractionDigits.value,
    }).format(normalizedAmount.value)
  } catch {
    const symbol = symbolByCode[resolvedCurrency.value] || resolvedCurrency.value
    return `${symbol} ${normalizedAmount.value.toLocaleString(props.locale, {
      minimumFractionDigits: fractionDigits.value,
      maximumFractionDigits: fractionDigits.value,
    })}`
  }
})
</script>

<template>
  <span>{{ formattedAmount }}</span>
</template>
