"""
AI Inference Service — Strategy pattern.

The InferenceService protocol defines the contract.
MockInferenceService runs now (no GPU, no model weights needed).
YOLOInferenceService is ready to plug in when weights are available.

Swap: change AI_INFERENCE_MODE=yolo in .env → no code changes needed.
"""

import asyncio
import random
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Protocol

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


def configure_trusted_checkpoint_loading(model_name: str) -> None:
    """
    Keep trusted YOLO .pt weights compatible with newer PyTorch checkpoint rules.

    Use this only for official or locally trained model files. Some Ultralytics
    checkpoints store model classes, not only tensors.
    """
    if not str(model_name).lower().endswith(".pt"):
        return
    try:
        import inspect
        import torch
    except ImportError:
        return

    if "weights_only" not in inspect.signature(torch.load).parameters:
        return
    if getattr(torch.load, "_kanbai_trusted_checkpoint_patch", False):
        return

    original_load = torch.load

    def trusted_load(*args, **kwargs):
        kwargs.setdefault("weights_only", False)
        return original_load(*args, **kwargs)

    trusted_load._kanbai_trusted_checkpoint_patch = True
    torch.load = trusted_load


# ── Data structures ───────────────────────────────────────────────────────────

DEFECT_CLASSES = [
    "scratch",
    "dent",
    "crack",
    "discoloration",
    "foreign_object",
    "edge_chip",
    "surface_void",
]


@dataclass
class DefectDetection:
    class_name: str
    confidence: float
    bbox: list[float]  # [x1, y1, x2, y2] normalized 0-1


@dataclass
class InferenceResult:
    decision: str              # "pass" | "fail" | "review" | "out_of_scope"
    confidence: Optional[float]
    defects: list[DefectDetection] = field(default_factory=list)
    latency_ms: int = 0
    model_version: str = "unknown"
    raw_output: Optional[dict] = None

    def to_dict(self) -> dict:
        return {
            "decision": self.decision,
            "confidence": round(self.confidence, 4) if self.confidence is not None else None,
            "defects": [
                {
                    "class_name": d.class_name,
                    "confidence": round(d.confidence, 4),
                    "bbox": [round(v, 4) for v in d.bbox],
                }
                for d in self.defects
            ],
            "latency_ms": self.latency_ms,
            "model_version": self.model_version,
        }


# ── Protocol (interface) ──────────────────────────────────────────────────────

class InferenceService(Protocol):
    async def analyze(self, image_path: str) -> InferenceResult: ...
    def get_model_version(self) -> str: ...


# ── Mock implementation ───────────────────────────────────────────────────────

