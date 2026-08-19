# KanbAI Open Dataset Catalog

This catalog lists free/open industrial defect datasets that can be used to
increase KanbAI's demo and model-development signal without scraping company
websites or committing third-party images to GitHub.

## Rule

Use only sources with a clear license and keep raw data local:

- Raw images go under `mlops/dataset/raw/open/`.
- Raw images are git-ignored.
- Attribution is required for `CC BY 4.0` datasets.
- GERMAKSAN or other factory images must stay private and separate.

## First Batch

The first usable batch is Roboflow Universe datasets that currently show
`CC BY 4.0` on their source pages:

| Source | Images | Task | Why it helps KanbAI |
| --- | ---: | --- | --- |
| Defects metal surface | 484 | Object detection | Small, fast first download for metal surface defect demos. |
| Sheet Metal Defect Detection | 2,277 | Object detection | Best first candidate for YOLOv8 experimentation. |
| weld defects | 2,000 | Object detection | Adds welding-specific factory story. |
| Steel rope defect detection | 305 | Object detection | Narrow safety/maintenance example. |
| Wire Rope Defect | 4,317 model version images | Object detection | Larger wire-rope robustness set. |

Source metadata is stored in `open_sources.json`.

## Download

Roboflow downloads require a free Roboflow API key.

```powershell
cd D:\kanba-qc-platform\qc-platform
python -m pip install roboflow
$env:ROBOFLOW_API_KEY = "paste_your_real_roboflow_key_here"
python mlops\dataset\download_open_datasets.py --list
python mlops\dataset\download_open_datasets.py --source defects_metal_surface
```

To download every catalog source:

```powershell
python mlops\dataset\download_open_datasets.py --source all --format yolov8
```

The script writes:

```text
mlops/dataset/raw/open/<source-id>/
mlops/dataset/versions/open_dataset_manifest.json
```

Both directories are ignored by git.

## What Not To Use Without Permission

- Vendor or competitor website images.
- Marketing pages from machine vision companies.
- Private factory photos.
- Datasets marked non-commercial unless the pilot/demo use is explicitly
  approved.

## Next KanbAI Step

After the first download, use the data for:

1. Scope-gate calibration: metal part vs out-of-scope images.
2. YOLOv8 baseline training on sheet-metal or weld classes.
3. Demo sample gallery with attribution.
4. Comparison against GERMAKSAN private pilot images without mixing public and
   private sources.
