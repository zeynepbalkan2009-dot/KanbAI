"""
Production Inference Wrapper
==============================
Supports: mock | yolo (PyTorch) | onnx (CPU/GPU runtime)

Design principles:
1. Same interface regardless of backend
2. Factory-level threshold configuration
3. Confidence → decision mapping (pass / review / fail)
4. Full telemetry for every inference call
5. Thread-safe for Celery multi-worker

Usage:
    # In .env: AI_INFERENCE_MODE=onnx, ONNX_MODEL_PATH=models/best.onnx
    svc = create_inference_service()
    result = await svc.analyze("/path/to/image.jpg")
"""

import asyncio
import time
import random
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional
import json

# ── Result types ─────────────────────────────────────────────────────────────

@dataclass
class DefectBox:
    class_id:   int
    class_name: str
    confidence: float
    bbox_xyxy:  list[float]   # [x1, y1, x2, y2] in pixels
    bbox_norm:  list[float]   # [cx, cy, w, h]  0-1 normalized

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class InferenceResult:
    decision:       str           # "pass" | "fail" | "review"
    confidence:     float         # max defect confidence (0 if no defect)
    defects:        list[DefectBox] = field(default_factory=list)
    latency_ms:     int  = 0
    model_version:  str  = "unknown"
    image_size:     tuple[int, int] = (640, 640)
    backend:        str  = "unknown"

    @property
    def defect_count(self) -> int:
        return len(self.defects)

    @property
    def top_defect(self) -> Optional[DefectBox]:
        return max(self.defects, key=lambda d: d.confidence) if self.defects else None

    def to_dict(self) -> dict:
        return {
            "decision":      self.decision,
            "confidence":    round(self.confidence, 4),
            "defects":       [d.to_dict() for d in self.defects],
            "defect_count":  self.defect_count,
            "latency_ms":    self.latency_ms,
            "model_version": self.model_version,
            "backend":       self.backend,
        }


# ── Threshold engine ──────────────────────────────────────────────────────────

@dataclass
class ThresholdConfig:
    """Per-factory configurable thresholds."""
    pass_threshold:   float = 0.50   # below this → pass (no significant defect)
    review_threshold: float = 0.75   # between pass and fail → review
    # fail = confidence >= review_threshold
    min_box_area:     float = 0.001  # ignore tiny detections (noise)
    classes_always_fail: list[str] = field(default_factory=list)
    # e.g. ["crack"] → always fail regardless of confidence

    @classmethod
    def from_dict(cls, d: dict) -> "ThresholdConfig":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

    def classify(self, detections: list[DefectBox]) -> tuple[str, float]:
        """Map detections → (decision, max_confidence)."""
        if not detections:
            return "pass", 0.0

        top = max(detections, key=lambda d: d.confidence)

        # Always-fail classes override
        for d in detections:
            if d.class_name in self.classes_always_fail:
                return "fail", d.confidence

        if top.confidence >= self.review_threshold:
            return "fail", top.confidence
        elif top.confidence >= self.pass_threshold:
            return "review", top.confidence
        else:
            return "pass", top.confidence


# ── Mock backend ──────────────────────────────────────────────────────────────

DEFECT_CLASSES_DEMO = {
    0: "good",
    1: "scratch",
    2: "dent",
    3: "crack",
    4: "inclusion",
    5: "discoloration",
    6: "surface_void",
    7: "edge_chip",
}


