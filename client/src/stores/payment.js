import { ref, watch, computed } from 'vue';
import { defineStore } from 'pinia';
import { useGroupStore } from '@/stores/group';

export const usePaymentStore = defineStore('payment', () => {
  const groupStore = useGroupStore();
  const payments = ref([]);

  const balance = computed(() => {
    const balanceMap = new Map();

    if (groupStore.members.length === 0) return balanceMap;

    // グループのメンバーを初期化して、支払額と消費額を 0 に設定
    groupStore.members.forEach((m) => {
      balanceMap.set(m.id, { id: m.id, paid: 0, balance: 0, consumption: 0 });
    });

    // 支払い情報をもとに、支払額と消費額を計算
    payments.value.forEach((p) => {
      const payerData = balanceMap.get(p.payer);
      payerData.paid += p.amount;
      payerData.balance += p.amount;

      const baseDebt = Math.ceil(p.amount / p.payees.length);
      const payerDebt = p.amount - baseDebt * (p.payees.length - 1);

      p.payees.forEach((e) => {
        const cost = e === p.payer ? payerDebt : baseDebt;
        const debtor = balanceMap.get(e);
        debtor.balance -= cost;
        debtor.consumption += cost;
      })
    })

    return balanceMap;
  });

  const transactions = computed(() => {
    const players = Array.from(balance.value.values()).map((p) => ({ ...p }));

    if (players.length === 0) return [];

    const arr = [];
    while (true) {
      // 毎回最新の「最大支払者」と「最大未払者」を見つける
      players.sort((a, b) => b.balance - a.balance);
      const paidTooMuch = players[0];
      const paidLess = players[players.length - 1];

      // 誤差を考慮して 1円未満などは終了とする
      if (paidTooMuch.balance <= 0.1 && paidLess.balance >= -0.1) break;

      const amount = Math.min(paidTooMuch.balance, Math.abs(paidLess.balance));
      if (amount === 0) break;

      arr.push({
        sender: paidLess.id,
        receiver: paidTooMuch.id,
        amount: Math.round(amount), // 小数点誤差対策
      });

      paidTooMuch.balance -= amount;
      paidLess.balance += amount;
    }

    return arr;
  });

  function _fetchPaymentsData(grpId) {
    payments.value = [
      {
        id: 1,
        name: 'タクシー代',
        note: '渋谷から新宿までのタクシー代',
        amount: 4003,
        payer: 1,
        payees: [1, 2, 3, 4],
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        currency: 'JPY',
        exchangeRate: 1,
      },
    ];
  }

  watch(() => groupStore.id, (to) => {
    if (to === '') return;
    _fetchPaymentsData(to);
  });

  return {
    payments,
    balance,
    transactions,
  }
});
