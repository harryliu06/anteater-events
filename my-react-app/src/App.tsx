import React, { useRef, useEffect, useState } from 'react'
import FloatingActionButtons from './components/FloatingActionButton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

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
  const [categories, setCategories] = useState<string[] | 'all'>('all')

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lng: number; lat: number } | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' })
 
  // -------- Helpers --------
  const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/+$/, '')
  const listEndpoint = apiBase ? `${apiBase}/events/` : '/events/'
  const postEndpoint = listEndpoint

  //Clear all the markers from the database
  function clearDbMarkers() {
    for (const m of dbMarkersRef.current) m.remove()
    dbMarkersRef.current = []
  }

  // Fit the map view to the given markers
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

  // Load events 
  async function loadEvents(d: string, cats: string[] | 'all', { fit = true, keepExistingOnEmpty = false }: { fit?: boolean, keepExistingOnEmpty?: boolean } = {}) {
    const map = mapRef.current
    if (!map) return

    const params = new URLSearchParams()
    params.set('day', d)
    params.set('categories', cats === 'all' ? 'all' : cats.join(','))

    let res: Response
    try {
      const url = `${listEndpoint}?${params.toString()}`
      console.log('loadEvents fetching', url)
      res = await fetch(url)
    } catch (e) {
      console.warn('Failed to reach events endpoint', e)
      return
    }
    if (!res.ok) {
      console.warn('Events fetch failed with status', res.status)
      return
    }
    const json = await res.json() as { events?: any[] }
    console.log('loadEvents response count', (json.events || []).length)

    // If the server returned no events for this day, optionally keep existing markers
    if (!json.events || (Array.isArray(json.events) && json.events.length === 0)) {
      if (keepExistingOnEmpty) {
        console.log('loadEvents: no events returned, keeping existing markers')
        return
      }
      // clear markers if there are no events for this day
      console.log('loadEvents: no events returned, clearing existing markers')
      clearDbMarkers()
      return
    }

    for (const r of json.events || []) {
      const lng = Number(r.longitude)
      const lat = Number(r.latitude)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue

      const mk = createMarker(map, lng, lat, {
        title: r.title,
        description: r.description,
        day: r.day,
        start_time: r.start_time, 
        end_time: r.end_time,
        categories: Array.isArray(r.categories) ? r.categories : [],
      })
      dbMarkersRef.current.push(mk)
    }

    if (fit) fitMapToMarkers(dbMarkersRef.current)
  }

  // Load events for the Current Day
  async function loadUpcoming() {
    const map = mapRef.current
    if (!map) return
    const base = apiBase ? `${apiBase.replace(/\/+$/, '')}/events/` : '/events/'
    const params = new URLSearchParams()
    params.set('day', day)
    params.set('categories', 'all')
    const url = `${base}?${params.toString()}`
    console.log('loadUpcoming fetching', url)
    const res = await fetch(url)
    if (!res.ok) return
    const json = await res.json() as { events?: any[] }

    if (!json.events || (Array.isArray(json.events) && json.events.length === 0)) {
      console.log('loadUpcoming: no events returned, keeping existing markers')
      return
    }

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

  //Handle create form submission
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
      // Return empty string when no time is provided
      if (!time) return ''
      // If already an ISO-like value, return it
      if (time.includes('T')) return time
      // Prefer the provided dayStr, fall back to the currently-selected `day` in state
      const useDayRaw = (dayStr && String(dayStr).trim()) || day
      if (!useDayRaw) return ''

      // Normalize day to YYYY-MM-DD with zero-padded month/day
      const normalizeDay = (s: string) => {
        const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
        if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
        return s
      }

      const normalizeTime = (t: string) => {
        const parts = String(t).split(':')
        if (parts.length >= 2) {
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
        }
        return t
      }

      const useDay = normalizeDay(useDayRaw)
      const useTime = normalizeTime(time)
      const isoCandidate = `${useDay}T${useTime}:00Z`
      const dt = new Date(isoCandidate)
      if (isNaN(dt.getTime())) {
        console.warn('toIso: constructed invalid date from', isoCandidate)
        return ''
      }
      return dt.toISOString()
    }

    //Format day to YYYY-MM-DD
    const Format_day = (s: string) => {
      const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
      if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
      return s
    }

    // prepare and validate payload fields before POST
    const startIso = toIso(data.day, data.start_time)
    const endIso = toIso(data.day, data.end_time)
    const FormattedDay = Format_day(data.day || '')

    // require valid start/end times
    if (!startIso || !endIso) {
      setSnackbar({ open: true, message: 'Please provide valid start and end times', severity: 'warning' })
      return
    }

    // Ensure end is after start
    try {
      const sDt = new Date(startIso)
      const eDt = new Date(endIso)
      if (eDt.getTime() <= sDt.getTime()) {
        setSnackbar({ open: true, message: 'End time must be after start time', severity: 'warning' })
        return
      }
    } catch (e) {
      console.warn('Failed to compare start/end times', e)
      setSnackbar({ open: true, message: 'Invalid start or end time', severity: 'warning' })
      return
    }

    const categoriesArray = Array.isArray(data.categories)
      ? data.categories
      : (data.categories ? String(data.categories).split(',').map(s => s.trim()).filter(Boolean) : [])

    // default to a generic category if none provided so backend validation passes
    if (categoriesArray.length === 0) categoriesArray.push('general')

    const payload = {
      id: '',
      title: data.title,
      description: data.description,
      day: FormattedDay || day,
      start_time: startIso,
      end_time: endIso,
      latitude: loc.lat,
      longitude: loc.lng,
      categories: categoriesArray,
    }

    try {
      console.log('Creating event with payload:', payload)
      const resp = await axios.post(postEndpoint, payload, { headers: { 'Content-Type': 'application/json' } })
      console.log('POST response status:', resp.status, 'data:', resp.data)
      setSnackbar({ open: true, message: 'Event saved', severity: 'success' })
      const respData = resp.data || {}

      // For instant feedback, draw the returned feature if present
      if (respData.feature && respData.feature.geometry && Array.isArray(respData.feature.geometry.coordinates)) {
        const [lon, lat] = respData.feature.geometry.coordinates
        const props = respData.feature.properties || {}
        const mk = createMarker(map, lon, lat, {
          title: props.title || data.title,
          description: props.description || data.description,
          day: props.day || data.day,
          start_time: props.start_time || payload.start_time,
          end_time: props.end_time || payload.end_time,
          categories: props.categories || data.categories,
        })
        dbMarkersRef.current.push(mk)
      } else {
        // fallback: draw locally at selected point
        const mk = createMarker(map, loc.lng, loc.lat, data)
        dbMarkersRef.current.push(mk)
      }

      
      const reloadDay = (respData && respData.feature && respData.feature.properties && respData.feature.properties.day) || data.day || day
      console.log('Reloading events for day:', reloadDay)
      await loadEvents(reloadDay, categories, { fit: true })
      
    } catch (err) {
      console.error('Failed to POST event, falling back to local marker', err)
      const aerr = err as any
      if (aerr && aerr.response && aerr.response.data) {
        const msg = aerr.response.data.error || JSON.stringify(aerr.response.data)
        setSnackbar({ open: true, message: `Save failed: ${msg}`, severity: 'error' })
      } else {
        setSnackbar({ open: true, message: 'Failed to save event', severity: 'error' })
      }
      createMarker(map, loc.lng, loc.lat, data)
      // Still refresh list so we remain consistent
      await loadEvents(data.day || day, categories, { fit: true })
    } finally {
      setSelectedLocation(null)
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
      // initial load: keep demo markers if server returns none
      await loadEvents(day, categories, { fit: true, keepExistingOnEmpty: true })
      await loadUpcoming()

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
        try { demoRemoveRef.current() } catch (e) { console.warn('Failed to remove demo markers', e) }
        demoRemoveRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <>
      <SearchBar
        onDateChange={(d) => {
          const isoDay = d.format ? d.format('YYYY-MM-DD') : new Date().toISOString().slice(0,10)
          setDay(isoDay)
          // reload events for the selected day; when user changes date we want to show only that day's events
          loadEvents(isoDay, categories, { fit: true, keepExistingOnEmpty: false })
        }}
        onCategoriesFound={(cats) => {
          const newCats: string[] | 'all' = (cats && cats.length) ? cats : 'all'
          console.log('App received categories from SearchBar:', newCats)
          setCategories(newCats)
          // reload events for current day using the new categories
          loadEvents(day, newCats, { fit: true, keepExistingOnEmpty: false })
        }}
        onSearchResults={(results) => {
          const map = mapRef.current
          if (!map) return
          // clear current DB markers and draw only the search results
          clearDbMarkers()
          if (!results || results.length === 0) return
          for (const r of results as any[]) {
            const lng = Number(r.longitude)
            const lat = Number(r.latitude)
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
            const mk = createMarker(map, lng, lat, {
              title: r.title,
              description: r.description,
              day: r.day,
              start_time: r.start_time,
              end_time: r.end_time,
              categories: Array.isArray(r.categories) ? r.categories : [],
            })
            dbMarkersRef.current.push(mk)
          }
          fitMapToMarkers(dbMarkersRef.current)
        }}
      />
      <div id="map-container" ref={mapContainerRef}>
        <FloatingActionButtons onCreate={handleCreate} />
      </div>
      <CreateDetails
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={(_e?: unknown, reason?: string) => { if (reason === 'clickaway') return; setSnackbar(s => ({ ...s, open: false })) }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: 2000 }}
      >
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity || 'info'} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default App