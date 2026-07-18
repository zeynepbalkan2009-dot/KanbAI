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
from typing import Optional, Protocol

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


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
    decision: str              # "pass" | "fail" | "review"
    confidence: float
    defects: list[DefectDetection] = field(default_factory=list)
    latency_ms: int = 0
    model_version: str = "unknown"
    raw_output: Optional[dict] = None

    def to_dict(self) -> dict:
        return {
            "decision": self.decision,
            "confidence": round(self.confidence, 4),
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

        result = self._generate_result()
        result.latency_ms = int((time.monotonic() - start) * 1000)

        logger.info(
            "mock_inference_complete",
            image_path=image_path,
            decision=result.decision,
            confidence=result.confidence,
            defect_count=len(result.defects),
            latency_ms=result.latency_ms,
        )
        return result

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


# ── YOLO implementation (stub — ready to activate) ───────────────────────────

class YOLOInferenceService:
    """
    Real YOLOv8 inference.
    Activate by: AI_INFERENCE_MODE=yolo + placing best.pt in backend/models/
    """

    def __init__(self, model_path: str):
        # Lazy import — don't load ultralytics if not needed
        from ultralytics import YOLO  # type: ignore
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

def create_inference_service() -> InferenceService:
    mode = settings.ai_inference_mode
    if mode == "mock":
        logger.info("inference_mode", mode="mock")
        return MockInferenceService()
    elif mode == "yolo":
        logger.info("inference_mode", mode="yolo", path=settings.yolo_model_path)
        return YOLOInferenceService(settings.yolo_model_path)
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
