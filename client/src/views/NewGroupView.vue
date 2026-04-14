<script setup>
import { computed, ref } from 'vue';
import EmojiSelector from '@/components/EmojiSelector.vue';
import DateSelector from '@/components/DateSelector.vue';
import TimeZoneSelector from '@/components/TimeZoneSelector.vue';
import CurrencySelector from '@/components/CurrencySelector.vue';
import CurrencyDisplay from '@/components/CurrencyDisplay.vue';
import IconXmark from '@/components/icons/IconXmark.vue';

const vmNewGroupName = ref('');
const vmNewMemberName = ref('');
const vmStartDate = ref('');
const vmEndDate = ref('');
const vmGroupDescription = ref('');
const vmGroupIcon = ref('');
const vmCurrency = ref('JPY');
const vmTimeOffset = ref(9);
const vmMemberIcons = ref([]);

const memberNames = ref([]);

const timeDisplayWithOffset = computed(() => {
  const offsetHours = Number(vmTimeOffset.value);
  if (Number.isNaN(offsetHours)) {
    return '時差を選択してください';
  }

  // UTC に時差を加算した時刻を表示する
  const shifted = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const yyyy = shifted.getUTCFullYear();
  const mo = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  const ss = String(shifted.getUTCSeconds()).padStart(2, '0');

  return `${yyyy}-${mo}-${dd} ${hh}:${mm}:${ss}`;
})

function changeMemberIcon(index, newIcon) {
  vmMemberIcons.value[index] = newIcon;
}

function addMember() {
  const name = vmNewMemberName.value.trim();
  if (name) {
    vmMemberIcons.value.push('');
    memberNames.value.push(name);
    vmNewMemberName.value = '';
  }
}

function createGroup() {
  const groupData = {
    name: vmNewGroupName.value,
    startDate: vmStartDate.value,
    endDate: vmEndDate.value,
    description: vmGroupDescription.value,
    icon: vmGroupIcon.value,
    usePrivate: vmUsePrivate.value,
    password: vmUsePrivate.value ? vmGroupPassword.value : null,
    currency: vmCurrency.value,
    timeOffset: vmTimeOffset.value,
    members: memberNames.value,
    useGoodSplit: vmUseGoodSplit.value,
    roundUnit: vmRoundUnit.value,
  };
  // グループ作成ロジックをここに追加
}

function removeMember(index) {
  memberNames.value.splice(index, 1);
  vmMemberIcons.value.splice(index, 1);
}
</script>

<template>
  <div class="new-group-view">
    <header class="hero">
      <h1>新しいグループを作成する</h1>
      <p>収支を管理するためのグループを作成します</p>
    </header>

    <main>
      <section class="basic-settings">
        <label class="grpname-input-section" for="grp-name">
          <span>作成するグループの名前</span>
          <div>
            <input type="text" id="grp-name" v-model="vmNewGroupName" placeholder="沖縄旅行" />
            <EmojiSelector v-model="vmGroupIcon" placeholder="" />
          </div>
        </label>

        <label class="member-input-section" for="mem-name">
          <span>追加するメンバーの名前</span>
          <div>
            <input type="text" id="mem-name" v-model="vmNewMemberName" @keydown.enter.prevent="addMember"
              placeholder="名前を入力して 追加ボタン または Enter キーを押す" />
            <button type="button" @click="addMember" class="btn-add-member">追加</button>
          </div>
        </label>

        <div class="members-section">
          <h2>メンバー</h2>
          <div v-if="memberNames.length === 0" class="empty-members">
            <p>メンバーを追加してください</p>
          </div>
          <ul v-else class="members-list">
            <li v-for="(name, memIdx) in memberNames" :key="memIdx" class="member-item">
              <EmojiSelector
                v-model="vmMemberIcons[memIdx]"
                placeholder=""
                @change="changeMemberIcon(memIdx, $event)"
              />
              <span class="member-name">{{ name }}</span>
              <button type="button" @click="removeMember(memIdx)" class="btn-remove"><IconXmark size="1rem" /></button>
            </li>
          </ul>
        </div>
      </section>

      <section class="advanced-settings">
        <details>
          <summary>詳しい設定</summary>
          <div class="details-content">
            <label>
              <span>グループの説明</span>
              <textarea
                v-model="vmGroupDescription"
                placeholder="このグループについて説明を入力..."
              ></textarea>
            </label>

            <div class="two-column-row">
              <label>
                <span>表示通貨</span>
                <CurrencySelector v-model="vmCurrency" />
                <small><CurrencyDisplay :currency="vmCurrency" :amount="1000" /></small>
              </label>

              <label>
                <span>タイムゾーン</span>
                <TimeZoneSelector v-model="vmTimeOffset" />
                <small>現在の時刻: {{ timeDisplayWithOffset }}</small>
              </label>
            </div>

            <div class="two-column-row">
              <label>
                <span>予定の開始日</span>
                <DateSelector v-model="vmStartDate" />
              </label>
              <label>
                <span>予定の終了日</span>
                <DateSelector v-model="vmEndDate" :min="vmStartDate" />
              </label>
            </div>
          </div>
        </details>
      </section>

      <button @click="createGroup" class="btn-create">グループを作成</button>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as var;

