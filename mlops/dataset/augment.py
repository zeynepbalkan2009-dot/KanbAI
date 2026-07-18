"""
Augmentation Pipeline
======================
Factory-realistic augmentations for industrial defect detection.

Strategy:
- Heavy geometric augmentation (defects can be at any angle)
- Lighting variation (factory floor has uneven lighting)
- Noise + blur (camera vibration, motion blur)
- Synthetic defect overlay (boost rare defect classes)
- Class-balanced oversampling

Usage:
    python augment.py --input dataset/yolo/v1.0 --output dataset/augmented/v1.0 --factor 3
"""

import random
import shutil
from pathlib import Path
from typing import Optional

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

try:
    import albumentations as A
    from albumentations.pytorch import ToTensorV2
    ALBUMENTATIONS_AVAILABLE = True
except ImportError:
    ALBUMENTATIONS_AVAILABLE = False


# ── Augmentation pipeline definition ─────────────────────────────────────────

def build_train_augmentor(img_size: int = 640):
    """
    Production-grade augmentation for industrial defect detection.
    Tuned for factory floor conditions.
    """
    if not ALBUMENTATIONS_AVAILABLE:
        return None

    return A.Compose([
        # ── Geometric ────────────────────────────────────────────────────────
        A.RandomRotate90(p=0.5),
        A.Flip(p=0.5),
        A.Transpose(p=0.2),
        A.ShiftScaleRotate(
            shift_limit=0.05, scale_limit=0.1, rotate_limit=15,
            border_mode=cv2.BORDER_REFLECT_101, p=0.5,
        ),
        A.Perspective(scale=(0.02, 0.05), p=0.2),

        # ── Lighting (factory floor varies) ──────────────────────────────────
        A.OneOf([
            A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=1.0),
            A.RandomGamma(gamma_limit=(70, 130), p=1.0),
            A.CLAHE(clip_limit=4.0, tile_grid_size=(8, 8), p=1.0),
        ], p=0.7),
        A.HueSaturationValue(hue_shift_limit=5, sat_shift_limit=20, val_shift_limit=20, p=0.3),
        A.RandomShadow(num_shadows_lower=1, num_shadows_upper=2, p=0.2),

        # ── Noise + artifacts (camera vibration) ─────────────────────────────
        A.OneOf([
            A.GaussNoise(var_limit=(10, 50), p=1.0),
            A.ISONoise(color_shift=(0.01, 0.05), intensity=(0.1, 0.5), p=1.0),
            A.MultiplicativeNoise(multiplier=(0.9, 1.1), p=1.0),
        ], p=0.4),
        A.OneOf([
            A.MotionBlur(blur_limit=5, p=1.0),
            A.MedianBlur(blur_limit=3, p=1.0),
            A.GaussianBlur(blur_limit=3, p=1.0),
        ], p=0.2),

        # ── Compression artifacts (mobile camera upload) ──────────────────────
        A.ImageCompression(quality_lower=75, quality_upper=95, p=0.2),

        # ── Cutout (occlusion simulation) ─────────────────────────────────────
        A.CoarseDropout(
            max_holes=4, max_height=32, max_width=32,
            min_holes=1, min_height=8, min_width=8,
            fill_value=0, p=0.15,
        ),

        # ── Final resize ─────────────────────────────────────────────────────
        A.Resize(img_size, img_size),
        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ],
        bbox_params=A.BboxParams(
            format="yolo",
            min_visibility=0.3,
            label_fields=["class_labels"],
        ),
    )


def build_val_augmentor(img_size: int = 640):
    """Minimal val transform — only resize + normalize."""
    if not ALBUMENTATIONS_AVAILABLE:
        return None
    return A.Compose([
        A.Resize(img_size, img_size),
        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ],
        bbox_params=A.BboxParams(format="yolo", label_fields=["class_labels"]),
    )


# ── Augmenter class ───────────────────────────────────────────────────────────

