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
  step: {
    type: [String, Number],
    default: 60,
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
    default: 'Select date and time',
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())
const selectedDay = ref(null)
const selectedHour = ref('00')
const selectedMinute = ref('00')

const normalizedValue = computed(() => normalizeDateTimeValue(props.modelValue))
const selectedDateTime = computed(() => parseDateTimeLocal(normalizedValue.value))
const minDateTime = computed(() => parseDateTimeLocal(normalizeDateTimeValue(props.min)))
const maxDateTime = computed(() => parseDateTimeLocal(normalizeDateTimeValue(props.max)))

const displayText = computed(() => {
  if (!selectedDateTime.value) {
    return props.placeholder
  }
  return formatDateTimeForDisplay(selectedDateTime.value)
})

const monthLabel = computed(
  () => `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}`,
)

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const calendarDays = computed(() => buildCalendarDays(viewYear.value, viewMonth.value))

const stepMinutes = computed(() => {
  const raw = Number(props.step)
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1
  }
  return Math.max(1, Math.round(raw / 60))
})

const minuteOptions = computed(() => {
  const options = []
  for (let minute = 0; minute < 60; minute += stepMinutes.value) {
    options.push(String(minute).padStart(2, '0'))
  }

  if (!options.includes('00')) {
    options.unshift('00')
  }

  return options
})

watch(
  () => normalizedValue.value,
  (nextValue) => {
    const dt = parseDateTimeLocal(nextValue)
    if (dt) {
      viewYear.value = dt.getFullYear()
      viewMonth.value = dt.getMonth()
    }
  },
  { immediate: true },
)

function normalizeDateTimeValue(value) {
  if (!value) {
    return ''
  }

  const asString = String(value)

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(asString)) {
    return asString
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(asString)) {
    return asString.slice(0, 16)
  }

  const date = new Date(asString)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return formatDateTime(date)
}

function formatDateTime(date) {
  const y = String(date.getFullYear())
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  return `${y}-${m}-${d}T${hh}:${mm}`
}

