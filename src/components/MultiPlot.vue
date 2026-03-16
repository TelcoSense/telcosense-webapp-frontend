<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import type {
  EChartsOption,
  LineSeriesOption,
  SeriesOption,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts'
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
import { computed, onMounted, ref, watch } from 'vue'
import ECharts from 'vue-echarts'
import { useRoute } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'

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

type SeriesInput = {
  name: string
  data: { time: string; value: number | null }[]
  subplotIndex: number // 0, 1, 2
  yAxisSide?: 'left' | 'right'
}

const auth = useAuthStore()
const route = useRoute()
const cfgStore = useConfigStore()

const props = defineProps<{
  seriesData: SeriesInput[]
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
const isMobile = useMediaQuery('(max-width: 768px)')

// public: show subplot 0 + 1
// logged in: show all 3
const visibleSubplots = computed<number[]>(() => {
  return auth.isLoggedIn ? [0, 1, 2] : [0, 1]
})

function isSubplotVisible(index: number): boolean {
  return visibleSubplots.value.includes(index)
}

const subplotGridMap = computed(() => {
  const map = new Map<number, number>()
  visibleSubplots.value.forEach((subplotIndex, gridIndex) => {
    map.set(subplotIndex, gridIndex)
  })
  return map
})

function getGridIndex(subplotIndex: number): number {
  return subplotGridMap.value.get(subplotIndex) ?? 0
}

const SERIES_COLORS: Record<string, string> = {
  'Weather station rainfall': '#38bdf8',
  'Weather station temp': '#f97316',
  'TRSL A': '#8b5cf6',
  'TRSL B': '#6d28d9',
  'HW temp A': '#10b981',
  'HW temp B': '#059669',
  'Rain intensity': '#14b8a6',
  'Pred temp A': '#eab308',
  'Pred temp B': '#ca8a04',
}

function getSeriesColor(name: string): string {
  return SERIES_COLORS[name] ?? '#d1d5db'
}

// ----------------------------
// helpers
// ----------------------------

function axisFormatSpec(axisName: string) {
  const n = axisName.toLowerCase()

  if (n.includes('temp') || n.includes('temperature') || n.includes('t2m'))
    return { decimals: 0, step: 1 }
  if (n.includes('rain') || n.includes('rainfall')) return { decimals: 1, step: 0.1 }
  if (n.includes('trsl') || n.includes('rsl') || n.includes('tsl'))
    return { decimals: 1, step: 0.1 }

  return { decimals: 1, step: 0.1 }
}

function resolveYAxisSide(seriesName: string): 'left' | 'right' {
  const lower = seriesName.toLowerCase()
  if (
    lower.includes('trsl') ||
    lower.includes('rainfall') ||
    lower.includes('rsl') ||
    lower.includes('tsl')
  )
    return 'right'
  return 'left'
}

function hasDataForSubplot(index: number): boolean {
  if (!isSubplotVisible(index)) return false
  return props.seriesData.some((s) => s.subplotIndex === index && s.data.length > 0)
}

const seriesNames = computed(() =>
  props.seriesData
    .filter((s) => isSubplotVisible(s.subplotIndex))
    .map((s) => s.name),
)

function computeDefaultLegendSelected(): Record<string, boolean> {
  const hiddenByDefault: Record<number, string[]> =
    route.name === 'rain'
      ? { 1: ['temp'] }
      : { 1: ['trsl'] }

  const selected: Record<string, boolean> = {}

  for (const s of props.seriesData) {
    if (!isSubplotVisible(s.subplotIndex)) continue

    const hiddenList = hiddenByDefault[s.subplotIndex] ?? []
    selected[s.name] = !hiddenList.some((h) => s.name.toLowerCase().includes(h.toLowerCase()))
  }

  return selected
}

// live legend state
const legendSelectedState = ref<Record<string, boolean>>({})

function isSeriesVisible(name: string) {
  return legendSelectedState.value[name] !== false
}

function hasYAxisSeriesData(subplot: number, side: 'left' | 'right') {
  if (!isSubplotVisible(subplot)) return false

  return props.seriesData.some(
    (s) =>
      s.subplotIndex === subplot &&
      (s.yAxisSide ?? resolveYAxisSide(s.name)) === side &&
      s.data.length > 0,
  )
}

function hasVisibleSeriesForAxis(subplot: number, side: 'left' | 'right') {
  if (!isSubplotVisible(subplot)) return false

  return props.seriesData.some((s) => {
    if (s.subplotIndex !== subplot) return false
    if ((s.yAxisSide ?? resolveYAxisSide(s.name)) !== side) return false
    if (!s.data.length) return false
    return isSeriesVisible(s.name)
  })
}

function cursorYAxisIndexForSubplot(subplot: number): number {
  const gridIndex = getGridIndex(subplot)

  const leftVisible = hasVisibleSeriesForAxis(subplot, 'left')
  const rightVisible = hasVisibleSeriesForAxis(subplot, 'right')

  if (leftVisible) return gridIndex * 2 + 0
  if (rightVisible) return gridIndex * 2 + 1
  return gridIndex * 2 + 0
}

function createYAxisConfig(
  name: string,
  gridIndex: number,
  position: 'left' | 'right',
  hasAnyData: boolean,
  hasVisible: boolean,
): YAXisComponentOption {
  const axisLabelSize = isMobile.value ? 8 : 10
  const axisNameSize = isMobile.value ? 8 : 10
  const spec = axisFormatSpec(name)

  const showAxis = hasAnyData && hasVisible
  const hideAxisDecorations = isMobile.value

  const axis: YAXisComponentOption = {
    type: 'value',
    gridIndex,
    position,
    show: showAxis,
    axisLabel: {
      show: !hideAxisDecorations,
    },
    axisTick: {
      show: false,
    },
    axisLine: {
      show: !hideAxisDecorations,
      lineStyle: { color: '#6b7280' },
    },
    splitLine: { show: false },
    min: 'dataMin',
    max: 'dataMax',
    minInterval: spec.step,
    interval: spec.step,
  }

  if (showAxis && !hideAxisDecorations) {
    axis.name = name
    axis.nameRotate = 90
    axis.nameLocation = 'middle'
    axis.nameGap = 45

    axis.axisLabel = {
      show: true,
      color: '#ffffff',
      fontSize: axisLabelSize,
      fontFamily: 'Chivo Mono, monospace',
      align: 'right',
      margin: position === 'right' ? 24 : 5,
      hideOverlap: true,
      formatter: (value: number) => (Number.isFinite(value) ? value.toFixed(spec.decimals) : ''),
    }

    axis.nameTextStyle = {
      fontSize: axisNameSize,
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
    }
  } else {
    axis.name = ''
  }

  return axis
}

function createCursorMarkline(id: string, xAxisIndex: number, yAxisIndex: number): LineSeriesOption {
  return {
    id,
    type: 'line',
    data: [],
    xAxisIndex,
    yAxisIndex,
    silent: true,
    showSymbol: false,
    lineStyle: { width: 0 },
    markLine: {
      symbol: 'none',
      label: { show: false },
      lineStyle: { type: 'solid', color: '#FF0000', width: 1.5 },
      data: props.cursorTime ? [{ xAxis: props.cursorTime }] : [],
    },
  }
}

function buildGrids(subplotCount: number) {
  const sideMargin = isMobile.value ? '5%' : '8%'
  if (subplotCount <= 1) {
    return [
      {
        left: sideMargin,
        right: sideMargin,
        top: '10%',
        height: isMobile.value ? '78%' : '80%',
      },
    ]
  }

  if (subplotCount === 2) {
    const height = isMobile.value ? 33 : 34
    const gap = isMobile.value ? 12 : 13
    const startTop = (100 - (2 * height + gap)) / 2

    return Array.from({ length: 2 }, (_, index) => ({
      left: sideMargin,
      right: sideMargin,
      top: `${startTop + index * (height + gap)}%`,
      height: `${height}%`,
    }))
  }

  const height = isMobile.value ? 19 : 20
  const gap = isMobile.value ? 8 : 9
  const startTop = (100 - (3 * height + 2 * gap)) / 2

  return Array.from({ length: 3 }, (_, index) => ({
    left: sideMargin,
    right: sideMargin,
    top: `${startTop + index * (height + gap)}%`,
    height: `${height}%`,
  }))
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
function tooltipFormatter(params) {
  const items = Array.isArray(params) ? params : [params]
  if (!items.length) return ''

  const header = items[0]?.axisValueLabel ?? ''
  const desiredOrder = props.seriesData
    .filter((s) => isSubplotVisible(s.subplotIndex))
    .map((s) => s.name)

  const map = new Map(items.map((p) => [p.seriesName, p]))
  const sorted = desiredOrder.map((n) => map.get(n)).filter(Boolean)

  const lines = sorted.map((p) => {
    const v = p?.data?.[1]
    const valText = v == null ? '—' : Number.isFinite(v) ? String(v) : '—'
    return `${p.marker}${p.seriesName}: ${valText}`
  })
  return [header, ...lines].join('<br/>')
}

// ----------------------------
// build options
// ----------------------------

function buildOptions() {
  const series: SeriesOption[] = []

  for (const seriesItem of props.seriesData) {
    if (!isSubplotVisible(seriesItem.subplotIndex)) continue

    const convertedData: [string, number | null][] = seriesItem.data.map((d) => [d.time, d.value])
    const color = getSeriesColor(seriesItem.name)

    const subplotIndex = seriesItem.subplotIndex
    const gridIndex = getGridIndex(subplotIndex)
    const ySide = seriesItem.yAxisSide ?? resolveYAxisSide(seriesItem.name)
    const yAxisOffset = ySide === 'left' ? 0 : 1
    const yAxisIndex = gridIndex * 2 + yAxisOffset

    series.push({
      name: seriesItem.name,
      type: 'line',
      data: convertedData,
      showSymbol: false,
      sampling: 'average',
      itemStyle: { color },
      lineStyle: { width: 1.5, color },
      xAxisIndex: gridIndex,
      yAxisIndex,
    })
  }

  if (hasDataForSubplot(0)) {
    series.push(
      createCursorMarkline(
        'cursor-markline-top',
        getGridIndex(0),
        cursorYAxisIndexForSubplot(0),
      ),
    )
  }

  if (hasDataForSubplot(1)) {
    series.push(
      createCursorMarkline(
        'cursor-markline-bottom',
        getGridIndex(1),
        cursorYAxisIndexForSubplot(1),
      ),
    )
  }

  if (hasDataForSubplot(2)) {
    series.push(
      createCursorMarkline(
        'cursor-markline-third',
        getGridIndex(2),
        cursorYAxisIndexForSubplot(2),
      ),
    )
  }

  const activeXAxisIndices = visibleSubplots.value.filter(hasDataForSubplot).map(getGridIndex)

  const subplotCount = visibleSubplots.value.length

  const grids = buildGrids(subplotCount)

  const xAxes: XAXisComponentOption[] = visibleSubplots.value.map((subplotIndex, gridIndex) => {
    const isLastVisible = gridIndex === visibleSubplots.value.length - 1
    const DAY_MS = 1000 * 60 * 60 * 24

    return {
      type: 'time',
      gridIndex,
      min: props.xMin,
      max: props.xMax,
      minInterval: DAY_MS,
      interval: DAY_MS,
      axisLabel: {
        show: visibleSubplots.value.length === 1 || isLastVisible,
        fontSize: isMobile.value ? 10 : 12,
        formatter:
          visibleSubplots.value.length === 1 || isLastVisible
            ? isMobile.value
              ? '{MM}-{dd}'
              : '{yyyy}-{MM}-{dd} '
            : undefined,
        color: '#ffffff',
        fontFamily: 'Chivo Mono',
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: '#6b7280' } },
      splitLine: { show: true, lineStyle: { color: '#374151' } },
      ...(hasDataForSubplot(subplotIndex) && { axisPointer: { label: { show: false } } }),
    }
  })

  const axisNamesBySubplot: Record<number, { left: string; right: string }> = {
    0: {
      left: props.topLeftAxisName ?? 'Top left',
      right: props.topRightAxisName ?? 'Top right',
    },
    1: {
      left: props.bottomLeftAxisName ?? 'Bottom left',
      right: props.bottomRightAxisName ?? 'Bottom right',
    },
    2: {
      left: props.thirdLeftAxisName ?? 'Third left',
      right: props.thirdRightAxisName ?? 'Third right',
    },
  }

  const yAxes: YAXisComponentOption[] = visibleSubplots.value.flatMap((subplotIndex, gridIndex) => [
    createYAxisConfig(
      axisNamesBySubplot[subplotIndex].left,
      gridIndex,
      'left',
      hasYAxisSeriesData(subplotIndex, 'left'),
      hasVisibleSeriesForAxis(subplotIndex, 'left'),
    ),
    createYAxisConfig(
      axisNamesBySubplot[subplotIndex].right,
      gridIndex,
      'right',
      hasYAxisSeriesData(subplotIndex, 'right'),
      hasVisibleSeriesForAxis(subplotIndex, 'right'),
    ),
  ])

  chartOptions.value = {
    useUTC: cfgStore.datetimeFormat === 'UTC',
    backgroundColor: '#1f2937',
    animation: false,
    textStyle: { fontFamily: 'Inter, sans-serif', color: '#ffffff' },

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
      formatter: tooltipFormatter,
      axisPointer: {
        type: 'line',
        label: {
          backgroundColor: '#6b7280',
          color: '#ffffff',
          fontSize: isMobile.value ? 8 : 12,
          fontFamily: 'Chivo Mono, monospace',
        },
      },
      textStyle: {
        color: '#ffffff',
        fontSize: isMobile.value ? 8 : 12,
        fontFamily: 'Chivo Mono, monospace',
      },
      backgroundColor: '#374151',
      borderColor: '#4b5563',
      borderWidth: 1,
      padding: isMobile.value ? 4 : 8,
    },

    legend: {
      data: seriesNames.value,
      selected: legendSelectedState.value,
      top: isMobile.value ? '1%' : 0,
      left: 'center',
      itemGap: isMobile.value ? 8 : 15,
      itemWidth: isMobile.value ? 10 : 18,
      itemHeight: isMobile.value ? 6 : 12,
      type: 'scroll',
      orient: 'horizontal',
      padding: isMobile.value ? [2, 10] : 5,
      pageIconSize: isMobile.value ? 8 : 12,
      textStyle: {
        fontSize: isMobile.value ? 10 : 12,
        color: '#ffffff',
        fontFamily: 'Inter',
      },
      pageTextStyle: {
        color: '#ffffff',
        fontSize: isMobile.value ? 10 : 12,
        fontFamily: 'Inter',
      },
    },

    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    series,

    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: visibleSubplots.value.map((_, idx) => idx),
        filterMode: 'none',
        zoomOnMouseWheel: false,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
    ],
  }
}

