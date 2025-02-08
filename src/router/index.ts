import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/nota/:id',
      name: 'nota',
      component: () => import('../views/NotaView.vue'),
      props: true,
    },
    {
      path: '/page/:id',
      name: 'page',
      component: () => import('../views/PageView.vue'),
      props: true,
    },
  ],
})

export default router
