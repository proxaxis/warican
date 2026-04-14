<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  min: {
    type: String,
    default: '',
  },
  max: {
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
    default: 'Select date',
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

const normalizedValue = computed(() => normalizeDateValue(props.modelValue))
const selectedDate = computed(() => parseYmd(normalizedValue.value))
const minDate = computed(() => parseYmd(normalizeDateValue(props.min)))
const maxDate = computed(() => parseYmd(normalizeDateValue(props.max)))

const displayText = computed(() => {
  if (!selectedDate.value) {
    return props.placeholder
  }
  return formatDateForDisplay(selectedDate.value)
})

const monthLabel = computed(
  () => `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}`,
)

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const calendarDays = computed(() => buildCalendarDays(viewYear.value, viewMonth.value))

watch(
  () => normalizedValue.value,
  (nextValue) => {
    const date = parseYmd(nextValue)
    if (date) {
      viewYear.value = date.getFullYear()
      viewMonth.value = date.getMonth()
    }
  },
  { immediate: true },
)

function normalizeDateValue(value) {
  if (!value) {
    return ''
  }

  const asString = String(value)

  if (/^\d{4}-\d{2}-\d{2}$/.test(asString)) {
    return asString
  }

  const date = new Date(asString)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return formatDate(date)
}

function formatDate(date) {
  const y = String(date.getFullYear())
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  return `${y}-${m}-${d}`
}

function formatDateForDisplay(date) {
  const y = String(date.getFullYear())
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}

function parseYmd(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

function buildCalendarDays(year, month) {
  const firstDate = new Date(year, month, 1)
  const startWeekday = firstDate.getDay()
  const startDate = new Date(year, month, 1 - startWeekday)
  const days = []

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)

    days.push({
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      date,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameDate(date, today),
      isSelected: selectedDate.value ? isSameDate(date, selectedDate.value) : false,
      isDisabled: !isWithinRange(date),
    })
  }

  return days
}

function isWithinRange(date) {
  const time = dateAtStart(date).getTime()

  if (minDate.value) {
    const minTime = dateAtStart(minDate.value).getTime()
    if (time < minTime) {
      return false
    }
  }

  if (maxDate.value) {
    const maxTime = dateAtStart(maxDate.value).getTime()
    if (time > maxTime) {
      return false
    }
  }

  return true
}

function dateAtStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function openModal() {
  if (props.disabled) {
    return
  }

  const base = selectedDate.value || today
  viewYear.value = base.getFullYear()
  viewMonth.value = base.getMonth()
  isOpen.value = true
}

function closeModal() {
  isOpen.value = false
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
    return
  }
  viewMonth.value -= 1
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
    return
  }
  viewMonth.value += 1
}

function selectDay(dayInfo) {
  if (dayInfo.isDisabled) {
    return
  }

  const ymd = formatDate(dayInfo.date)
  emit('update:modelValue', ymd)
  emit('change', ymd)
  closeModal()
}

function clearDate() {
  emit('update:modelValue', '')
  emit('change', '')
  closeModal()
}

function handleOverlayClick(event) {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}

function onEscape(event) {
  if (event.key === 'Escape') {
    closeModal()
  }
}

function onInput(event) {
  emit('update:modelValue', event.target.value)
}

function onChange(event) {
  emit('change', event.target.value)
}
</script>

<template>
  <div class="date-selector" :class="{ 'is-disabled': disabled }">
    <button
      type="button"
      class="date-selector__trigger"
      :id="id || undefined"
      :disabled="disabled"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      @click="openModal"
    >
      <span class="date-selector__text" :class="{ 'is-empty': !normalizedValue }">{{
        displayText
      }}</span>
      <span class="date-selector__icon">Cal</span>
    </button>

    <input v-if="name" type="hidden" :name="name" :value="normalizedValue" :required="required" />

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="date-modal-overlay"
        role="presentation"
        @click="handleOverlayClick"
        @keydown="onEscape"
      >
        <section class="date-modal" role="dialog" aria-modal="true" aria-label="Date picker">
          <header class="date-modal__header">
            <button type="button" class="date-modal__nav" @click="prevMonth">&lt;</button>
            <strong class="date-modal__title">{{ monthLabel }}</strong>
            <button type="button" class="date-modal__nav" @click="nextMonth">&gt;</button>
          </header>

          <div class="date-modal__weekdays">
            <span v-for="day in weekdayLabels" :key="day" class="date-modal__weekday">{{
              day
            }}</span>
          </div>

          <div class="date-modal__grid">
            <button
              v-for="dayInfo in calendarDays"
              :key="dayInfo.key"
              type="button"
              class="date-modal__day"
              :class="{
                'is-outside': !dayInfo.isCurrentMonth,
                'is-today': dayInfo.isToday,
                'is-selected': dayInfo.isSelected,
                'is-disabled': dayInfo.isDisabled,
              }"
              :disabled="dayInfo.isDisabled"
              @click="selectDay(dayInfo)"
            >
              {{ dayInfo.day }}
            </button>
          </div>

          <footer class="date-modal__actions">
            <button type="button" class="date-modal__action" @click="clearDate">Clear</button>
            <button type="button" class="date-modal__action" @click="closeModal">Close</button>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as var;

.date-selector {
  position: relative;
  width: 100%;

  &.is-disabled {
    opacity: 0.7;
  }
}

.date-selector__trigger {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background-color: var(--bg-0);
  color: var(--text-0);
  padding: 0.6rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.date-selector__text {
  font-size: 1rem;

  &.is-empty {
    color: var(--text-1);
  }
}

.date-selector__icon {
  font-size: 0.78rem;
  color: var(--text-1);
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: 0.15rem 0.4rem;
}

.date-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background-color: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.date-modal {
  width: min(420px, 100%);
  border: 1px solid var(--border);
  border-radius: 12px;
  background-color: var(--bg-0);
  color: var(--text-0);
  box-shadow: 0 14px 36px var(--shadow);
  padding: 0.9rem;
}

.date-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}

.date-modal__title {
  font-size: 1rem;
}

.date-modal__nav {
  border: 1px solid var(--border);
  background-color: var(--bg-1);
  color: var(--text-0);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  cursor: pointer;
}

.date-modal__weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin-bottom: 0.25rem;
}

.date-modal__weekday {
  text-align: center;
  font-size: 0.72rem;
  color: var(--text-1);
  padding: 0.3rem 0;
}

.date-modal__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.25rem;
}

.date-modal__day {
  border: 1px solid transparent;
  border-radius: 8px;
  min-height: 36px;
  background-color: var(--bg-1);
  color: var(--text-0);
  cursor: pointer;

  &.is-outside {
    opacity: 0.55;
  }

  &.is-today {
    border-color: var(--primary);
  }

  &.is-selected {
    background-color: var(--primary);
    color: #fff;
    border-color: var(--primary);
  }

  &.is-disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.date-modal__actions {
  margin-top: 0.9rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.date-modal__action {
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--bg-1);
  color: var(--text-0);
  padding: 0.45rem 0.7rem;
  cursor: pointer;
}
</style>
