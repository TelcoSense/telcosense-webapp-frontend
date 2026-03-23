<script setup lang="ts">
import { computed } from 'vue'

type TempStop = {
  value: number
  color: string
}

const tempStops: TempStop[] = [
  { value: -20, color: '#7000d8' },
  { value: -18, color: '#6200de' },
  { value: -16, color: '#5300e4' },
  { value: -14, color: '#3f10e8' },
  { value: -12, color: '#2a28eb' },
  { value: -10, color: '#1540ee' },
  { value: -9, color: '#0d50ee' },
  { value: -8, color: '#0660ed' },
  { value: -7, color: '#0170eb' },
  { value: -6, color: '#007fe8' },
  { value: -5, color: '#038ee3' },
  { value: -4, color: '#069cdc' },
  { value: -3, color: '#0caad4' },
  { value: -2, color: '#15b8cb' },
  { value: -1, color: '#1fc5c1' },
  { value: 0, color: '#22cfe1' },
  { value: 1, color: '#18d7df' },
  { value: 2, color: '#10dddb' },
  { value: 3, color: '#0ce3d4' },
  { value: 4, color: '#0ce8ca' },
  { value: 5, color: '#0eebbd' },
  { value: 6, color: '#12edaf' },
  { value: 7, color: '#18ef9c' },
  { value: 8, color: '#24ef82' },
  { value: 9, color: '#37ec61' },
  { value: 10, color: '#52e52b' },
  { value: 11, color: '#74de1d' },
  { value: 12, color: '#97db1b' },
  { value: 13, color: '#badc1b' },
  { value: 14, color: '#d8df1a' },
  { value: 15, color: '#ecd81a' },
  { value: 16, color: '#f5c619' },
  { value: 17, color: '#fcb019' },
  { value: 18, color: '#ff871b' },
  { value: 19, color: '#ff8019' },
  { value: 20, color: '#ff681c' },
  { value: 21, color: '#ff5021' },
  { value: 22, color: '#ff3a27' },
  { value: 23, color: '#ff1d2e' },
  { value: 24, color: '#ff0e36' },
  { value: 25, color: '#fa0241' },
  { value: 26, color: '#e8004b' },
  { value: 27, color: '#d60055' },
  { value: 28, color: '#c3005d' },
  { value: 29, color: '#b00065' },
  { value: 30, color: '#9d006a' },
  { value: 31, color: '#89006d' },
  { value: 32, color: '#75006f' },
  { value: 33, color: '#62006f' },
  { value: 34, color: '#4f006c' },
  { value: 35, color: '#3d0067' },
  { value: 40, color: '#21003b' },
]

const monthlyRanges = [
  { min: -20, max: 16 }, // January
  { min: -18, max: 18 }, // February
  { min: -16, max: 22 }, // March
  { min: -12, max: 26 }, // April
  { min: -10, max: 32 }, // May
  { min: -6, max: 40 },  // June
  { min: 0, max: 40 },   // July
  { min: 0, max: 40 },   // August
  { min: -6, max: 34 },  // September
  { min: -12, max: 26 }, // October
  { min: -18, max: 20 }, // November
  { min: -20, max: 16 }, // December
]

const currentMonthIndex = new Date().getMonth()

const visibleStops = computed(() => {
  const range = monthlyRanges[currentMonthIndex]
  return tempStops.filter((stop) => stop.value >= range.min && stop.value <= range.max)
})

</script>

<template>
  <div
    class="font-chivo absolute top-14 right-3 flex flex-col items-center gap-y-1 rounded-md border border-gray-600 bg-gray-800/60 p-2 text-[8px] backdrop-blur-xs md:text-[10px]">
    <div class="text-white select-none text-sm">°C</div>

    <div class="flex flex-col-reverse">
      <div v-for="stop in visibleStops" :key="stop.value" class="flex h-2.5 items-center gap-x-1.5 md:h-3">
        <div class="h-full w-2.5 md:w-3" :style="{ backgroundColor: stop.color }"></div>
        <div class="text-white select-none leading-none">
          {{ stop.value }}
        </div>
      </div>
    </div>
  </div>
</template>
