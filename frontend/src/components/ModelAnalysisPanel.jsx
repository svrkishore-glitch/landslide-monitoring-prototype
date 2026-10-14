import { useEffect, useState } from 'react'
import { analyzeScene, fetchModelStatus } from '../api'

const LAYERS = [
  ['rgb', 'RGB natural color'],
  ['swir', 'SWIR composite'],
  ['nir', 'NIR false color'],
  ['ndmi', 'NDMI moisture index'],
  ['ndvi', 'NDVI vegetation index'],
  ['bsi', 'BSI bare soil index'],
  ['tct_wetness', 'TCT wetness index'],
]
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

export default function ModelAnalysisPanel() {
  const [server, setServer] = useState(null)
  const [serverError, setServerError] = useState('')
  const [files, setFiles] = useState({})
  const [metadata, setMetadata] = useState({
    latitude: '',
    longitude: '',
    capture_month: '',
    cloud_cover: '',
    movement_type: '',
  })
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkingServer, setCheckingServer] = useState(true)

  async function checkServer() {
    setCheckingServer(true)
    setServerError('')
    try {
      setServer(await fetchModelStatus())
    } catch {
      setServerError('Could not check the local model server.')
    } finally {
      setCheckingServer(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetchModelStatus()
      .then((status) => {
        if (!cancelled) setServer(status)
      })
      .catch(() => {
        if (!cancelled) setServerError('Could not check the local model server.')
      })
      .finally(() => {
        if (!cancelled) setCheckingServer(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function updateMetadata(event) {
    const { name, value } = event.target
    setMetadata((current) => ({ ...current, [name]: value }))
  }

  function chooseImage(key, file, input) {
    setError('')
    setAnalysis('')
    if (!file) {
      setFiles((current) => ({ ...current, [key]: null }))
      return
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Use PNG, JPEG, or WebP image files for each layer.')
      setFiles((current) => ({ ...current, [key]: null }))
      input.value = ''
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Each image must be smaller than 2 MB.')
      setFiles((current) => ({ ...current, [key]: null }))
      input.value = ''
      return
    }
    setFiles((current) => ({ ...current, [key]: file }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setAnalysis('')
    if (!LAYERS.every(([key]) => files[key])) {
      setError('Choose all seven Sentinel-2 image layers before analyzing.')
      return
    }

    setSubmitting(true)
    try {
      const images = Object.fromEntries(
        await Promise.all(
          LAYERS.map(async ([key]) => [key, await readAsDataUrl(files[key])]),
        ),
      )
      const result = await analyzeScene({
        images,
        metadata: {
          latitude: Number(metadata.latitude),
          longitude: Number(metadata.longitude),
          capture_month: Number(metadata.capture_month),
          cloud_cover: Number(metadata.cloud_cover),
          movement_type: metadata.movement_type,
        },
      })
      setAnalysis(result.analysis)
    } catch (requestError) {
      setError(requestError.message || 'Could not analyze these images.')
    } finally {
      setSubmitting(false)
    }
  }

  const ready = server?.ready === true

  return (
    <section className="model-panel" aria-labelledby="model-title">
      <div className="model-panel__heading">
        <div>
          <p className="eyebrow">Experimental Hugging Face model</p>
          <h2 id="model-title">Analyze a Sentinel-2 scene</h2>
        </div>
        <span className={`model-state ${ready ? 'is-ready' : ''}`}>
          {ready ? 'Local model connected' : 'Model server offline'}
        </span>
      </div>

      <p>
        This optional experiment sends satellite-image layers to a vision model
        running on your computer. It is separate from the rainfall dashboard
        and needs seven aligned Sentinel-2 composites from the same scene and
        date. Regular photos are not valid inputs.
      </p>

      <div className="model-steps" aria-label="How this experiment works">
        <div><span>01</span><b>Choose 7 layers</b><small>Same place and capture date</small></div>
        <div><span>02</span><b>Add scene details</b><small>Use the dataset metadata</small></div>
        <div><span>03</span><b>Run locally</b><small>Needs the model server online</small></div>
      </div>

      <div className="model-warning">
        <strong>Research demo only.</strong> The model was fine-tuned using
        Italian-region examples, is not validated for Northeast India, and its
        generated risk scores are not calibrated warnings or probabilities.
        Never use them for safety decisions.
      </div>

      <div className={`model-connection ${ready ? 'is-ready' : ''}`} role="status">
        <span className="model-connection__icon">{ready ? '✓' : '!'}</span>
        <div className="model-connection__copy">
          <strong>{ready ? 'Local model connected' : checkingServer ? 'Checking model connection' : 'Local model server is offline'}</strong>
          <small>{serverError || server?.message || 'Start the optional model server to enable image analysis.'}</small>
        </div>
        <button className="model-refresh" type="button" onClick={checkServer} disabled={checkingServer}>
          {checkingServer ? 'Checking…' : 'Check again'}
        </button>
      </div>

      <form className="model-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Seven image layers</legend>
          <div className="layer-grid">
            {LAYERS.map(([key, label]) => (
              <label className="layer-input" key={key}>
                <span>{label}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => chooseImage(key, event.target.files?.[0], event.target)}
                  required
                />
                {files[key] && <small>{files[key].name}</small>}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Scene metadata</legend>
          <div className="metadata-grid">
            <label>
              Latitude
              <input name="latitude" type="number" min="-90" max="90" step="any" value={metadata.latitude} onChange={updateMetadata} required />
            </label>
            <label>
              Longitude
              <input name="longitude" type="number" min="-180" max="180" step="any" value={metadata.longitude} onChange={updateMetadata} required />
            </label>
            <label>
              Capture month
              <input name="capture_month" type="number" min="1" max="12" value={metadata.capture_month} onChange={updateMetadata} required />
            </label>
            <label>
              Cloud cover (%)
              <input name="cloud_cover" type="number" min="0" max="100" step="any" value={metadata.cloud_cover} onChange={updateMetadata} required />
            </label>
            <label className="metadata-wide">
              Movement type from the dataset
              <input name="movement_type" type="text" maxLength="80" value={metadata.movement_type} onChange={updateMetadata} placeholder="Use the dataset value; do not guess" required />
            </label>
          </div>
        </fieldset>

        <button className="model-submit" type="submit" disabled={!ready || submitting}>
          {submitting ? 'Analyzing locally…' : 'Analyze this scene'}
        </button>
      </form>

      {error && <p className="model-message error" role="alert">{error}</p>}
      {analysis && (
        <div className="model-result" aria-live="polite">
          <h3>Experimental model output</h3>
          <pre>{analysis}</pre>
        </div>
      )}
    </section>
  )
}