class MockInferenceBackend:
    VERSION = "mock-v1.2"
    PASS_WEIGHT   = 0.55
    FAIL_WEIGHT   = 0.30
    REVIEW_WEIGHT = 0.15

    async def infer(self, image_path: str,
                    threshold: ThresholdConfig) -> InferenceResult:
        delay = random.uniform(2.0, 4.0)
        await asyncio.sleep(delay)
        start = time.monotonic()

        outcome = random.choices(
            ["pass", "fail", "review"],
            weights=[self.PASS_WEIGHT, self.FAIL_WEIGHT, self.REVIEW_WEIGHT],
        )[0]

        defects: list[DefectBox] = []
        if outcome != "pass":
            n = random.randint(1, 3)
            for _ in range(n):
                min_conf = 0.65 if outcome == "fail" else 0.45
                max_conf = 0.99 if outcome == "fail" else 0.74
                conf = round(random.uniform(min_conf, max_conf), 4)
                cls_id = random.randint(1, len(DEFECT_CLASSES_DEMO) - 1)
                x1 = random.uniform(0.05, 0.6)
                y1 = random.uniform(0.05, 0.6)
                x2 = min(x1 + random.uniform(0.05, 0.35), 0.99)
                y2 = min(y1 + random.uniform(0.05, 0.35), 0.99)
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
                w  = x2 - x1
                h  = y2 - y1
                defects.append(DefectBox(
                    class_id=cls_id,
                    class_name=DEFECT_CLASSES_DEMO[cls_id],
                    confidence=conf,
                    bbox_xyxy=[round(v * 640, 1) for v in [x1, y1, x2, y2]],
                    bbox_norm=[round(v, 4) for v in [cx, cy, w, h]],
                ))

        decision, confidence = threshold.classify(defects)

        return InferenceResult(
            decision=decision,
            confidence=confidence,
            defects=defects,
            latency_ms=int((time.monotonic() - start) * 1000) + int(delay * 1000),
            model_version=self.VERSION,
            backend="mock",
        )


# ── YOLO (PyTorch) backend ────────────────────────────────────────────────────

class YOLOBackend:
    def __init__(self, model_path: str):
        from ultralytics import YOLO
        self._model = YOLO(model_path)
        self._version = Path(model_path).stem
        self._class_names = self._model.names

    async def infer(self, image_path: str,
                    threshold: ThresholdConfig) -> InferenceResult:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_infer, image_path, threshold)

    def _sync_infer(self, image_path: str,
                     threshold: ThresholdConfig) -> InferenceResult:
        start = time.monotonic()
        results = self._model(image_path, verbose=False)[0]
        latency = int((time.monotonic() - start) * 1000)

        import cv2
        img = cv2.imread(image_path)
        H, W = (img.shape[:2] if img is not None else (640, 640))

        defects: list[DefectBox] = []
        for box in results.boxes:
            conf = float(box.conf[0])
            if conf < threshold.pass_threshold:
                continue
            cls_id  = int(box.cls[0])
            cls_name = self._class_names.get(cls_id, f"class_{cls_id}")
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            # Filter tiny boxes
            area = ((x2 - x1) / W) * ((y2 - y1) / H)
            if area < threshold.min_box_area:
                continue
            defects.append(DefectBox(
                class_id=cls_id, class_name=cls_name,
                confidence=round(conf, 4),
                bbox_xyxy=[round(v, 1) for v in [x1, y1, x2, y2]],
                bbox_norm=[
                    round(((x1 + x2) / 2) / W, 4),
                    round(((y1 + y2) / 2) / H, 4),
                    round((x2 - x1) / W, 4),
                    round((y2 - y1) / H, 4),
                ],
            ))

        decision, confidence = threshold.classify(defects)
        return InferenceResult(
            decision=decision, confidence=confidence, defects=defects,
            latency_ms=latency, model_version=self._version,
            image_size=(W, H), backend="yolo",
        )


# ── ONNX backend (CPU-optimized) ─────────────────────────────────────────────

