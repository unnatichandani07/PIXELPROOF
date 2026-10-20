"""Flask backend. Serves the website (../frontend) and the prediction API."""
import io
import os

from flask import Flask, jsonify, request, send_from_directory
from PIL import Image, UnidentifiedImageError

import predict

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB upload limit


@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/<path:filename>")
def static_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "models": predict.models_status()})


@app.post("/api/predict")
def api_predict():
    file = request.files.get("image")
    if file is None or file.filename == "":
        return jsonify({"error": "No image was uploaded."}), 400
    try:
        img = Image.open(io.BytesIO(file.read()))
        img.load()
    except (UnidentifiedImageError, OSError):
        return jsonify({"error": "That file is not a readable image (use JPG or PNG)."}), 400
    try:
        return jsonify(predict.analyze(img))
    except Exception as exc:  # show the real reason instead of a blank failure
        return jsonify({"error": f"Analysis failed: {exc}"}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
