"""
YOLO Training Pipeline
=======================
- YOLOv8 training with MLflow experiment tracking
- Multi-config support (nano / small / medium)
- Auto-export to ONNX after training
- Model registry integration
- CPU-first (GPU auto-detected)

Usage:
    python train.py --data dataset/yolo/v1.0/binary/data.yaml
    python train.py --data ... --model yolov8s.pt --epochs 150
    python train.py --data ... --experiment steel_factory_v2
"""

import argparse
import json
import os
import shutil
import subprocess
import time
from datetime import datetime
from pathlib import Path

import yaml

# Optional deps — graceful degradation
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False
    print("⚠ ultralytics not installed: pip install ultralytics")

try:
    import mlflow
    import mlflow.pytorch
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    print("⚠ mlflow not installed: pip install mlflow")

RUNS_DIR      = Path(__file__).parent.parent / "runs"
REGISTRY_DIR  = Path(__file__).parent.parent / "registry"
EXPORT_DIR    = Path(__file__).parent.parent / "inference" / "models"


# ── Training orchestrator ─────────────────────────────────────────────────────

class YOLOTrainer:
    def __init__(
        self,
        data_yaml: str,
        model: str = "yolov8n.pt",
        epochs: int = 100,
        batch: int = 16,
        imgsz: int = 640,
        experiment: str = "qc_defect",
        run_name: str | None = None,
        device: str = "auto",
    ):
        self.data_yaml = Path(data_yaml)
        self.model_name = model
        self.epochs = epochs
        self.batch = batch
        self.imgsz = imgsz
        self.experiment = experiment
        self.run_name = run_name or f"{experiment}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.device = self._resolve_device(device)

        RUNS_DIR.mkdir(parents=True, exist_ok=True)
        REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
        EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    def _resolve_device(self, device: str) -> str:
        if device != "auto":
            return device
        try:
            import torch
            if torch.cuda.is_available():
                d = "0"
                print(f"  ✓ GPU detected: {torch.cuda.get_device_name(0)}")
            else:
                d = "cpu"
                print("  ℹ No GPU — training on CPU (slower but functional)")
            return d
        except ImportError:
            return "cpu"

    def train(self) -> dict:
        if not ULTRALYTICS_AVAILABLE:
            print("⚠ ultralytics not available — returning mock training result")
            return self._mock_training_result()

        print(f"\n{'='*60}")
        print(f"  QC Platform — YOLO Training")
        print(f"  Model:      {self.model_name}")
        print(f"  Data:       {self.data_yaml}")
        print(f"  Epochs:     {self.epochs}")
        print(f"  Device:     {self.device}")
        print(f"  Run name:   {self.run_name}")
        print(f"{'='*60}\n")

        model = YOLO(self.model_name)

        # Start MLflow run
        if MLFLOW_AVAILABLE:
            mlflow.set_experiment(self.experiment)
            mlflow_run = mlflow.start_run(run_name=self.run_name)

        try:
            results = model.train(
                data=str(self.data_yaml),
                epochs=self.epochs,
                batch=self.batch,
                imgsz=self.imgsz,
                device=self.device,
                project=str(RUNS_DIR),
                name=self.run_name,
                exist_ok=True,
                patience=20,
                save=True,
                plots=True,
                verbose=True,
                # Augmentation
                hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,
                degrees=15.0, translate=0.1, scale=0.5,
                flipud=0.5, fliplr=0.5,
                mosaic=1.0, mixup=0.1,
            )

            metrics = self._extract_metrics(results)
            run_dir = RUNS_DIR / self.run_name
            best_pt = run_dir / "weights" / "best.pt"

            # Log to MLflow
            if MLFLOW_AVAILABLE:
                mlflow.log_params({
                    "model": self.model_name,
                    "epochs": self.epochs,
                    "batch": self.batch,
                    "imgsz": self.imgsz,
                    "device": self.device,
                    "data": str(self.data_yaml),
                })
                mlflow.log_metrics(metrics)
                if best_pt.exists():
                    mlflow.log_artifact(str(best_pt), "weights")
                mlflow.log_artifact(str(self.data_yaml), "dataset")

            # Export
            export_paths = self.export_model(best_pt)
            metrics["export"] = export_paths

            # Register
            registry_entry = self._register_model(metrics, best_pt, export_paths)
            metrics["registry_entry"] = registry_entry

            print(f"\n✅ Training complete!")
            print(f"   mAP50:     {metrics.get('mAP50', 0):.4f}")
            print(f"   mAP50-95:  {metrics.get('mAP50_95', 0):.4f}")
            print(f"   Precision: {metrics.get('precision', 0):.4f}")
            print(f"   Recall:    {metrics.get('recall', 0):.4f}")

            return metrics

        finally:
            if MLFLOW_AVAILABLE:
                mlflow.end_run()

    def _extract_metrics(self, results) -> dict:
        """Extract metrics from Ultralytics results object."""
        try:
            return {
                "mAP50":      float(results.results_dict.get("metrics/mAP50(B)", 0)),
                "mAP50_95":   float(results.results_dict.get("metrics/mAP50-95(B)", 0)),
                "precision":  float(results.results_dict.get("metrics/precision(B)", 0)),
                "recall":     float(results.results_dict.get("metrics/recall(B)", 0)),
                "box_loss":   float(results.results_dict.get("train/box_loss", 0)),
                "cls_loss":   float(results.results_dict.get("train/cls_loss", 0)),
            }
        except Exception:
            return {}

    def export_model(self, best_pt: Path) -> dict[str, str]:
        """Export best.pt to ONNX (+ TensorRT if GPU available)."""
        if not best_pt.exists():
            print(f"  ⚠ best.pt not found at {best_pt}")
            return {}

        print(f"\n→ Exporting model...")
        model = YOLO(str(best_pt))
        exports = {}

        # ONNX export (CPU + GPU compatible, edge deployable)
        try:
            onnx_path = model.export(
                format="onnx",
                imgsz=self.imgsz,
                opset=12,           # broad compatibility
                simplify=True,
                dynamic=False,      # fixed batch=1 for production
            )
            dest = EXPORT_DIR / f"{self.run_name}.onnx"
            shutil.copy2(onnx_path, dest)
            exports["onnx"] = str(dest)
            print(f"  ✓ ONNX exported: {dest}")
        except Exception as e:
            print(f"  ✗ ONNX export failed: {e}")

        # Copy best.pt
        pt_dest = EXPORT_DIR / f"{self.run_name}.pt"
        shutil.copy2(best_pt, pt_dest)
        exports["pytorch"] = str(pt_dest)

        # TensorRT (GPU only, skip in CPU mode)
        if self.device != "cpu":
            try:
                trt_path = model.export(format="engine", imgsz=self.imgsz, half=True)
                dest = EXPORT_DIR / f"{self.run_name}.engine"
                shutil.copy2(trt_path, dest)
                exports["tensorrt"] = str(dest)
                print(f"  ✓ TensorRT exported: {dest}")
            except Exception as e:
                print(f"  ℹ TensorRT export skipped: {e}")

        return exports

    def _register_model(self, metrics: dict, pt_path: Path, exports: dict) -> dict:
        """Write model registry entry."""
        entry = {
            "run_name":    self.run_name,
            "model_arch":  self.model_name,
            "trained_at":  datetime.now().isoformat(),
            "metrics":     metrics,
            "data_yaml":   str(self.data_yaml),
            "exports":     exports,
            "is_production": False,
            "notes": "",
        }
        registry_file = REGISTRY_DIR / f"{self.run_name}.json"
        with open(registry_file, "w") as f:
            json.dump(entry, f, indent=2)
        print(f"  ✓ Registered: {registry_file}")
        return entry

    def _mock_training_result(self) -> dict:
        """Return mock result for demo/testing without ultralytics."""
        import random
        return {
            "mAP50":     round(random.uniform(0.82, 0.94), 4),
            "mAP50_95":  round(random.uniform(0.55, 0.72), 4),
            "precision": round(random.uniform(0.85, 0.96), 4),
            "recall":    round(random.uniform(0.78, 0.92), 4),
            "run_name":  self.run_name,
            "mock": True,
        }


