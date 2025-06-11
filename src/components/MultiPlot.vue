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
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  CanvasRenderer,
  MarkLineComponent,
])

const props = defineProps<{
  seriesData: Array<{
    name: string
    data: { time: string; value: number | null }[]
  }>
  xMin?: string
  xMax?: string
  cursorTime?: string
  leftAxisName?: string
  rightAxisName?: string
}>()

const chartOptions = ref<EChartsOption>({})

const CURSOR_LINE_STYLE = {
  color: '#FF0000',
  width: 1.5,
  type: 'solid' as const,
}

const buildCursorSeries = (): SeriesOption | undefined => {
  if (!props.cursorTime) return undefined
  return {
    name: 'Cursor Line',
    type: 'line',
    data: [],
    z: 100,
    silent: true,
    tooltip: { show: false },
    lineStyle: { opacity: 0 },
    markLine: {
      silent: true,
      symbol: 'none',
      lineStyle: CURSOR_LINE_STYLE,
      label: { show: false },
      data: [{ xAxis: props.cursorTime }],
    },
  }
}

const resolveYAxisIndex = (name: string): number => {
  const lower = name.toLowerCase()
  if (lower.includes('trsl') || lower.includes('rainfall') || lower.includes('srážky')) return 1
  return 0
}

const buildOptions = () => {
  const series: SeriesOption[] = []

  props.seriesData.forEach((seriesItem) => {
    const convertedData: [string, number | null][] = seriesItem.data.map((d) => [d.time, d.value])
    const s: SeriesOption = {
      name: seriesItem.name,
      type: 'line',
      data: convertedData,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: 1.5 },
      yAxisIndex: resolveYAxisIndex(seriesItem.name),
    }
    series.push(s)
  })

  const cursorSeries = buildCursorSeries()
  if (cursorSeries) series.push(cursorSeries)

  chartOptions.value = {
    useUTC: true,
    backgroundColor: '#1f2937',
    textStyle: {
      fontFamily: 'Inter, sans-serif',
      color: '#ffffff',
    },
    tooltip: {
      trigger: 'axis',
      transitionDuration: 0,
      enterable: false,
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6b7280',
          color: '#ffffff',
          fontFamily: 'Chivo Mono, monospace',
        },
      },
      textStyle: {
        color: '#ffffff',
        fontFamily: 'Chivo Mono, monospace',
      },
      backgroundColor: '#374151',
      borderColor: '#4b5563',
    },
    legend: {
      data: props.seriesData.map((s) => s.name),
      textStyle: { color: '#ffffff', fontFamily: 'Inter' },
      top: 0,
      itemGap: 30,
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '0%',
      top: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      min: props.xMin ?? undefined,
      max: props.xMax ?? undefined,
      axisLabel: {
        formatter: '{yyyy}-{MM}-{dd} {HH}:{mm}',
        color: '#ffffff',
        fontFamily: 'Chivo Mono, monospace',
      },
      axisLine: { lineStyle: { color: '#6b7280' } },
      splitLine: {
        show: true,
        lineStyle: { color: '#374151' },
      },
    },
    yAxis: [
      {
        type: 'value',
        name: props.leftAxisName ?? 'Left Axis',
        position: 'left',
        nameRotate: 90,
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: {
          color: '#ffffff',
          fontFamily: 'Inter',
        },
        axisLabel: {
          rotate: 0,
          color: '#ffffff',
          fontFamily: 'Chivo Mono, monospace',
          width: 40,
          formatter: (value: number) =>
            Number.isInteger(value) ? value.toString() : value.toFixed(1),
        },
        axisLine: { lineStyle: { color: '#6b7280' } },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
      },
      {
        type: 'value',
        name: props.rightAxisName ?? 'Right Axis',
        position: 'right',
        nameRotate: 90,
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: {
          color: '#ffffff',
          fontFamily: 'Inter',
        },
        axisLabel: {
          rotate: 0,
          color: '#ffffff',
          fontFamily: 'Chivo Mono, monospace',
          width: 40,
          formatter: (value: number) =>
            Number.isInteger(value) ? value.toString() : value.toFixed(1),
        },
        axisLine: { lineStyle: { color: '#6b7280' } },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
      },
    ],
    series,
    animation: false,
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
    ],
  }
}

onMounted(async () => {
  await document.fonts.ready
  buildOptions()
})

watch(() => props.seriesData, buildOptions, { deep: true })
</script>

<template>
  <div class="h-full w-full rounded-md bg-gray-800 p-4">
    <ECharts :option="chartOptions" autoresize class="h-full w-full" />
  </div>
</template>
