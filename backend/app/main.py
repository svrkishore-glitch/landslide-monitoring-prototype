"""FastAPI entry point for the LandslideGuard NER portfolio prototype."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.routers import model_analysis, sample_data

app = FastAPI(
    title="LandslideGuard NER",
    description=(
        "Portfolio demo API for Northeast India landslide monitoring ideas. "
        "Not an official emergency-warning system."
    ),
    version="0.3.0",
)

# Useful if you open the frontend without the Vite proxy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(sample_data.router)
app.include_router(model_analysis.router)

REGIONS = [
    {"id": "arunachal", "name": "Arunachal Pradesh", "city": "Itanagar", "latitude": 27.0844, "longitude": 93.6053},
    {"id": "assam", "name": "Assam", "city": "Guwahati", "latitude": 26.1445, "longitude": 91.7362},
    {"id": "manipur", "name": "Manipur", "city": "Imphal", "latitude": 24.8170, "longitude": 93.9368},
    {"id": "meghalaya", "name": "Meghalaya", "city": "Shillong", "latitude": 25.5788, "longitude": 91.8933},
    {"id": "mizoram", "name": "Mizoram", "city": "Aizawl", "latitude": 23.7271, "longitude": 92.7176},
    {"id": "nagaland", "name": "Nagaland", "city": "Kohima", "latitude": 25.6751, "longitude": 94.1086},
    {"id": "sikkim", "name": "Sikkim", "city": "Gangtok", "latitude": 27.3389, "longitude": 88.6065},
    {"id": "tripura", "name": "Tripura", "city": "Agartala", "latitude": 23.8315, "longitude": 91.2868},
]


@app.get("/api/weather/regions")
def weather_regions():
    """Return the monitored Northeast India reference locations."""
    return {"regions": REGIONS}


@app.get("/api/weather")
async def all_regional_weather():
    """Fetch one multi-location forecast request for all eight reference cities."""
    params = {
        "latitude": ",".join(str(item["latitude"]) for item in REGIONS),
        "longitude": ",".join(str(item["longitude"]) for item in REGIONS),
        "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code",
        "hourly": "precipitation,precipitation_probability,soil_moisture_0_to_7cm",
        "forecast_days": 2,
        "timezone": "Asia/Kolkata",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Weather provider is temporarily unavailable.") from exc

    payload = response.json()
    locations = payload if isinstance(payload, list) else [payload]
    results = []
    for region, data in zip(REGIONS, locations):
        current = data.get("current", {})
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        start = next((i for i, value in enumerate(times) if value >= current.get("time", "")), 0)
        end = min(start + 24, len(times))
        precip = hourly.get("precipitation", [])[start:end]
        probabilities = hourly.get("precipitation_probability", [])[start:end]
        moisture = hourly.get("soil_moisture_0_to_7cm", [])[start:end]
        results.append({
            "region": region,
            "source": "Open-Meteo forecast models",
            "source_url": "https://open-meteo.com/en/docs",
            "updated_at": current.get("time"),
            "timezone": data.get("timezone", "Asia/Kolkata"),
            "current": current,
            "outlook": [
                {"time": times[start + i], "precipitation_mm": precip[i],
                 "precipitation_probability": probabilities[i] if i < len(probabilities) else None,
                 "soil_moisture": moisture[i] if i < len(moisture) else None}
                for i in range(len(precip))
            ],
            "next_24h_rain_mm": round(sum(value or 0 for value in precip), 1),
            "max_rain_probability": max((value or 0 for value in probabilities), default=0),
            "model_note": "Model-derived weather estimates for the selected city, not a landslide probability or warning.",
        })
    return {"regions": results, "source": "Open-Meteo forecast models", "fetched_at": results[0]["updated_at"] if results else None}


@app.get("/api/weather/{region_id}")
async def regional_weather(region_id: str):
    """Fetch a live model-based weather forecast for one regional reference city."""
    region = next((item for item in REGIONS if item["id"] == region_id), None)
    if region is None:
        raise HTTPException(status_code=404, detail="Unknown region.")

    params = {
        "latitude": region["latitude"],
        "longitude": region["longitude"],
        "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code",
        "hourly": "precipitation,precipitation_probability,soil_moisture_0_to_7cm",
        "forecast_days": 2,
        "timezone": "Asia/Kolkata",
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Weather provider is temporarily unavailable.") from exc

    data = response.json()
    current = data.get("current", {})
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    # Forecast includes the current hour; show the next 24 values for a compact outlook.
    start = next((i for i, value in enumerate(times) if value >= current.get("time", "")), 0)
    end = min(start + 24, len(times))
    precip = hourly.get("precipitation", [])[start:end]
    probabilities = hourly.get("precipitation_probability", [])[start:end]
    moisture = hourly.get("soil_moisture_0_to_7cm", [])[start:end]
    return {
        "region": region,
        "source": "Open-Meteo forecast models",
        "source_url": "https://open-meteo.com/en/docs",
        "updated_at": current.get("time"),
        "timezone": data.get("timezone", "Asia/Kolkata"),
        "current": current,
        "outlook": [
            {"time": times[start + i], "precipitation_mm": precip[i],
             "precipitation_probability": probabilities[i] if i < len(probabilities) else None,
             "soil_moisture": moisture[i] if i < len(moisture) else None}
            for i in range(len(precip))
        ],
        "next_24h_rain_mm": round(sum(value or 0 for value in precip), 1),
        "max_rain_probability": max((value or 0 for value in probabilities), default=0),
        "model_note": "Model-derived weather estimates for the selected city, not a landslide probability or warning.",
    }


@app.get("/api/health")
def health():
    """Simple check that the API process is running."""
    return {
        "status": "ok",
        "service": "LandslideGuard NER",
        "phase": 3,
        "message": "Portfolio demo. Map pins are invented; model analysis is experimental.",
    }
