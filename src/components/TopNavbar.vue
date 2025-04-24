<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { api } from '@/api'

const router = useRouter()
const auth = useAuthStore()

async function logout() {
  try {
    const res = await api.post('/logout')
    console.log(res)
    if (res.data.message === 'Logout successful') {
      await auth.checkLogin()
      router.push({ name: 'login' })
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error('Caught error:', err.response.data.message)
      alert(err.response.data.message)
    } else {
      console.error('Unknown error:', err)
    }
  }
}
</script>

<template>
  <nav class="h-16 bg-gray-800 px-6 text-gray-100">
    <div class="flex h-full items-center justify-between">
      <div class="text-xl font-semibold">TelcoSense</div>
      <div class="flex">
        <div>
          Logged in as <span class="font-semibold">{{ auth.username }}</span>
        </div>
        <button @click="logout()" class="ml-1 cursor-pointer hover:underline">Log out</button>
      </div>
    </div>
  </nav>
</template>
