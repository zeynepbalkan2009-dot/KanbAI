"""Security primitives for factory Edge agents.

The raw device credential is never persisted. Only a SHA-256 digest is stored.
The token is deliberately scoped to one device and is accepted only over the
explicit Edge API surface.
"""

import hashlib
import hmac
import secrets


def issue_device_token() -> tuple[str, str]:
    raw = "kbdev_" + secrets.token_urlsafe(32)
    return raw, hash_device_token(raw)


def hash_device_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_device_token(token: str, expected_hash: str | None) -> bool:
    if not token or not expected_hash:
        return False
    actual = hash_device_token(token)
    return hmac.compare_digest(actual, expected_hash)


def sha256_json(payload: object) -> str:
    import json
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()