main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

section {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: 1rem;
  background-color: var(--bg-0);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;

  & > span {
    font-weight: 500;
    font-size: 0.95rem;
    color: var(--text-0);
  }

  input {
    display: block;
    height: 100%;
  }
}

// 基本設定セクション
.basic-settings {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.member-input-section, .grpname-input-section {
  display: flex;
  flex-direction: column;

  & > div {
    display: flex;
    gap: 0.4rem;

    input {
      flex-grow: 1;
    }
  }

  // ボタン スタイル
  .btn-add-member {
    padding: 0 1.2rem;
    border: 1px solid var(--primary);
    border-radius: 6px;
    background-color: var(--primary);
    color: white;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: 0.3s;
    white-space: nowrap;

    &:hover {
      background-color: #0000cc;
      box-shadow: 0 2px 8px var(--shadow);
    }
  }
}

.members-section {
  border-top: 1px solid var(--border);
}

.empty-members {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-1);
  background-color: var(--bg-1);
  border-radius: 6px;
  font-style: italic;
}

.members-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.8rem;
  padding: 0;
  margin: 0.8rem 0 0 0;
  list-style: none;

  @include var.narrow() {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }
}

.member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem;
  background-color: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 6px;
  gap: 0.5rem;
  transition: 0.3s;

  &:hover {
    background-color: var(--bg-2);
    box-shadow: 0 2px 4px var(--shadow);
  }
}

.member-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.btn-remove {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background-color: var(--bg-0);
  color: var(--danger);
  font-size: 1.2rem;
  border-radius: 4px;
  cursor: pointer;
  transition: 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: var(--danger);
    color: white;
  }
}

// 詳細設定セクション
.advanced-settings {
  padding: 0;
  border: none;
  background: transparent;
}

summary {
  display: flex;
  align-items: center;
  padding: 1.2rem 1rem;
  background-color: var(--bg-1);
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  font-size: 1rem;
  transition: 0.3s;

  &:hover {
    background-color: var(--bg-2);
  }
}

details {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: 0;
  background-color: var(--bg-0);
  overflow: hidden;
}

details[open] summary {
  background-color: var(--bg-2);
}

.details-content {
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

// 2列レイアウト
.two-column-row {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;

  @include var.narrow() {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
  }
}

// 入力要素スタイル
input[type='text'],
input[type='number'],
select,
textarea {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background-color: var(--bg-0);
  color: var(--text-0);
  font-family: inherit;
  transition: 0.3s;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
}

textarea {
  resize: vertical;
  min-height: 6rem;
  font-family: inherit;
  background-color: var(--bg-1);
}

.btn-create {
  padding: 0.8rem 2rem;
  border: 2px solid var(--primary);
  border-radius: var(--border-radius);
  background-color: var(--primary);
  color: white;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: 0.3s;
  width: 100%;
  margin-top: 1rem;

  &:hover {
    background-color: #0000cc;
    box-shadow: 0 4px 12px var(--shadow);
  }

  &:active {
    transform: scale(0.98);
  }

  @include var.narrow() {
    padding: 1rem 3rem;
    font-size: 1.1rem;
    width: auto;
    align-self: center;
    margin-top: 1.5rem;
  }
}
</style>
