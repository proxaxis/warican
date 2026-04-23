import { createRouter, createWebHistory } from 'vue-router';
import GroupMngView from '@/views/GroupMngView.vue';
import GroupHomeView from '@/views/GroupHomeView.vue';
import PaymentMngView from '@/views/PaymentMngView.vue';
import SubGroupMngView from '@/views/SubGroupMngView.vue';
import IndexPageView from '@/views/IndexPageView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: 'NewGroup',
      component: GroupMngView,
      path: '/new',
      props: { inNewMode: true },
    },
    {
      name: 'GroupHome',
      component: GroupHomeView,
      path: '/g/:grpId',
    },
    {
      name: 'NewPayment',
      component: PaymentMngView,
      path: '/g/:grpId/new',
      props: { inNewMode: true, isRepayment: false },
    },
    {
      name: 'EditGroup',
      component: GroupMngView,
      path: '/g/:grpId/edit',
      props: { inNewMode: false },
    },
    {
      name: 'NewRepayment',
      component: PaymentMngView,
      path: '/g/:grpId/new-rp',
      props: { inNewMode: true, isRepayment: true },
    },
    {
      name: 'EditPayment',
      component: PaymentMngView,
      path: '/g/:grpId/edit/:payId',
      props: { inNewMode: false, isRepayment: false },
    },
    {
      name: 'EditRepayment',
      component: PaymentMngView,
      path: '/g/:grpId/edit-rp/:payId',
      props: { inNewMode: false, isRepayment: true },
    },
    {
      name: 'EditSubGroup',
      component: SubGroupMngView,
      path: '/g/:grpId/subgroup',
    },
    {
      name: 'IndexPage',
      component: IndexPageView,
      path: '/',
    },
  ],
});

export default router;
