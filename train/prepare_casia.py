"""Step 1 of the forgery model: turn images into ELA maps and save them as one file.

Run from the project root:   python train/prepare_casia.py
Reads : data/casia2 (folders Au = authentic, Tp = tampered)  [+ optional data/comofod]
Writes: data/ela_forgery.npz   (X = ELA maps 128x128x3 uint8, y: 0 = authentic, 1 = tampered)
"""
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image

from utils import ROOT

sys.path.insert(0, os.path.join(ROOT, "backend"))
from ela import ela_array  # noqa: E402  (same function the website uses)

MAX_PER_CLASS = 5000     # lower this (e.g. 2000) if you are short of time
USE_COMOFOD = True       # also add CoMoFoD originals (_O) and forgeries (_F)
IMG_EXT = (".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp")


def find_dir(base, name):
    for dirpath, dirs, _ in os.walk(base):
        for d in dirs:
            if d.lower() == name.lower():
                return os.path.join(dirpath, d)
    return None


def list_images(folder):
    out = []
    for dirpath, _, files in os.walk(folder):
        for f in files:
            if f.lower().endswith(IMG_EXT):
                out.append(os.path.join(dirpath, f))
    return sorted(out)


def process(path):
    try:
        return ela_array(Image.open(path))
    except Exception as exc:
        print("  skipped (unreadable):", os.path.basename(path), exc)
        return None


def build(paths, label, rng):
    if len(paths) > MAX_PER_CLASS:
        paths = list(rng.choice(paths, MAX_PER_CLASS, replace=False))
    done = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i, arr in enumerate(pool.map(process, paths), 1):
            if arr is not None:
                done.append(arr)
            if i % 500 == 0:
                print(f"  label {label}: {i}/{len(paths)}")
    return done


rng = np.random.default_rng(42)
casia = os.path.join(ROOT, "data", "casia2")
au_dir, tp_dir = find_dir(casia, "Au"), find_dir(casia, "Tp")
if not au_dir or not tp_dir:
    raise FileNotFoundError("Could not find the 'Au' and 'Tp' folders inside data/casia2/")
print("Authentic folder:", au_dir)
print("Tampered folder :", tp_dir)

auth_paths, tamp_paths = list_images(au_dir), list_images(tp_dir)
print(f"CASIA v2 images found -> authentic: {len(auth_paths)}, tampered: {len(tamp_paths)}")

if USE_COMOFOD:
    como = os.path.join(ROOT, "data", "comofod")
    pat = re.compile(r"^\d+_(O|F)\.(png|jpg|jpeg|bmp)$", re.IGNORECASE)
    n_o = n_f = 0
    for p in list_images(como):
        m = pat.match(os.path.basename(p))
        if m and m.group(1).upper() == "O":
            auth_paths.append(p); n_o += 1
        elif m:
            tamp_paths.append(p); n_f += 1
    print(f"CoMoFoD images added -> originals: {n_o}, forged: {n_f}")

print("Computing ELA maps (this takes a few minutes)...")
X_auth = build(auth_paths, 0, rng)
X_tamp = build(tamp_paths, 1, rng)

X = np.array(X_auth + X_tamp, dtype=np.uint8)
y = np.array([0] * len(X_auth) + [1] * len(X_tamp), dtype=np.uint8)
out = os.path.join(ROOT, "data", "ela_forgery.npz")
np.savez_compressed(out, X=X, y=y)
print(f"Saved {out}  | X shape: {X.shape} | authentic: {int((y == 0).sum())}, tampered: {int((y == 1).sum())}")
