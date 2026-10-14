# LandslideGuard NER

A **personal learning and portfolio** web app that will demonstrate landslide monitoring ideas for Northeast India.

This is **not** an official emergency-warning system. Do not use it for safety decisions. See [docs/DISCLAIMER.md](docs/DISCLAIMER.md).

## Current status: live weather dashboard + research references

The dashboard fetches current model weather and a 24-hour rainfall outlook for one reference city in each of the eight Northeast states from Open-Meteo. It refreshes every 15 minutes and shows the forecast update time. Map markers represent those reference cities and are colored by forecast rainfall amount; they are **not landslide alerts or event locations**. It first tries the FastAPI weather route, then falls back to Open-Meteo directly if that route is missing or unavailable. No API key is needed for non-commercial use. Open-Meteo data requires attribution and is provided under CC BY 4.0; check the provider's current terms before commercial use.

The dashboard also links to NASA's global landslide nowcast and keeps the optional local Hugging Face image-analysis demo under an expandable research section. Neither is presented as a locally validated landslide warning for Northeast India.

Stack: **React (Vite)** + **Python FastAPI**. Express and MongoDB are not used.

Data and license notes: [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## What you need installed

- Node.js 20.19+ or 22.12+ (`node -v`, `npm -v`), required by the Vite 8 project setup
- Python 3.11 or newer (`python --version`)
- No API keys for the Open-Meteo weather forecast. Model inference runs locally when you choose to install the optional model server.

## How to run

Use two terminals. Keep both running.

### 1. Backend (FastAPI)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Checks:

- [http://127.0.0.1:8001/api/health](http://127.0.0.1:8001/api/health)
- [http://127.0.0.1:8001/api/weather](http://127.0.0.1:8001/api/weather) — forecast data for eight reference cities (requires internet access)

Interactive API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Frontend (React)

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually [http://localhost:5173](http://localhost:5173)). Select a state, review the forecast metrics and rainfall chart, or click a map point to switch locations. The weather feed requires the backend and internet access.

The Vite dev server proxies `/api` to `http://127.0.0.1:8001`.

### 3. Optional Hugging Face image model

The analysis form needs all seven aligned Sentinel-2 composites (RGB, SWIR, NIR, NDMI, NDVI, BSI, TCT Wetness) from the same scene and date, plus scene metadata. A normal photo or a single RGB satellite image is not a valid input. Each image must be PNG, JPEG, or WebP under 2 MB.

Install llama.cpp using its official Windows package and start the model server in a third terminal:

```powershell
winget install llama.cpp
llama serve -hf Sciamlab/LFM2.5-VL-450M-landslide-GGUF:Q8_0 --port 8080
```

The first start downloads roughly 612 MB of model files. Keep the server running while using the form. The API checks `http://127.0.0.1:8080/health` and sends images only to that local server; no Hugging Face token is needed. Model download is optional; the map and NASA reference still work without it.

The model card links an example dataset at [Sciamlab/landslide-sentinel2-vlm](https://huggingface.co/datasets/Sciamlab/landslide-sentinel2-vlm). Its examples cover Italian regions. They are useful to exercise the upload flow, but they do not establish performance in Northeast India. The model and dataset licenses also apply; see the source table before sharing or adapting them.

If the weather panel shows an error, confirm the backend is running and that it can reach Open-Meteo, then refresh. If the provider is unavailable, the dashboard reports the failure rather than substituting sample values.

## Project layout

```
README.md
docs/DISCLAIMER.md
docs/DATA_SOURCES.md
frontend/          Vite + React (Leaflet map)
backend/           FastAPI
  app/main.py
  app/routers/sample_data.py
  app/data/sample_landslides.geojson
```

## Honesty rules

- Label sample or mock data as sample data.
- Do not describe image segmentation as forecasting a future landslide.
- Treat all generated model scores as experimental model output, never as calibrated probabilities or warnings.
- Do not download large datasets or model weights without documenting size, source, and license first.
