"""
Dataset Preprocessing Pipeline
================================
1. MVTec AD  : pixel mask → bounding box → YOLO format
2. NEU-DET   : VOC XML annotation → YOLO format
3. Unified   : merge both → single YOLO dataset with class map
4. Versioning: hash-based dataset snapshot

Usage:
    python preprocess.py --source mvtec --category metal_nut
    python preprocess.py --source neu
    python preprocess.py --merge --version v1.0
"""

import argparse
import hashlib
import json
import os
import shutil
import xml.etree.ElementTree as ET
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional
import random

# Optional heavy deps — graceful fallback
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("⚠ cv2 not available — install: pip install opencv-python-headless")

RAW_DIR       = Path(__file__).parent / "raw"
PROCESSED_DIR = Path(__file__).parent / "processed"
YOLO_DIR      = Path(__file__).parent / "yolo"
VERSIONS_DIR  = Path(__file__).parent / "versions"

# ── Unified class map ─────────────────────────────────────────────────────────
# All defects from both datasets → single integer index
# Class 0 is always "good" (pass) for binary mode
UNIFIED_CLASSES = {
    0: "good",
    # NEU classes
    1: "crazing",
    2: "inclusion",
    3: "patches",
    4: "pitted_surface",
    5: "rolled_in_scale",
    6: "scratches",
    # MVTec metal_nut classes
    7: "bent",
    8: "color",
    9: "flip",
    10: "scratch",
    # MVTec screw classes
    11: "manipulated_front",
    12: "scratch_head",
    13: "scratch_neck",
    14: "thread_side",
    15: "thread_top",
}

BINARY_MAP = {name: (0 if name == "good" else 1) for name in UNIFIED_CLASSES.values()}


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class YOLOAnnotation:
    class_id: int
    cx: float   # center x  0-1
    cy: float   # center y  0-1
    w:  float   # width     0-1
    h:  float   # height    0-1

    def to_line(self) -> str:
        return f"{self.class_id} {self.cx:.6f} {self.cy:.6f} {self.w:.6f} {self.h:.6f}"


@dataclass
class SampleMeta:
    image_path: str
    label_path: str
    source: str        # "mvtec" | "neu"
    category: str
    defect_class: str
    split: str         # "train" | "val" | "test"
    is_defective: bool
    annotation_count: int
    image_hash: str


# ── MVTec preprocessor ────────────────────────────────────────────────────────

