"""In-memory application state with thread-safe containers."""

from collections import deque
from threading import Lock
from typing import Any

from app.models.event import PodEvent
from app.models.metric import MetricSnapshot


class AppState:
    """Thread-safe in-memory store for events and metrics history."""

    def __init__(self, max_events: int = 100, max_metrics: int = 10):
        self._event_log: deque[PodEvent] = deque(maxlen=max_events)
        self._metrics_history: list[MetricSnapshot] = []
        self._max_metrics = max_metrics
        self._lock = Lock()

    # --- Events ---

    def add_event(self, event: PodEvent) -> None:
        """Append an event to the front of the log."""
        with self._lock:
            self._event_log.appendleft(event)

    def get_events(self) -> list[PodEvent]:
        """Return all events as a list (newest first)."""
        with self._lock:
            return list(self._event_log)

    # --- Metrics ---

    def add_metric_snapshot(self, snapshot: MetricSnapshot) -> None:
        """Append a metrics snapshot, trimming to max_metrics."""
        with self._lock:
            self._metrics_history.append(snapshot)
            if len(self._metrics_history) > self._max_metrics:
                self._metrics_history.pop(0)

    def get_metrics_history(self) -> list[MetricSnapshot]:
        """Return all metrics snapshots (oldest first)."""
        with self._lock:
            return list(self._metrics_history)

    def clear(self) -> None:
        """Clear all stored data."""
        with self._lock:
            self._event_log.clear()
            self._metrics_history.clear()


# Global singleton instance
app_state = AppState()