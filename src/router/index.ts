import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/features/bashhub/views/HomeView.vue'),
    },
    {
      path: '/nota/:id',
      name: 'nota',
      component: () => import('@/features/nota/views/SplitNotaView.vue'),
      props: true,
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('@/features/nota/views/FavoritesView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/features/settings/views/SettingsView.vue'),
    },
    {
      path: '/bashhub',
      name: 'bashhub',
      component: () => import('@/features/bashhub/views/BashHubView.vue'),
    },
    // Code block output route
    {
      path: '/output/:notaId/:blockId',
      name: 'code-block-output',
      component: () => import('@/features/editor/views/CodeBlockOutputView.vue'),
      props: true,
    },
    // Auth routes
    {
      path: '/login',
      name: 'login',
      component: () => import('@/features/auth/views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/features/auth/views/RegisterView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/features/auth/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/p/:id',
      name: 'public-nota',
      component: () => import('@/features/nota/views/PublicNotaView.vue'),
      props: true,
    },
    // User routes with tag
    {
      path: '/@:userTag',
      name: 'user-tag-profile',
      component: () => import('@/features/bashhub/views/UserPublishedView.vue'),
      props: true,
    },
    {
      path: '/@:userTag/:notaId',
      name: 'user-tag-nota',
      component: () => import('@/features/nota/views/PublicNotaView.vue'),
      props: true,
    },
    // Legacy user route
    {
      path: '/u/:userId',
      name: 'user-published',
      component: () => import('@/features/bashhub/views/UserPublishedView.vue'),
      props: true,
    },
    // 404 route should be the last route
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/features/nota/components/NotFound.vue'),
    },
  ],
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Wait for auth to initialize if it hasn't already
  if (!authStore.isInitialized) {
    await authStore.init()
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest)
  const isAuthenticated = authStore.isAuthenticated

  // Handle routes that require authentication
  if (requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // Handle routes that require guest access (like login/register)
  if (requiresGuest && isAuthenticated) {
    next({ name: 'home' })
    return
  }

  // Continue to the requested route
  next()
})

export default router








