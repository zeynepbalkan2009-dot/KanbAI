import asyncio

from app.edge.outbox import EdgeOutbox, SyncResult


def test_enqueue_is_idempotent(tmp_path):
    outbox = EdgeOutbox(tmp_path / "edge.db")
    event_id = outbox.enqueue("inspection.completed", {"decision": "REVIEW"}, event_id="evt-1")
    assert event_id == "evt-1"
    assert outbox.enqueue("inspection.completed", {"decision": "PASS"}, event_id="evt-1") == "evt-1"
    pending = outbox.pending()
    assert len(pending) == 1
    assert pending[0].payload == {"decision": "REVIEW"}


def test_failed_events_use_bounded_exponential_backoff(tmp_path):
    outbox = EdgeOutbox(tmp_path / "edge.db", base_backoff_seconds=2, max_backoff_seconds=5, max_attempts=3)
    outbox.enqueue("inspection.completed", {}, event_id="evt-1")
    outbox.mark_failed(["evt-1"], "network down", now=100)
    assert outbox.pending(now=101) == []
    assert outbox.pending(now=102)[0].attempts == 1
    outbox.mark_failed(["evt-1"], "network down", now=102)
    assert outbox.pending(now=105)[0].attempts == 2


def test_flush_reconciles_accepted_and_duplicate_ids(tmp_path):
    outbox = EdgeOutbox(tmp_path / "edge.db")
    outbox.enqueue("a", {}, event_id="evt-1")
    outbox.enqueue("b", {}, event_id="evt-2")

    async def sender(events):
        assert [event.event_id for event in events] == ["evt-1", "evt-2"]
        return SyncResult(accepted=("evt-1",), duplicates=("evt-2",))

    asyncio.run(outbox.flush(sender))
    assert outbox.counts() == {"sent": 2}


def test_flush_retries_when_network_is_unavailable(tmp_path):
    outbox = EdgeOutbox(tmp_path / "edge.db", base_backoff_seconds=2)
    outbox.enqueue("inspection.completed", {}, event_id="evt-1")

    async def sender(events):
        raise ConnectionError("offline")

    result = asyncio.run(outbox.flush(sender))
    assert result == SyncResult(accepted=(), duplicates=())
    assert outbox.counts() == {"pending": 1}
    assert outbox.pending(now=1_000_000) == []
