   ---
   title: PixelProof
   sdk: docker
   app_port: 7860
   ---
   # Fake, Forged and AI Image Detector

Two CNN models plus a website:

| Model | Dataset | Task | Saved as |
|---|---|---|---|
| A: forgery detector | CASIA v2 (+ CoMoFoD), ELA preprocessing | Authentic vs Tampered | `models/forgery_detector.keras` |
| B: AI-image detector | CIFAKE | Real vs AI-generated | `models/ai_detector.keras` |

## Folder layout

```
fake_detector/
  backend/    app.py (Flask server + API), predict.py (loads models), ela.py (ELA function)
  frontend/   index.html, style.css, app.js (the website)
  train/      train_cifake.py, prepare_casia.py, train_forgery.py, utils.py
  data/       cifake/, casia2/, comofod/   <- extract the datasets here
  models/     trained .keras files appear here
  reports/    confusion matrices, curves and metrics for your report
  requirements.txt
```

## Setup (Python 3.11, 3.12 or 3.13 is required; TensorFlow does NOT support 3.14)

```
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Run order

```
python train/train_cifake.py        # Model B -> models/ai_detector.keras
python train/prepare_casia.py       # builds data/ela_forgery.npz
python train/train_forgery.py       # Model A -> models/forgery_detector.keras
python backend/app.py               # website at http://127.0.0.1:5000
```

## Known limitations (write these in your report)

- CIFAKE images are 32x32, so uploaded photos are shrunk to 32x32 for Model B. It can be
  less reliable on high-resolution photos from generators it never saw (generalization problem).
- CASIA v2 tampered images are derived from authentic ones, so a random split can leak
  similar content between train and test. Reported accuracy may be optimistic.
- ELA works best on JPEG images; heavily recompressed images and screenshots weaken it.
