import { useRef, useEffect, useState } from 'react'
import FloatingActionButtons from './components/FloatingActionButton'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './App.css'
import addGeoJSONMarkers from './components/marker'
import CreateDetails, { type CreateFormData } from './components/create_details'
import createMarker from './utils/createMarker'
import waitForMapClick from './utils/waitForMapClick'
import axios from 'axios'
import SearchBar from './components/search_bar';
const MAPBOX_KEY = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

function App() {
  // Map and container refs
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  // Keep track of DB-backed markers we add so we can clear/fit
  const dbMarkersRef = useRef<mapboxgl.Marker[]>([])
  // Optional: handle demo (geojson) marker cleanup
  const demoRemoveRef = useRef<(() => void) | null>(null)

  // Filters
  const [day, setDay] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [categories] = useState<string[] | 'all'>('all')

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lng: number; lat: number } | null>(null)

  // -------- Helpers --------
  const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/+$/, '')
  const listEndpoint = apiBase ? `${apiBase}/events/` : '/events/'
  const postEndpoint = listEndpoint

  function clearDbMarkers() {
    for (const m of dbMarkersRef.current) m.remove()
    dbMarkersRef.current = []
  }

  function fitMapToMarkers(markers: mapboxgl.Marker[]) {
    const map = mapRef.current
    if (!map || markers.length === 0) return
    const bounds = new mapboxgl.LngLatBounds()
    for (const m of markers) {
      const pos = m.getLngLat()
      bounds.extend([pos.lng, pos.lat])
    }
    // Pad a bit so markers aren’t at the very edges
    map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 500 })
  }

  async function loadEvents(d: string, cats: string[] | 'all', { fit = true }: { fit?: boolean } = {}) {
    const map = mapRef.current
    if (!map) return

    const params = new URLSearchParams()
    params.set('day', d)
    params.set('categories', cats === 'all' ? 'all' : cats.join(','))

    let res: Response
    try {
      res = await fetch(`${listEndpoint}?${params.toString()}`)
    } catch (e) {
      console.warn('Failed to reach events endpoint', e)
      return
    }
    if (!res.ok) {
      console.warn('Events fetch failed with status', res.status)
      return
    }
    const json = await res.json() as { events?: any[] }

    clearDbMarkers()

    for (const r of json.events || []) {
      const lng = Number(r.longitude)
      const lat = Number(r.latitude)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue

      const mk = createMarker(map, lng, lat, {
        title: r.title,
        description: r.description,
        day: r.day,
        start_time: r.start_time, // server stores timetz; our popup will show the string
        end_time: r.end_time,
        categories: Array.isArray(r.categories) ? r.categories : [],
      })
      dbMarkersRef.current.push(mk)
    }

    // Ensure the previously inserted events are visible even if they’re far from the campus center
    if (fit) fitMapToMarkers(dbMarkersRef.current)
  }

  async function loadUpcoming() {
    const map = mapRef.current
    if (!map) return

    const base = apiBase ? `${apiBase.replace(/\/+$/,'')}/events/` : '/events/'
    const res = await fetch(base)           // NOTE: no ?day=...
    if (!res.ok) return
    const json = await res.json() as { events?: any[] }

    clearDbMarkers()
    for (const r of (json.events || [])) {
      const mk = createMarker(map, Number(r.longitude), Number(r.latitude), {
        title: r.title, description: r.description, day: r.day,
        start_time: r.start_time, end_time: r.end_time, categories: r.categories
      })
      dbMarkersRef.current.push(mk)
    }
    fitMapToMarkers(dbMarkersRef.current)
  }


  // -------- Create flow --------
  const handleCreate = () => {
    const map = mapRef.current
    if (!map) {
      setSelectedLocation(null)
      setIsCreateOpen(true)
      return
    }
    waitForMapClick(map).then(({ lng, lat }) => {
      setSelectedLocation({ lng, lat })
      setIsCreateOpen(true)
    })
  }

  const handleCreateSubmit = async (data: CreateFormData) => {
    setIsCreateOpen(false)
    const loc = selectedLocation
    if (!loc) {
      console.warn('No location selected — cannot place marker')
      return
    }
    const map = mapRef.current
    if (!map) return

    // converting to ISO for backend; backend normalizes to day + timetz
    const toIso = (dayStr?: string, time?: string) => {
      if (!time) return ''
      if (time.includes('T')) return time
      if (dayStr) return new Date(`${dayStr}T${time}:00Z`).toISOString()
      return new Date(time).toISOString()
    }

    const payload = {
      id: '',
      title: data.title,
      description: data.description,
      day: data.day,
      start_time: toIso(data.day, data.start_time),
      end_time: toIso(data.day, data.end_time),
      latitude: loc.lat,
      longitude: loc.lng,
      categories: Array.isArray(data.categories)
        ? data.categories
        : (data.categories ? String(data.categories).split(',').map(s => s.trim()).filter(Boolean) : []),
    }

    try {
      const resp = await axios.post(postEndpoint, payload, { headers: { 'Content-Type': 'application/json' } })
      const respData = resp.data || {}
      // For instant feedback, draw the returned feature if present
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
        // fallback: draw locally at selected point
        createMarker(map, loc.lng, loc.lat, data)
      }

      // Reload from the API so it persists across refresh and ensure visibility
      await loadEvents(propsDay(respData) ?? day, categories, { fit: true })
    } catch (err) {
      console.error('Failed to POST event, falling back to local marker', err)
      createMarker(map, loc.lng, loc.lat, data)
      // Still refresh list so we remain consistent
      await loadEvents(day, categories, { fit: true })
    } finally {
      setSelectedLocation(null)
    }

    function propsDay(respData: any): string | undefined {
      return respData?.feature?.properties?.day as string | undefined
    }
  }

  // -------- Map bootstrap --------
  useEffect(() => {
    if (MAPBOX_KEY) {
      mapboxgl.accessToken = MAPBOX_KEY
    } else {
      console.warn('Mapbox token not found! Map may not load.')
    }
    if (!mapContainerRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-117.841019, 33.645198],
      zoom: 16,
    })
    mapRef.current = map

    map.on('load', async () => {
      // 1) Load existing events from the backend so the previously added two entries show up
      await loadEvents(day, categories, { fit: true })
      await loadUpcoming()

      // 2) (Optional) Also show the demo markers from /public/location.geojson,
      //    preserving your current behavior.
      try {
        const removeDemo = await addGeoJSONMarkers(map)
        demoRemoveRef.current = removeDemo
      } catch (e) {
        console.warn('Failed to add demo markers', e)
      }
    })

    return () => {
      clearDbMarkers()
      if (demoRemoveRef.current) {
        try { demoRemoveRef.current() } catch {}
        demoRemoveRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <SearchBar />
      <div id="map-container" ref={mapContainerRef}>
        <FloatingActionButtons onCreate={handleCreate} />
      </div>
      <CreateDetails
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />
    </>
  )
}

export default App