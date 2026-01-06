<script setup lang="ts">
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import { reactive, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()

const formData = reactive({
  username: '',
  password: '',
})

const loading = ref(false)

watchEffect(() => {
  document.title = 'TelcoSense'
})

async function login() {
  if (loading.value) return
  loading.value = true
  try {
    const res = await api.post('/login', formData)
    if (res.data.message === 'Login successful') {
      await auth.checkLogin()
      router.push({ name: 'rain' })
    }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      alert(err.response.data.message)
    } else {
      alert('Login failed')
    }
  } finally {
    // loading.value = false
  }
}
</script>

<template>
  <div class="font-inter min-h-[100svh] bg-black text-white overflow-hidden">
    <!-- blue background -->
    <div class="pointer-events-none fixed inset-0">
      <!-- base -->
      <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>

      <!-- center spotlight (adds depth) -->
      <div class="absolute inset-0"
        style="background: radial-gradient(circle at 50% 35%, rgba(59,130,246,0.18), transparent 55%);"></div>

      <!-- your original glows -->
      <div class="absolute -top-40 left-1/2 h-[680px] w-[680px] -translate-x-1/2
           rounded-full bg-blue-500/30 blur-3xl"></div>

      <div class="absolute -bottom-60 left-1/2 -translate-x-1/2 h-[780px] w-[780px]
           rounded-full bg-blue-600/20 blur-3xl"></div>

      <!-- grid (keep, slightly refined opacity) -->
      <div class="absolute inset-0 opacity-[0.08]" style="
      background-image:
        linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px);
      background-size: 48px 48px;
    "></div>

      <!-- scanlines (very subtle tech texture) -->
      <div class="absolute inset-0 opacity-[0.06]" style="
      background-image: repeating-linear-gradient(
        to bottom,
        rgba(255,255,255,0.10) 0px,
        rgba(255,255,255,0.10) 1px,
        transparent 2px,
        transparent 7px
      );
    "></div>

      <!-- vignette (keeps edges dark, focuses center) -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/50"></div>
    </div>

    <main class="relative flex min-h-[100svh] flex-col items-center justify-center px-4 py-8">
      <!-- title -->
      <h1 class="mb-3 text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
        <span class="bg-gradient-to-r from-blue-200 via-white to-orange-200 bg-clip-text text-transparent">
          TelcoSense
        </span>
      </h1>

      <!-- login card -->
      <div class="w-full max-w-[280px] sm:max-w-md rounded-xl sm:rounded-2xl
               border border-white/10 bg-white/5 p-4 sm:p-5
               backdrop-blur-xl shadow-2xl shadow-black/60">

        <form @submit.prevent="login" class="space-y-2">
          <input v-model="formData.username" type="text" required autocomplete="username" placeholder="Username" class="w-full rounded-lg sm:rounded-xl border border-white/10 bg-black/40
                   px-3 py-1.5 text-sm text-white
                   placeholder-white/30 outline-none
                   focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30" />

          <input v-model="formData.password" type="password" required autocomplete="current-password"
            placeholder="Password" class="w-full rounded-lg sm:rounded-xl border border-white/10 bg-black/40
                   px-3 py-1.5 text-sm text-white
                   placeholder-white/30 outline-none
                   focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30" />

          <button type="submit" :disabled="loading" class="w-full rounded-lg sm:rounded-xl border border-blue-500/30
                   bg-blue-500/15 py-1.5 text-sm 
                   shadow-sm shadow-blue-500/20
                   cursor-pointer transition
                   hover:bg-blue-500/20 hover:border-blue-400/60 hover:shadow-blue-500/40
                   active:scale-[0.98]
                   disabled:cursor-not-allowed disabled:opacity-60">
            {{ loading ? 'Logging in...' : 'Log in' }}
          </button>
        </form>

      </div>
      <a @click="router.push({ name: 'home' })" class="mt-4 cursor-pointer text-xs tracking-wide text-blue-300/80
         hover:text-blue-200 underline
         transition">
        Home page
      </a>
    </main>
  </div>
</template>
