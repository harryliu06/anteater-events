import { useRef, useEffect, useState } from 'react'
import FloatingActionButtons from './components/FloatingActionButton'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'
import addGeoJSONMarkers from './components/marker';
import CreateDetails, { type CreateFormData } from './components/create_details'
import RoomTwoToneIcon from '@mui/icons-material/RoomTwoTone';
import { renderToStaticMarkup } from 'react-dom/server';

const MAPBOX_KEY = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

function App() {
  //mapRef hold the map instance
  const mapRef = useRef<mapboxgl.Map | null>(null);
  //mapContainerRef hold the map container div
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lng: number; lat: number } | null>(null)

  const escapeHtml = (str: string) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  // choose location first, then open the modal
  const handleCreate = () => {
    const map = mapRef.current
    if (!map) {
      // fallback: open modal with no location
      setSelectedLocation(null)
      setIsCreateOpen(true)
      return
    }

    const canvas = map.getCanvas()
    const prevCursor = canvas.style.cursor
    canvas.style.cursor = 'crosshair'
    map.once('click', (e) => {
      canvas.style.cursor = prevCursor || ''
      const lngLat = e.lngLat
      setSelectedLocation({ lng: lngLat.lng, lat: lngLat.lat })
      setIsCreateOpen(true)
    })
  }

  // called when the modal form is submitted
  const handleCreateSubmit = (data: CreateFormData) => {
    setIsCreateOpen(false)
    const loc = selectedLocation
    if (!loc) {
      console.warn('No location selected — cannot place marker')
      return
    }

    const map = mapRef.current
    if (!map) return

    const el = document.createElement('div')
    el.className = 'custom-marker'
    try {
      const svg = renderToStaticMarkup(<RoomTwoToneIcon />)
      el.innerHTML = svg
    } catch (err) {
      console.warn('icon render failed', err)
    }

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([loc.lng, loc.lat])
      .addTo(map)

    if (data.title) el.title = data.title

    if (data.title || data.description) {
      const popupHtml = `
        <strong>${escapeHtml(data.title)}</strong>
        <div>${escapeHtml(data.description)}</div>
        <strong>Day:</strong>
        <div>${escapeHtml(data.day)}</div>
        <strong>Time:</strong>
        <div>${escapeHtml(data.start_time)}${data.start_time && data.end_time ? ' - ' + escapeHtml(data.end_time) : ''}</div>
        <div>Categories: ${escapeHtml(data.categories.join(', '))}</div>
      `
      marker.setPopup(new mapboxgl.Popup({ offset: 8 }).setHTML(popupHtml))
    }

    // clear selected location
    setSelectedLocation(null)
  }
  
  //Create map when component mounts
  useEffect(() => {
    if (MAPBOX_KEY) {
      mapboxgl.accessToken = MAPBOX_KEY;
    } else {
      console.warn('Token not found! Map not loaded correctly.');
    }
    if (!mapContainerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-117.841019, 33.645198],
      zoom: 16
    });

    // add demo markers from public/location.geojson
    let removeMarkers: (() => void) | undefined
    if (mapRef.current) {
      addGeoJSONMarkers(mapRef.current).then(rem => { removeMarkers = rem }).catch(err => console.warn(err))
    }

    return () => {
      if (removeMarkers) removeMarkers()
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    }
  }, [])
    return (
      <>
        <div id='map-container' ref={mapContainerRef}>
          <FloatingActionButtons onCreate={handleCreate}></FloatingActionButtons>
        </div>
        <CreateDetails open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreateSubmit} />
      </>
    )
}

export default App