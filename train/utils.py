"""Shared helpers for the training scripts: saves report images and metrics."""
import os
import matplotlib
matplotlib.use("Agg")  # draw to files, no window needed
import matplotlib.pyplot as plt
from sklearn.metrics import (ConfusionMatrixDisplay, classification_report,
                             confusion_matrix, roc_auc_score)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT_DIR = os.path.join(ROOT, "reports")
MODEL_DIR = os.path.join(ROOT, "models")
os.makedirs(REPORT_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)


def save_reports(history, y_true, y_prob, class_names, tag):
    """Saves training curves, confusion matrix and a metrics text file in reports/."""
    y_pred = (y_prob > 0.5).astype(int)

    # 1) training curves
    fig, ax = plt.subplots(1, 2, figsize=(11, 4))
    ax[0].plot(history.history["accuracy"], label="train")
    ax[0].plot(history.history["val_accuracy"], label="validation")
    ax[0].set_title("Accuracy"); ax[0].set_xlabel("epoch"); ax[0].legend()
    ax[1].plot(history.history["loss"], label="train")
    ax[1].plot(history.history["val_loss"], label="validation")
    ax[1].set_title("Loss"); ax[1].set_xlabel("epoch"); ax[1].legend()
    fig.tight_layout()
    fig.savefig(os.path.join(REPORT_DIR, f"{tag}_curves.png"), dpi=150)
    plt.close(fig)

    # 2) confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    disp = ConfusionMatrixDisplay(cm, display_labels=class_names)
    fig, ax = plt.subplots(figsize=(5, 4.5))
    disp.plot(ax=ax, cmap="Blues", colorbar=False)
    ax.set_title(f"{tag}: confusion matrix (test set)")
    fig.tight_layout()
    fig.savefig(os.path.join(REPORT_DIR, f"{tag}_confusion_matrix.png"), dpi=150)
    plt.close(fig)

    # 3) text metrics
    report = classification_report(y_true, y_pred, target_names=class_names, digits=4)
    auc = roc_auc_score(y_true, y_prob)
    text = f"{tag}\n\nConfusion matrix:\n{cm}\n\n{report}\nROC-AUC: {auc:.4f}\n"
    with open(os.path.join(REPORT_DIR, f"{tag}_metrics.txt"), "w") as f:
        f.write(text)
    print("\n" + text)
    print(f"Report images saved in: {REPORT_DIR}")