class MockInferenceService:
    """
    Deterministic-ish mock that simulates real YOLO pipeline behavior:
    - Realistic processing delay (2-4s)
    - Random defect classification
    - Confidence-based decision logic (same thresholds as production)
    - Publishes same event structure as real YOLO would
    """

    VERSION = "mock-v1.0"

    # Probability weights for outcome simulation
    _PASS_WEIGHT = 0.55
    _FAIL_WEIGHT = 0.30
    _REVIEW_WEIGHT = 0.15

    def get_model_version(self) -> str:
        return self.VERSION

    async def analyze(self, image_path: str) -> InferenceResult:
        start = time.monotonic()

        # Simulate processing delay
        delay = random.uniform(settings.ai_mock_delay_min, settings.ai_mock_delay_max)
        await asyncio.sleep(delay)

        is_candidate, scope_metrics = self._is_industrial_metal_candidate(image_path)
        if not is_candidate:
            result = InferenceResult(
                decision="out_of_scope",
                confidence=None,
                defects=[],
                model_version=self.VERSION,
                raw_output={"scope_gate": scope_metrics},
            )
        else:
            result = self._generate_result()
        result.latency_ms = int((time.monotonic() - start) * 1000)

        logger.info(
            "mock_inference_complete",
            image_path=image_path,
            decision=result.decision,
            confidence=result.confidence,
            defect_count=len(result.defects),
            latency_ms=result.latency_ms,
            scope_metrics=scope_metrics,
        )
        return result

    @staticmethod
    def _is_industrial_metal_candidate(image_path: str) -> tuple[bool, dict]:
        """
        Lightweight scope gate for mock mode.

        This is not defect detection. It only prevents demos from assigning fake
        defect scores to obviously unrelated screenshots, games, wood photos, or
        colorful graphics before a real model is connected.
        """
        try:
            import colorsys
            import math
            from PIL import Image, ImageFile

            ImageFile.LOAD_TRUNCATED_IMAGES = True

            with Image.open(image_path) as source:
                source.thumbnail((180, 180))
                image = source.convert("RGB")
                pixels = list(image.getdata())

            if not pixels:
                return True, {"scope": "unknown", "reason": "image_empty"}

            count = len(pixels)
            high_sat_count = 0
            very_high_sat_count = 0
            low_sat_count = 0
            neutral_mid_count = 0
            gray_metal_count = 0
            warm_material_count = 0
            rg_values: list[float] = []
            yb_values: list[float] = []

            for red, green, blue in pixels:
                hue, sat, val = colorsys.rgb_to_hsv(red / 255.0, green / 255.0, blue / 255.0)
                hue_degrees = hue * 360

                if sat > 0.48 and val > 0.18:
                    high_sat_count += 1
                if sat > 0.62 and val > 0.20:
                    very_high_sat_count += 1
                if sat < 0.28:
                    low_sat_count += 1
                if sat < 0.24 and 0.12 < val < 0.88:
                    neutral_mid_count += 1
                if sat < 0.30 and 0.16 < val < 0.78:
                    gray_metal_count += 1
                if 16 <= hue_degrees <= 76 and sat > 0.23 and val > 0.32:
                    warm_material_count += 1

                rg_values.append(abs(red - green))
                yb_values.append(abs(0.5 * (red + green) - blue))

            def ratio(value: int) -> float:
                return value / count

            def mean(values: list[float]) -> float:
                return sum(values) / len(values)

            def stddev(values: list[float], avg: float) -> float:
                return math.sqrt(sum((value - avg) ** 2 for value in values) / len(values))

            rg_mean = mean(rg_values)
            yb_mean = mean(yb_values)
            colorfulness = (
                math.sqrt(stddev(rg_values, rg_mean) ** 2 + stddev(yb_values, yb_mean) ** 2)
                + 0.3 * math.sqrt(rg_mean ** 2 + yb_mean ** 2)
            )

            high_saturation = ratio(high_sat_count)
            very_high_saturation = ratio(very_high_sat_count)
            low_saturation = ratio(low_sat_count)
            neutral_mid = ratio(neutral_mid_count)
            gray_metal = ratio(gray_metal_count)
            warm_material = ratio(warm_material_count)

            obvious_nonindustrial = (
                (high_saturation > 0.32)
                or (very_high_saturation > 0.18 and colorfulness > 42)
                or (colorfulness > 58)
                or (warm_material > 0.30 and gray_metal < 0.18)
            )
            metal_like = (
                (gray_metal > 0.18 and high_saturation < 0.26 and colorfulness < 54)
                or (neutral_mid > 0.34 and high_saturation < 0.22)
                or (neutral_mid > 0.25 and gray_metal > 0.10 and warm_material < 0.02 and high_saturation < 0.04 and colorfulness < 22)
                or (low_saturation > 0.72 and gray_metal > 0.16 and neutral_mid > 0.24 and very_high_saturation < 0.16 and warm_material < 0.30)
            )

            metrics = {
                "scope": "industrial_metal" if metal_like and not obvious_nonindustrial else "out_of_scope",
                "high_saturation": round(high_saturation, 4),
                "very_high_saturation": round(very_high_saturation, 4),
                "low_saturation": round(low_saturation, 4),
                "neutral_mid": round(neutral_mid, 4),
                "gray_metal": round(gray_metal, 4),
                "warm_material": round(warm_material, 4),
                "colorfulness": round(colorfulness, 2),
            }
            return metal_like and not obvious_nonindustrial, metrics
        except Exception as exc:
            logger.warning("mock_scope_gate_failed", image_path=image_path, error=str(exc))
            return True, {"scope": "unknown", "reason": "scope_gate_failed"}

    def _generate_result(self) -> InferenceResult:
        outcome = random.choices(
            ["pass", "fail", "review"],
            weights=[self._PASS_WEIGHT, self._FAIL_WEIGHT, self._REVIEW_WEIGHT],
        )[0]

        if outcome == "pass":
            confidence = random.uniform(0.76, 0.99)
            defects = []
        elif outcome == "fail":
            n_defects = random.randint(1, 4)
            defects = [self._random_defect(min_conf=0.65) for _ in range(n_defects)]
            confidence = max(d.confidence for d in defects)
        else:  # review
            n_defects = random.randint(1, 2)
            defects = [self._random_defect(min_conf=0.45, max_conf=0.74) for _ in range(n_defects)]
            confidence = max(d.confidence for d in defects)

        return InferenceResult(
            decision=outcome,
            confidence=round(confidence, 4),
            defects=defects,
            model_version=self.VERSION,
        )

    @staticmethod
    def _random_defect(min_conf: float = 0.50, max_conf: float = 0.99) -> DefectDetection:
        x1 = random.uniform(0.05, 0.6)
        y1 = random.uniform(0.05, 0.6)
        x2 = x1 + random.uniform(0.05, 0.35)
        y2 = y1 + random.uniform(0.05, 0.35)
        return DefectDetection(
            class_name=random.choice(DEFECT_CLASSES),
            confidence=round(random.uniform(min_conf, max_conf), 4),
            bbox=[min(x1, 1), min(y1, 1), min(x2, 1), min(y2, 1)],
        )


class DataCollectionInferenceService:
    """Pilot-safe mode that stores images without inventing model evidence."""

    VERSION = "data-collection-v1"

    def get_model_version(self) -> str:
        return self.VERSION

    async def analyze(self, image_path: str) -> InferenceResult:
        return InferenceResult(
            decision="review",
            confidence=None,
            defects=[],
            latency_ms=0,
            model_version=self.VERSION,
            raw_output={
                "human_review_required": True,
                "quality_decision_enabled": False,
                "model_executed": False,
            },
        )


