<template>
  <div
    class="font-chivo absolute top-14 right-3 flex flex-col items-center gap-y-1 rounded-md border border-gray-600 bg-gray-800/60 p-2 text-[8px] backdrop-blur-xs md:text-[10px]">
    <div class="text-white select-none text-sm">°C</div>

    <div class="flex gap-x-1.5">
      <!-- color bar -->
      <div class="flex flex-col-reverse">
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #a301e3"></div> <!-- -50 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #8100e8"></div> <!-- -30 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #6101e7"></div> <!-- -20 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #4001e4"></div> <!-- -15 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #0525e4"></div> <!-- -10 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #0446ea"></div> <!-- -8 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #0367e7"></div> <!-- -6 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #0788e7"></div> <!-- -4 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #07a9e8"></div> <!-- -3 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #04cbe8"></div> <!-- -2 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #08e7e3"></div> <!-- -1 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #07e9c4"></div> <!-- 0 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #04eaa2"></div> <!-- 1 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #0ae964"></div> <!-- 2 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #6eec0e"></div> <!-- 3 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #b0ec0c"></div> <!-- 4 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #ceec11"></div> <!-- 5 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #ebe80e"></div> <!-- 8 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #ebc90d"></div> <!-- 10 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #eca912"></div> <!-- 12 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #ed8b11"></div> <!-- 14 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #ed6b13"></div> <!-- 16 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #f04b15"></div> <!-- 18 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #f22c0f"></div> <!-- 30 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #f01438"></div> <!-- 35 -->
        <div class="h-2.5 w-2.5 md:h-4" style="background-color: #ff0000"></div> <!-- 50 -->
      </div>

      <!-- labels -->
      <div class="flex flex-col-reverse items-center justify-around text-white select-none leading-tight">
        <div>-50</div>
        <div>-30</div>
        <div>-20</div>
        <div>-15</div>
        <div>-10</div>
        <div>-8</div>
        <div>-6</div>
        <div>-4</div>
        <div>-3</div>
        <div>-2</div>
        <div>-1</div>
        <div>0</div>
        <div>1</div>
        <div>2</div>
        <div>3</div>
        <div>4</div>
        <div>5</div>
        <div>8</div>
        <div>10</div>
        <div>12</div>
        <div>14</div>
        <div>16</div>
        <div>18</div>
        <div>30</div>
        <div>35</div>
        <div>50</div>
      </div>
    </div>
  </div>
</template>