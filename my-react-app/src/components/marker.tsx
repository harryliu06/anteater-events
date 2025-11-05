import mapboxgl from 'mapbox-gl'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import RoomTwoToneIcon from '@mui/icons-material/RoomTwoTone';

type GeoFeature = {
	type: string
	properties?: Record<string, unknown>
	geometry: { type: string; coordinates: [number, number] }
}

type GeoJSONFC = {
	type: 'FeatureCollection'
	features: GeoFeature[]
}

//Change ISO date string to hh:mm AM/PM format
function changeToTimeFormat(isoDate: string): string {
    const date = new Date(isoDate);
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');

    const meridiem = hours >= 12 ? 'PM' : 'AM';
    const adjustedHours = hours % 12 || 12; // Convert to 12-hour format
    const formattedHours = adjustedHours.toString().padStart(2, '0');

    
    return `${formattedHours}:${minutes}  ${meridiem}`;
}

// Function to add markers from GeoJSON to the map
export async function addGeoJSONMarkers(map: mapboxgl.Map): Promise<() => void> {
	const res = await fetch('/location.geojson')
	if (!res.ok) {
		console.warn('Could not load /location.geojson')
		return () => {}
	}
	const geo: GeoJSONFC = await res.json()
	const created: mapboxgl.Marker[] = []

	for (const feature of geo.features) {
		const coords = feature.geometry.coordinates
		const [lng, lat] = coords
			
        const el = document.createElement('div')
        el.className = 'custom-marker'
			
        const svg = renderToStaticMarkup(<RoomTwoToneIcon />)
        el.innerHTML = svg
        
        const props = feature.properties as Record<string, unknown> | undefined
        const title = props && typeof props['title'] === 'string' ? (props['title'] as string) : ''
        const description = props && typeof props['description'] === 'string' ? (props['description'] as string) : ''
        const day = props && typeof props['day'] === 'string' ? (props['day'] as string) : ''
        
        let start_time = props && typeof props['start_time'] === 'string' ? (props['start_time'] as string) : ''
        start_time = changeToTimeFormat(start_time)
        let end_time = props && typeof props['end_time'] === 'string' ? (props['end_time'] as string) : ''
        end_time = changeToTimeFormat(end_time)
        
        const categories = props && Array.isArray(props['categories']) ? (props['categories'] as string[]) : []
        if (title) el.title = title
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lng, lat])

        if (title || description) {
            const popup = new mapboxgl.Popup({ offset: 8 }).setHTML(`
                <strong>${title}</strong>
                <div>${description}</div>
                <strong>
                Day: 
                </strong>
                <div>${day}</div>
                <strong>
                Time: 
                </strong>
                <div>${start_time} - ${end_time}</div>
                <div>Categories: ${categories.join(', ')}</div>
            `)
            marker.setPopup(popup)
        }

		marker.addTo(map)
		created.push(marker)
	}

	return () => { created.forEach(m => m.remove()) }
}

export default addGeoJSONMarkers
