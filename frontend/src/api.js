/**
 * Talks to the FastAPI backend through Vite's /api proxy in development.
 */
export async function fetchHealth() {
  const response = await fetch('/api/health')
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`)
  }
  return response.json()
}

export async function fetchSampleLandslides() {
  const response = await fetch('/api/sample-landslides')
  if (!response.ok) {
    throw new Error(`Sample data request failed (${response.status})`)
  }
  return response.json()
}

export async function fetchRegionalWeather() {
  try {
    const response = await fetch('/api/weather')
    if (response.ok) return await response.json()
  } catch {
    // Use the public no-key weather endpoint below if the local API is not running.
  }

  const locations = [
    { id: 'arunachal', name: 'Arunachal Pradesh', city: 'Itanagar', latitude: 27.0844, longitude: 93.6053 },
    { id: 'assam', name: 'Assam', city: 'Guwahati', latitude: 26.1445, longitude: 91.7362 },
    { id: 'manipur', name: 'Manipur', city: 'Imphal', latitude: 24.817, longitude: 93.9368 },
    { id: 'meghalaya', name: 'Meghalaya', city: 'Shillong', latitude: 25.5788, longitude: 91.8933 },
    { id: 'mizoram', name: 'Mizoram', city: 'Aizawl', latitude: 23.7271, longitude: 92.7176 },
    { id: 'nagaland', name: 'Nagaland', city: 'Kohima', latitude: 25.6751, longitude: 94.1086 },
    { id: 'sikkim', name: 'Sikkim', city: 'Gangtok', latitude: 27.3389, longitude: 88.6065 },
    { id: 'tripura', name: 'Tripura', city: 'Agartala', latitude: 23.8315, longitude: 91.2868 },
  ]
  const params = new URLSearchParams({
    latitude: locations.map(({ latitude }) => latitude).join(','),
    longitude: locations.map(({ longitude }) => longitude).join(','),
    current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code',
    hourly: 'precipitation,precipitation_probability,soil_moisture_0_to_7cm',
    forecast_days: '2',
    timezone: 'Asia/Kolkata',
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.reason || `Weather provider request failed (${response.status})`)
  }

  const dataByLocation = Array.isArray(payload) ? payload : [payload]
  const regions = locations.map((region, index) => {
    const data = dataByLocation[index]
    const current = data.current || {}
    const hourly = data.hourly || {}
    const times = hourly.time || []
    const start = Math.max(0, times.findIndex((time) => time >= (current.time || '')))
    const end = Math.min(start + 24, times.length)
    const precipitation = (hourly.precipitation || []).slice(start, end)
    const probabilities = (hourly.precipitation_probability || []).slice(start, end)
    const soilMoisture = (hourly.soil_moisture_0_to_7cm || []).slice(start, end)

    return {
      region,
      source: 'Open-Meteo forecast models',
      source_url: 'https://open-meteo.com/en/docs',
      updated_at: current.time,
      timezone: data.timezone || 'Asia/Kolkata',
      current,
      outlook: precipitation.map((amount, hour) => ({
        time: times[start + hour],
        precipitation_mm: amount,
        precipitation_probability: probabilities[hour] ?? null,
        soil_moisture: soilMoisture[hour] ?? null,
      })),
      next_24h_rain_mm: Number(precipitation.reduce((sum, amount) => sum + (amount || 0), 0).toFixed(1)),
      max_rain_probability: Math.max(0, ...probabilities.filter((value) => value != null)),
      model_note: 'Model-derived weather estimates for the selected city, not a landslide probability or warning.',
    }
  })

  return { regions, source: 'Open-Meteo forecast models', fetched_at: regions[0]?.updated_at }
}

export async function fetchModelStatus() {
  const response = await fetch('/api/model/status')
  if (!response.ok) {
    throw new Error(`Model status request failed (${response.status})`)
  }
  return response.json()
}

export async function analyzeScene(payload) {
  const response = await fetch('/api/model/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.detail || `Model analysis failed (${response.status})`)
  }
  return result
}