# ── Hyperparameter search (simple grid) ──────────────────────────────────────

class HyperparamSearch:
    """
    Simple grid search for key hyperparameters.
    Replace with Optuna for production.
    """
    GRID = {
        "lr0":          [0.001, 0.01],
        "batch":        [8, 16],
        "model":        ["yolov8n.pt", "yolov8s.pt"],
    }

    def run(self, data_yaml: str, n_trials: int = 4):
        import itertools
        keys = list(self.GRID.keys())
        combos = list(itertools.product(*self.GRID.values()))[:n_trials]
        results = []

        for combo in combos:
            params = dict(zip(keys, combo))
            print(f"\n→ Trial: {params}")
            trainer = YOLOTrainer(
                data_yaml=data_yaml,
                model=params["model"],
                batch=params["batch"],
                epochs=30,  # short trial
                experiment="hyperparam_search",
            )
            metrics = trainer.train()
            results.append({"params": params, "metrics": metrics})

        best = max(results, key=lambda x: x["metrics"].get("mAP50", 0))
        print(f"\n✅ Best trial: {best['params']}")
        print(f"   mAP50: {best['metrics'].get('mAP50', 0):.4f}")
        return best


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="QC Platform YOLO Trainer")
    parser.add_argument("--data",       required=True, help="Path to data.yaml")
    parser.add_argument("--model",      default="yolov8n.pt")
    parser.add_argument("--epochs",     type=int, default=100)
    parser.add_argument("--batch",      type=int, default=16)
    parser.add_argument("--imgsz",      type=int, default=640)
    parser.add_argument("--experiment", default="qc_defect")
    parser.add_argument("--run-name",   default=None)
    parser.add_argument("--device",     default="auto")
    parser.add_argument("--search",     action="store_true", help="Run hyperparameter search")
    args = parser.parse_args()

    if args.search:
        searcher = HyperparamSearch()
        searcher.run(args.data)
    else:
        trainer = YOLOTrainer(
            data_yaml=args.data,
            model=args.model,
            epochs=args.epochs,
            batch=args.batch,
            imgsz=args.imgsz,
            experiment=args.experiment,
            run_name=args.run_name,
            device=args.device,
        )
        trainer.train()


if __name__ == "__main__":
    main()
