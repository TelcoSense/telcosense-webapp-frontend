<script setup lang="ts">
import { useActiveLayer } from '@/composables/useActiveLayer'
import { useMaxzStore } from '@/stores/maxz'
import { useMerge1hStore } from '@/stores/merge1h'
import { useRainczStore } from '@/stores/raincz'
import { computed } from 'vue'

const { activeLayer, setLayer, clearLayer } = useActiveLayer()

const maxz = useMaxzStore()
const merge1h = useMerge1hStore()
const raincz = useRainczStore()

const isMaxzActive = computed(() => activeLayer.value?.name === 'maxz')
const isMerge1hActive = computed(() => activeLayer.value?.name === 'merge1h')
const isRainczActive = computed(() => activeLayer.value?.name === 'raincz')

function toggleMaxz() {
  if (isMaxzActive.value) {
    clearLayer()
  } else {
    setLayer(maxz, 'maxz')
  }
}

function toggleMerge1h() {
  if (isMerge1hActive.value) {
    clearLayer()
  } else {
    setLayer(merge1h, 'merge1h')
  }
}

function toggleRaincz() {
  if (isRainczActive.value) {
    clearLayer()
  } else {
    setLayer(raincz, 'raincz')
  }
}
</script>

<template>
  <div class="absolute top-20 left-6 w-[160px] rounded-md bg-gray-800 p-3">
    <span class="flex border-b border-gray-700 pb-1.5 text-white">Map layers</span>

    <span class="my-1.5 flex text-white">CHMI</span>
    <div class="flex flex-col gap-y-3">
      <button
        @click="toggleMaxz()"
        class="h-8 cursor-pointer rounded-md bg-gray-600 text-white hover:bg-gray-500 hover:opacity-100"
        :class="isMaxzActive ? 'bg-gray-600' : 'border border-gray-700 opacity-40'"
      >
        Max Z
      </button>
      <button
        @click="toggleMerge1h()"
        class="h-8 cursor-pointer rounded-md bg-gray-600 text-white hover:bg-gray-500 hover:opacity-100"
        :class="isMerge1hActive ? 'bg-gray-600' : 'border border-gray-700 opacity-40'"
      >
        Merge 1h
      </button>
    </div>
    <span class="mt-3 mb-1.5 flex text-white">TelcoSense</span>
    <div class="flex flex-col gap-y-3">
      <button
        @click="toggleRaincz()"
        class="h-8 cursor-pointer rounded-md bg-gray-600 text-white hover:bg-gray-500 hover:opacity-100"
        :class="isRainczActive ? 'bg-gray-600' : 'border border-gray-700 opacity-40'"
      >
        Rain CZ
      </button>
    </div>
  </div>
</template>
