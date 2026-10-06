from app.core.model_security import artifact_sha256, canonical_model_manifest, sign_model_manifest, verify_model_manifest


def test_model_artifact_hash_and_signature_are_deterministic():
    data = b"kanbai-model-artifact"
    digest = artifact_sha256(data)
    manifest = canonical_model_manifest(factory_id="factory-a", model_name="inspection", version="1.0.0", artifact_sha256=digest)
    signature = sign_model_manifest(manifest, b"test-secret")
    assert len(digest) == 64
    assert verify_model_manifest(manifest, signature, b"test-secret")
    assert not verify_model_manifest(manifest, signature, b"wrong-secret")


def test_manifest_binds_factory_and_artifact():
    digest = artifact_sha256(b"model-a")
    a = canonical_model_manifest(factory_id="factory-a", model_name="inspection", version="1.0", artifact_sha256=digest)
    b = canonical_model_manifest(factory_id="factory-b", model_name="inspection", version="1.0", artifact_sha256=digest)
    assert a != b
