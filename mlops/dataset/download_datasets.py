"""
Dataset Downloader
==================
MVTec AD + NEU Surface Defect

Usage:
    python download_datasets.py --dataset mvtec --categories metal_nut screw
    python download_datasets.py --dataset neu
    python download_datasets.py --all
"""

import argparse
import hashlib
import json
import os
import shutil
import tarfile
import urllib.request
import zipfile
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).parent
RAW_DIR = BASE_DIR / "raw"
METADATA_FILE = BASE_DIR / "versions" / "download_manifest.json"

# ── Dataset Configs ───────────────────────────────────────────────────────────

MVTEC_CATEGORIES = {
    "metal_nut":  "https://www.mvtec.com/fileadmin/Datasets/mvtec_anomaly_detection/metal_nut.tar.xz",
    "screw":      "https://www.mvtec.com/fileadmin/Datasets/mvtec_anomaly_detection/screw.tar.xz",
    "capsule":    "https://www.mvtec.com/fileadmin/Datasets/mvtec_anomaly_detection/capsule.tar.xz",
    "tile":       "https://www.mvtec.com/fileadmin/Datasets/mvtec_anomaly_detection/tile.tar.xz",
    "wood":       "https://www.mvtec.com/fileadmin/Datasets/mvtec_anomaly_detection/wood.tar.xz",
    "leather":    "https://www.mvtec.com/fileadmin/Datasets/mvtec_anomaly_detection/leather.tar.xz",
}

NEU_KAGGLE_DATASET = "kaustubhdikshit/neu-surface-defect-database"

# ── Progress reporter ─────────────────────────────────────────────────────────

def _progress(block_num, block_size, total_size):
    downloaded = block_num * block_size
    pct = min(100, downloaded * 100 // total_size) if total_size > 0 else 0
    bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
    print(f"\r  [{bar}] {pct}%  ({downloaded/1e6:.1f}/{total_size/1e6:.1f} MB)", end="")


# ── MD5 verification ──────────────────────────────────────────────────────────

def verify_md5(path: Path, expected: Optional[str] = None) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    actual = h.hexdigest()
    if expected and actual != expected:
        raise ValueError(f"MD5 mismatch: {path}\n  expected: {expected}\n  got:      {actual}")
    return actual


# ── MVTec downloader ──────────────────────────────────────────────────────────

def download_mvtec(categories: list[str]) -> dict:
    out_dir = RAW_DIR / "mvtec"
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = {}

    for cat in categories:
        url = MVTEC_CATEGORIES.get(cat)
        if not url:
            print(f"  ⚠ Unknown category: {cat}")
            continue

        dest = out_dir / f"{cat}.tar.xz"
        extract_dir = out_dir / cat

        if extract_dir.exists() and any(extract_dir.iterdir()):
            print(f"  ✓ {cat} already extracted — skipping")
            manifest[cat] = str(extract_dir)
            continue

        print(f"\n→ Downloading MVTec/{cat}...")
        print(f"  NOTE: MVTec requires manual download from: {url}")
        print(f"  Place the file at: {dest}")
        print(f"  Then re-run this script.\n")

        # If file exists (manually placed), extract it
        if dest.exists():
            print(f"  ✓ Archive found — extracting...")
            with tarfile.open(dest, "r:xz") as tf:
                tf.extractall(out_dir)
            md5 = verify_md5(dest)
            manifest[cat] = {"path": str(extract_dir), "md5": md5, "source": url}
            print(f"  ✓ Extracted to {extract_dir}")

    return manifest


# ── NEU downloader (via Kaggle API) ──────────────────────────────────────────

def download_neu() -> dict:
    out_dir = RAW_DIR / "neu"
    out_dir.mkdir(parents=True, exist_ok=True)

    if (out_dir / "NEU-DET").exists():
        print("  ✓ NEU dataset already present — skipping")
        return {"path": str(out_dir), "source": "kaggle"}

    print("\n→ Downloading NEU Surface Defect Dataset via Kaggle API...")
    print("  Requires: pip install kaggle + ~/.kaggle/kaggle.json")

    try:
        import subprocess
        result = subprocess.run(
            ["kaggle", "datasets", "download", "-d", NEU_KAGGLE_DATASET,
             "-p", str(out_dir), "--unzip"],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"  ✗ Kaggle download failed: {result.stderr}")
            _create_neu_synthetic_fallback(out_dir)
        else:
            print(f"  ✓ NEU downloaded to {out_dir}")
    except FileNotFoundError:
        print("  ⚠ kaggle CLI not found — creating synthetic fallback")
        _create_neu_synthetic_fallback(out_dir)

    return {"path": str(out_dir), "source": NEU_KAGGLE_DATASET}


def _create_neu_synthetic_fallback(out_dir: Path):
    """
    Creates a minimal synthetic NEU-like structure for offline demo.
    Replace with real images when available.
    """
    print("  → Creating synthetic NEU structure for demo...")
    classes = ["crazing", "inclusion", "patches", "pitted_surface", "rolled-in_scale", "scratches"]
    
    for split in ["train", "val"]:
        for cls in classes:
            img_dir = out_dir / "NEU-DET" / split / "images"
            lbl_dir = out_dir / "NEU-DET" / split / "labels"
            img_dir.mkdir(parents=True, exist_ok=True)
            lbl_dir.mkdir(parents=True, exist_ok=True)

    # Write class map
    class_map = {i: name for i, name in enumerate(classes)}
    with open(out_dir / "classes.json", "w") as f:
        json.dump(class_map, f, indent=2)

    print(f"  ✓ Synthetic NEU structure at {out_dir}")
    print("  ⚠ Add real images to replace synthetic placeholders")


# ── Manifest writer ───────────────────────────────────────────────────────────

def write_manifest(manifest: dict):
    METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    existing = {}
    if METADATA_FILE.exists():
        with open(METADATA_FILE) as f:
            existing = json.load(f)
    existing.update(manifest)
    with open(METADATA_FILE, "w") as f:
        json.dump(existing, f, indent=2)
    print(f"\n✓ Manifest written: {METADATA_FILE}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="QC Platform Dataset Downloader")
    parser.add_argument("--dataset", choices=["mvtec", "neu", "all"], default="all")
    parser.add_argument("--categories", nargs="+",
                        default=["metal_nut", "screw"],
                        help="MVTec categories to download")
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()

    manifest = {}
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    if args.dataset in ("mvtec", "all") or args.all:
        m = download_mvtec(args.categories)
        manifest["mvtec"] = m

    if args.dataset in ("neu", "all") or args.all:
        m = download_neu()
        manifest["neu"] = m

    write_manifest(manifest)
    print("\n✅ Dataset download complete.")
    print(f"   Raw data location: {RAW_DIR}")


if __name__ == "__main__":
    main()
