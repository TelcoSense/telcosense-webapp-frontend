import type { WeatherStation } from '@/stores/weatherStations'
import L from 'leaflet'
import type { Ref } from 'vue'

interface UseStationSelectionOptions {
    map: Ref<L.Map | null>
    dragBox: Ref<HTMLDivElement | null>
    stations: { filteredStations: WeatherStation[] }
    selectedStationIds: Ref<Set<number>>
    drawStations: () => void
}

export function useStationSelection({
    map,
    dragBox,
    stations,
    selectedStationIds,
    drawStations,
}: UseStationSelectionOptions) {
    let dragStart: L.Point | null = null
    let dragging = false

    function onMapMouseDown(e: L.LeafletMouseEvent) {
        if (!e.originalEvent.ctrlKey || !map.value || !dragBox.value) return

        map.value.dragging.disable()
        e.originalEvent.preventDefault()

        dragStart = map.value.mouseEventToContainerPoint(e.originalEvent)
        dragging = true

        dragBox.value.style.left = `${dragStart.x}px`
        dragBox.value.style.top = `${dragStart.y}px`
        dragBox.value.style.width = `0`
        dragBox.value.style.height = `0`
        dragBox.value.classList.remove('hidden')

        const onMouseMove = (e: MouseEvent) => {
            if (!dragging || !dragStart) return
            const current = map.value!.mouseEventToContainerPoint(e)

            const left = Math.min(dragStart.x, current.x)
            const top = Math.min(dragStart.y, current.y)
            const width = Math.abs(dragStart.x - current.x)
            const height = Math.abs(dragStart.y - current.y)

            dragBox.value!.style.left = `${left}px`
            dragBox.value!.style.top = `${top}px`
            dragBox.value!.style.width = `${width}px`
            dragBox.value!.style.height = `${height}px`
        }

        const onMouseUp = (e: MouseEvent) => {
            if (!dragging || !dragStart) return

            dragging = false
            dragBox.value!.classList.add('hidden')
            map.value!.dragging.enable()

            const end = map.value!.mouseEventToContainerPoint(e)
            const bounds = L.latLngBounds(
                map.value!.containerPointToLatLng(
                    L.point(Math.min(dragStart.x, end.x), Math.min(dragStart.y, end.y)),
                ),
                map.value!.containerPointToLatLng(
                    L.point(Math.max(dragStart.x, end.x), Math.max(dragStart.y, end.y)),
                ),
            )

            selectedStationIds.value.clear()
            stations.filteredStations.forEach((station) => {
                const point = L.latLng(station.Y, station.X)
                if (bounds.contains(point)) {
                    selectedStationIds.value.add(station.id)
                }
            })

            drawStations()

            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    return { onMapMouseDown }
}
