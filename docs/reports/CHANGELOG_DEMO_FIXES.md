# Demo Readiness Fixes

This package was prepared from `kanbai.zip` for public investor demo readiness.

## Fixed

- Replaced invalid PostgreSQL UUID seed values in `scripts/init_db.sql`.
- Replaced demo password hashes so documented demo credentials work.
- Removed Django Celery Beat scheduler usage from `docker-compose.yml`.
- Registered retraining tasks and periodic schedule in `backend/app/workers/celery_app.py`.
- Registered v2 inference task factory in Celery boot.
- Mounted root `mlops/` directory into backend/worker containers as `/app/mlops`.
- Fixed SQLAlchemy reserved `metadata` attribute conflicts by mapping the DB column as `metadata_json`.
- Fixed parameterized PostgreSQL interval expression in `/api/v1/mlops/demo/seed`.
- Added README, demo guide, and GitHub upload guide.

## Remaining demo assumptions

- Default inference is mock mode.
- Real YOLO model training requires actual dataset/model files.
- Docker must be running locally.
- For a clean DB seed, run on a fresh volume or reset with `docker compose down -v`.
