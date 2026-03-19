<script setup lang="ts">
import axios from 'axios'

import { api } from '@/api'
import getSecureConfig from '@/cookies'
import { useAuthStore } from '@/stores/auth'

import { onClickOutside } from '@vueuse/core'
import { computed, onMounted, reactive, ref } from 'vue'

type LinkAccessType = 'basic' | 'full'
type SortKey = 'username' | 'access' | 'admin'

interface AdminUser {
  id: number
  username: string
  org: string
  link_access: boolean
  link_access_type: LinkAccessType
  is_admin: boolean
}

interface UserForm {
  username: string
  org: string
  link_access: boolean
  link_access_type: LinkAccessType
  is_admin: boolean
}

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()

const panelRef = ref<HTMLElement | null>(null)
onClickOutside(panelRef, () => {
  emit('close')
})

const users = ref<AdminUser[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const generatedPassword = ref('')
const editingUserId = ref<number | null>(null)
const sortKey = ref<SortKey>('username')
const sortDirection = ref<'asc' | 'desc'>('asc')

const form = reactive<UserForm>({
  username: '',
  org: 'BUT',
  link_access: false,
  link_access_type: 'full',
  is_admin: false,
})

const isEditing = computed(() => editingUserId.value !== null)
const submitLabel = computed(() => (isEditing.value ? 'Save changes' : 'Create user'))
const sortedUsers = computed(() => {
  const accessRank = (user: AdminUser) => {
    if (!user.link_access) return 0
    return user.link_access_type === 'full' ? 2 : 1
  }

  const usersCopy = [...users.value]
  usersCopy.sort((a, b) => {
    let comparison = 0

    if (sortKey.value === 'username') {
      comparison = a.username.localeCompare(b.username)
    } else if (sortKey.value === 'access') {
      comparison = accessRank(a) - accessRank(b)
    } else if (sortKey.value === 'admin') {
      comparison = Number(a.is_admin) - Number(b.is_admin)
    }

    if (comparison === 0) {
      comparison = a.username.localeCompare(b.username)
    }

    return sortDirection.value === 'asc' ? comparison : -comparison
  })

  return usersCopy
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortKey.value = key
  sortDirection.value = 'asc'
}

function sortIndicator(key: SortKey) {
  if (sortKey.value !== key) return ''
  return sortDirection.value === 'asc' ? '↑' : '↓'
}

function orgColorClasses(org: string) {
  const normalized = org.trim().toUpperCase()

  if (normalized === 'BUT') {
    return 'bg-cyan-500/15 text-cyan-100 ring-cyan-400/40'
  }
  if (normalized === 'CHMI') {
    return 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/40'
  }
  if (normalized === 'TELCOSENSE') {
    return 'bg-amber-500/15 text-amber-100 ring-amber-400/40'
  }

  return 'bg-violet-500/15 text-violet-100 ring-violet-400/40'
}

function resetForm() {
  editingUserId.value = null
  form.username = ''
  form.org = 'BUT'
  form.link_access = false
  form.link_access_type = 'full'
  form.is_admin = false
}

function startCreateUser() {
  resetForm()
  success.value = ''
  error.value = ''
  generatedPassword.value = ''
}

function setFormFromUser(user: AdminUser) {
  editingUserId.value = user.id
  form.username = user.username
  form.org = user.org
  form.link_access = user.link_access
  form.link_access_type = user.link_access_type
  form.is_admin = user.is_admin
  success.value = ''
  error.value = ''
  generatedPassword.value = ''
}

function buildPayload() {
  const payload: Record<string, string | boolean> = {
    username: form.username.trim(),
    org: form.org.trim(),
    link_access: form.link_access,
    link_access_type: form.link_access_type,
    is_admin: form.is_admin,
  }
  return payload
}

function getErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? fallback
  }
  return fallback
}

async function loadUsers() {
  loading.value = true
  error.value = ''

  try {
    const res = await api.get('/admin/users', getSecureConfig())
    users.value = res.data.users ?? []
  } catch (err) {
    error.value = getErrorMessage(err, 'Failed to load users')
  } finally {
    loading.value = false
  }
}