function formatDateTimeForDisplay(date) {
  const y = String(date.getFullYear())
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${d} ${hh}:${mm}`
}

function parseDateTimeLocal(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null
  }

  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const date = new Date(year, month - 1, day, hour, minute)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null
  }

  return date
}

function formatDate(date) {
  const y = String(date.getFullYear())
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
      isSelected: selectedDay.value ? isSameDate(date, selectedDay.value) : false,
      isDisabled: isDateDisabled(date),
    })
  }

  return days
}

function isDateDisabled(date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)

  if (minDateTime.value && dayEnd.getTime() < minDateTime.value.getTime()) {
    return true
  }

  if (maxDateTime.value && dayStart.getTime() > maxDateTime.value.getTime()) {
    return true
  }

  return false
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

  const base = selectedDateTime.value || new Date()
  viewYear.value = base.getFullYear()
  viewMonth.value = base.getMonth()
  selectedDay.value = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  selectedHour.value = String(base.getHours()).padStart(2, '0')
  selectedMinute.value = pickClosestMinute(base.getMinutes())
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
  selectedDay.value = new Date(
    dayInfo.date.getFullYear(),
    dayInfo.date.getMonth(),
    dayInfo.date.getDate(),
  )
}

function pickClosestMinute(currentMinute) {
  const closest = minuteOptions.value.reduce((best, value) => {
    if (Math.abs(Number(value) - currentMinute) < Math.abs(Number(best) - currentMinute)) {
      return value
    }
    return best
  }, minuteOptions.value[0] || '00')

  return closest
}

function clearDateTime() {
  emit('update:modelValue', '')
  emit('change', '')
  closeModal()
}

function getSelectedDateTime() {
  if (!selectedDay.value) {
    return null
  }

  const date = new Date(
    selectedDay.value.getFullYear(),
    selectedDay.value.getMonth(),
    selectedDay.value.getDate(),
    Number(selectedHour.value),
    Number(selectedMinute.value),
    0,
  )

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function applyDateTime() {
  const dt = getSelectedDateTime()
  if (!dt) {
    return
  }

  if (minDateTime.value && dt.getTime() < minDateTime.value.getTime()) {
    return
  }

  if (maxDateTime.value && dt.getTime() > maxDateTime.value.getTime()) {
    return
  }

  const normalized = formatDateTime(dt)
  emit('update:modelValue', normalized)
  emit('change', normalized)
  closeModal()
}

function isApplyDisabled() {
  const dt = getSelectedDateTime()

  if (!dt) {
    return true
  }

  if (minDateTime.value && dt.getTime() < minDateTime.value.getTime()) {
    return true
  }

  if (maxDateTime.value && dt.getTime() > maxDateTime.value.getTime()) {
    return true
  }

  return false
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
</script>

<template>
  <div class="datetime-selector" :class="{ 'is-disabled': disabled }">
    <button
      type="button"
      class="datetime-selector__trigger"
      :id="id || undefined"
      :disabled="disabled"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      @click="openModal"
    >
      <span class="datetime-selector__text" :class="{ 'is-empty': !normalizedValue }">{{
        displayText
      }}</span>
      <span class="datetime-selector__icon">DateTime</span>
    </button>

    <input v-if="name" type="hidden" :name="name" :value="normalizedValue" :required="required" />

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="datetime-modal-overlay"
        role="presentation"
        @click="handleOverlayClick"
        @keydown="onEscape"
      >
        <section
          class="datetime-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Datetime picker"
        >
          <header class="datetime-modal__header">
            <button type="button" class="datetime-modal__nav" @click="prevMonth">&lt;</button>
            <strong class="datetime-modal__title">{{ monthLabel }}</strong>
            <button type="button" class="datetime-modal__nav" @click="nextMonth">&gt;</button>
          </header>

          <div class="datetime-modal__weekdays">
            <span v-for="day in weekdayLabels" :key="day" class="datetime-modal__weekday">{{
              day
            }}</span>
          </div>

          <div class="datetime-modal__grid">
            <button
              v-for="dayInfo in calendarDays"
              :key="dayInfo.key"
              type="button"
              class="datetime-modal__day"
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

          <div class="datetime-modal__time-row">
            <label class="datetime-modal__time-field">
              <span>Hour</span>
              <select v-model="selectedHour">
                <option v-for="hour in 24" :key="hour" :value="String(hour - 1).padStart(2, '0')">
                  {{ String(hour - 1).padStart(2, '0') }}
                </option>
              </select>
            </label>

            <label class="datetime-modal__time-field">
              <span>Minute</span>
              <select v-model="selectedMinute">
                <option v-for="minute in minuteOptions" :key="minute" :value="minute">
                  {{ minute }}
                </option>
              </select>
            </label>
          </div>

          <footer class="datetime-modal__actions">
            <button type="button" class="datetime-modal__action" @click="clearDateTime">
              Clear
            </button>
            <button type="button" class="datetime-modal__action" @click="closeModal">Close</button>
            <button
              type="button"
              class="datetime-modal__action is-primary"
              :disabled="isApplyDisabled()"
              @click="applyDateTime"
            >
              Apply
            </button>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as var;

.datetime-selector {
  position: relative;
  width: 100%;

  &.is-disabled {
    opacity: 0.7;
  }
}

.datetime-selector__trigger {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--bg-0);
  color: var(--text-0);
  padding: 0.55rem 0.7rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(0, 0, 255, 0.1);
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.datetime-selector__text {
  font-size: 0.95rem;

  &.is-empty {
    color: var(--text-1);
  }
}

.datetime-selector__icon {
  font-size: 0.78rem;
  color: var(--text-1);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.15rem 0.4rem;
}

.datetime-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background-color: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.datetime-modal {
  width: min(460px, 100%);
  border: 1px solid var(--border);
  border-radius: 12px;
  background-color: var(--bg-0);
  color: var(--text-0);
  box-shadow: 0 14px 36px var(--shadow);
  padding: 0.9rem;
}

.datetime-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}

.datetime-modal__title {
  font-size: 1rem;
}

.datetime-modal__nav {
  border: 1px solid var(--border);
  background-color: var(--bg-1);
  color: var(--text-0);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  cursor: pointer;
}

.datetime-modal__weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin-bottom: 0.25rem;
}

.datetime-modal__weekday {
  text-align: center;
  font-size: 0.72rem;
  color: var(--text-1);
  padding: 0.3rem 0;
}

.datetime-modal__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.25rem;
}

.datetime-modal__day {
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

.datetime-modal__time-row {
  margin-top: 0.9rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.datetime-modal__time-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  span {
    font-size: 0.82rem;
    color: var(--text-1);
  }

  select {
    min-height: 36px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background-color: var(--bg-1);
    color: var(--text-0);
    padding: 0.35rem 0.5rem;
  }
}

.datetime-modal__actions {
  margin-top: 0.9rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.datetime-modal__action {
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--bg-1);
  color: var(--text-0);
  padding: 0.45rem 0.7rem;
  cursor: pointer;

  &.is-primary {
    border-color: var(--primary);
    background-color: var(--primary);
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