// ----------------------------
// BEST PRACTICE: batch rebuilds
// ----------------------------
let rebuildQueued = false
function scheduleRebuild() {
  if (rebuildQueued) return
  rebuildQueued = true
  requestAnimationFrame(() => {
    rebuildQueued = false
    buildOptions()
  })
}

type LegendSelectChangedPayload = {
  selected: Record<string, boolean>
  name?: string
  type?: string
}

function onLegendSelectChanged(e: LegendSelectChangedPayload) {
  legendSelectedState.value = { ...e.selected }
  scheduleRebuild()
}

// ----------------------------
// lifecycle / watchers
// ----------------------------

onMounted(async () => {
  await document.fonts.ready
  legendSelectedState.value = computeDefaultLegendSelected()
  buildOptions()
})

watch(
  () => props.seriesData,
  () => {
    const defaults = computeDefaultLegendSelected()
    const next: Record<string, boolean> = {}

    for (const name of seriesNames.value) {
      if (legendSelectedState.value[name] === false) next[name] = false
      else next[name] = defaults[name] ?? true
    }
    legendSelectedState.value = next

    scheduleRebuild()
  },
  { deep: true, flush: 'post' },
)

watch(() => isMobile.value, () => scheduleRebuild())
watch(() => [props.xMin, props.xMax], () => scheduleRebuild())
watch(() => cfgStore.datetimeFormat, () => scheduleRebuild())
watch(() => auth.isLoggedIn, () => scheduleRebuild())

watch(
  () => route.name,
  () => {
    legendSelectedState.value = computeDefaultLegendSelected()
    scheduleRebuild()
  },
)

watch(
  () => props.cursorTime,
  (cursor) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chart = chartRef.value?.chart as any | undefined
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
    <ECharts ref="chartRef" :option="chartOptions" autoresize class="h-full w-full"
      @legendselectchanged="onLegendSelectChanged" />
  </div>
</template>
