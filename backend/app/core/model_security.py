"""Model artifact integrity and signature verification primitives."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any


def canonical_model_manifest(*, factory_id: str, model_name: str, version: str, artifact_sha256: str) -> bytes:
    payload = {
        "artifact_sha256": artifact_sha256.lower(),
        "factory_id": factory_id,
        "model_name": model_name,
        "version": version,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def signed_model_policy_required(*, edge_required: bool, pilot_mode: bool, production: bool) -> bool:
    """Require trusted model signatures whenever edge policy, pilot, or production demands it."""
    return edge_required or pilot_mode or production


def artifact_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sign_model_manifest(manifest: bytes, signing_secret: bytes) -> str:
    """Pilot-grade HMAC signing; production can replace this with KMS/Ed25519."""
    signature = hmac.new(signing_secret, manifest, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")


def verify_model_manifest(manifest: bytes, signature: str, signing_secret: bytes) -> bool:
    expected = sign_model_manifest(manifest, signing_secret)
    return hmac.compare_digest(expected, signature)


def require_signed_model(
    manifest: bytes,
    signature: str | None,
    signing_secret: str,
    *,
    required: bool = True,
) -> None:
    """Fail closed when signed deployment is required but trust material is unavailable."""
    if not required:
        return
    if not signing_secret:
        raise ValueError("Model signing secret is not configured")
    if not signature:
        raise ValueError("Signed model artifact is required")
    if not verify_model_manifest(manifest, signature, signing_secret.encode("utf-8")):
        raise ValueError("Model artifact signature verification failed")


def validate_model_metrics(
    *,
    map50: float | None,
    precision: float | None,
    recall: float | None,
    min_map50: float,
    min_precision: float,
    min_recall: float,
) -> None:
    """Quality gate for candidate models before production deployment."""
    missing = [
        name
        for name, value in (("mAP50", map50), ("precision", precision), ("recall", recall))
        if value is None
    ]
    if missing:
        raise ValueError(f"Model validation metrics missing: {', '.join(missing)}")
    checks = (
        ("mAP50", map50, min_map50),
        ("precision", precision, min_precision),
        ("recall", recall, min_recall),
    )
    failures = [f"{name}={value:.4f} < {threshold:.4f}" for name, value, threshold in checks if value < threshold]
    if failures:
        raise ValueError("Model validation gate failed: " + "; ".join(failures))
