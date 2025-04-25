<script setup lang="ts">
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()

const formData = reactive({
  username: '',
  password: '',
})

async function login() {
  try {
    const res = await api.post('/login', formData)
    if (res.data.message === 'Login successful') {
      await auth.checkLogin()
      router.push({ name: 'home' })
    }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      console.error('Caught error:', err.response.data.message)
      alert(err.response.data.message)
    } else {
      console.error('Unknown error:', err)
    }
  }
}
</script>

<template>
  <div class="font-inter min-h-screen bg-gray-800 text-white">
    <main class="flex h-screen flex-col items-center justify-center">
      <h2 class="mb-4 text-center text-xl">TelcoSense</h2>
      <div class="w-full max-w-md border border-gray-700 bg-gray-800 p-6">
        <form @submit.prevent="login" method="POST" class="space-y-5">
          <div>
            <label for="username" class="mb-1 block font-medium">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              v-model="formData.username"
              required
              autocomplete="username"
              class="w-full border border-gray-600 bg-gray-700 px-2 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label for="password" class="mb-1 block font-medium">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              v-model="formData.password"
              required
              autocomplete="current-password"
              class="w-full border border-gray-600 bg-gray-700 px-2 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <button
              type="submit"
              class="w-full cursor-pointer bg-cyan-600 py-2 text-white hover:bg-cyan-700"
            >
              Log in
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>
