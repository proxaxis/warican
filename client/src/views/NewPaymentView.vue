<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGroupStore } from '@/stores/group';
import { usePaymentStore } from '@/stores/payment';
import { useUserStore } from '@/stores/user';
import DateTimeSelector from '@/components/DateTimeSelector.vue';
import CurrencySelector from '@/components/CurrencySelector.vue';

const route = useRoute();
const router = useRouter();
const groupStore = useGroupStore();
const paymentStore = usePaymentStore();
const userStore = useUserStore();

const vm = ref({
  name: '',
  note: '',
  payer: 0,
  amountExpression: '',
  payees: [],
  paidAt: '',
  inputCurrency: 'JPY',
  exchangeRate: 1,
  taxExclusive: false,
  taxRate: 0.1,
  serviceRate: 0,
  nonDrinkers: [],
  childrenIds: [],
  childRatio: 0.5,
  birthdayFreeIds: [],
  couponAmount: 0,
  couponOwnerId: null,
  pointsAmount: 0,
  pointsOwnerId: null,
  receiptPhotoUrl: '',
  attendanceMinutes: {},
  plannedMinutes: 120,
});

const vmQuickAmount = ref('');
const vmQuickTitle = ref('');
const vmTemplateName = ref('');
const vmSelectedTemplate = ref(0);
const vmAlcoholAmount = ref(0);
const vmSponsorAmount = ref(0);
const vmSponsorId = ref(0);
const formError = ref('');

const members = computed(() => groupStore.members);
const amountPreview = computed(() => paymentStore.evaluateMathExpression(vm.value.amountExpression));

const defaultAttendance = computed(() => {
  const result = [];
  members.value.forEach((m) => {
    const stayed = Number(vm.value.attendanceMinutes[m.id] || vm.value.plannedMinutes);
    result.push({
      memberId: m.id,
      plannedMinutes: Number(vm.value.plannedMinutes),
      stayedMinutes: stayed,
    });
  });
  return result;
});

function normalizedPayees() {
  if (vm.value.payees.length > 0) return vm.value.payees.map(Number);
  return members.value.map((m) => m.id);
}

function buildPayload() {
  const converted = amountPreview.value * Number(vm.value.exchangeRate || 1);
  const items = [];
  if (Number(vmAlcoholAmount.value) > 0) {
    items.push({
      name: 'アルコール',
      amount: Number(vmAlcoholAmount.value),
      isAlcohol: true,
    });
  }
  if (Number(vmSponsorAmount.value) > 0 && Number(vmSponsorId.value) > 0) {
    items.push({
      name: '奢り品目',
      amount: Number(vmSponsorAmount.value),
      sponsorId: Number(vmSponsorId.value),
      isAlcohol: false,
    });
  }

  const childRatioById = {};
  vm.value.childrenIds.forEach((id) => {
    childRatioById[id] = Number(vm.value.childRatio || 0.5);
  });

  return {
    name: vm.value.name,
    note: vm.value.note,
    payer: Number(vm.value.payer),
    payees: normalizedPayees(),
    amountExpression: vm.value.amountExpression,
    amount: converted,
    inputAmount: amountPreview.value,
    paidAt: vm.value.paidAt ? new Date(vm.value.paidAt).toISOString() : new Date().toISOString(),
    taxExclusive: vm.value.taxExclusive,
    taxRate: Number(vm.value.taxRate || 0),
    serviceRate: Number(vm.value.serviceRate || 0),
    nonDrinkers: vm.value.nonDrinkers.map(Number),
    childrenIds: vm.value.childrenIds.map(Number),
    childRatioById,
    birthdayFreeIds: vm.value.birthdayFreeIds.map(Number),
    coupon: {
      amount: Number(vm.value.couponAmount || 0),
      ownerId: vm.value.couponOwnerId ? Number(vm.value.couponOwnerId) : null,
    },
    pointsUsed: {
      amount: Number(vm.value.pointsAmount || 0),
      ownerId: vm.value.pointsOwnerId ? Number(vm.value.pointsOwnerId) : null,
    },
    items,
    attendance: defaultAttendance.value,
    receiptPhotoUrl: vm.value.receiptPhotoUrl,
  };
}

