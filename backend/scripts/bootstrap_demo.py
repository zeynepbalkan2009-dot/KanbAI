"""Seed the disposable demo tenant after migrations in a public demo environment."""
import asyncio
import sys

from app.core.config import get_settings
from app.infrastructure.database.session import engine
from app.main import seed_demo_data


async def main() -> None:
    settings = get_settings()
    if not settings.demo_mode or settings.pilot_mode:
        raise RuntimeError("Demo bootstrap requires DEMO_MODE=true and PILOT_MODE=false.")

    async with engine.begin() as conn:
        await seed_demo_data(conn)
    print("Demo tenant, users, device, and mock model are ready.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"Demo bootstrap failed: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        asyncio.run(engine.dispose())
