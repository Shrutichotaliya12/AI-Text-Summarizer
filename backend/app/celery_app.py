from celery import Celery
from app.infrastructure.config import settings

celery_worker = Celery(
    "summarizer_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_worker.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600, # 1 hour max for long docs
)

# Autodiscover tasks from adapters/queue layer
celery_worker.autodiscover_tasks(["app.adapters.queue"])