# ── YOLO implementation (stub — ready to activate) ───────────────────────────

class YOLOInferenceService:
    """
    Real YOLOv8 inference.
    Activate by: AI_INFERENCE_MODE=yolo + placing best.pt in backend/models/
    """

    def __init__(self, model_path: str):
        model_file = Path(model_path)
        if not model_file.exists():
            raise FileNotFoundError(
                f"YOLO model file not found: {model_path}. "
                "Set YOLO_MODEL_PATH to a mounted .pt file or place best.pt under backend/models/."
            )

        try:
            from ultralytics import YOLO  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "AI_INFERENCE_MODE=yolo requires the optional ultralytics dependency. "
                "Use the full backend requirements or install ultralytics in the worker image."
            ) from exc

        configure_trusted_checkpoint_loading(model_path)
        self._model = YOLO(model_path)
        self._version = self._extract_version(model_path)
        logger.info("yolo_model_loaded", path=model_path, version=self._version)

    def get_model_version(self) -> str:
        return self._version

    async def analyze(self, image_path: str) -> InferenceResult:
        loop = asyncio.get_event_loop()
        # Run blocking inference in thread pool to not block event loop
        result = await loop.run_in_executor(None, self._sync_analyze, image_path)
        return result

    def _sync_analyze(self, image_path: str) -> InferenceResult:
        start = time.monotonic()
        results = self._model(image_path, verbose=False)[0]
        latency_ms = int((time.monotonic() - start) * 1000)

        defects: list[DefectDetection] = []
        for box in results.boxes:
            conf = float(box.conf[0])
            if conf < settings.ai_confidence_review_threshold:
                continue
            cls_idx = int(box.cls[0])
            bbox = box.xyxyn[0].tolist()  # normalized
            defects.append(DefectDetection(
                class_name=results.names[cls_idx],
                confidence=round(conf, 4),
                bbox=[round(v, 4) for v in bbox],
            ))

        if not defects:
            decision, confidence = "pass", 0.99
        elif all(d.confidence >= settings.ai_confidence_pass_threshold for d in defects):
            decision = "fail"
            confidence = max(d.confidence for d in defects)
        else:
            decision = "review"
            confidence = max(d.confidence for d in defects)

        return InferenceResult(
            decision=decision,
            confidence=round(confidence, 4),
            defects=defects,
            latency_ms=latency_ms,
            model_version=self._version,
        )

    @staticmethod
    def _extract_version(path: str) -> str:
        import re
        match = re.search(r"v(\d+[\w.]+)", path)
        return f"yolo-{match.group(1)}" if match else "yolo-unknown"


# ── Factory function ──────────────────────────────────────────────────────────

class PilotScopedYOLOInferenceService:
    """
    Reject unrelated images first, then use the local YOLO model as pilot
    evidence. Until a factory-approved defect model exists, every in-scope
    image is routed to human review instead of producing an automatic quality
    PASS/FAIL decision.
    """

    def __init__(self, model_path: str):
        self._yolo = YOLOInferenceService(model_path)

    def get_model_version(self) -> str:
        return f"pilot-scope+{self._yolo.get_model_version()}"

    async def analyze(self, image_path: str) -> InferenceResult:
        start = time.monotonic()
        is_candidate, scope_metrics = MockInferenceService._is_industrial_metal_candidate(image_path)
        if not is_candidate:
            return InferenceResult(
                decision="out_of_scope",
                confidence=None,
                defects=[],
                latency_ms=int((time.monotonic() - start) * 1000),
                model_version=self.get_model_version(),
                raw_output={"scope_gate": scope_metrics},
            )

        yolo_result = await self._yolo.analyze(image_path)
        return InferenceResult(
            decision="review",
            confidence=yolo_result.confidence,
            defects=[],
            latency_ms=int((time.monotonic() - start) * 1000),
            model_version=self.get_model_version(),
            raw_output={
                "scope_gate": scope_metrics,
                "scope_detections": [d.__dict__ for d in yolo_result.defects],
                "human_review_required": True,
            },
        )


def create_inference_service() -> InferenceService:
    mode = settings.ai_inference_mode
    if mode == "mock":
        logger.info("inference_mode", mode="mock")
        return MockInferenceService()
    elif mode == "data_collection":
        logger.info("inference_mode", mode="data_collection")
        return DataCollectionInferenceService()
    elif mode == "yolo":
        logger.info("inference_mode", mode="yolo", path=settings.yolo_model_path)
        return YOLOInferenceService(settings.yolo_model_path)
    elif mode == "pilot_yolo_scope":
        logger.info("inference_mode", mode="pilot_yolo_scope", path=settings.yolo_model_path)
        return PilotScopedYOLOInferenceService(settings.yolo_model_path)
    elif mode == "onnx":
        raise NotImplementedError("ONNX inference not yet implemented")
    else:
        raise ValueError(f"Unknown inference mode: {mode}")


# Singleton instance
_inference_service: InferenceService | None = None


def get_inference_service() -> InferenceService:
    global _inference_service
    if _inference_service is None:
        _inference_service = create_inference_service()
    return _inference_service