function submit() {
  formError.value = '';
  if (!vm.value.name.trim()) {
    formError.value = '支払い名を入力してください。';
    return;
  }
  const payload = buildPayload();
  const result = paymentStore.addPayment(payload);
  if (!result.ok) {
    if (result.reason === 'receipt-required') {
      formError.value = '写真メモ強制モードのためレシート写真URLが必要です。';
    } else {
      formError.value = '入力内容を見直してください。';
    }
    return;
  }
  router.push({ name: 'GroupHome', params: { grpid: groupStore.id } });
}

function saveTemplate() {
  const name = vmTemplateName.value.trim();
  if (!name) return;
  paymentStore.saveTemplate({
    name,
    payload: buildPayload(),
  });
  vmTemplateName.value = '';
}

function applyTemplate() {
  const template = paymentStore.applyTemplate(Number(vmSelectedTemplate.value));
  if (!template) return;
  const payload = template.payload;
  vm.value.name = payload.name || '';
  vm.value.note = payload.note || '';
  vm.value.amountExpression = String(payload.inputAmount || payload.amount || '');
  vm.value.payees = payload.payees || [];
  vm.value.nonDrinkers = payload.nonDrinkers || [];
  vm.value.childrenIds = payload.childrenIds || [];
}

function addQuickMemo() {
  if (!vmQuickAmount.value.trim()) return;
  paymentStore.addQuickAmountMemo({
    title: vmQuickTitle.value || '後で入力',
    amountExpression: vmQuickAmount.value,
  });
  vmQuickAmount.value = '';
  vmQuickTitle.value = '';
}

function consumeMemo(memo) {
  vm.value.amountExpression = memo.amountExpression;
  vm.value.name = memo.title;
}

onMounted(() => {
  userStore.isLoading = true;
  groupStore.id = route.params.grpid;
  paymentStore.setLocationTriggeredReminder();
  if (members.value.length > 0) {
    vm.value.payer = members.value[0].id;
    vmSponsorId.value = members.value[0].id;
  }
  userStore.isLoading = false;
});
</script>

