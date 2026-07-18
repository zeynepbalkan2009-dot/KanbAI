"""
Model Registry
===============
Local file-based registry (MVP) → MLflow Model Registry (production).

Tracks:
  - All trained model versions
  - Performance metrics
  - Production/staging/archived status
  - A/B test assignments
  - Rollback history
  - Per-factory deployment mapping

MVP: JSON files in mlops/registry/
Phase 2: MLflow Tracking Server
Phase 3: Custom model serving with Triton
"""

import json
import shutil
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Optional


REGISTRY_DIR = Path(__file__).parent
MODELS_DIR   = Path(__file__).parent.parent / "inference" / "models"


class ModelStage(str, Enum):
    DEVELOPMENT = "development"
    STAGING     = "staging"
    PRODUCTION  = "production"
    ARCHIVED    = "archived"


@dataclass
class ModelMetrics:
    mAP50:      float = 0.0
    mAP50_95:   float = 0.0
    precision:  float = 0.0
    recall:     float = 0.0
    f1:         float = 0.0
    false_positive_rate: float = 0.0
    false_negative_rate: float = 0.0
    avg_latency_cpu_ms: Optional[int] = None
    avg_latency_gpu_ms: Optional[int] = None


@dataclass
class ModelVersion:
    version_id:      str
    name:            str
    version:         str          # e.g. "1.3.0"
    architecture:    str          # "yolov8n", "yolov8s", "onnx"
    stage:           ModelStage
    metrics:         ModelMetrics
    pytorch_path:    Optional[str] = None
    onnx_path:       Optional[str] = None
    tensorrt_path:   Optional[str] = None
    data_yaml:       Optional[str] = None
    dataset_version: Optional[str] = None
    mlflow_run_id:   Optional[str] = None
    class_names:     dict = field(default_factory=dict)
    training_config: dict = field(default_factory=dict)
    notes:           str  = ""
    promoted_by:     Optional[str] = None
    created_at:      str  = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    promoted_at:     Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        d["metrics"] = asdict(self.metrics)
        d["stage"]   = self.stage.value
        return d


