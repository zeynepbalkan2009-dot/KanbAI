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


def test_signed_model_requirement_fails_closed_without_secret():
    import pytest
    from app.core.model_security import require_signed_model
    with pytest.raises(ValueError, match="not configured"):
        require_signed_model(b"manifest", "sig", "", required=True)


def test_model_validation_gate_rejects_weak_candidate():
    import pytest
    from app.core.model_security import validate_model_metrics
    with pytest.raises(ValueError, match="validation gate failed"):
        validate_model_metrics(map50=0.79, precision=0.95, recall=0.95, min_map50=0.80, min_precision=0.80, min_recall=0.80)


def test_model_validation_gate_accepts_candidate():
    from app.core.model_security import validate_model_metrics
    validate_model_metrics(map50=0.91, precision=0.89, recall=0.87, min_map50=0.80, min_precision=0.80, min_recall=0.80)


def test_signature_rejects_changed_artifact_hash_or_model_version():
    digest = artifact_sha256(b"trusted-artifact")
    manifest = canonical_model_manifest(
        factory_id="factory-a",
        model_name="inspection",
        version="1.0.0",
        artifact_sha256=digest,
    )
    signature = sign_model_manifest(manifest, b"test-secret")

    changed_hash = canonical_model_manifest(
        factory_id="factory-a",
        model_name="inspection",
        version="1.0.0",
        artifact_sha256=artifact_sha256(b"tampered-artifact"),
    )
    changed_version = canonical_model_manifest(
        factory_id="factory-a",
        model_name="inspection",
        version="1.0.1",
        artifact_sha256=digest,
    )

    assert not verify_model_manifest(changed_hash, signature, b"test-secret")
    assert not verify_model_manifest(changed_version, signature, b"test-secret")


def test_required_signature_rejects_missing_and_invalid_signatures():
    import pytest
    from app.core.model_security import require_signed_model

    manifest = canonical_model_manifest(
        factory_id="factory-a",
        model_name="inspection",
        version="1.0.0",
        artifact_sha256=artifact_sha256(b"artifact"),
    )
    with pytest.raises(ValueError, match="artifact is required"):
        require_signed_model(manifest, None, "test-secret", required=True)
    with pytest.raises(ValueError, match="signature verification failed"):
        require_signed_model(manifest, "invalid-signature", "test-secret", required=True)


def test_signature_rejects_cross_factory_and_model_name_replay():
    digest = artifact_sha256(b"factory-private-artifact")
    manifest = canonical_model_manifest(
        factory_id="factory-a",
        model_name="inspection-a",
        version="2.0.0",
        artifact_sha256=digest,
    )
    signature = sign_model_manifest(manifest, b"test-secret")

    other_factory = canonical_model_manifest(
        factory_id="factory-b",
        model_name="inspection-a",
        version="2.0.0",
        artifact_sha256=digest,
    )
    other_name = canonical_model_manifest(
        factory_id="factory-a",
        model_name="inspection-b",
        version="2.0.0",
        artifact_sha256=digest,
    )

    assert not verify_model_manifest(other_factory, signature, b"test-secret")
    assert not verify_model_manifest(other_name, signature, b"test-secret")
