import L from 'leaflet'
import type { Ref } from 'vue'

import type { Link } from '@/stores/links'

interface UseLinkSelectionOptions {
  map: Ref<L.Map | null>
  dragBox: Ref<HTMLDivElement | null>
  links: { filteredLinks: Link[] }
  selectedLinkIds: Ref<Set<number>>
  drawLinks: () => void
}

export function useLinkSelection({
  map,
  dragBox,
  links,
  selectedLinkIds,
  drawLinks,
}: UseLinkSelectionOptions) {
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

      selectedLinkIds.value.clear()
      links.filteredLinks.forEach((link: Link) => {
        const pointA = L.latLng(link.site_A.y, link.site_A.x)
        const pointB = L.latLng(link.site_B.y, link.site_B.x)
        const mid = L.latLng((pointA.lat + pointB.lat) / 2, (pointA.lng + pointB.lng) / 2)

        if (bounds.contains(pointA) || bounds.contains(pointB) || bounds.contains(mid)) {
          selectedLinkIds.value.add(link.id)
        }
      })

      drawLinks()

      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return { onMapMouseDown }
}