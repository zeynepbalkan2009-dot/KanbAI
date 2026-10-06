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


def artifact_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sign_model_manifest(manifest: bytes, signing_secret: bytes) -> str:
    """Pilot-grade HMAC signing; production can replace this with KMS/Ed25519."""
    signature = hmac.new(signing_secret, manifest, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")


def verify_model_manifest(manifest: bytes, signature: str, signing_secret: bytes) -> bool:
    expected = sign_model_manifest(manifest, signing_secret)
    return hmac.compare_digest(expected, signature)
