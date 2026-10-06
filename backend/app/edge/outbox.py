"""Durable local outbox for offline-first Edge -> Cloud synchronization.

The outbox deliberately has no network dependency. The Edge runtime can enqueue
inspection/quality events while disconnected and flush them once connectivity
returns. Production model changes remain outside this component.
"""

from __future__ import annotations

import asyncio
import json
import os
import sqlite3
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, Iterable


@dataclass(frozen=True)
class OutboxEvent:
    event_id: str
    event_type: str
    payload: dict
    attempts: int
    next_attempt_at: float


@dataclass(frozen=True)
class SyncResult:
    accepted: tuple[str, ...]
    duplicates: tuple[str, ...]


SendBatch = Callable[[list[OutboxEvent]], Awaitable[SyncResult]]


class EdgeOutbox:
    """SQLite-backed durable queue with idempotent event IDs and bounded retry."""

    def __init__(
        self,
        path: str | os.PathLike[str],
        *,
        max_attempts: int = 12,
        base_backoff_seconds: float = 2.0,
        max_backoff_seconds: float = 300.0,
    ) -> None:
        if max_attempts < 1:
            raise ValueError("max_attempts must be >= 1")
        if base_backoff_seconds <= 0 or max_backoff_seconds < base_backoff_seconds:
            raise ValueError("invalid backoff configuration")
        self.path = Path(path)
        self.max_attempts = max_attempts
        self.base_backoff_seconds = base_backoff_seconds
        self.max_backoff_seconds = max_backoff_seconds
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=FULL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.touch(exist_ok=True)
        try:
            os.chmod(self.path, 0o600)
        except OSError:
            # Windows/managed volumes may not expose POSIX permissions.
            pass
        with self._connect() as conn:
            conn.execute(
                """CREATE TABLE IF NOT EXISTS edge_outbox (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    next_attempt_at REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    last_error TEXT,
                    created_at REAL NOT NULL,
                    sent_at REAL
                )"""
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS ix_edge_outbox_due "
                "ON edge_outbox(status, next_attempt_at)"
            )

    def enqueue(self, event_type: str, payload: dict, *, event_id: str | None = None) -> str:
        event_id = event_id or f"edge_{uuid.uuid4().hex}"
        payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
        now = time.time()
        with self._connect() as conn:
            conn.execute(
                """INSERT OR IGNORE INTO edge_outbox
                   (event_id, event_type, payload_json, next_attempt_at, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (event_id, event_type, payload_json, now, now),
            )
        return event_id

    def pending(self, *, limit: int = 100, now: float | None = None) -> list[OutboxEvent]:
        if limit < 1:
            return []
        now = time.time() if now is None else now
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT event_id, event_type, payload_json, attempts, next_attempt_at
                   FROM edge_outbox
                   WHERE status = 'pending' AND next_attempt_at <= ?
                   ORDER BY created_at ASC LIMIT ?""",
                (now, limit),
            ).fetchall()
        return [
            OutboxEvent(
                event_id=row["event_id"],
                event_type=row["event_type"],
                payload=json.loads(row["payload_json"]),
                attempts=row["attempts"],
                next_attempt_at=row["next_attempt_at"],
            )
            for row in rows
        ]

    def mark_accepted(self, event_ids: Iterable[str]) -> None:
        ids = tuple(set(event_ids))
        if not ids:
            return
        now = time.time()
        with self._connect() as conn:
            conn.executemany(
                "UPDATE edge_outbox SET status='sent', sent_at=? WHERE event_id=? AND status='pending'",
                [(now, event_id) for event_id in ids],
            )

    def mark_failed(self, event_ids: Iterable[str], error: str, *, now: float | None = None) -> None:
        ids = tuple(set(event_ids))
        if not ids:
            return
        now = time.time() if now is None else now
        with self._connect() as conn:
            for event_id in ids:
                row = conn.execute(
                    "SELECT attempts FROM edge_outbox WHERE event_id=? AND status='pending'",
                    (event_id,),
                ).fetchone()
                if not row:
                    continue
                attempts = int(row["attempts"]) + 1
                if attempts >= self.max_attempts:
                    conn.execute(
                        "UPDATE edge_outbox SET attempts=?, status='dead', last_error=? WHERE event_id=?",
                        (attempts, error[:1000], event_id),
                    )
                    continue
                delay = min(self.max_backoff_seconds, self.base_backoff_seconds * (2 ** (attempts - 1)))
                conn.execute(
                    """UPDATE edge_outbox
                       SET attempts=?, next_attempt_at=?, last_error=?
                       WHERE event_id=?""",
                    (attempts, now + delay, error[:1000], event_id),
                )

    async def flush(self, send_batch: SendBatch, *, batch_size: int = 100) -> SyncResult:
        """Send due events and reconcile only server-confirmed IDs."""
        events = self.pending(limit=batch_size)
        if not events:
            return SyncResult(accepted=(), duplicates=())
        try:
            result = await send_batch(events)
        except Exception as exc:
            self.mark_failed((event.event_id for event in events), str(exc))
            return SyncResult(accepted=(), duplicates=())

        confirmed = set(result.accepted) | set(result.duplicates)
        self.mark_accepted(confirmed)
        unknown = {event.event_id for event in events} - confirmed
        if unknown:
            self.mark_failed(unknown, "server response omitted event")
        return result

    def counts(self) -> dict[str, int]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT status, COUNT(*) AS count FROM edge_outbox GROUP BY status"
            ).fetchall()
        return {row["status"]: int(row["count"]) for row in rows}


async def retry_loop(outbox: EdgeOutbox, send_batch: SendBatch, *, interval_seconds: float = 2.0) -> None:
    """Long-running Edge reconciliation loop; cancellation is the shutdown mechanism."""
    while True:
        await outbox.flush(send_batch)
        await asyncio.sleep(interval_seconds)
