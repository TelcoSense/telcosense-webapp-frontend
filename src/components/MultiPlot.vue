<script setup lang="ts">
import type { EChartsOption, SeriesOption } from 'echarts'

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
import { onMounted, ref, watch } from 'vue'
import ECharts from 'vue-echarts'

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
    subplotIndex: number
    yAxisSide?: 'left' | 'right'
  }>
  xMin?: string
  xMax?: string
  cursorTime?: string
  topLeftAxisName?: string
  topRightAxisName?: string
  bottomLeftAxisName?: string
  bottomRightAxisName?: string
}>()

const chartOptions = ref<EChartsOption>({})
const chartRef = ref<InstanceType<typeof ECharts> | null>(null)

const resolveYAxisIndex = (name: string): number => {
  const lower = name.toLowerCase()
  if (lower.includes('trsl') || lower.includes('rainfall')) return 1
  return 0
}

const buildOptions = () => {
  const series: SeriesOption[] = []

  props.seriesData.forEach((seriesItem) => {
    const convertedData: [string, number | null][] = seriesItem.data.map((d) => [d.time, d.value])
    const subplotIndex = seriesItem.subplotIndex
    const yAxisSide =
      seriesItem.yAxisSide ?? (resolveYAxisIndex(seriesItem.name) === 0 ? 'left' : 'right')
    const yAxisOffset = yAxisSide === 'left' ? 0 : 1
    const yAxisIndex = subplotIndex * 2 + yAxisOffset

    series.push({
      name: seriesItem.name,
      type: 'line',
      data: convertedData,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: 1.5 },
      xAxisIndex: subplotIndex,
      yAxisIndex,
    })
  })

  // series.push({
  //   id: 'cursor',
  //   name: 'Cursor Line',
  //   type: 'line',
  //   data: [],
  //   z: 100,
  //   silent: true,
  //   tooltip: { show: false },
  //   lineStyle: { opacity: 0 },
  //   markLine: {
  //     silent: true,
  //     symbol: 'none',
  //     lineStyle: CURSOR_LINE_STYLE,
  //     label: { show: false },
  //     data: props.cursorTime ? [{ xAxis: props.cursorTime }] : [],
  //   },
  // })

  chartOptions.value = {
    useUTC: true,
    backgroundColor: '#1f2937',
    animation: false,
    textStyle: {
      fontFamily: 'Inter, sans-serif',
      color: '#ffffff',
    },
    axisPointer: {
      link: [
        {
          xAxisIndex: [0, 1], // link both x-axes
        },
      ],
      label: {
        backgroundColor: '#6b7280',
        color: '#ffffff',
        fontFamily: 'Chivo Mono, monospace',
      },
      triggerTooltip: true,
      snap: true,
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
      itemGap: 15,
    },
    grid: [
      { left: '5%', right: '5%', top: '15%', height: '35%' },
      { left: '5%', right: '5%', top: '55%', height: '35%' },
    ],
    xAxis: [
      {
        type: 'time',
        gridIndex: 0,
        min: props.xMin,
        max: props.xMax,
        axisLabel: {
          show: false,
        },
        axisLine: { lineStyle: { color: '#6b7280' } },
        splitLine: {
          show: true,
          lineStyle: { color: '#374151' },
        },
        axisPointer: {
          label: {
            show: false,
          },
        },
      },
      {
        type: 'time',
        gridIndex: 1,
        min: props.xMin,
        max: props.xMax,
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
    ],
    // y axes
    yAxis: [
      {
        type: 'value',
        name: props.topLeftAxisName ?? 'Top left',
        gridIndex: 0,
        position: 'left',
        nameRotate: 90,
        nameLocation: 'middle',
        nameGap: 45,
        axisLabel: {
          color: '#ffffff',
          fontFamily: 'Chivo Mono, monospace',
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
        name: props.topRightAxisName ?? 'Top right',
        gridIndex: 0,
        position: 'right',
        nameRotate: 90,
        nameLocation: 'middle',
        nameGap: 45,
        axisLabel: {
          color: '#ffffff',
          fontFamily: 'Chivo Mono, monospace',
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
        name: props.bottomLeftAxisName ?? 'Bottom left',
        gridIndex: 1,
        position: 'left',
        nameRotate: 90,
        nameLocation: 'middle',
        nameGap: 45,
        axisLabel: {
          color: '#ffffff',
          fontFamily: 'Chivo Mono, monospace',
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
        name: props.bottomRightAxisName ?? 'Bottom right',
        gridIndex: 1,
        position: 'right',
        nameRotate: 90,
        nameLocation: 'middle',
        nameGap: 45,
        axisLabel: {
          color: '#ffffff',
          fontFamily: 'Chivo Mono, monospace',
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
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
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
    <ECharts ref="chartRef" :option="chartOptions" autoresize class="h-full w-full" />
  </div>
</template>
