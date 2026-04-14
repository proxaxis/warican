<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { usePaymentStore } from '@/stores/payment'
import CurrencyDisplay from '@/components/CurrencyDisplay.vue'
import IconPenToSquare from '@/components/icons/IconPenToSquare.vue'
import IconPlus from '@/components/icons/IconPlus.vue'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const userStore = useUserStore()
const paymentStore = usePaymentStore()
const expandedPayees = ref(new Set())

const PAYEE_PREVIEW_COUNT = 2

const getMemberLabel = (memberId) => {
  const member = groupStore.getMemberById(memberId)
  return `${member?.icon || '〇'}${member?.name || 'Unknown'}`
}

const getPayeesFullLabel = (payees = []) => payees.map(getMemberLabel).join('、')

const getPayeesCompactLabel = (payees = []) => {
  if (!Array.isArray(payees) || payees.length === 0) return '-'

  const visible = payees.slice(0, PAYEE_PREVIEW_COUNT).map(getMemberLabel)
  const hiddenCount = payees.length - PAYEE_PREVIEW_COUNT

  return hiddenCount > 0 ? `${visible.join('、')} ほか${hiddenCount}名` : visible.join('、')
}

const isPayeesExpanded = (paymentId) => expandedPayees.value.has(paymentId)

const togglePayeesExpanded = (paymentId) => {
  const next = new Set(expandedPayees.value)
  if (next.has(paymentId)) {
    next.delete(paymentId)
  } else {
    next.add(paymentId)
  }
  expandedPayees.value = next
}

const memberSummaries = computed(() =>
  Array.from(paymentStore.balance.entries()).map(([id, data]) => ({
    id,
    ...(groupStore.getMemberById(id) ?? { name: 'Unknown', icon: '❓' }),
    paid: data.paid ?? data.consumption + data.balance,
    consumption: data.consumption,
  })),
)

onMounted(async () => {
  userStore.isLoading = true
  groupStore.id = route.params.grpid
  userStore.isLoading = false
})
</script>

<template>
  <div class="group-home-view">
    <header class="hero">
      <h1>
        <span>{{ groupStore.info.icon }}{{ groupStore.info.name }}</span>
        <button title="編集する"><IconPenToSquare size="1.25rem" /></button>
      </h1>
      <p>{{ groupStore.info.description }}</p>
    </header>

    <details class="panel overview-panel" open>
      <summary>概要</summary>
      <ul class="kv-list">
        <li>
          <span>グループID</span><span class="mono">{{ groupStore.id }}</span>
        </li>
        <li>
          <span>作成日時</span><span>{{ groupStore.timeInfo.created }}</span>
        </li>
        <li>
          <span>更新日時</span><span>{{ groupStore.timeInfo.updated }}</span>
        </li>
        <li>
          <span>表示通貨</span><span>{{ groupStore.option.currency }}</span>
        </li>
        <li>
          <span>タイムゾーンオフセット</span>
          <span
            >UTC{{ groupStore.timeInfo.offset >= 0 ? '+' : ''
            }}{{ String(groupStore.timeInfo.offset).padStart(2, '0') }}00</span
          >
        </li>
        <li>
          <span>メンバー数</span><span>{{ groupStore.members.length }}</span>
        </li>
      </ul>
    </details>

    <div class="content-grid">
      <section class="panel members-panel">
        <h2>メンバー</h2>
        <ul class="members-list">
          <li v-for="member in groupStore.members" :key="member.id" class="member-chip">
            {{ member.icon }}{{ member.name }}
          </li>
        </ul>
      </section>

      <section class="panel summary-panel">
        <h2>メンバー別集計</h2>
        <ul class="summary-list">
          <li v-for="member in memberSummaries" :key="member.id" class="summary-item">
            <details>
              <summary>{{ member.icon }}{{ member.name }}</summary>
              <ul class="kv-list summary-value">
                <li>
                  <span>支払った金額</span><span><CurrencyDisplay :amount="member.paid" /></span>
                </li>
                <li>
                  <span>消費した金額</span
                  ><span><CurrencyDisplay :amount="member.consumption" /></span>
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </section>

      <section class="panel payments-panel">
        <h2>支払履歴</h2>
        <ul class="payments-list">
          <li v-for="p in paymentStore.payments" :key="p.id" class="payment-item">
            <details class="payment-details">
              <summary>
                <span>{{ p.name }}</span
                ><code><CurrencyDisplay :amount="p.amount" /></code>
              </summary>
              <ul class="kv-list nested-list">
                <li>
                  <span>メモ</span>
                  <span>{{ p.note || '-' }}</span>
                </li>
                <li>
                  <span>支払者</span>
                  <span>
                    {{ groupStore.getMemberById(p.payer)?.icon || '〇'
                    }}{{ groupStore.getMemberById(p.payer)?.name || 'Unknown' }}
                  </span>
                </li>
                <li class="payees-row">
                  <span>受取者</span>
                  <button
                    type="button"
                    class="payees-toggle"
                    :class="{ expanded: isPayeesExpanded(p.id) }"
                    :title="
                      isPayeesExpanded(p.id) ? 'クリックで折りたたむ' : getPayeesFullLabel(p.payees)
                    "
                    @click="togglePayeesExpanded(p.id)"
                  >
                    {{
                      isPayeesExpanded(p.id)
                        ? getPayeesFullLabel(p.payees)
                        : getPayeesCompactLabel(p.payees)
                    }}
                  </button>
                </li>
                <li v-if="p.currency">
                  <span>入力通貨</span>
                  <span>{{ p.currency }}</span>
                </li>
                <li v-if="p.exchangeRate">
                  <span>為替レート</span>
                  <span
                    >1 {{ p.inputCurrency }} = {{ p.exchangeRate }}
                    {{ groupStore.option.currency }}</span
                  >
                </li>
                <li>
                  <span>支払日時</span>
                  <span>{{ new Date(p.paidAt).toLocaleString('ja-JP') }}</span>
                </li>
                <li>
                  <span>登録日時</span>
                  <span>{{ new Date(p.createdAt).toLocaleString('ja-JP') }}</span>
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </section>

      <section class="panel transactions-panel">
        <h2>現在の立替</h2>
        <ul class="transactions-list">
          <li
            v-for="transaction in paymentStore.transactions"
            :key="transaction.sender + transaction.receiver"
            class="transaction-item"
          >
            <span>
              {{ groupStore.getMemberById(transaction.sender)?.icon }}
              {{ groupStore.getMemberById(transaction.sender)?.name || 'Unknown' }}
              → {{ groupStore.getMemberById(transaction.receiver)?.icon }}
              {{ groupStore.getMemberById(transaction.receiver)?.name || 'Unknown' }}
            </span>
            <code><CurrencyDisplay :amount="transaction.amount" /></code>
          </li>
        </ul>
      </section>
    </div>

    <teleport to="body">
      <button
        class="floating-action-button"
        title="支払いを追加"
        @click="router.push({ name: 'AddPayment', params: { grpid: groupStore.id } })"
      >
        <IconPlus size="1.5rem" />
      </button>
    </teleport>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as var;

