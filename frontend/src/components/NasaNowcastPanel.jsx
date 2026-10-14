const NASA_NOWCAST_URL =
  'https://pmmpublisher.pps.eosdis.nasa.gov/precip-apps-viewer.html'

export default function NasaNowcastPanel() {
  return (
    <section className="nasa-panel" aria-labelledby="nasa-nowcast-title">
      <div className="nasa-panel__heading">
        <div>
          <p className="eyebrow">External reference · NASA</p>
          <h2 id="nasa-nowcast-title">NASA landslide nowcast</h2>
        </div>
        <span className="external-badge">Opens NASA viewer</span>
      </div>

      <p>
        NASA’s LHASA model combines satellite rainfall, soil moisture, and
        landslide susceptibility information to estimate where rainfall-linked
        landslide hazard may be elevated.
      </p>

      <div className="nasa-panel__notice">
        <strong>This is NASA’s global product, not a forecast from this app.</strong>
        <span>
          It has not been validated here specifically for Northeast India. The
          map and sample pins above are separate demo content.
        </span>
      </div>

      <a
        className="nasa-link"
        href={NASA_NOWCAST_URL}
        target="_blank"
        rel="noreferrer"
      >
        Open NASA’s interactive nowcast
        <span aria-hidden="true"> ↗</span>
      </a>
      <p className="nasa-panel__footnote">
        NASA describes this as a near-real-time product; data latency and
        service availability can vary. Follow local authorities for safety
        guidance.
      </p>
    </section>
  )
}
