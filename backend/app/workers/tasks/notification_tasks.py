"""
Notification tasks — general queue.
Extend with email/SMS/Slack integrations as needed.
"""
from celery.utils.log import get_task_logger
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(
    name="app.workers.tasks.notification_tasks.send_alert",
    queue="notifications",
    max_retries=3,
)
def send_alert(tenant_id: str, alert_type: str, payload: dict) -> dict:
    """
    Placeholder for notification dispatch.
    alert_type: "defect_rate_high" | "device_offline" | "model_drift"
    """
    logger.info(f"[alert] tenant={tenant_id} type={alert_type} payload={payload}")
    # TODO: Integrate SMTP / Slack / PagerDuty
    return {"sent": True, "alert_type": alert_type}


@celery_app.task(
    name="app.workers.tasks.notification_tasks.cleanup_old_images",
    queue="default",
)
def cleanup_old_images(days_old: int = 90) -> dict:
    """Periodic: remove MinIO objects older than N days (GDPR / storage quota)."""
    logger.info(f"[cleanup] removing images older than {days_old} days")
    # TODO: implement MinIO lifecycle policy sync
    return {"status": "ok", "days_old": days_old}
