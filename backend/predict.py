"""Loads both models and turns an uploaded image into a verdict."""
import base64
import io
import os

import numpy as np
from PIL import Image

from ela import ela_array, ela_pil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "models")
AI_MODEL_PATH = os.path.join(MODEL_DIR, "ai_detector.keras")
FORGERY_MODEL_PATH = os.path.join(MODEL_DIR, "forgery_detector.keras")

_models = {}


def _load(name, path):
    """Load a model once; return None if the file does not exist yet."""
    if name in _models:
        return _models[name]
    if not os.path.exists(path):
        _models[name] = None
        return None
    import tensorflow as tf  # imported late so the server starts fast
    _models[name] = tf.keras.models.load_model(path)
    return _models[name]


def models_status():
    return {
        "ai_detector": os.path.exists(AI_MODEL_PATH),
        "forgery_detector": os.path.exists(FORGERY_MODEL_PATH),
    }


def predict_ai(img: Image.Image):
    """Probability that the image is AI-generated (or None if no model).

    The CIFAKE model was trained with class order FAKE=0, REAL=1, so its sigmoid
    output is P(REAL). P(AI) = 1 - P(REAL)."""
    model = _load("ai", AI_MODEL_PATH)
    if model is None:
        return None
    x = np.array(img.convert("RGB").resize((32, 32), Image.BILINEAR), dtype=np.float32)
    p_real = float(model.predict(x[None, ...], verbose=0)[0][0])
    return 1.0 - p_real


def predict_forgery(img: Image.Image):
    """Probability that the image is tampered (or None if no model).
    Forgery model labels: Authentic=0, Tampered=1."""
    model = _load("forgery", FORGERY_MODEL_PATH)
    if model is None:
        return None
    x = ela_array(img).astype(np.float32)
    return float(model.predict(x[None, ...], verbose=0)[0][0])


def ela_preview_b64(img: Image.Image):
    """Full-size ELA map as a base64 PNG (shown on the website)."""
    ela = ela_pil(img)
    ela.thumbnail((640, 640))
    buf = io.BytesIO()
    ela.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def analyze(img: Image.Image):
    ai_p = predict_ai(img)
    forg_p = predict_forgery(img)

    if ai_p is None and forg_p is None:
        verdict = "No models found"
    elif ai_p is not None and ai_p >= 0.5:
        verdict = "AI-generated"
    elif forg_p is not None and forg_p >= 0.5:
        verdict = "Forged / tampered"
    else:
        verdict = "Authentic"

    return {
        "verdict": verdict,
        "ai_probability": ai_p,
        "forgery_probability": forg_p,
        "ela_image": ela_preview_b64(img),
    }
