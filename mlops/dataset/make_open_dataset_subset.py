"""
Create a small deterministic YOLO subset from a downloaded open dataset.

Raw third-party images stay under mlops/dataset/raw/open and are ignored by git.
The subset is also ignored by git and is intended for fast local smoke training,
scope-gate checks and pilot rehearsal.
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - actionable CLI error
    raise SystemExit("PyYAML is required. Install it with: python -m pip install pyyaml") from exc


BASE_DIR = Path(__file__).resolve().parent
RAW_OPEN_DIR = BASE_DIR / "raw" / "open"
PROCESSED_DIR = BASE_DIR / "processed" / "open_smoke"
VERSIONS_DIR = BASE_DIR / "versions"
SUBSET_MANIFEST_FILE = VERSIONS_DIR / "open_subset_manifest.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a YAML object")
    return data


def image_files(split_dir: Path) -> list[Path]:
    if not split_dir.exists():
        return []
    return sorted(path for path in split_dir.iterdir() if path.suffix.lower() in IMAGE_EXTENSIONS)


def copy_split(source_dir: Path, output_dir: Path, split: str, limit: int, rng: random.Random) -> int:
    images_dir = source_dir / split / "images"
    labels_dir = source_dir / split / "labels"
    images = image_files(images_dir)
    if not images:
        return 0

    selected = images if limit <= 0 or limit >= len(images) else rng.sample(images, limit)
    selected = sorted(selected)

    out_images = output_dir / split / "images"
    out_labels = output_dir / split / "labels"
    out_images.mkdir(parents=True, exist_ok=True)
    out_labels.mkdir(parents=True, exist_ok=True)

    for image in selected:
        shutil.copy2(image, out_images / image.name)
        label = labels_dir / f"{image.stem}.txt"
        target_label = out_labels / f"{image.stem}.txt"
        if label.exists():
            shutil.copy2(label, target_label)
        else:
            target_label.write_text("", encoding="utf-8")

    return len(selected)


def write_data_yaml(source_yaml: dict[str, Any], output_dir: Path) -> None:
    names = source_yaml.get("names") or []
    if isinstance(names, dict):
        names = [name for _, name in sorted(names.items(), key=lambda item: int(item[0]))]
    if not isinstance(names, list) or not names:
        raise ValueError("Source data.yaml must include non-empty names")

    data = {
        "path": str(output_dir.resolve()),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": len(names),
        "names": names,
    }
    roboflow = source_yaml.get("roboflow")
    if roboflow:
        data["roboflow"] = roboflow
    (output_dir / "data.yaml").write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")


def load_manifest() -> dict[str, Any]:
    if not SUBSET_MANIFEST_FILE.exists():
        return {"subsets": []}
    with SUBSET_MANIFEST_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_manifest(entry: dict[str, Any]) -> None:
    VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()
    manifest["subsets"] = [
        item for item in manifest.get("subsets", []) if item.get("name") != entry["name"]
    ]
    manifest["subsets"].append(entry)
    with SUBSET_MANIFEST_FILE.open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a small YOLO subset from a downloaded open dataset.")
    parser.add_argument("--source", default="battery_detection_multiclass", help="Downloaded source id under raw/open.")
    parser.add_argument("--name", default="battery_open_smoke_v0", help="Subset folder name under processed/open_smoke.")
    parser.add_argument("--train", type=int, default=240, help="Training image limit. 0 means all.")
    parser.add_argument("--valid", type=int, default=60, help="Validation image limit. 0 means all.")
    parser.add_argument("--test", type=int, default=60, help="Test image limit. 0 means all.")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic sampling seed.")
    args = parser.parse_args()

    source_dir = RAW_OPEN_DIR / args.source
    data_yaml = source_dir / "data.yaml"
    if not data_yaml.exists():
        raise SystemExit(f"Downloaded source not found: {data_yaml}")

    output_dir = PROCESSED_DIR / args.name
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    source_yaml = load_yaml(data_yaml)
    rng = random.Random(args.seed)
    counts = {
        "train": copy_split(source_dir, output_dir, "train", args.train, rng),
        "valid": copy_split(source_dir, output_dir, "valid", args.valid, rng),
        "test": copy_split(source_dir, output_dir, "test", args.test, rng),
    }
    write_data_yaml(source_yaml, output_dir)

    entry = {
        "name": args.name,
        "source": args.source,
        "path": str(output_dir.resolve()),
        "data_yaml": str((output_dir / "data.yaml").resolve()),
        "counts": counts,
        "seed": args.seed,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    write_manifest(entry)

    print(f"Created subset: {output_dir}")
    print(f"Counts: train={counts['train']} valid={counts['valid']} test={counts['test']}")
    print(f"Data YAML: {output_dir / 'data.yaml'}")
    print(f"Manifest: {SUBSET_MANIFEST_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
