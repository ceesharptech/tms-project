"""
Face enrollment logic.
Accepts 3-5 images for a driver, extracts ArcFace embeddings via DeepFace,
averages them, and returns the averaged vector to store in Supabase JSONB.
"""
import logging
from typing import List

from deepface import DeepFace
from fastapi import UploadFile

from utils.embedding_utils import average_embeddings
from utils.image_processing import preprocess_for_deepface, validate_image

logger = logging.getLogger(__name__)


async def enroll_face(driver_id: str, image_files: List[UploadFile]) -> List[float]:
    """
    Process 3-5 face images for a driver and return the averaged ArcFace embedding.

    Raises ValueError for validation errors, RuntimeError for DeepFace failures.
    """
    if not (3 <= len(image_files) <= 5):
        raise ValueError(
            f"Expected 3-5 images for enrollment, got {len(image_files)}"
        )

    logger.info(f"Enrolling driver_id={driver_id} with {len(image_files)} image(s)")

    embeddings = []
    for idx, file in enumerate(image_files, start=1):
        image_bytes = await file.read()

        try:
            img_array = validate_image(image_bytes)
            img_array = preprocess_for_deepface(img_array)
        except ValueError as e:
            raise ValueError(f"Image {idx} failed validation: {e}")

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
                raise ValueError(f"No face detected in image {idx}")
            raise ValueError(f"Face detection failed for image {idx}: {e}")
        except Exception as e:
            logger.error(f"DeepFace error on image {idx} (driver={driver_id}): {e}")
            raise RuntimeError(f"Processing failed for image {idx}: {e}")

        if len(result) == 0:
            raise ValueError(f"No face detected in image {idx}")
        if len(result) > 1:
            raise ValueError(
                f"Multiple faces detected in image {idx} — please crop to a single face"
            )

        embedding = result[0]["embedding"]
        embeddings.append(embedding)
        logger.debug(f"  Image {idx}: embedding extracted (dim={len(embedding)})")

    averaged = average_embeddings(embeddings)
    logger.info(
        f"Enrollment complete: driver_id={driver_id}, embedding_dim={len(averaged)}"
    )
    return averaged
