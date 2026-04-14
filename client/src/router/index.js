import { createRouter, createWebHistory } from 'vue-router'
import NewGroupView from '@/views/NewGroupView.vue'
import GroupHomeView from '@/views/GroupHomeView.vue'
import NewPaymentView from '@/views/NewPaymentView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: 'NewGroup',
      component: NewGroupView,
      path: '/new',
    },
    {
      name: 'GroupHome',
      component: GroupHomeView,
      path: '/grp/:grpid',
    },
    {
      name: 'NewPayment',
      component: NewPaymentView,
      path: '/grp/:grpid/new',
    },
  ],
})

export default router
