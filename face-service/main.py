"""
TOMS Face Recognition Service
FastAPI microservice — ArcFace embeddings via DeepFace.
Endpoints: GET /health, POST /enroll, POST /identify
"""
import json
import logging
import os
from datetime import datetime, timezone
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("face-service")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PORT = int(os.getenv("PORT", "8000"))
MODEL_NAME = os.getenv("MODEL_NAME", "ArcFace")
DETECTION_BACKEND = os.getenv("DETECTION_BACKEND", "opencv")
FACE_CONFIDENCE_THRESHOLD = float(os.getenv("FACE_CONFIDENCE_THRESHOLD", "0.4"))

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="TOMS Face Recognition Service",
    description="Facial recognition microservice using DeepFace + ArcFace",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:8080", "http://localhost:5173", "https://tms-backend-production-45c0.up.railway.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-import model modules so DeepFace weight downloads happen on first request
from models.face_enrollment import enroll_face
from models.face_identification import identify_face


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "toms-face-service",
        "model": MODEL_NAME,
        "detection_backend": DETECTION_BACKEND,
        "threshold": FACE_CONFIDENCE_THRESHOLD,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/enroll")
async def enroll(
    driver_id: str = Form(...),
    images: List[UploadFile] = File(...),
):
    """
    Enroll a driver by submitting 3-5 face images.
    Returns the averaged ArcFace embedding (512 floats).
    """
    logger.info(f"POST /enroll — driver_id={driver_id}, images={len(images)}")

    # Basic file-type guard
    for i, img in enumerate(images, start=1):
        ct = img.content_type or ""
        if not ct.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"File {i} is not an image (content_type={ct})",
            )

    try:
        embedding = await enroll_face(driver_id, images)
    except ValueError as e:
        logger.warning(f"Enrollment validation error (driver={driver_id}): {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Enrollment processing error (driver={driver_id}): {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "success": True,
        "driver_id": driver_id,
        "embedding": embedding,
        "model": MODEL_NAME,
        "num_images": len(images),
        "embedding_dim": len(embedding),
    }


@app.post("/identify")
async def identify(
    image: UploadFile = File(...),
    stored_embeddings: str = Form(...),
):
    """
    Identify a face against a list of stored driver embeddings.

    `stored_embeddings` is a JSON string:
    [{"driver_id": "DRV001", "embedding": [0.1, ...]}, ...]
    """
    logger.info("POST /identify — parsing stored_embeddings")

    ct = image.content_type or ""
    if not ct.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file is not an image (content_type={ct})",
        )

    try:
        embeddings_list = json.loads(stored_embeddings)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"stored_embeddings is not valid JSON: {e}",
        )

    if not isinstance(embeddings_list, list):
        raise HTTPException(
            status_code=400,
            detail="stored_embeddings must be a JSON array",
        )

    try:
        result = await identify_face(image, embeddings_list)
    except ValueError as e:
        logger.warning(f"Identification validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Identification processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if not result.get("matched"):
        raise HTTPException(status_code=404, detail=result)

    return result


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)

