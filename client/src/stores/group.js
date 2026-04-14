import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';
import { useRouter } from 'vue-router';

export const useGroupStore = defineStore('group', () => {
  const router = useRouter();

  // グループの基本情報
  const info = ref({
    id: '',
    name: '',
    description: '',
    icon: '',
  });
  const members = ref([]);
  const subGroups = ref([]);
  const categories = ref([]);

  // グループの設定
  const option = ref({
    currency: 'JPY',
    timeOffset: 9,
  });

  const createdAt = ref(null);
  const updatedAt = ref(null);

  function _fetchGroupData(id) {
    info.value.name = 'グループの名前';
    info.value.description = 'グループの説明';
    info.value.icon = '😊';
    option.value.currency = 'JPY';
    option.value.timeOffset = 9;
    members.value = [
      {
        id: 1,
        name: 'ユーザA',
        icon: '😊',
      },
      {
        id: 2,
        name: 'ユーザB',
        icon: '😊',
      },
      {
        id: 3,
        name: 'ユーザC',
        icon: '😊',
      },
      {
        id: 4,
        name: 'ユーザD',
        icon: '😊',
      },
    ];
    subGroups.value = [
      {
        id: 1,
        name: 'サブグループ1',
        members: [1, 2],
      },
      {
        id: 2,
        name: 'サブグループ2',
        members: [3, 4],
      },
    ];
    categories.value = [
      {
        id: 1,
        name: '食費',
      },
      {
        id: 2,
        name: '交通費',
      },
      {
        id: 3,
        name: '娯楽',
      },
    ];
    createdAt.value = new Date().toISOString();
    updatedAt.value = new Date().toISOString();
  }

  const id = computed({
    get() {
      return info.value.id;
    },
    set(newId) {
      info.value.id = newId;
    },
  });

  const timeInfo = computed(() => {
    const offset = option.value.timeOffset;
    const created = new Date(createdAt.value);
    const updated = new Date(updatedAt.value);
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const localTime = new Date(utc + 3600000 * offset);
    return {
      now: localTime,
      created: new Date(created.getTime() + 3600000 * offset).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      updated: new Date(updated.getTime() + 3600000 * offset).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      offset,
    }
  });

  function forceFetchGroupData() {
    if (id.value === '') return;
    _fetchGroupData(id.value);
  }

  function getMemberById(memId) {
    return members.value.find((m) => m.id === memId) || null;
  }

  watch(() => id.value, (to) => {
    if (to === '') return;
    _fetchGroupData(to);
  });

  return {
    id,
    info,
    members,
    subGroups,
    categories,
    option,
    createdAt,
    updatedAt,
    timeInfo,
    forceFetchGroupData,
    getMemberById,
  }
});
