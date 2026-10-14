import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { fetchRegionalWeather } from './api'
import DisclaimerBanner from './components/DisclaimerBanner'
import NasaNowcastPanel from './components/NasaNowcastPanel'
import ModelAnalysisPanel from './components/ModelAnalysisPanel'
import 'leaflet/dist/leaflet.css'
import './App.css'

const REFRESH_MS = 15 * 60 * 1000

function weatherLabel(code) {
  if ([0].includes(code)) return 'Clear sky'
  if ([1, 2, 3].includes(code)) return 'Partly cloudy'
  if ([45, 48].includes(code)) return 'Fog'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain showers'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow'
  if ([95, 96, 99].includes(code)) return 'Thunderstorm'
  return 'Weather data available'
}

function timeLabel(value) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: true }).format(new Date(value))
}

function RainChart({ outlook }) {
  const data = outlook.filter((_, index) => index % 3 === 0).slice(0, 8)
  const max = Math.max(1, ...data.map((item) => item.precipitation_mm || 0))
  return (
    <div className="rain-chart" aria-label="Rainfall forecast for the next 24 hours">
      {data.map((item) => {
        const height = Math.max(5, ((item.precipitation_mm || 0) / max) * 100)
        return (
          <div className="rain-bar" key={item.time} title={`${timeLabel(item.time)} · ${item.precipitation_mm ?? 0} mm`}>
            <span className="rain-bar__value">{Number(item.precipitation_mm || 0).toFixed(1)}</span>
            <span className="rain-bar__fill" style={{ height: `${height}%` }} />
            <span className="rain-bar__time">{timeLabel(item.time)}</span>
          </div>
        )
      })}
    </div>
  )
}