class ONNXBackend:
    """
    ONNX runtime inference — fastest CPU option.
    ~3-5x faster than PyTorch on CPU for inference.
    """
    def __init__(self, model_path: str, imgsz: int = 640):
        import onnxruntime as ort
        import numpy as np

        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if self._cuda_available()
            else ["CPUExecutionProvider"]
        )
        self._session = ort.InferenceSession(model_path, providers=providers)
        self._input_name = self._session.get_inputs()[0].name
        self._imgsz = imgsz
        self._version = f"onnx-{Path(model_path).stem}"

        # Load class names from companion JSON
        names_file = Path(model_path).with_suffix(".json")
        if names_file.exists():
            self._class_names = json.loads(names_file.read_text())
        else:
            self._class_names = {i: f"class_{i}" for i in range(100)}

    async def infer(self, image_path: str,
                    threshold: ThresholdConfig) -> InferenceResult:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_infer, image_path, threshold)

    def _sync_infer(self, image_path: str,
                     threshold: ThresholdConfig) -> InferenceResult:
        import cv2
        import numpy as np

        start = time.monotonic()
        img = cv2.imread(image_path)
        if img is None:
            return InferenceResult(decision="error", confidence=0.0, backend="onnx")

        H_orig, W_orig = img.shape[:2]
        inp = self._preprocess(img)
        outputs = self._session.run(None, {self._input_name: inp})
        detections = self._postprocess(outputs[0], W_orig, H_orig, threshold)

        decision, confidence = threshold.classify(detections)
        latency = int((time.monotonic() - start) * 1000)

        return InferenceResult(
            decision=decision, confidence=confidence, defects=detections,
            latency_ms=latency, model_version=self._version,
            image_size=(W_orig, H_orig), backend="onnx",
        )

    def _preprocess(self, img) -> "np.ndarray":
        import cv2
        import numpy as np
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img_rgb, (self._imgsz, self._imgsz))
        inp = img_resized.astype(np.float32) / 255.0
        inp = np.transpose(inp, (2, 0, 1))      # HWC → CHW
        inp = np.expand_dims(inp, axis=0)        # add batch dim
        return inp

    def _postprocess(self, output, W: int, H: int,
                      threshold: ThresholdConfig) -> list[DefectBox]:
        """Parse YOLOv8 ONNX output: [1, num_classes+4, num_anchors]"""
        import numpy as np
        predictions = output[0].T  # [num_anchors, 4 + num_classes]
        defects = []
        for pred in predictions:
            cx, cy, w, h = pred[:4]
            class_scores = pred[4:]
            cls_id = int(np.argmax(class_scores))
            conf   = float(class_scores[cls_id])
            if conf < threshold.pass_threshold:
                continue
            # Convert to pixel coords
            x1 = (cx - w / 2) * W
            y1 = (cy - h / 2) * H
            x2 = (cx + w / 2) * W
            y2 = (cy + h / 2) * H
            area_norm = (w / W) * (h / H) if W > 0 and H > 0 else w * h
            if area_norm < threshold.min_box_area:
                continue
            defects.append(DefectBox(
                class_id=cls_id,
                class_name=self._class_names.get(str(cls_id), f"class_{cls_id}"),
                confidence=round(conf, 4),
                bbox_xyxy=[round(v, 1) for v in [x1, y1, x2, y2]],
                bbox_norm=[round(cx, 4), round(cy, 4), round(w, 4), round(h, 4)],
            ))
        return defects

    @staticmethod
    def _cuda_available() -> bool:
        try:
            import onnxruntime as ort
            return "CUDAExecutionProvider" in ort.get_available_providers()
        except Exception:
            return False


# ── Factory function ──────────────────────────────────────────────────────────

_BACKENDS: dict[str, object] = {}


def get_inference_backend(mode: str, model_path: str) -> object:
    """Singleton per backend type."""
    if mode not in _BACKENDS:
        if mode == "mock":
            _BACKENDS[mode] = MockInferenceBackend()
        elif mode == "yolo":
            _BACKENDS[mode] = YOLOBackend(model_path)
        elif mode == "onnx":
            _BACKENDS[mode] = ONNXBackend(model_path)
        else:
            raise ValueError(f"Unknown inference mode: {mode}")
    return _BACKENDS[mode]


async def run_inference(
    image_path: str,
    mode: str = "mock",
    model_path: str = "models/best.onnx",
    threshold_config: Optional[dict] = None,
) -> InferenceResult:
    """High-level inference entry point."""
    threshold = ThresholdConfig.from_dict(threshold_config or {})
    backend = get_inference_backend(mode, model_path)
    return await backend.infer(image_path, threshold)