async function submitForm() {
  if (saving.value) return

  saving.value = true
  error.value = ''
  success.value = ''
  generatedPassword.value = ''

  const payload = buildPayload()

  try {
    if (editingUserId.value === null) {
      const res = await api.post(
        '/admin/users',
        { ...payload, generate_password: true },
        getSecureConfig(),
      )
      generatedPassword.value = res.data.generated_password ?? ''
      success.value = 'User created'
    } else {
      await api.patch(`/admin/users/${editingUserId.value}`, payload, getSecureConfig())
      success.value = 'User updated'
    }

    await loadUsers()
    resetForm()
  } catch (err) {
    error.value = getErrorMessage(err, 'Failed to save user')
  } finally {
    saving.value = false
  }
}

async function deleteUser(user: AdminUser) {
  if (user.id === auth.userId) return
  if (!window.confirm(`Delete user "${user.username}"?`)) return

  saving.value = true
  error.value = ''
  success.value = ''
  generatedPassword.value = ''

  try {
    await api.delete(`/admin/users/${user.id}`, getSecureConfig())
    success.value = 'User deleted'
    if (editingUserId.value === user.id) {
      resetForm()
    }
    await loadUsers()
  } catch (err) {
    error.value = getErrorMessage(err, 'Failed to delete user')
  } finally {
    saving.value = false
  }
}

async function resetPassword(user: AdminUser) {
  if (saving.value) return
  if (!window.confirm(`Reset password for "${user.username}"?`)) return

  saving.value = true
  error.value = ''
  success.value = ''
  generatedPassword.value = ''

  try {
    const res = await api.post(`/admin/users/${user.id}/reset-password`, {}, getSecureConfig())
    generatedPassword.value = res.data.generated_password ?? ''
    success.value = `Password reset for ${user.username}`
    await loadUsers()
  } catch (err) {
    error.value = getErrorMessage(err, 'Failed to reset password')
  } finally {
    saving.value = false
  }
}

async function copyGeneratedPassword() {
  if (!generatedPassword.value) return
  try {
    await navigator.clipboard.writeText(generatedPassword.value)
    success.value = 'Generated password copied to clipboard'
  } catch {
    error.value = 'Failed to copy generated password'
  }
}

onMounted(async () => {
  await loadUsers()
})
</script>

