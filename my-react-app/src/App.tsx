import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

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
      center: [-117.841019, 33.645198],
      zoom: 16
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    }
  }, [])
  return (
    <>
      <div id='map-container' ref={mapContainerRef} />
    </>
  )
}

export default App