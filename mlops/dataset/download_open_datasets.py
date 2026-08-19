"""
Download open industrial defect datasets listed in open_sources.json.

Raw data is intentionally ignored by git. Use this script to populate a local
training sandbox without committing third-party images to the repository.

Usage:
    python mlops/dataset/download_open_datasets.py --list
    python mlops/dataset/download_open_datasets.py --source defects_metal_surface
    python mlops/dataset/download_open_datasets.py --source all --format yolov8

Roboflow Universe downloads require a free Roboflow API key:
    set ROBOFLOW_API_KEY=...
    pip install roboflow
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
CATALOG_FILE = BASE_DIR / "open_sources.json"
RAW_DIR = BASE_DIR / "raw" / "open"
VERSIONS_DIR = BASE_DIR / "versions"
MANIFEST_FILE = VERSIONS_DIR / "open_dataset_manifest.json"


def load_catalog() -> dict[str, Any]:
    with CATALOG_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_manifest() -> dict[str, Any]:
    if not MANIFEST_FILE.exists():
        return {"downloads": []}
    with MANIFEST_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_manifest(manifest: dict[str, Any]) -> None:
    VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
    with MANIFEST_FILE.open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)


def source_index(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {source["id"]: source for source in catalog["sources"]}


def list_sources(catalog: dict[str, Any]) -> None:
    print("KanbAI open dataset catalog")
    print("===========================")
    for source in catalog["sources"]:
        print(
            f"- {source['id']}: {source['name']} "
            f"({source['image_count']} images, {source['license']})"
        )
        print(f"  classes: {', '.join(source['classes'])}")
        print(f"  source:  {source['source_url']}")
    print("\nReference-only / restricted:")
    for source in catalog.get("reference_only", []):
        print(f"- {source['id']}: {source['reason']}")


def ensure_roboflow_client():
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ROBOFLOW_API_KEY is not set. Create a free Roboflow account, "
            "copy the API key, then run: set ROBOFLOW_API_KEY=<key>"
        )

    try:
        from roboflow import Roboflow  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "The roboflow package is not installed. Run: pip install roboflow"
        ) from exc

    return Roboflow(api_key=api_key)


def download_roboflow_source(source: dict[str, Any], export_format: str) -> dict[str, Any]:
    rf = ensure_roboflow_client()
    target_dir = RAW_DIR / source["id"]
    target_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nDownloading {source['id']} from Roboflow Universe...")
    print(f"  source:  {source['source_url']}")
    print(f"  license: {source['license']} (attribution required)")

    workspace = rf.workspace(source["workspace"])
    project = workspace.project(source["project"])
    version = project.version(int(source["version"]))
    dataset = version.download(export_format, location=str(target_dir), overwrite=True)

    return {
        "id": source["id"],
        "name": source["name"],
        "provider": source["provider"],
        "license": source["license"],
        "source_url": source["source_url"],
        "attribution": source["attribution"],
        "format": export_format,
        "path": str(Path(dataset.location).resolve()),
        "downloaded_at": datetime.now(timezone.utc).isoformat(),
    }


def select_sources(catalog: dict[str, Any], requested: str) -> list[dict[str, Any]]:
    sources = source_index(catalog)
    if requested == "all":
        return list(sources.values())
    if requested not in sources:
        valid = ", ".join(sorted(sources))
        raise ValueError(f"Unknown source '{requested}'. Valid sources: {valid}, all")
    return [sources[requested]]


def main() -> int:
    parser = argparse.ArgumentParser(description="Download vetted open KanbAI datasets.")
    parser.add_argument("--list", action="store_true", help="Print the catalog and exit.")
    parser.add_argument("--source", default="defects_metal_surface", help="Source id or 'all'.")
    parser.add_argument("--format", default="yolov8", help="Roboflow export format, e.g. yolov8.")
    args = parser.parse_args()

    catalog = load_catalog()
    if args.list:
        list_sources(catalog)
        return 0

    selected = select_sources(catalog, args.source)
    manifest = load_manifest()
    downloads = manifest.setdefault("downloads", [])

    for source in selected:
        if source["provider"] != "roboflow_universe":
            print(f"Skipping unsupported provider for {source['id']}: {source['provider']}")
            continue
        downloads.append(download_roboflow_source(source, args.format))

    write_manifest(manifest)
    print(f"\nManifest written: {MANIFEST_FILE}")
    print("Raw images remain local and are ignored by git.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
