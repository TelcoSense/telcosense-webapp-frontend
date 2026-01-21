<script setup lang="ts">
const props = defineProps({
  layerId: {
    type: String,
    default: 'layer',
  },
})
</script>

<template>
  <div
    class="font-chivo absolute top-14 right-3 flex flex-col items-center gap-y-1 rounded-md border border-gray-600 bg-gray-800/60 p-1.5 text-[9px] backdrop-blur-xs md:text-sm">
    <div class="flex w-full justify-between text-white select-none"
      :class="{ 'justify-center': props.layerId === 'raincz' || props.layerId === 'user-calc' }">
      <div v-if="props.layerId != 'raincz' && props.layerId != 'user-calc'">dBZ</div>
      <div>mm/h</div>
    </div>
    <div class="flex gap-x-1.5">
      <div v-if="props.layerId != 'raincz' && props.layerId != 'user-calc'"
        class="flex flex-col-reverse items-center justify-around text-white select-none">
        <div>4</div>
        <div>8</div>
        <div>12</div>
        <div>16</div>
        <div>20</div>
        <div>24</div>
        <div>28</div>
        <div>32</div>
        <div>36</div>
        <div>40</div>
        <div>44</div>
        <div>48</div>
        <div>52</div>
        <div>56</div>
        <div>60</div>
      </div>

      <div class="flex flex-col-reverse">
        <div class="h-4 w-2.5 md:h-6" style="background-color: #380070"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #3000a8"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #0000fc"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #006cc0"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #00a000"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #00bc00"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #34d800"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #9cdc00"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #e0dc00"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #fcb000"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #fc8400"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #fc5800"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #fc0000"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #a00000"></div>
        <div class="h-4 w-2.5 md:h-6" style="background-color: #fcfcfc"></div>
      </div>
      <div class="flex flex-col-reverse items-center justify-around text-white select-none">
        <div>0.1</div>
        <div></div>
        <div></div>
        <div></div>
        <div>1</div>
        <div></div>
        <div></div>
        <div></div>
        <div>10</div>
        <div></div>
        <div></div>
        <div></div>
        <div>100</div>
        <div></div>
        <div></div>
      </div>
    </div>
  </div>
</template>
