"""Image pre-processing utilities: validation, conversion, normalization."""
import io
import logging

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def validate_image(image_bytes: bytes) -> np.ndarray:
    """Check file is valid image, convert to numpy array, validate min dimensions."""
    try:
        # Two-pass: verify integrity first, then re-open to read pixels
        Image.open(io.BytesIO(image_bytes)).verify()
    except Exception as e:
        raise ValueError(f"Invalid image format: {e}")

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)

    h, w = img_array.shape[:2]
    if h < 100 or w < 100:
        raise ValueError(
            f"Image too small: {w}x{h} pixels — minimum 100x100 required"
        )

    return img_array


def preprocess_for_deepface(image_array: np.ndarray) -> np.ndarray:
    """Ensure the array is in RGB uint8 format expected by DeepFace."""
    if image_array.ndim == 2:
        # Grayscale → RGB
        image_array = np.stack([image_array] * 3, axis=-1)
    elif image_array.shape[2] == 4:
        # RGBA → RGB
        image_array = image_array[:, :, :3]
    return image_array
