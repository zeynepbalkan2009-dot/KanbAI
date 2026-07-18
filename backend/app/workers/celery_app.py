from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "qc_platform",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.tasks.inference_tasks",
        "app.workers.tasks.inference_tasks_v2",
        "app.workers.tasks.notification_tasks",
        "app.workers.tasks.retrain_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_soft_time_limit=120,
    task_time_limit=180,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.tasks.inference_tasks.*": {"queue": "inference"},
        "app.workers.tasks.inference_tasks_v2.*": {"queue": "inference"},
        "app.workers.tasks.retrain_tasks.*": {"queue": "default"},
        "app.workers.tasks.notification_tasks.*": {"queue": "notifications"},
        "*": {"queue": "default"},
    },
    task_queues={
        "inference": {"exchange": "inference", "routing_key": "inference"},
        "notifications": {"exchange": "notifications", "routing_key": "notifications"},
        "default": {"exchange": "default", "routing_key": "default"},
    },
)


# Register MLOps retraining tasks and periodic schedule.
try:
    from app.workers.tasks.retrain_tasks import register_retraining_tasks
    register_retraining_tasks(celery_app)
except Exception as exc:  # keep API/worker boot resilient in demo mode
    import logging
    logging.getLogger(__name__).warning("Could not register retraining tasks: %s", exc)

# Register v2 production inference task if available.
try:
    from app.workers.tasks.inference_tasks_v2 import make_inference_task
    make_inference_task(celery_app)
except Exception as exc:
    import logging
    logging.getLogger(__name__).warning("Could not register inference v2 task: %s", exc)