.group-home-view {
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hero h1 {
  display: flex;
  align-items: center;
  justify-content: space-between;

  button {
    background: none;
    border: none;
    padding: 0.25rem;
    color: var(--text-1);
    cursor: pointer;

    &:hover {
      color: var(--accent);
      transform: scale(1.1);
    }
  }
}

.panel {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background-color: var(--bg-0);
  padding: 1rem;

  h2 {
    margin: 0 0 0.8rem;
  }
}

.overview-panel {
  padding: 0;
  overflow: hidden;

  summary {
    padding: 0.9rem 1rem;
    background-color: var(--bg-1);
    font-weight: 700;
  }

  &[open] summary {
    background-color: var(--bg-2);
  }

  .kv-list {
    padding: 0.9rem 1rem;
  }
}

.kv-list {
  list-style: none;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  li {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.7rem;
    padding-bottom: 0.45rem;
    border-bottom: 1px dashed var(--border);
  }

  li:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }

  li > span:first-child {
    color: var(--text-1);
  }

  li > span:last-child {
    text-align: right;
    word-break: break-word;
  }
}

.nested-list {
  margin-top: 0.65rem;
}

.mono {
  font-family: 'DM Mono', monospace;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @include var.narrow() {
    grid-template-columns: 0.95fr 1.25fr;
    grid-template-areas:
      'members payments'
      'summary payments'
      'transactions payments';
    align-items: start;
    gap: 1.2rem;
  }
}

.members-panel {
  @include var.narrow() {
    grid-area: members;
  }
}

.summary-panel {
  @include var.narrow() {
    grid-area: summary;
  }
}

.payments-panel {
  @include var.narrow() {
    grid-area: payments;
  }
}

.transactions-panel {
  @include var.narrow() {
    grid-area: transactions;
  }
}

.members-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.member-chip {
  padding: 0.35rem 0.6rem;
  background-color: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 999px;
}

.summary-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.summary-item {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background-color: var(--bg-1);

  details {
    padding: 0.75rem 0.9rem;
  }

  details[open] summary {
    margin-bottom: 0.8rem;
  }
}

.summary-name {
  margin: 0 0 0.3rem;
  font-weight: 700;
}

.summary-value {
  margin: 0;
  color: var(--text-1);

  li > span:first-child {
    color: var(--text-1);
  }

  li > span:last-child {
    text-align: right;
    word-break: break-word;
  }
}

.payments-list,
.transactions-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.payment-item,
.transaction-item {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background-color: var(--bg-1);
}

.payment-details {
  summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 0.9rem;
  }

  .kv-list {
    padding: 0.75rem 0.9rem;
  }

  .nested-list > li {
    display: grid;
    grid-template-columns: 6.5rem minmax(0, 1fr);
    align-items: start;
    gap: 0.4rem 0.8rem;
  }

  .nested-list > li > span:first-child {
    align-self: start;
  }

  .nested-list > li > :last-child {
    min-width: 0;
    justify-self: end;
    text-align: right;
  }
}

code {
  font-family: 'DM Mono', monospace;
}

.payees-toggle {
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  cursor: pointer;
  display: inline-block;
  max-width: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;

  &:hover {
    color: var(--accent);
  }
}

.payees-toggle.expanded {
  max-width: none;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  text-align: left;
  justify-self: stretch;
}

.payees-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.transaction-item {
  padding: 0.75rem 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;

  strong {
    font-family: 'DM Mono', monospace;
  }
}

.floating-action-button {
  position: fixed;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  width: 3.5rem;
  height: 3.5rem;
  border: none;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background-color: var(--accent);
  color: #fff;
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.22);
  cursor: pointer;
  z-index: 1000;
  transition:
    transform 0.18s ease,
    filter 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.05);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--text-0);
    outline-offset: 2px;
  }
}
</style>
