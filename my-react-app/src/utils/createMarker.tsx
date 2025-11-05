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
