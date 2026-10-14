import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { fetchSampleLandslides } from '../api'
import { sampleMarkerIcon } from '../leafletSetup'
import 'leaflet/dist/leaflet.css'

const MAP_CENTER = [26.2, 93.0]
const MAP_BOUNDS = [
  [21.5, 87.5],
  [29.8, 97.8],
]

export default function MapView() {
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchSampleLandslides()
        if (!cancelled) {
          setFeatures(data.features ?? [])
        }
      } catch {
        if (!cancelled) {
          setError(
            'Could not load sample map data. Start the FastAPI server on port 8000, then refresh.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="status">Loading sample map data…</p>
  }

  if (error) {
    return <p className="status error">{error}</p>
  }

  return (
    <div className="map-wrap">
      <MapContainer
        center={MAP_CENTER}
        zoom={6}
        minZoom={5}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {features.map((feature) => {
          const [lon, lat] = feature.geometry.coordinates
          const { id, title, notice } = feature.properties
          return (
            <Marker key={id} position={[lat, lon]} icon={sampleMarkerIcon}>
              <Popup>
                <strong>{title}</strong>
                <p>{notice}</p>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
