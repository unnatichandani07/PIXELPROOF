"""Model A: authentic vs forged/tampered images, a CNN trained on ELA maps.

Run from the project root (after prepare_casia.py):   python train/train_forgery.py
Saves: models/forgery_detector.keras  +  report images in reports/
Labels: Authentic = 0, Tampered = 1 (model output = P(tampered)).
"""
import os
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from tensorflow.keras import layers, models

from utils import ROOT, MODEL_DIR, save_reports

BATCH = 32
EPOCHS = 20
SEED = 42

path = os.path.join(ROOT, "data", "ela_forgery.npz")
if not os.path.exists(path):
    raise FileNotFoundError("Run 'python train/prepare_casia.py' first.")
d = np.load(path)
X, y = d["X"], d["y"].astype("float32")
print("Loaded:", X.shape, "| authentic:", int((y == 0).sum()), "| tampered:", int((y == 1).sum()))

# 70% train / 15% validation / 15% test (stratified)
X_tr, X_tmp, y_tr, y_tmp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=SEED)
X_val, X_te, y_val, y_te = train_test_split(X_tmp, y_tmp, test_size=0.50, stratify=y_tmp, random_state=SEED)
print(f"train {len(X_tr)} | val {len(X_val)} | test {len(X_te)}")

model = models.Sequential([
    layers.Input((128, 128, 3)),
    layers.Rescaling(1.0 / 255),
    layers.RandomFlip("horizontal"),   # light augmentation only: heavy resizing destroys forgery traces

    layers.Conv2D(32, 3, padding="same", activation="relu"),
    layers.BatchNormalization(),
    layers.MaxPooling2D(),

    layers.Conv2D(64, 3, padding="same", activation="relu"),
    layers.BatchNormalization(),
    layers.MaxPooling2D(),

    layers.Conv2D(128, 3, padding="same", activation="relu"),
    layers.BatchNormalization(),
    layers.MaxPooling2D(),

    layers.Conv2D(128, 3, padding="same", activation="relu"),
    layers.BatchNormalization(),
    layers.GlobalAveragePooling2D(),

    layers.Dense(64, activation="relu"),
    layers.Dropout(0.4),
    layers.Dense(1, activation="sigmoid"),
])
model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="binary_crossentropy",
              metrics=["accuracy"])
model.summary()

history = model.fit(
    X_tr, y_tr, validation_data=(X_val, y_val), epochs=EPOCHS, batch_size=BATCH,
    callbacks=[
        tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=2),
    ])

loss, acc = model.evaluate(X_te, y_te, verbose=0)
print(f"\nTEST accuracy: {acc:.4f}")
y_prob = model.predict(X_te, verbose=0).ravel()
save_reports(history, y_te.astype(int), y_prob, ["Authentic", "Tampered"], "casia_forgery_detector")

model.save(os.path.join(MODEL_DIR, "forgery_detector.keras"))
print("Model saved to models/forgery_detector.keras")
