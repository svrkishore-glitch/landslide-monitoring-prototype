"""Optional local Hugging Face model adapter through llama.cpp."""

import base64
import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/model", tags=["experimental model"])
LLAMA_SERVER = "http://127.0.0.1:8080"
MODEL_ID = "Sciamlab/LFM2.5-VL-450M-landslide-GGUF"
MAX_IMAGE_BYTES = 2 * 1024 * 1024
DATA_URL_RE = re.compile(r"^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$")


class SceneImages(BaseModel):
    rgb: str
    swir: str
    nir: str
    ndmi: str
    ndvi: str
    bsi: str
    tct_wetness: str


class SceneMetadata(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    capture_month: int = Field(ge=1, le=12)
    cloud_cover: float = Field(ge=0, le=100)
    movement_type: str = Field(min_length=1, max_length=80)


class AnalysisRequest(BaseModel):
    images: SceneImages
    metadata: SceneMetadata


def _checked_image(data_url: str) -> str:
    match = DATA_URL_RE.fullmatch(data_url)
    if not match:
        raise HTTPException(status_code=422, detail="Each layer must be a PNG, JPEG, or WebP image.")
    try:
        raw = base64.b64decode(match.group(2), validate=True)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="An uploaded image is not valid base64 data.") from exc
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Each layer must be smaller than 2 MB.")
    return data_url


@router.get("/status")
def model_status():
    """Tell the frontend whether the optional local inference server is ready."""
    try:
        with urlopen(f"{LLAMA_SERVER}/health", timeout=1.5) as response:
            ready = response.status == 200
    except (HTTPError, URLError, TimeoutError, OSError):
        ready = False
    return {
        "ready": ready,
        "model": MODEL_ID,
        "server": LLAMA_SERVER,
        "message": "Local model server is ready." if ready else "Start the optional llama.cpp model server to enable analysis.",
    }


@router.post("/analyze")
def analyze_scene(payload: AnalysisRequest):
    """Forward seven Sentinel-2 layer images to the user-run local model server."""
    image_fields = payload.images.dict()
    images = {name: _checked_image(value) for name, value in image_fields.items()}

    prompt = (
        "You are an experimental remote-sensing image assessment model. Analyze the seven supplied "
        "Sentinel-2 composites in this exact order: RGB, SWIR, NIR, NDMI, NDVI, BSI, TCT Wetness. "
        "Scene metadata: "
        f"latitude={payload.metadata.latitude}, longitude={payload.metadata.longitude}, "
        f"movement_type={payload.metadata.movement_type}, capture_month={payload.metadata.capture_month}, "
        f"cloud_cover_percent={payload.metadata.cloud_cover}. "
        "Return one JSON object with the model's expected fields: soil_moisture_anomaly, "
        "vegetation_stress, bare_soil_exposure, water_accumulation, steep_terrain_visible, "
        "erosion_evidence, swir_anomaly, tct_wetness_anomaly, image_quality_limited, geo_features, "
        "exposure_risk, exposure_risk_explanation, hazard_risk, and hazard_risk_explanation. "
        "Do not claim this is a calibrated probability, official warning, or verified forecast. "
        "If image quality or required information is insufficient, say so and set image_quality_limited true."
    )
    content = [{"type": "text", "text": prompt}]
    content.extend(
        {"type": "image_url", "image_url": {"url": images[name]}}
        for name in ("rgb", "swir", "nir", "ndmi", "ndvi", "bsi", "tct_wetness")
    )
    request_body = json.dumps(
        {
            "model": "local-model",
            "messages": [{"role": "user", "content": content}],
            "temperature": 0,
            "max_tokens": 700,
            "stream": False,
        }
    ).encode("utf-8")
    request = Request(
        f"{LLAMA_SERVER}/v1/chat/completions",
        data=request_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail="The local model server rejected the image request.") from exc
    except (URLError, TimeoutError, OSError) as exc:
        raise HTTPException(status_code=503, detail="The local model server is unavailable. Check its status and try again.") from exc
    except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="The local model server returned an unreadable response.") from exc

    try:
        output = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="The local model response did not include an analysis.") from exc
    return {"model": MODEL_ID, "analysis": output, "experimental": True}
