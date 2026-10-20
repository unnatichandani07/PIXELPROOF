"""Model B: AI-generated vs real images, trained on CIFAKE (32x32 images).

Run from the project root:   python train/train_cifake.py
Saves: models/ai_detector.keras  +  report images in reports/
Class order is alphabetical: FAKE = 0, REAL = 1 (model output = P(REAL)).
"""
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models

from utils import ROOT, MODEL_DIR, save_reports

BATCH = 128
IMG = (32, 32)
EPOCHS = 12
CACHE_IN_RAM = True   # set False if your laptop has 4 GB RAM or less


def find_cifake_root():
    base = os.path.join(ROOT, "data")
    for dirpath, dirs, _ in os.walk(base):
        if "train" in dirs and "test" in dirs:
            return dirpath
    raise FileNotFoundError(
        "Could not find a folder containing 'train' and 'test' inside data/. "
        "Extract CIFAKE into data/cifake/")


DATA = find_cifake_root()
print("Using CIFAKE folder:", DATA)

train_ds = tf.keras.utils.image_dataset_from_directory(
    f"{DATA}/train", image_size=IMG, batch_size=BATCH, label_mode="binary",
    validation_split=0.1, subset="training", seed=42)
val_ds = tf.keras.utils.image_dataset_from_directory(
    f"{DATA}/train", image_size=IMG, batch_size=BATCH, label_mode="binary",
    validation_split=0.1, subset="validation", seed=42)
test_ds = tf.keras.utils.image_dataset_from_directory(
    f"{DATA}/test", image_size=IMG, batch_size=BATCH, label_mode="binary", shuffle=False)

class_names = train_ds.class_names
print("Class order:", class_names)
assert class_names == ["FAKE", "REAL"], "Unexpected class folders: " + str(class_names)

AUTOTUNE = tf.data.AUTOTUNE
if CACHE_IN_RAM:
    train_ds, val_ds, test_ds = train_ds.cache(), val_ds.cache(), test_ds.cache()
train_ds = train_ds.shuffle(1000).prefetch(AUTOTUNE)
val_ds = val_ds.prefetch(AUTOTUNE)
test_ds = test_ds.prefetch(AUTOTUNE)

model = models.Sequential([
    layers.Input((32, 32, 3)),
    layers.Rescaling(1.0 / 255),
    layers.RandomFlip("horizontal"),

    layers.Conv2D(32, 3, padding="same", activation="relu"),
    layers.BatchNormalization(),
    layers.Conv2D(32, 3, padding="same", activation="relu"),
    layers.MaxPooling2D(),

    layers.Conv2D(64, 3, padding="same", activation="relu"),
    layers.BatchNormalization(),
    layers.Conv2D(64, 3, padding="same", activation="relu"),
    layers.MaxPooling2D(),

    layers.Conv2D(128, 3, padding="same", activation="relu"),
    layers.BatchNormalization(),
    layers.GlobalAveragePooling2D(),

    layers.Dropout(0.4),
    layers.Dense(1, activation="sigmoid"),
])
model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
model.summary()

history = model.fit(
    train_ds, validation_data=val_ds, epochs=EPOCHS,
    callbacks=[tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True)])

loss, acc = model.evaluate(test_ds)
print(f"\nTEST accuracy: {acc:.4f}")

y_true = np.concatenate([y.numpy() for _, y in test_ds]).ravel().astype(int)
y_prob = model.predict(test_ds).ravel()
save_reports(history, y_true, y_prob, class_names, "cifake_ai_detector")

model.save(os.path.join(MODEL_DIR, "ai_detector.keras"))
print("Model saved to models/ai_detector.keras")
