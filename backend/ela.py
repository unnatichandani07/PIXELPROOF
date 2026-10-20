"""Error Level Analysis (ELA).

IMPORTANT: this single function is used by BOTH training (train/) and the website
backend, so the model sees identical preprocessing in both places. Do not change the
parameters after training the forgery model without retraining it.
"""
import io
import numpy as np
from PIL import Image, ImageChops, ImageEnhance

ELA_QUALITY = 90
ELA_SIZE = (128, 128)


def ela_pil(img: Image.Image, quality: int = ELA_QUALITY) -> Image.Image:
    """Return the ELA map of a PIL image as a full-size RGB PIL image."""
    original = img.convert("RGB")
    buffer = io.BytesIO()
    original.save(buffer, "JPEG", quality=quality)
    buffer.seek(0)
    resaved = Image.open(buffer).convert("RGB")
    diff = ImageChops.difference(original, resaved)
    extrema = diff.getextrema()
    max_diff = max(e[1] for e in extrema) or 1
    return ImageEnhance.Brightness(diff).enhance(255.0 / max_diff)


def ela_array(img: Image.Image, size=ELA_SIZE) -> np.ndarray:
    """ELA map resized to `size`, returned as a uint8 array (H, W, 3).
    The model rescales /255 itself, so we keep raw 0-255 values here."""
    return np.array(ela_pil(img).resize(size), dtype=np.uint8)
