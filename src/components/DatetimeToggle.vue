<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
const config = useConfigStore()

function toggle() {
  config.toggleDatetimeFormat()
}
</script>

<template>
  <div class="flex h-8 items-center rounded-md bg-gray-800 px-3">
    <!-- left label -->
    <span class="text-xs text-white"> UTC </span>
    <!-- toggle switch -->
    <label class="relative inline-flex h-8 w-14 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        class="peer sr-only"
        :checked="config.datetimeFormat === 'Europe/Prague'"
        @change="toggle"
      />
      <div class="h-5 w-12 rounded-full bg-gray-700 transition-colors"></div>
      <div
        class="absolute top-2 left-2 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-6"
      ></div>
    </label>
    <!-- right label -->
    <span class="text-xs text-white"> Local </span>
  </div>
</template>
