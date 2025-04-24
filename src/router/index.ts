
import { useAuthStore } from '@/stores/auth';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const needsAuth = to.meta.requiresAuth;
  const needsGuest = to.meta.requiresGuest;
  if ((needsAuth || needsGuest) && auth.isLoggedIn === null) {
    await auth.checkLogin();
  }
  if (needsAuth && auth.isLoggedIn === false) {
    return { name: 'login' };
  }
  if (needsGuest && auth.isLoggedIn === true) {
    return { name: 'home' };
  }
});

export default router
