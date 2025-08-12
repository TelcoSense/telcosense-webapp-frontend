<script setup lang="ts">
import type { EChartsOption, LineSeriesOption, SeriesOption, XAXisComponentOption } from 'echarts'
import { LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
  GraphicComponent,
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
  thirdLeftAxisName?: string
  thirdRightAxisName?: string
}>()

const chartOptions = ref<EChartsOption>({})
const chartRef = ref<InstanceType<typeof ECharts> | null>(null)

function hasDataForSubplot(index: number): boolean {
  return props.seriesData.some((s) => s.subplotIndex === index && s.data.length > 0)
}

const resolveYAxisIndex = (name: string): number => {
  const lower = name.toLowerCase()
  if (lower.includes('trsl') || lower.includes('rainfall')) return 1
  return 0
}

function createYAxisConfig(
  name: string,
  gridIndex: number,
  position: 'left' | 'right',
  hasData: boolean,
): echarts.YAXisComponentOption {
  const config: echarts.YAXisComponentOption = {
    type: 'value',
    gridIndex,
    position,
    show: hasData,
    axisLine: { lineStyle: { color: '#6b7280' } },
    splitLine: { show: false },
    min: 'dataMin',
    max: 'dataMax',
  }

  if (hasData) {
    config.name = name
    config.nameRotate = 90
    config.nameLocation = 'middle'
    config.nameGap = 45
    config.axisLabel = {
      color: '#ffffff',
      fontFamily: 'Chivo Mono, monospace',
      formatter: (value: number) => (Number.isInteger(value) ? value.toString() : value.toFixed(1)),
    }
  } else {
    config.axisLabel = { show: false }
  }

  return config
}

function createCursorMarkline(
  id: string,
  xAxisIndex: number,
  yAxisIndex: number,
): LineSeriesOption {
  return {
    id,
    type: 'line',
    data: [],
    xAxisIndex,
    yAxisIndex,
    silent: true,
    markLine: {
      symbol: 'none',
      label: { show: false },
      lineStyle: {
        type: 'solid',
        color: '#FF0000',
        width: 1.5,
      },
      data: props.cursorTime ? [{ xAxis: props.cursorTime }] : [],
    },
  }
}

function hasYAxisData(subplot: number, side: 'left' | 'right') {
  return props.seriesData.some(
    (s) => s.subplotIndex === subplot && (s.yAxisSide ?? 'left') === side && s.data.length > 0,
  )
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

  if (hasDataForSubplot(0)) series.push(createCursorMarkline('cursor-markline-top', 0, 0))
  if (hasDataForSubplot(1)) series.push(createCursorMarkline('cursor-markline-bottom', 1, 2))
  if (hasDataForSubplot(2)) series.push(createCursorMarkline('cursor-markline-third', 2, 4))

  const activeXAxisIndices = [0, 1, 2].filter(hasDataForSubplot)

  const seriesNames = props.seriesData.map((s) => s.name)
  const legendSelected: Record<string, boolean> = {}
  const hiddenByDefault: Record<number, string[]> = {
    1: ['temperature'],
  }

  seriesNames.forEach((name) => {
    const matchingSeries = props.seriesData.find((s) => s.name === name)
    if (!matchingSeries) return
    const subplotIndex = matchingSeries.subplotIndex
    const hiddenList = hiddenByDefault[subplotIndex] ?? []

    legendSelected[name] = !hiddenList.some((h) => name.toLowerCase().includes(h.toLowerCase()))
  })

  chartOptions.value = {
    useUTC: true,
    backgroundColor: '#1f2937',
    animation: false,
    textStyle: {
      fontFamily: 'Inter, sans-serif',
      color: '#ffffff',
    },
    axisPointer: {
      animation: false,
      link: [{ xAxisIndex: activeXAxisIndices }],
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
      data: seriesNames,
      selected: legendSelected,
      textStyle: { color: '#ffffff', fontFamily: 'Inter' },
      top: 0,
      itemGap: 15,
    },
    grid: [
      { left: '5%', right: '5%', top: '10%', height: '22%' },
      { left: '5%', right: '5%', top: '40%', height: '22%' },
      { left: '5%', right: '5%', top: '70%', height: '22%' },
    ],
    xAxis: [0, 1, 2].map((i): XAXisComponentOption => {
      const base: XAXisComponentOption = {
        type: 'time',
        gridIndex: i,
        min: props.xMin,
        max: props.xMax,
        axisLabel: {
          show: i === 2,
          formatter: i === 2 ? '{yyyy}-{MM}-{dd} {HH}:{mm}' : undefined,
          color: '#ffffff',
          fontFamily: 'Chivo Mono, monospace',
        },
        axisLine: { lineStyle: { color: '#6b7280' } },
        splitLine: {
          show: true,
          lineStyle: { color: '#374151' },
        },
      }

      if (hasDataForSubplot(i)) {
        base.axisPointer = { label: { show: false } }
      }

      return base
    }),
    yAxis: [
      createYAxisConfig(props.topLeftAxisName ?? 'Top left', 0, 'left', hasYAxisData(0, 'left')),
      createYAxisConfig(
        props.topRightAxisName ?? 'Top right',
        0,
        'right',
        hasYAxisData(0, 'right'),
      ),
      createYAxisConfig(
        props.bottomLeftAxisName ?? 'Bottom left',
        1,
        'left',
        hasYAxisData(1, 'left'),
      ),
      createYAxisConfig(
        props.bottomRightAxisName ?? 'Bottom right',
        1,
        'right',
        hasYAxisData(1, 'right'),
      ),
      createYAxisConfig(
        props.thirdLeftAxisName ?? 'Third left',
        2,
        'left',
        hasYAxisData(2, 'left'),
      ),
      createYAxisConfig(
        props.thirdRightAxisName ?? 'Third right',
        2,
        'right',
        hasYAxisData(2, 'right'),
      ),
    ],

    series,
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1, 2],
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

onBeforeUnmount(() => {
  chartRef.value?.dispose?.()
})

watch(
  () => props.seriesData,
  () => buildOptions(),
  { deep: false },
)

watch(
  () => props.cursorTime,
  (cursor) => {
    const chart = chartRef.value?.chart as echarts.ECharts | undefined
    if (!chart) return

    const updates: LineSeriesOption[] = []
    if (hasDataForSubplot(0)) {
      updates.push({
        id: 'cursor-markline-top',
        markLine: { data: cursor ? [{ xAxis: cursor }] : [] },
      } as LineSeriesOption)
    }
    if (hasDataForSubplot(1)) {
      updates.push({
        id: 'cursor-markline-bottom',
        markLine: { data: cursor ? [{ xAxis: cursor }] : [] },
      } as LineSeriesOption)
    }
    if (hasDataForSubplot(2)) {
      updates.push({
        id: 'cursor-markline-third',
        markLine: { data: cursor ? [{ xAxis: cursor }] : [] },
      } as LineSeriesOption)
    }

    chart.setOption({ series: updates }, { notMerge: false })
  },
)
</script>

<template>
  <div class="h-full w-full bg-gray-800">
    <ECharts ref="chartRef" :option="chartOptions" autoresize class="h-full w-full" />
  </div>
</template>