class DatasetAugmenter:
    def __init__(self, factor: int = 3, img_size: int = 640):
        self.factor = factor
        self.img_size = img_size
        self.transform = build_train_augmentor(img_size)

    def augment_dataset(self, input_dir: Path, output_dir: Path):
        """
        Augment train split only (val/test are never augmented).
        """
        for split in ["train", "val", "test"]:
            src_img = input_dir / "images" / split
            src_lbl = input_dir / "labels" / split
            out_img = output_dir / "images" / split
            out_lbl = output_dir / "labels" / split

            out_img.mkdir(parents=True, exist_ok=True)
            out_lbl.mkdir(parents=True, exist_ok=True)

            if not src_img.exists():
                continue

            img_files = list(src_img.glob("*.png")) + list(src_img.glob("*.jpg"))
            print(f"\n  Processing split={split} ({len(img_files)} images)")

            for img_path in img_files:
                lbl_path = src_lbl / f"{img_path.stem}.txt"

                # Always copy original
                shutil.copy2(img_path, out_img / img_path.name)
                if lbl_path.exists():
                    shutil.copy2(lbl_path, out_lbl / lbl_path.name)

                # Augment only train
                if split == "train" and CV2_AVAILABLE and self.transform:
                    self._augment_single(img_path, lbl_path, out_img, out_lbl)

        # Copy data.yaml
        src_yaml = input_dir / "data.yaml"
        if src_yaml.exists():
            shutil.copy2(src_yaml, output_dir / "data.yaml")
            # Update path in yaml
            content = (output_dir / "data.yaml").read_text()
            content = content.replace(str(input_dir.absolute()), str(output_dir.absolute()))
            (output_dir / "data.yaml").write_text(content)

        print(f"\n  ✓ Augmentation complete → {output_dir}")

    def _augment_single(self, img_path: Path, lbl_path: Path,
                         out_img: Path, out_lbl: Path):
        img = cv2.imread(str(img_path))
        if img is None:
            return
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Load YOLO labels
        bboxes, class_labels = [], []
        if lbl_path.exists():
            for line in lbl_path.read_text().strip().splitlines():
                parts = line.split()
                if len(parts) == 5:
                    cls, cx, cy, w, h = parts
                    bboxes.append([float(cx), float(cy), float(w), float(h)])
                    class_labels.append(int(cls))

        for i in range(self.factor - 1):  # -1 because original is already copied
            try:
                augmented = self.transform(
                    image=img_rgb, bboxes=bboxes, class_labels=class_labels,
                )
                aug_img = cv2.cvtColor(augmented["image"], cv2.COLOR_RGB2BGR)
                aug_bboxes = augmented["bboxes"]
                aug_labels = augmented["class_labels"]

                aug_name = f"{img_path.stem}_aug{i}"
                cv2.imwrite(str(out_img / f"{aug_name}.png"), aug_img)

                lines = [
                    f"{cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}"
                    for (cx, cy, w, h), cls in zip(aug_bboxes, aug_labels)
                ]
                (out_lbl / f"{aug_name}.txt").write_text("\n".join(lines))
            except Exception as e:
                pass  # skip failed augmentations silently


# ── Class balancer ────────────────────────────────────────────────────────────

class ClassBalancer:
    """
    Oversample underrepresented defect classes.
    Important: industrial datasets are heavily imbalanced.
    """

    def balance(self, split_dir: Path, target_ratio: float = 3.0):
        """
        target_ratio: max(defective) / min(defective) allowed imbalance.
        Oversample minority classes by copying with random name suffix.
        """
        img_dir = split_dir / "images" / "train"
        lbl_dir = split_dir / "labels" / "train"

        # Count by class
        class_counts: dict[int, list[Path]] = {}
        for lbl_file in lbl_dir.glob("*.txt"):
            for line in lbl_file.read_text().strip().splitlines():
                parts = line.split()
                if parts:
                    cls = int(parts[0])
                    class_counts.setdefault(cls, []).append(lbl_file)

        if not class_counts:
            return

        max_count = max(len(v) for v in class_counts.values())
        print(f"\n  Class balance (before):")
        for cls, files in sorted(class_counts.items()):
            print(f"    Class {cls}: {len(files):4d} samples")

        for cls, files in class_counts.items():
            target = min(max_count, int(len(files) * target_ratio))
            needed = target - len(files)
            if needed <= 0:
                continue

            for i in range(needed):
                src_lbl = random.choice(files)
                src_img = img_dir / src_lbl.with_suffix(".png").name
                if not src_img.exists():
                    src_img = img_dir / src_lbl.with_suffix(".jpg").name
                if not src_img.exists():
                    continue

                suffix = f"_bal{i}"
                shutil.copy2(src_img, img_dir / f"{src_img.stem}{suffix}{src_img.suffix}")
                shutil.copy2(src_lbl, lbl_dir / f"{src_lbl.stem}{suffix}.txt")

        print(f"  ✓ Class balancing applied")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--input",   required=True, help="Input YOLO dataset dir")
    parser.add_argument("--output",  required=True, help="Output augmented dir")
    parser.add_argument("--factor",  type=int, default=3, help="Augmentation factor")
    parser.add_argument("--size",    type=int, default=640)
    parser.add_argument("--balance", action="store_true")
    args = parser.parse_args()

    augmenter = DatasetAugmenter(factor=args.factor, img_size=args.size)
    augmenter.augment_dataset(Path(args.input), Path(args.output))

    if args.balance:
        balancer = ClassBalancer()
        balancer.balance(Path(args.output))
