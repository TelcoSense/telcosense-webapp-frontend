<script setup lang="ts">
import { RouterView } from 'vue-router';

if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  document.body.classList.add('no-hover')
}
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