<template>
  <div
    ref="panelRef"
    class="absolute top-14 right-3 z-50 w-[min(94vw,64rem)] rounded-xl border border-gray-600 bg-gray-800/95 p-4 text-white shadow-2xl shadow-black/30 backdrop-blur-sm"
  >
    <div class="mb-3 flex border-b border-gray-600 pb-1.5 text-xs text-white md:text-sm">
      <span>Admin panel</span>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div class="min-w-0">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm">Users</span>
          <button
            class="cursor-pointer rounded-md border border-gray-500 px-2 py-1 text-xs transition hover:bg-gray-700"
            @click="startCreateUser"
          >
            New user
          </button>
        </div>

        <div class="max-h-[28rem] overflow-auto rounded-lg border border-gray-700">
          <table class="min-w-full text-left text-sm">
            <thead class="text-xs uppercase tracking-wide text-gray-300">
              <tr>
                <th class="sticky top-0 z-10 bg-gray-900/95 px-3 py-2 backdrop-blur-sm">
                  <button class="cursor-pointer" @click="toggleSort('username')">
                    User {{ sortIndicator('username') }}
                  </button>
                </th>
                <th class="sticky top-0 z-10 bg-gray-900/95 px-3 py-2 backdrop-blur-sm">
                  <button class="cursor-pointer" @click="toggleSort('access')">
                    Link access {{ sortIndicator('access') }}
                  </button>
                </th>
                <th class="sticky top-0 z-10 bg-gray-900/95 px-3 py-2 backdrop-blur-sm">
                  <button class="cursor-pointer" @click="toggleSort('admin')">
                    Flags {{ sortIndicator('admin') }}
                  </button>
                </th>
                <th class="sticky top-0 z-10 bg-gray-900/95 px-3 py-2 text-right backdrop-blur-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" class="px-3 py-4 text-center text-gray-400">Loading users...</td>
              </tr>
              <tr v-else-if="users.length === 0">
                <td colspan="4" class="px-3 py-4 text-center text-gray-400">No users found</td>
              </tr>
              <tr
                v-for="user in sortedUsers"
                v-else
                :key="user.id"
                class="border-t border-gray-700/80 text-gray-100"
              >
                <td class="px-3 py-2 align-top">
                  <div>{{ user.username }}</div>
                  <div
                    :class="[
                      'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] ring-1',
                      orgColorClasses(user.org),
                    ]"
                  >
                    {{ user.org }}
                  </div>
                </td>
                <td class="px-3 py-2 align-top">
                  <div>{{ user.link_access ? user.link_access_type : 'none' }}</div>
                </td>
                <td class="px-3 py-2 align-top">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs"
                    :class="user.is_admin ? 'bg-cyan-500/20 text-cyan-200' : 'bg-gray-700 text-gray-300'"
                  >
                    {{ user.is_admin ? 'admin' : 'user' }}
                  </span>
                </td>
                <td class="px-3 py-2 align-top text-right">
                  <div class="flex justify-end gap-x-2">
                    <button
                      class="cursor-pointer rounded-md border border-gray-500 px-2 py-1 text-xs transition hover:bg-gray-700"
                      @click="setFormFromUser(user)"
                    >
                      Edit
                    </button>
                    <button
                      class="cursor-pointer rounded-md border border-cyan-500/60 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      :disabled="saving"
                      @click="resetPassword(user)"
                    >
                      Reset password
                    </button>
                    <button
                      class="cursor-pointer rounded-md border border-red-500/60 px-2 py-1 text-xs text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      :disabled="user.id === auth.userId || saving"
                      @click="deleteUser(user)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm">
            {{ isEditing ? 'Edit User' : 'Create User' }}
          </span>
          <button
            v-if="isEditing"
            class="cursor-pointer text-xs text-gray-300 hover:text-white"
            @click="resetForm"
          >
            Cancel edit
          </button>
        </div>

        <div v-if="error" class="mb-3 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {{ error }}
        </div>
        <div
          v-if="success"
          class="mb-3 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100"
        >
          {{ success }}
        </div>
        <div
          v-if="generatedPassword"
          class="mb-3 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100"
        >
          <div class="mb-1">Generated password</div>
          <div class="break-all font-mono text-[11px]">{{ generatedPassword }}</div>
          <div class="mt-2 flex gap-2">
            <button
              type="button"
              class="cursor-pointer rounded-md border border-cyan-400/50 px-2 py-1 text-[11px] transition hover:bg-cyan-500/15"
              @click="copyGeneratedPassword"
            >
              Copy
            </button>
          </div>
        </div>

        <form class="space-y-3" @submit.prevent="submitForm">
          <div>
            <label class="mb-1 block text-xs text-gray-300">Username</label>
            <input
              v-model="form.username"
              type="text"
              class="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label class="mb-1 block text-xs text-gray-300">Org</label>
            <input
              v-model="form.org"
              type="text"
              class="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label class="mb-1 block text-xs text-gray-300">Link access type</label>
            <select
              v-model="form.link_access_type"
              class="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="full">full</option>
              <option value="basic">basic</option>
            </select>
          </div>

          <div class="space-y-2 rounded-md border border-gray-700 bg-gray-800/60 p-3 text-sm">
            <label class="flex items-center gap-x-2">
              <input v-model="form.link_access" type="checkbox" />
              <span>Link access</span>
            </label>
            <label class="flex items-center gap-x-2">
              <input
                v-model="form.is_admin"
                type="checkbox"
                :disabled="editingUserId === auth.userId"
              />
              <span>Admin</span>
            </label>
          </div>

          <button
            type="submit"
            class="w-full cursor-pointer rounded-md bg-cyan-600 px-3 py-2 text-sm text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : submitLabel }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