class MVTecPreprocessor:
    def __init__(self, category: str, binary_mode: bool = False):
        self.category = category
        self.binary_mode = binary_mode
        self.src_dir = RAW_DIR / "mvtec" / category
        self.out_images = PROCESSED_DIR / "mvtec" / category / "images"
        self.out_labels = PROCESSED_DIR / "mvtec" / category / "labels"

    def process(self) -> list[SampleMeta]:
        if not self.src_dir.exists():
            print(f"  ⚠ MVTec/{self.category} not found at {self.src_dir}")
            return []

        self.out_images.mkdir(parents=True, exist_ok=True)
        self.out_labels.mkdir(parents=True, exist_ok=True)
        samples = []

        # Good samples (no defect)
        good_dir = self.src_dir / "train" / "good"
        for img_path in sorted(good_dir.glob("*.png")):
            meta = self._process_good(img_path)
            if meta:
                samples.append(meta)

        # Defective samples (test set with ground truth)
        test_dir = self.src_dir / "test"
        gt_dir   = self.src_dir / "ground_truth"
        for defect_dir in sorted(test_dir.iterdir()):
            if defect_dir.name == "good":
                continue
            for img_path in sorted(defect_dir.glob("*.png")):
                gt_mask = gt_dir / defect_dir.name / (img_path.stem + "_mask.png")
                meta = self._process_defective(img_path, gt_mask, defect_dir.name)
                if meta:
                    samples.append(meta)

        print(f"  ✓ MVTec/{self.category}: {len(samples)} samples processed")
        return samples

    def _process_good(self, img_path: Path) -> Optional[SampleMeta]:
        out_name = f"mvtec_{self.category}_good_{img_path.stem}"
        img_out  = self.out_images / f"{out_name}.png"
        lbl_out  = self.out_labels / f"{out_name}.txt"

        shutil.copy2(img_path, img_out)
        lbl_out.write_text("")  # empty = no defects
        img_hash = _file_hash(img_path)

        return SampleMeta(
            image_path=str(img_out), label_path=str(lbl_out),
            source="mvtec", category=self.category,
            defect_class="good", split="train",
            is_defective=False, annotation_count=0,
            image_hash=img_hash,
        )

    def _process_defective(self, img_path: Path, gt_mask: Path, defect_name: str) -> Optional[SampleMeta]:
        if not CV2_AVAILABLE:
            return None

        out_name = f"mvtec_{self.category}_{defect_name}_{img_path.stem}"
        img_out  = self.out_images / f"{out_name}.png"
        lbl_out  = self.out_labels / f"{out_name}.txt"

        img = cv2.imread(str(img_path))
        if img is None:
            return None
        H, W = img.shape[:2]

        annotations: list[YOLOAnnotation] = []
        if gt_mask.exists():
            mask = cv2.imread(str(gt_mask), cv2.IMREAD_GRAYSCALE)
            if mask is not None:
                annotations = self._mask_to_bboxes(mask, W, H, defect_name)

        shutil.copy2(img_path, img_out)
        lbl_out.write_text("\n".join(a.to_line() for a in annotations))
        img_hash = _file_hash(img_path)

        return SampleMeta(
            image_path=str(img_out), label_path=str(lbl_out),
            source="mvtec", category=self.category,
            defect_class=defect_name, split="test",
            is_defective=True, annotation_count=len(annotations),
            image_hash=img_hash,
        )

    def _mask_to_bboxes(self, mask: "np.ndarray", W: int, H: int,
                         defect_name: str) -> list[YOLOAnnotation]:
        """Convert binary mask → connected component bounding boxes → YOLO format."""
        _, binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary)

        annotations = []
        cls_id = self._get_class_id(defect_name)

        for i in range(1, num_labels):  # skip background (0)
            x, y, w, h, area = stats[i]
            if area < 100:  # filter noise
                continue
            cx = (x + w / 2) / W
            cy = (y + h / 2) / H
            nw = w / W
            nh = h / H
            annotations.append(YOLOAnnotation(
                class_id=1 if self.binary_mode else cls_id,
                cx=round(cx, 6), cy=round(cy, 6),
                w=round(nw, 6),  h=round(nh, 6),
            ))
        return annotations

    def _get_class_id(self, defect_name: str) -> int:
        for cid, cname in UNIFIED_CLASSES.items():
            if cname == defect_name.replace("-", "_"):
                return cid
        return 1  # unknown defect → class 1


# ── NEU preprocessor ─────────────────────────────────────────────────────────

