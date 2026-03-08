"""
Face identification logic.
Accepts a query image, extracts its ArcFace embedding, compares it via
cosine distance against all stored driver embeddings, and returns the best match.
"""
import logging
import os
from typing import Any, Dict, List

from deepface import DeepFace
from fastapi import UploadFile

from utils.embedding_utils import compute_cosine_distance
from utils.image_processing import preprocess_for_deepface, validate_image

logger = logging.getLogger(__name__)


async def identify_face(
    query_image: UploadFile, stored_embeddings: List[Dict]
) -> Dict[str, Any]:
    """
    Compare a query image against stored driver embeddings.

    Parameters:
        query_image: Uploaded face image file.
        stored_embeddings: [{"driver_id": str, "embedding": List[float]}, ...]

    Returns a dict with match result.
    Raises ValueError for bad-input errors, RuntimeError for DeepFace failures.
    """
    threshold = float(os.getenv("FACE_CONFIDENCE_THRESHOLD", "0.4"))

    image_bytes = await query_image.read()
    try:
        img_array = validate_image(image_bytes)
        img_array = preprocess_for_deepface(img_array)
    except ValueError as e:
        raise ValueError(f"Query image validation failed: {e}")

    logger.info("Extracting embedding from query image")
    try:
        result = DeepFace.represent(
            img_path=img_array,
            model_name="ArcFace",
            enforce_detection=True,
            detector_backend="opencv",
        )
    except ValueError as e:
        msg = str(e).lower()
        if "face" in msg or "detected" in msg:
            raise ValueError("No face detected in query image")
        raise ValueError(f"Face detection failed: {e}")
    except Exception as e:
        logger.error(f"DeepFace error on query image: {e}")
        raise RuntimeError(f"Processing failed for query image: {e}")

    if len(result) == 0:
        raise ValueError("No face detected in query image")
    if len(result) > 1:
        raise ValueError("Multiple faces in query image — please crop to a single face")

    query_embedding = result[0]["embedding"]
    logger.info(f"Query embedding extracted (dim={len(query_embedding)})")

    if not stored_embeddings:
        return {"matched": False, "message": "No stored embeddings to compare against"}

    best_driver_id: str | None = None
    best_distance = float("inf")

    for entry in stored_embeddings:
        dist = compute_cosine_distance(query_embedding, entry["embedding"])
        if dist < best_distance:
            best_distance = dist
            best_driver_id = entry["driver_id"]

    logger.info(
        f"Best match: driver_id={best_driver_id}, "
        f"distance={best_distance:.4f}, threshold={threshold}"
    )

    if best_distance < threshold:
        confidence = (1.0 - best_distance) * 100.0
        logger.info(f"MATCH: driver_id={best_driver_id}, confidence={confidence:.2f}%")
        return {
            "matched": True,
            "driver_id": best_driver_id,
            "confidence": round(confidence, 2),
            "distance": round(best_distance, 4),
        }

    logger.info(
        f"NO MATCH: best distance {best_distance:.4f} exceeds threshold {threshold}"
    )
    return {
        "matched": False,
        "message": "No match found above confidence threshold",
        "best_distance": round(best_distance, 4),
        "threshold": threshold,
    }
