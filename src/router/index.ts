
import { useAuthStore } from '@/stores/auth';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/rain',
      name: 'rain',
      component: () => import('../views/RainView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/temp',
      name: 'temp',
      component: () => import('../views/TempView.vue'),
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
  // if (needsAuth && auth.isLoggedIn === false) {
  //   return { name: 'login' };
  // }
  if (needsGuest && auth.isLoggedIn === true) {
    return { name: 'rain' };
  }
});

export default router
