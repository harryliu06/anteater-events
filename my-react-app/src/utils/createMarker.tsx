import mapboxgl from 'mapbox-gl'
import RoomTwoToneIcon from '@mui/icons-material/RoomTwoTone'
import { renderToStaticMarkup } from 'react-dom/server'
import escapeHtml from './escapeHtml'

export type CreateFormData = {
  title?: string
  description?: string
  day?: string
  start_time?: string
  end_time?: string
  categories?: string[]
}

function changeToTimeFormat(isoDate: string): string {
  if (!isoDate) return ''
  // Try to extract hours and minutes from multiple possible formats:
  // examples: "12:59:00+00", "16:30:00", "2025-11-06T16:30:00Z"
  const m = String(isoDate).match(/(\d{1,2}):(\d{2})/)
  if (!m) return String(isoDate)
  const hours = parseInt(m[1], 10)
  const minutes = parseInt(m[2], 10)
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const adjustedHours = hours % 12 || 12 // Convert 0 -> 12
  const formattedHours = adjustedHours.toString().padStart(2, '0')
  const formattedMinutes = minutes.toString().padStart(2, '0')
  return `${formattedHours}:${formattedMinutes} ${meridiem}`
}

// Create and add a marker to the map. Returns the Marker instance.
export default function createMarker(
  map: mapboxgl.Map,
  lng: number,
  lat: number,
  data: CreateFormData
): mapboxgl.Marker {
  const el = document.createElement('div')
  el.className = 'custom-marker'
  try {
    const svg = renderToStaticMarkup(<RoomTwoToneIcon />)
    el.innerHTML = svg
  } catch (err) {
    console.warn('icon render failed', err)
  }

  const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([lng, lat])
    .addTo(map)

  if (data.title) el.title = data.title

  if (data.start_time) data.start_time = changeToTimeFormat(String(data.start_time))
  if (data.end_time) data.end_time = changeToTimeFormat(String(data.end_time))

  if (data.title || data.description) {
    const popupHtml = `
      <strong>${escapeHtml(String(data.title || ''))}</strong>
      <div>${escapeHtml(String(data.description || ''))}</div>
      <strong>Day:</strong>
      <div>${escapeHtml(String(data.day || ''))}</div>
      <strong>Time:</strong>
      <div>${escapeHtml(String(data.start_time || ''))}${data.start_time && data.end_time ? ' - ' + escapeHtml(String(data.end_time)) : ''}</div>
      <div>Categories: ${escapeHtml((data.categories || []).join(', '))}</div>
    `
    marker.setPopup(new mapboxgl.Popup({ offset: 8 }).setHTML(popupHtml))
  }

  return marker
}
