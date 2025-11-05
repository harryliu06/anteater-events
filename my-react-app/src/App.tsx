import { useRef, useEffect } from 'react'
import FloatingActionButtons from './components/FloatingActionButton'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'
import addGeoJSONMarkers from './components/marker';

const MAPBOX_KEY = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

function App() {
  //mapRef hold the map instance
  const mapRef = useRef<mapboxgl.Map | null>(null);
  //mapContainerRef hold the map container div
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

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
          <FloatingActionButtons></FloatingActionButtons>
        </div>
      </>
    )
}

export default App