import { useRef, useEffect, useState } from 'react'
import FloatingActionButtons from './components/FloatingActionButton'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'
import addGeoJSONMarkers from './components/marker';
import CreateDetails, { type CreateFormData } from './components/create_details'
import createMarker from './utils/createMarker'
import waitForMapClick from './utils/waitForMapClick'
import axios from 'axios';

const MAPBOX_KEY = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

function App() {
  // mapRef holds the map instance
  const mapRef = useRef<mapboxgl.Map | null>(null);
  // mapContainerRef holds the map container div
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lng: number; lat: number } | null>(null)

  // choose location first, then open the modal
  const handleCreate = () => {
    const map = mapRef.current
    if (!map) {
      // opening modal without location if map not ready
      setSelectedLocation(null)
      setIsCreateOpen(true)
      return
    }
    // wait for a single map click
    waitForMapClick(map).then(({ lng, lat }) => {
      setSelectedLocation({ lng, lat })
      setIsCreateOpen(true)
    })
  }

  // called when the modal form is submitted
  const handleCreateSubmit = async (data: CreateFormData) => {
    setIsCreateOpen(false)
    const loc = selectedLocation
    if (!loc) {
      console.warn('No location selected — cannot place marker')
      return
    }

    const map = mapRef.current
    if (!map) return

    // Build payload expected by backend
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || ''
    const endpoint = apiBase ? `${apiBase.replace(/\/+$/,'')}/events` : '/events'

    // converting to ISO
    const toIso = (day?: string, time?: string) => {
      if (!time) return ''
      if (time.includes('T')) return time
      // assume input like 'HH:MM' and day like 'YYYY-MM-DD'
      if (day) return new Date(`${day}T${time}:00Z`).toISOString()
      return new Date(time).toISOString()
    }

    // JSON payload
    const payload = {
      id: '',
      title: data.title,
      description: data.description,
      day: data.day,
      start_time: toIso(data.day, data.start_time),
      end_time: toIso(data.day, data.end_time),
      latitude: loc.lat,
      longitude: loc.lng,
      categories: Array.isArray(data.categories) ? data.categories : (data.categories ? String(data.categories).split(',').map(s => s.trim()).filter(Boolean) : []),
    }

    try {
      const resp = await axios.post(endpoint, payload, { headers: { 'Content-Type': 'application/json' } })
      const respData = resp.data || {}

      if (respData.feature && respData.feature.geometry && Array.isArray(respData.feature.geometry.coordinates)) {
        const [lon, lat] = respData.feature.geometry.coordinates
        const props = respData.feature.properties || {}
        createMarker(map, lon, lat, {
          title: props.title || data.title,
          description: props.description || data.description,
          day: props.day || data.day,
          start_time: props.start_time || payload.start_time,
          end_time: props.end_time || payload.end_time,
          categories: props.categories || data.categories,
        })
      } else {
        // if failed, create marker locally at selected location
        createMarker(map, loc.lng, loc.lat, data)
      }
    } catch (err) {
      console.error('Failed to POST event, falling back to local marker', err)
      createMarker(map, loc.lng, loc.lat, data)
    }

    // clear selected location
    setSelectedLocation(null)
  }
  
  // Create map when component mounts
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