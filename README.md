# LandslideGuard NER

### A Northeast India landslide-monitoring portfolio prototype

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![Status](https://img.shields.io/badge/status-prototype-orange)

> **SIH Problem Statement 206 — “AI-Based Early Warning and Landslide Risk Monitoring System in NER.”**
>
> This is an independent learning and portfolio prototype inspired by that problem statement. It is **not the official SIH solution**, an operational warning service, or a validated landslide prediction system. Never use it to make safety or evacuation decisions.

---

## What it does

LandslideGuard NER is a web dashboard for exploring weather conditions at one representative city in each of Northeast India's eight states. It combines a regional map, weather summaries and a 24-hour rainfall outlook. It also links to NASA's landslide-nowcast viewer and offers an optional, locally run satellite-image model experiment.

The current app is deliberately a **prototype**: it demonstrates parts of a monitoring interface, but it does not predict landslides or send warnings.

## Prototype at a glance

| Dashboard feature | What it currently shows |
| --- | --- |
| Regional map | Eight fixed reference-city locations; marker color represents forecast rainfall, not landslide risk |
| Weather panel | Open-Meteo model-based current conditions and hourly forecast data |
| Rainfall outlook | Sum of the next 24 hourly forecast values and maximum precipitation probability |
| Refresh | The app refreshes its weather request every 15 minutes; the upstream weather model has its own update schedule |
| NASA reference | A link to NASA's external global landslide-nowcast viewer; this app does not generate that product |
| Satellite-image experiment | Optional local Hugging Face vision model that accepts seven aligned Sentinel-2 composite layers |
| API health | FastAPI health endpoint for checking that the backend is running |

## How this relates to SIH Problem Statement 206

The statement describes an AI-enabled real-time monitoring and prediction platform for the North Eastern Region. This prototype explores a few interface and integration ideas from that scope:

- **GIS visualization:** a Leaflet map with reference-city markers.
- **Weather-linked monitoring:** weather forecasts from Open-Meteo for the eight state-capital reference locations.
- **Satellite imagery experiment:** an optional local vision-model connection for seven Sentinel-2 composites.
- **Dashboard concept:** regional weather summaries and rainfall outlooks.

The project does **not** implement the full SIH requirements. It has no validated landslide-risk engine, official warning workflow, sensor network, field-reporting system, emergency prioritization, multilingual notifications, or offline operation. See [Limitations](#limitations) before interpreting any screen or model output.

## Built with

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite 8, JavaScript, CSS |
| Interactive map | Leaflet, React-Leaflet, OpenStreetMap tiles |
| Backend API | Python 3.11+, FastAPI, HTTPX, Pydantic |
| Weather data | Open-Meteo Forecast API |
| Optional image model | `Sciamlab/LFM2.5-VL-450M-landslide-GGUF` through a local `llama.cpp` server |
| Data formats | JSON API responses and GeoJSON sample artifact |

MongoDB and Express are not used. No API key is required for the weather dashboard. The satellite model is optional and runs locally when installed.

## Run locally

### Prerequisites

- Python 3.11 or newer
- Node.js 20.19+ or 22.12+ and npm
- Internet access for Open-Meteo, map tiles and NASA's external viewer

### 1. Start the backend

In a terminal from the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

The API is available at:

- Health: [http://127.0.0.1:8001/api/health](http://127.0.0.1:8001/api/health)
- Weather for all reference cities: [http://127.0.0.1:8001/api/weather](http://127.0.0.1:8001/api/weather)
- Interactive API docs: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

### 2. Start the frontend

Open a second terminal from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually [http://localhost:5173](http://localhost:5173). The Vite development server proxies `/api` requests to the backend on port `8001`.

### 3. Optional: enable the local image-model experiment

The main dashboard works without this model. To enable the experiment, install `llama.cpp` and start its server in another terminal:

```powershell
winget install llama.cpp
llama serve -hf Sciamlab/LFM2.5-VL-450M-landslide-GGUF:Q8_0 --port 8080
```

The first launch downloads the model files (about 612 MB). The analysis form requires **seven aligned Sentinel-2 composites from the same scene and date**: RGB, SWIR, NIR, NDMI, NDVI, BSI and TCT Wetness, plus scene metadata. Ordinary photographs or a single satellite image are not valid substitutes. The backend sends these images only to the local server at `127.0.0.1:8080`.

The model and example dataset are based on Italian-region examples. They are useful for exploring the interface, but they do not demonstrate accuracy in Northeast India. Review [data sources and licensing](docs/DATA_SOURCES.md) before using or redistributing model or dataset materials.

## Data and interpretation

- Weather values are model-derived estimates for fixed city coordinates, not measurements from local rain gauges, soil-moisture sensors or field stations.
- The app requests weather data when it loads and refreshes every 15 minutes. That refresh interval does not mean the upstream forecast model updates every 15 minutes.
- The map covers eight reference cities, not every district, road, village or slope in the region.
- Marker colors and rainfall summaries describe forecast weather only. They are **not** landslide-risk levels, event reports or alerts.
- The repository's `sample_landslides.geojson` contains invented legacy sample points. It is not used for the current dashboard and does not contain verified event data.
- The optional vision model returns experimental generated analysis. Its scores are not calibrated probabilities, and the model has not been validated for Northeast India.
- No Kaggle dataset, regional landslide inventory, sensor feed or satellite archive is integrated into the current dashboard.

Source details and license notes are in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md). The full safety disclaimer is in [docs/DISCLAIMER.md](docs/DISCLAIMER.md).

## Limitations

This is a portfolio prototype, not an operational disaster-management system. In particular, it currently has:

- No trained or validated Northeast India landslide forecasting model.
- No ground-truth evaluation, calibration, accuracy claim or independent model validation.
- No real-time sensor telemetry, local gauge integration or official IMD alert feed.
- No automated SMS, push, email or authority/community alert delivery.
- No citizen or field-official reporting, geotagged photo/video upload workflow, or verification queue.
- No road-closure, infrastructure exposure, emergency-prioritization or response-management data.
- No offline mode, low-network synchronization, mobile app, cloud deployment, authentication or production monitoring.
- Limited geographic coverage: eight fixed city points cannot represent the varied terrain and local rainfall across the NER.
- An optional satellite-image model trained on examples outside the target region; inputs must be prepared and aligned correctly.

**Do not use this app for safety decisions.** Follow official alerts and local disaster-management authorities for real-world risks.

## Repository structure

```text
backend/
  app/
    main.py                 FastAPI weather and health endpoints
    routers/                Sample-data and experimental model endpoints
    data/                   Legacy invented GeoJSON sample artifact
  requirements.txt
docs/
  DATA_SOURCES.md           Data, model, and license notes
  DISCLAIMER.md             Safety and scope disclaimer
frontend/
  src/
    App.jsx                 Dashboard interface
    components/             Map, NASA reference, model panel, disclaimers
    api.js                  API requests and weather fallback
  package.json
```

## Possible next steps

To move beyond a visual prototype, the project would need a trustworthy regional landslide inventory, terrain and rainfall datasets, a carefully designed training/evaluation split, validation with local domain expertise, and a clearly governed alert process. Operational alerts should only be considered with responsible authorities and extensive validation.

## License and attribution

No large dataset or model weights are stored in this repository. Open-Meteo attribution and data terms, OpenStreetMap tile attribution, and third-party model/dataset licenses apply; consult the linked source documentation and provider terms. A repository license has not been added, so do not assume the project is licensed for reuse.
