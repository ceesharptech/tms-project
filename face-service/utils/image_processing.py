"""Image pre-processing utilities: resize, normalize, face detection."""
import base64
import io
from PIL import Image
import numpy as np


def base64_to_image(b64_string: str) -> Image.Image:
    """Decode a base64-encoded image string to a PIL Image."""
    image_data = base64.b64decode(b64_string)
    return Image.open(io.BytesIO(image_data))


def image_to_numpy(image: Image.Image) -> np.ndarray:
    """Convert a PIL Image to a numpy array (RGB)."""
    return np.array(image.convert("RGB"))