function RainMap({ regions, selectedId, onSelect }) {
  return (
    <MapContainer className="regional-map" center={[26.1, 92.5]} zoom={5.8} minZoom={5} maxZoom={9} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {regions.map((item) => {
        const amount = item.next_24h_rain_mm || 0
        const color = amount >= 50 ? '#c4473a' : amount >= 20 ? '#d58b26' : '#2e806b'
        return (
          <CircleMarker
            key={item.region.id}
            center={[item.region.latitude, item.region.longitude]}
            radius={selectedId === item.region.id ? 10 : 7}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.86, weight: 2 }}
            eventHandlers={{ click: () => onSelect(item.region.id) }}
          >
            <Popup>
              <strong>{item.region.name}</strong><br />
              {item.region.city} · {amount} mm forecast rainfall / 24h
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

function App() {
  const [regions, setRegions] = useState([])
  const [selectedId, setSelectedId] = useState('assam')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const result = await fetchRegionalWeather()
      setRegions(result.regions || [])
      setUpdatedAt(new Date())
      setError('')
    } catch (requestError) {
      setError(requestError.message || 'Weather data could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(refresh, 0)
    const timer = window.setInterval(refresh, REFRESH_MS)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
    }
  }, [refresh])

  const selected = useMemo(() => regions.find((item) => item.region.id === selectedId) || regions[0], [regions, selectedId])
  const current = selected?.current || {}
  const moisture = selected?.outlook?.find((item) => item.soil_moisture != null)?.soil_moisture
  const localUpdated = updatedAt ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(updatedAt) : ''

  return (
    <div className="app-shell">
      <DisclaimerBanner />
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">L</span><span>Landslide<span className="brand-light">Guard</span><small>NORTHEAST INDIA MONITOR</small></span></a>
        <div className="topbar-meta"><span className={`live-dot ${error ? 'is-offline' : ''}`} />{error ? 'DATA OFFLINE' : loading ? 'UPDATING' : 'WEATHER FEED CONNECTED'}<button type="button" className="refresh-button" onClick={() => { setLoading(true); refresh() }} disabled={loading}>↻ Refresh</button></div>
      </header>

      <main className="dashboard" id="top">
        <section className="page-heading">
          <div><p className="eyebrow">REGIONAL CONDITIONS · LIVE MODEL DATA</p><h1>Rainfall &amp; slope watch</h1><p className="subtitle">A regional weather-monitoring prototype for Northeast India.</p></div>
          <div className="updated-card"><span className="live-dot"/><span><b>{loading ? 'Refreshing forecast' : 'Forecast updated'}</b><small>{localUpdated ? `Today at ${localUpdated} IST` : 'Waiting for data'}</small></span></div>
        </section>

        {error && <div className="error-banner" role="alert"><span>{error}</span><button type="button" onClick={refresh}>Try again</button></div>}
        {!error && !regions.length && <div className="loading-banner">Connecting to the regional weather feed…</div>}

        {selected && <>
          <section className="selection-row">
            <div><label htmlFor="region-select">MONITORED LOCATION</label><select id="region-select" value={selected.region.id} onChange={(event) => setSelectedId(event.target.value)}>{regions.map((item) => <option key={item.region.id} value={item.region.id}>{item.region.name} · {item.region.city}</option>)}</select></div>
            <div className="location-condition"><span className="weather-symbol">{current.weather_code >= 61 ? '🌧' : current.weather_code >= 45 ? '☁' : '◉'}</span><span><b>{weatherLabel(current.weather_code)}</b><small>At {selected.region.city}, {selected.region.name}</small></span></div>
          </section>

          <section className="metrics-grid" aria-label="Current weather metrics">
            <article className="metric-card"><span className="metric-icon">☔</span><span className="metric-label">RAIN · NEXT 24 HOURS</span><strong>{selected.next_24h_rain_mm}<small> mm</small></strong><span className="metric-foot">Forecast accumulation</span></article>
            <article className="metric-card"><span className="metric-icon">◎</span><span className="metric-label">PEAK RAIN CHANCE</span><strong>{selected.max_rain_probability}<small>%</small></strong><span className="metric-foot">Highest hourly probability</span></article>
            <article className="metric-card"><span className="metric-icon">◌</span><span className="metric-label">AIR TEMPERATURE</span><strong>{current.temperature_2m ?? '—'}<small>°C</small></strong><span className="metric-foot">Model current estimate</span></article>
            <article className="metric-card"><span className="metric-icon">◍</span><span className="metric-label">TOPSOIL MOISTURE</span><strong>{moisture == null ? '—' : Math.round(moisture * 100)}<small>{moisture == null ? '' : '%'}</small></strong><span className="metric-foot">0–7 cm model estimate</span></article>
          </section>

          <section className="content-grid">
            <article className="panel forecast-panel"><div className="panel-heading"><div><p className="eyebrow">SHORT-RANGE OUTLOOK</p><h2>Rainfall forecast</h2></div><span className="unit-tag">mm / hour</span></div><RainChart outlook={selected.outlook || []}/><div className="chart-caption"><span>Next 24 hours · {selected.region.city}</span><span>Updated {localUpdated || '—'}</span></div></article>
            <article className="panel map-panel"><div className="panel-heading"><div><p className="eyebrow">8 NORTHEAST STATES</p><h2>Regional overview</h2></div><span className="unit-tag">CITY FORECAST POINTS</span></div><RainMap regions={regions} selectedId={selected.region.id} onSelect={setSelectedId}/><div className="map-legend"><span><i className="legend-dot low"/> &lt;20 mm</span><span><i className="legend-dot medium"/> 20–49 mm</span><span><i className="legend-dot high"/> ≥50 mm</span></div></article>
          </section>

          <section className="info-strip"><span className="info-icon">i</span><p><b>How to read this dashboard</b> Rainfall, rain chance, and soil moisture are weather-model estimates for reference cities. They are not landslide observations, calibrated landslide probabilities, or official alerts. Use local authorities for safety decisions.</p><a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Data source ↗</a></section>
        </>}

        <details className="advanced-section"><summary>Experimental satellite-image analysis (research demo)</summary><div className="advanced-content"><ModelAnalysisPanel /></div></details>
        <details className="advanced-section nasa-details"><summary>NASA landslide nowcast reference</summary><div className="advanced-content"><NasaNowcastPanel /></div></details>
        <footer className="footer"><span>LANDSLIDEGUARD NER · PERSONAL PORTFOLIO PROJECT</span><span>Weather source: Open-Meteo · Refreshes every 15 minutes</span></footer>
      </main>
    </div>
  )
}

export default App