class NEUPreprocessor:
    NEU_CLASSES = {
        "crazing": 1, "inclusion": 2, "patches": 3,
        "pitted_surface": 4, "rolled-in_scale": 5, "scratches": 6,
    }

    def __init__(self, binary_mode: bool = False):
        self.binary_mode = binary_mode
        self.src_dir = RAW_DIR / "neu" / "NEU-DET"
        self.out_images = PROCESSED_DIR / "neu" / "images"
        self.out_labels = PROCESSED_DIR / "neu" / "labels"

    def process(self) -> list[SampleMeta]:
        if not self.src_dir.exists():
            print(f"  ⚠ NEU dataset not found at {self.src_dir}")
            return []

        self.out_images.mkdir(parents=True, exist_ok=True)
        self.out_labels.mkdir(parents=True, exist_ok=True)
        samples = []

        # NEU-DET has train/ and valid/ with images/ and annotations/
        for split_name, split_dir in [("train", "train"), ("val", "valid")]:
            img_dir = self.src_dir / split_dir / "images"
            ann_dir = self.src_dir / split_dir / "annotations"

            if not img_dir.exists():
                continue

            for img_path in sorted(img_dir.glob("*.jpg")) + sorted(img_dir.glob("*.bmp")):
                ann_path = ann_dir / f"{img_path.stem}.xml"
                meta = self._process_sample(img_path, ann_path, split_name)
                if meta:
                    samples.append(meta)

        print(f"  ✓ NEU: {len(samples)} samples processed")
        return samples

    def _process_sample(self, img_path: Path, ann_path: Path, split: str) -> Optional[SampleMeta]:
        out_name = f"neu_{img_path.stem}"
        img_out  = self.out_images / f"{out_name}.png"
        lbl_out  = self.out_labels / f"{out_name}.txt"

        if CV2_AVAILABLE:
            img = cv2.imread(str(img_path))
            if img is None:
                return None
            cv2.imwrite(str(img_out), img)
            H, W = img.shape[:2]
        else:
            shutil.copy2(img_path, img_out)
            W, H = 200, 200  # NEU default size

        annotations = []
        defect_class = "unknown"
        if ann_path.exists():
            annotations, defect_class = self._parse_voc_xml(ann_path, W, H)

        lbl_out.write_text("\n".join(a.to_line() for a in annotations))
        img_hash = _file_hash(img_path)

        return SampleMeta(
            image_path=str(img_out), label_path=str(lbl_out),
            source="neu", category="steel_surface",
            defect_class=defect_class, split=split,
            is_defective=len(annotations) > 0,
            annotation_count=len(annotations),
            image_hash=img_hash,
        )

    def _parse_voc_xml(self, xml_path: Path, W: int, H: int) -> tuple[list[YOLOAnnotation], str]:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        annotations = []
        defect_class = "unknown"

        for obj in root.findall("object"):
            name = obj.find("name").text.strip().lower()
            defect_class = name
            bndbox = obj.find("bndbox")
            xmin = float(bndbox.find("xmin").text)
            ymin = float(bndbox.find("ymin").text)
            xmax = float(bndbox.find("xmax").text)
            ymax = float(bndbox.find("ymax").text)

            cx = ((xmin + xmax) / 2) / W
            cy = ((ymin + ymax) / 2) / H
            bw = (xmax - xmin) / W
            bh = (ymax - ymin) / H

            cls_id = 1 if self.binary_mode else self.NEU_CLASSES.get(name, 1)
            annotations.append(YOLOAnnotation(
                class_id=cls_id,
                cx=round(cx, 6), cy=round(cy, 6),
                w=round(bw, 6),  h=round(bh, 6),
            ))
        return annotations, defect_class


# ── Dataset Splitter ──────────────────────────────────────────────────────────

class DatasetSplitter:
    def __init__(self, train=0.70, val=0.20, test=0.10, seed=42):
        self.ratios = {"train": train, "val": val, "test": test}
        self.seed = seed

    def split(self, samples: list[SampleMeta]) -> dict[str, list[SampleMeta]]:
        random.seed(self.seed)

        # Stratify by defect class
        by_class: dict[str, list[SampleMeta]] = {}
        for s in samples:
            by_class.setdefault(s.defect_class, []).append(s)

        splits: dict[str, list[SampleMeta]] = {"train": [], "val": [], "test": []}
        for cls, items in by_class.items():
            random.shuffle(items)
            n = len(items)
            n_train = int(n * self.ratios["train"])
            n_val   = int(n * self.ratios["val"])
            splits["train"] += items[:n_train]
            splits["val"]   += items[n_train:n_train + n_val]
            splits["test"]  += items[n_train + n_val:]

        for k, v in splits.items():
            print(f"  Split {k:5s}: {len(v):4d} samples")
        return splits

    def write_yolo_dataset(self, splits: dict[str, list[SampleMeta]],
                            output_dir: Path, binary: bool = False):
        """Write final YOLO-format dataset with data.yaml."""
        output_dir.mkdir(parents=True, exist_ok=True)

        for split_name, samples in splits.items():
            img_out = output_dir / "images" / split_name
            lbl_out = output_dir / "labels" / split_name
            img_out.mkdir(parents=True, exist_ok=True)
            lbl_out.mkdir(parents=True, exist_ok=True)

            for s in samples:
                src_img = Path(s.image_path)
                src_lbl = Path(s.label_path)
                if src_img.exists():
                    shutil.copy2(src_img, img_out / src_img.name)
                if src_lbl.exists():
                    shutil.copy2(src_lbl, lbl_out / src_lbl.name)

        # Write data.yaml
        if binary:
            classes = {0: "good", 1: "defect"}
        else:
            classes = UNIFIED_CLASSES

        yaml_content = f"""# QC Platform — YOLO Dataset
# Generated by preprocessing pipeline

path: {output_dir.absolute()}
train: images/train
val:   images/val
test:  images/test

nc: {len(classes)}
names: {list(classes.values())}

# Class map
# {json.dumps(classes, indent=2)}
"""
        (output_dir / "data.yaml").write_text(yaml_content)
        print(f"  ✓ data.yaml written → {output_dir / 'data.yaml'}")


