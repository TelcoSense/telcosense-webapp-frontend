<script setup lang="ts">
import type { EChartsOption, SeriesOption } from 'echarts'
import { onMounted, ref, watch } from 'vue'
import ECharts from 'vue-echarts'

import { LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
  MarkLineComponent,
])

const props = defineProps<{
  firstSeries: Array<{ name: string; data: { time: string; value: number | null }[] }>
  secondSeries: Array<{ name: string; data: { time: string; value: number | null }[] }>
  xMin?: string
  xMax?: string
  cursorTime?: string
}>()

const chartOptions = ref<EChartsOption>({})

const CURSOR_LINE_STYLE = {
  color: '#FF0000',
  width: 1.5,
  type: 'solid' as const,
}

const buildCursorMarkLine = (gridIndex: number) => {
  if (!props.cursorTime) return undefined
  return {
    silent: true,
    symbol: 'none',
    lineStyle: CURSOR_LINE_STYLE,
    label: { show: false },
    data: [{ xAxis: props.cursorTime }],
    xAxisIndex: gridIndex,
  }
}

const buildSeries = (
  data: Array<{ name: string; data: { time: string; value: number | null }[] }>,
  xAxisIndex: number,
  gridIndex: number,
  yAxisIndexOffset: number,
): SeriesOption[] => {
  return data.map((seriesItem, i) => ({
    name: seriesItem.name,
    type: 'line',
    data: seriesItem.data.map((d) => [d.time, d.value]),
    showSymbol: false,
    sampling: 'lttb',
    lineStyle: { width: 1.5 },
    xAxisIndex,
    yAxisIndex: yAxisIndexOffset + (i % 2), // alternate between 0 & 1 or 2 & 3
    markLine: buildCursorMarkLine(gridIndex),
  }))
}

const buildOptions = () => {
  const series: SeriesOption[] = [
    ...buildSeries(props.firstSeries, 0, 0, 0), // Y axes 0 & 1
    ...buildSeries(props.secondSeries, 1, 1, 2), // Y axes 2 & 3
  ]

  chartOptions.value = {
    useUTC: true,
    animation: false,
    animationDuration: 0,
    backgroundColor: '#1f2937',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: [...props.firstSeries, ...props.secondSeries].map((s) => s.name),
      textStyle: { color: '#ffffff' },
      top: 0,
    },
    grid: [
      { top: '10%', height: '35%' }, // subplot 1
      { top: '55%', height: '35%' }, // subplot 2
    ],
    xAxis: [
      {
        type: 'time',
        gridIndex: 0,
        min: props.xMin,
        max: props.xMax,
        axisLabel: { color: '#ffffff' },
      },
      {
        type: 'time',
        gridIndex: 1,
        min: props.xMin,
        max: props.xMax,
        axisLabel: { color: '#ffffff' },
      },
    ],
    yAxis: [
      {
        type: 'value',
        gridIndex: 0,
        axisLabel: { color: '#ffffff' },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
      },
      {
        type: 'value',
        gridIndex: 0,
        position: 'right',
        axisLabel: { color: '#ffffff' },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
      },
      {
        type: 'value',
        gridIndex: 1,
        // name: 'Y2A',
        axisLabel: { color: '#ffffff' },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
      },
      {
        type: 'value',
        gridIndex: 1,
        position: 'right',
        axisLabel: { color: '#ffffff' },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
      },
    ],
    series,
    dataZoom: [{ type: 'inside', xAxisIndex: [0, 1] }],
  }
}

onMounted(buildOptions)

watch(() => [props.firstSeries, props.secondSeries, props.cursorTime], buildOptions, {
  deep: true,
})
</script>

<template>
  <ECharts :option="chartOptions" autoresize class="h-full w-full" />
</template>