class ModelRegistry:
    def __init__(self):
        REGISTRY_DIR.mkdir(parents=True, exist_ok=True)

    def register(self, version: ModelVersion) -> str:
        path = REGISTRY_DIR / f"{version.version_id}.json"
        with open(path, "w") as f:
            json.dump(version.to_dict(), f, indent=2)
        print(f"  ✓ Registered: {version.name} v{version.version} → {path.name}")
        return version.version_id

    def list_versions(self, name: Optional[str] = None,
                       stage: Optional[ModelStage] = None) -> list[ModelVersion]:
        versions = []
        for f in sorted(REGISTRY_DIR.glob("*.json")):
            try:
                with open(f) as fp:
                    data = json.load(fp)
                mv = self._from_dict(data)
                if name  and mv.name  != name:  continue
                if stage and mv.stage != stage: continue
                versions.append(mv)
            except Exception:
                continue
        return sorted(versions, key=lambda v: v.created_at, reverse=True)

    def get_production_model(self, name: str = "qc-defect-detector") -> Optional[ModelVersion]:
        """Returns the currently active production model."""
        versions = self.list_versions(name=name, stage=ModelStage.PRODUCTION)
        return versions[0] if versions else None

    def promote(self, version_id: str, target_stage: ModelStage,
                promoted_by: str = "system") -> ModelVersion:
        """Promote a model to a new stage (auto-demotes current production)."""
        version = self._load(version_id)
        if not version:
            raise ValueError(f"Model {version_id} not found")

        # Demote current production → staging
        if target_stage == ModelStage.PRODUCTION:
            current = self.get_production_model(version.name)
            if current and current.version_id != version_id:
                current.stage = ModelStage.STAGING
                self.register(current)
                print(f"  ↓ Demoted: {current.version} → staging (rollback available)")

        version.stage      = target_stage
        version.promoted_by = promoted_by
        version.promoted_at = datetime.now(timezone.utc).isoformat()
        self.register(version)
        print(f"  ✓ Promoted: {version.name} v{version.version} → {target_stage.value}")
        return version

    def rollback(self, name: str) -> Optional[ModelVersion]:
        """Roll back to most recent staging model."""
        staging_versions = self.list_versions(name=name, stage=ModelStage.STAGING)
        if not staging_versions:
            print(f"  ✗ No staging model available for rollback")
            return None

        previous = staging_versions[0]
        return self.promote(previous.version_id, ModelStage.PRODUCTION, promoted_by="rollback")

    def compare(self, version_id_a: str, version_id_b: str) -> dict:
        """Side-by-side metric comparison."""
        a = self._load(version_id_a)
        b = self._load(version_id_b)
        if not a or not b:
            return {}

        def delta(va, vb):
            return round(vb - va, 4) if va is not None and vb is not None else None

        return {
            "a": {"version": a.version, "stage": a.stage.value},
            "b": {"version": b.version, "stage": b.stage.value},
            "deltas": {
                "mAP50":     delta(a.metrics.mAP50,    b.metrics.mAP50),
                "precision": delta(a.metrics.precision, b.metrics.precision),
                "recall":    delta(a.metrics.recall,    b.metrics.recall),
                "latency":   delta(a.metrics.avg_latency_cpu_ms, b.metrics.avg_latency_cpu_ms),
            },
            "recommendation": "b" if b.metrics.mAP50 > a.metrics.mAP50 else "a",
        }

    def _load(self, version_id: str) -> Optional[ModelVersion]:
        path = REGISTRY_DIR / f"{version_id}.json"
        if not path.exists():
            return None
        with open(path) as f:
            return self._from_dict(json.load(f))

    @staticmethod
    def _from_dict(d: dict) -> ModelVersion:
        metrics = ModelMetrics(**d.pop("metrics", {}))
        d["stage"] = ModelStage(d.get("stage", "development"))
        return ModelVersion(metrics=metrics, **{
            k: v for k, v in d.items()
            if k in ModelVersion.__dataclass_fields__ and k != "metrics"
        })


# ── Drift detector ────────────────────────────────────────────────────────────

class DriftDetector:
    """
    Statistical drift detection on inference results.
    Triggers retraining alert when distribution shifts.

    Methods:
      - Confidence score distribution shift (KS test)
      - False positive rate increase
      - Class distribution shift
      - Rolling window comparison
    """

    def __init__(self, window_size: int = 1000, alert_threshold: float = 0.15):
        self.window_size = window_size
        self.alert_threshold = alert_threshold

    def check_confidence_drift(
        self, recent: list[float], baseline: list[float]
    ) -> dict:
        """
        Compare recent confidence distribution to baseline.
        Uses mean shift as simple proxy (full KS test in production).
        """
        if len(recent) < 50 or len(baseline) < 50:
            return {"drift_detected": False, "reason": "insufficient_data"}

        recent_mean  = sum(recent)  / len(recent)
        baseline_mean = sum(baseline) / len(baseline)
        drift = abs(recent_mean - baseline_mean)

        return {
            "drift_detected":  drift > self.alert_threshold,
            "drift_magnitude": round(drift, 4),
            "recent_mean":     round(recent_mean, 4),
            "baseline_mean":   round(baseline_mean, 4),
            "recommendation":  "retrain" if drift > self.alert_threshold else "monitor",
        }

    def check_false_positive_rate(
        self, fp_count: int, total: int, baseline_fpr: float = 0.03
    ) -> dict:
        current_fpr = fp_count / total if total > 0 else 0.0
        spike = current_fpr / baseline_fpr if baseline_fpr > 0 else float("inf")
        return {
            "drift_detected": spike > 2.0,
            "current_fpr":   round(current_fpr, 4),
            "baseline_fpr":  baseline_fpr,
            "spike_factor":  round(spike, 2),
        }
