
// Wait for the user to choose the location on the map, set cursor to crosshair while waiting.
export default function waitForMapClick(map: mapboxgl.Map): Promise<{ lng: number; lat: number }> {
    return new Promise((resolve) => {
        const canvas = map.getCanvas()
        const prev = canvas.style.cursor
        canvas.style.cursor = 'crosshair'
        map.once('click', (e) => {
            canvas.style.cursor = prev || ''
            const lngLat = e.lngLat
            resolve({ lng: lngLat.lng, lat: lngLat.lat })
        })
    })
}
