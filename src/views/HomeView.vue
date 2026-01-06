<script setup lang="ts">
import { watchEffect } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

watchEffect(() => {
  document.title = 'TelcoSense'
})

function goRain() {
  router.push({ name: 'rain' })
}

function goTemp() {
  router.push({ name: 'temp' })
}

function goLogin() {
  router.push({ path: '/login' })
}
</script>

<template>
  <div class="font-inter min-h-[100svh] bg-black text-white overflow-hidden">
    <!-- background -->
    <div class="pointer-events-none fixed inset-0">
      <!-- base -->
      <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>

      <!-- spotlight -->
      <div class="absolute inset-0"
        style="background: radial-gradient(circle at 50% 35%, rgba(59,130,246,0.18), transparent 55%);"></div>

      <!-- glows -->
      <div class="absolute -top-40 left-1/2 h-[680px] w-[680px] -translate-x-1/2
               rounded-full bg-blue-500/30 blur-3xl"></div>

      <div class="absolute -bottom-60 left-1/2 -translate-x-1/2 h-[780px] w-[780px]
               rounded-full bg-blue-600/20 blur-3xl"></div>

      <!-- grid -->
      <div class="absolute inset-0 opacity-[0.08]" style="
          background-image:
            linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 48px 48px;
        "></div>

      <!-- scanlines -->
      <div class="absolute inset-0 opacity-[0.06]" style="
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.10) 0px,
            rgba(255,255,255,0.10) 1px,
            transparent 2px,
            transparent 7px
          );
        "></div>

      <!-- vignette -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/50"></div>
    </div>

    <main class="relative flex min-h-[100svh] flex-col items-center justify-center px-4 py-8">
      <!-- title -->
      <h1 class="mb-3 text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
        <span class="bg-gradient-to-r from-blue-200 via-white to-orange-200 bg-clip-text text-transparent">
          TelcoSense
        </span>
      </h1>

      <!-- dashboards -->
      <div class="mb-3 flex w-full max-w-[280px] gap-3 sm:max-w-md">
        <button @click="goRain" class="flex-1 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2 py-1.5
                 text-sm text-blue-200 shadow-sm shadow-blue-500/30
                 cursor-pointer transition
                 hover:bg-blue-500/20 hover:border-blue-400/60 hover:shadow-blue-500/50
                 active:scale-[0.97]">
          TelcoRain
        </button>

        <button @click="goTemp" class="flex-1 rounded-lg border border-orange-500/40 bg-orange-500/10 px-2 py-1.5
                 text-sm text-orange-200 shadow-sm shadow-orange-500/30
                 cursor-pointer transition
                 hover:bg-orange-500/20 hover:border-orange-400/60 hover:shadow-orange-500/50
                 active:scale-[0.97]">
          TelcoTemp
        </button>
      </div>

      <!-- acknowledgement card -->
      <div class="w-full max-w-[280px] sm:max-w-md rounded-xl sm:rounded-2xl
               border border-white/10 bg-white/5 p-4 sm:p-5
               backdrop-blur-xl shadow-2xl shadow-black/60">

        <div class="mb-2 text-center text-[12px]  tracking-[0.22em] text-blue-200/90">
          ACKNOWLEDGEMENT
        </div>

        <!-- text -->
        <div class="text-[11px] leading-relaxed text-white/90 text-justify mb-3 ">
          This output was financed through the projects
          “Precipitation Detection and Quantification System Based on Networks of Microwave Links”
          (SS06020416) and
          “Spatial Air Temperature Monitoring Using Microwave Links Data” (SS07020434),
          which are co-funded with state support from the Technology Agency of the Czech Republic
          under the Environment for Life Programme and further funded within the National Recovery Plan
          from the European Recovery and Resilience Facility.
        </div>

        <!-- logos -->
        <div class="flex items-center justify-center gap-y-2 flex-row sm:gap-6">
          <img src="@/assets/eu.png" alt="European Union" class="h-10 sm:h-15 w-auto object-contain" />
          <img src="@/assets/tacr.png" alt="Technology Agency of the Czech Republic"
            class="h-9 sm:h-14 w-auto object-contain" />
        </div>

      </div>

      <!-- internal access -->
      <button @click="goLogin" class="mt-3 w-full max-w-[280px] sm:max-w-md
               rounded-lg sm:rounded-xl border border-blue-500/30
               bg-blue-500/15 py-1.5 text-sm
               shadow-sm shadow-blue-500/20
               cursor-pointer transition
               hover:bg-blue-500/20 hover:border-blue-400/60 hover:shadow-blue-500/40
               active:scale-[0.98]">
        Internal access
      </button>
    </main>
  </div>
</template>