<template>
  <div class="new-payment">
    <header class="hero">
      <h1>支払い登録</h1>
      <p>計算式入力、税・サービス料、奢り、クーポン、写真メモ、テンプレートに対応</p>
    </header>

    <section class="panel">
      <label>支払い名<input v-model="vm.name" type="text" placeholder="例: 打ち上げ" /></label>
      <label>メモ<input v-model="vm.note" type="text" placeholder="共有メモにも残せます" /></label>

      <div class="row-2">
        <label>
          支払者
          <select v-model="vm.payer">
            <option :value="0" disabled>選択</option>
            <option v-for="m in members" :key="m.id" :value="m.id">{{ m.icon }}{{ m.name }}</option>
          </select>
        </label>
        <label>
          金額(計算式対応)
          <input v-model="vm.amountExpression" type="text" placeholder="1200+850*2" />
          <small>計算結果: {{ amountPreview }}</small>
        </label>
      </div>

      <div class="row-2">
        <label>
          入力通貨
          <CurrencySelector v-model="vm.inputCurrency" />
        </label>
        <label>
          為替レート
          <input v-model="vm.exchangeRate" type="number" min="0.001" step="0.001" />
        </label>
      </div>

      <div class="row-2">
        <label>
          税抜入力
          <input v-model="vm.taxExclusive" type="checkbox" />
        </label>
        <label>
          税率(例: 0.1)
          <input v-model="vm.taxRate" type="number" min="0" step="0.01" />
        </label>
      </div>

      <div class="row-2">
        <label>
          サービス料率
          <input v-model="vm.serviceRate" type="number" min="0" step="0.01" />
        </label>
        <label>
          支払日時
          <DateTimeSelector v-model="vm.paidAt" />
        </label>
      </div>

      <label>
        対象者
        <select v-model="vm.payees" multiple>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </label>

      <div class="row-2">
        <label>
          非飲酒者(アルコール除外)
          <select v-model="vm.nonDrinkers" multiple>
            <option v-for="m in members" :key="`nd-${m.id}`" :value="m.id">{{ m.name }}</option>
          </select>
        </label>
        <label>
          アルコール金額
          <input v-model="vmAlcoholAmount" type="number" min="0" />
        </label>
      </div>

      <div class="row-2">
        <label>
          子供ID(半額等)
          <select v-model="vm.childrenIds" multiple>
            <option v-for="m in members" :key="`c-${m.id}`" :value="m.id">{{ m.name }}</option>
          </select>
        </label>
        <label>
          子供比率
          <input v-model="vm.childRatio" type="number" min="0" max="1" step="0.1" />
        </label>
      </div>

      <div class="row-2">
        <label>
          誕生日無料ID
          <select v-model="vm.birthdayFreeIds" multiple>
            <option v-for="m in members" :key="`b-${m.id}`" :value="m.id">{{ m.name }}</option>
          </select>
        </label>
        <label>
          レシート写真URL
          <input v-model="vm.receiptPhotoUrl" type="url" placeholder="https://..." />
        </label>
      </div>

      <div class="row-2">
        <label>
          クーポン額
          <input v-model="vm.couponAmount" type="number" min="0" />
        </label>
        <label>
          クーポン利用者
          <select v-model="vm.couponOwnerId">
            <option :value="null">なし</option>
            <option v-for="m in members" :key="`co-${m.id}`" :value="m.id">{{ m.name }}</option>
          </select>
        </label>
      </div>

      <div class="row-2">
        <label>
          ポイント利用額
          <input v-model="vm.pointsAmount" type="number" min="0" />
        </label>
        <label>
          ポイント利用者
          <select v-model="vm.pointsOwnerId">
            <option :value="null">なし</option>
            <option v-for="m in members" :key="`po-${m.id}`" :value="m.id">{{ m.name }}</option>
          </select>
        </label>
      </div>

      <div class="row-2">
        <label>
          奢り金額
          <input v-model="vmSponsorAmount" type="number" min="0" />
        </label>
        <label>
          奢る人
          <select v-model="vmSponsorId">
            <option v-for="m in members" :key="`sp-${m.id}`" :value="m.id">{{ m.name }}</option>
          </select>
        </label>
      </div>

      <p v-if="formError" class="error">{{ formError }}</p>
      <button class="btn-primary" @click="submit">追加</button>
    </section>

    <section class="panel">
      <h2>テンプレート</h2>
      <div class="row-2">
        <label>
          テンプレート名
          <input v-model="vmTemplateName" type="text" placeholder="いつものランチ" />
        </label>
        <button class="btn-secondary" @click="saveTemplate">保存</button>
      </div>
      <div class="row-2">
        <label>
          読み込み
          <select v-model="vmSelectedTemplate">
            <option :value="0">選択</option>
            <option v-for="t in paymentStore.paymentTemplates" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </label>
        <button class="btn-secondary" @click="applyTemplate">適用</button>
      </div>
    </section>

    <section class="panel">
      <h2>後で入力スタック</h2>
      <div class="row-2">
        <label>
          タイトル
          <input v-model="vmQuickTitle" type="text" placeholder="後で入力" />
        </label>
        <label>
          金額メモ
          <input v-model="vmQuickAmount" type="text" placeholder="1300+580" />
        </label>
      </div>
      <button class="btn-secondary" @click="addQuickMemo">スタックに追加</button>
      <ul class="memo-list">
        <li v-for="memo in paymentStore.quickInputStack" :key="memo.id">
          <button class="link-btn" @click="consumeMemo(memo)">{{ memo.title }}: {{ memo.amountExpression }}</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as var;

.new-payment {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0 2rem;
}

.panel {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--bg-0);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.row-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.7rem;

  @include var.narrow() {
    grid-template-columns: 1fr 1fr;
  }
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

input,
select,
button {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-1);
  color: var(--text-0);
}

select[multiple] {
  min-height: 7rem;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.btn-secondary,
.link-btn {
  cursor: pointer;
}

.link-btn {
  width: 100%;
  text-align: left;
}

.error {
  color: var(--danger);
}

.memo-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
</style>