# ── Dataset Versioner ─────────────────────────────────────────────────────────

class DatasetVersioner:
    def __init__(self, version: str):
        self.version = version
        self.version_dir = VERSIONS_DIR / version

    def snapshot(self, samples: list[SampleMeta], splits: dict[str, list]) -> dict:
        self.version_dir.mkdir(parents=True, exist_ok=True)

        # Count stats
        stats = {
            "version": self.version,
            "total": len(samples),
            "by_source": {},
            "by_class": {},
            "by_split": {k: len(v) for k, v in splits.items()},
            "defective": sum(1 for s in samples if s.is_defective),
            "good": sum(1 for s in samples if not s.is_defective),
            "dataset_hash": _dataset_hash(samples),
        }
        for s in samples:
            stats["by_source"][s.source] = stats["by_source"].get(s.source, 0) + 1
            stats["by_class"][s.defect_class] = stats["by_class"].get(s.defect_class, 0) + 1

        manifest_path = self.version_dir / "manifest.json"
        with open(manifest_path, "w") as f:
            json.dump({
                "stats": stats,
                "samples": [asdict(s) for s in samples],
            }, f, indent=2)

        print(f"\n  ✓ Version {self.version} snapshot → {manifest_path}")
        print(f"    Total: {stats['total']}  |  Defective: {stats['defective']}  |  Good: {stats['good']}")
        return stats


# ── Utilities ─────────────────────────────────────────────────────────────────

def _file_hash(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()[:12]


def _dataset_hash(samples: list[SampleMeta]) -> str:
    h = hashlib.sha256()
    for s in sorted(samples, key=lambda x: x.image_hash):
        h.update(s.image_hash.encode())
    return h.hexdigest()[:16]


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=["mvtec", "neu", "all"], default="all")
    parser.add_argument("--category", default="metal_nut")
    parser.add_argument("--binary", action="store_true", help="Binary mode: good/defect only")
    parser.add_argument("--merge", action="store_true", help="Merge all sources")
    parser.add_argument("--version", default="v1.0")
    args = parser.parse_args()

    all_samples: list[SampleMeta] = []

    if args.source in ("mvtec", "all"):
        proc = MVTecPreprocessor(args.category, binary_mode=args.binary)
        all_samples += proc.process()

    if args.source in ("neu", "all"):
        proc = NEUPreprocessor(binary_mode=args.binary)
        all_samples += proc.process()

    if not all_samples:
        print("⚠ No samples processed. Check that raw data exists.")
        return

    print(f"\nTotal samples: {len(all_samples)}")

    splitter = DatasetSplitter()
    splits = splitter.split(all_samples)

    yolo_out = YOLO_DIR / args.version / ("binary" if args.binary else "multiclass")
    splitter.write_yolo_dataset(splits, yolo_out, binary=args.binary)

    versioner = DatasetVersioner(args.version)
    versioner.snapshot(all_samples, splits)

    print(f"\n✅ Dataset pipeline complete.")
    print(f"   YOLO dataset: {yolo_out}")
    print(f"   Run training: python ../training/train.py --data {yolo_out}/data.yaml")


if __name__ == "__main__":
    main()
