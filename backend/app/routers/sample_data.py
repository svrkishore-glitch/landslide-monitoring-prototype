"""Serves the tiny invented sample GeoJSON (not real landslide reports)."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()

# .../backend/app/data/sample_landslides.geojson
DATA_FILE = (
    Path(__file__).resolve().parent.parent / "data" / "sample_landslides.geojson"
)


@router.get("/api/sample-landslides")
def sample_landslides():
    """Return demo map pins. Every feature is labeled as sample data."""
    if not DATA_FILE.is_file():
        raise HTTPException(status_code=500, detail="Sample GeoJSON file is missing.")
    with DATA_FILE.open(encoding="utf-8") as file:
        return json.load(file)
