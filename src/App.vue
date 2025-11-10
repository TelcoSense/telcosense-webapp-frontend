<script setup lang="ts">
import { useDeviceStore } from '@/stores/device';
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';


if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  document.body.classList.add('no-hover')
}

onMounted(() => {
  useDeviceStore().startTracking()
})
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
