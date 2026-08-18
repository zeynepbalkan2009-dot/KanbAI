"""Create the first factory tenant and admin account for a fresh pilot database.

Run this only after Alembic migrations. It refuses to reuse an existing factory
slug or email so it cannot silently alter an existing tenant.
"""
import argparse
import asyncio
import getpass
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.infrastructure.database.models import Factory, User
from app.infrastructure.database.session import AsyncSessionLocal, engine


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--factory-name", required=True)
    parser.add_argument("--factory-slug", required=True)
    parser.add_argument("--admin-email", required=True)
    parser.add_argument("--admin-name", required=True)
    parser.add_argument("--location", default=None)
    parser.add_argument("--timezone", default="Europe/Istanbul")
    parser.add_argument("--password", help="Use only in controlled non-interactive setup.")
    args = parser.parse_args()
    if not args.password:
        args.password = getpass.getpass("Pilot admin password: ")
    if len(args.password) < 12:
        parser.error("Pilot admin password must be at least 12 characters.")
    return args


async def create_pilot_admin(args: argparse.Namespace) -> None:
    async with AsyncSessionLocal() as session:
        existing_factory = await session.scalar(select(Factory).where(Factory.slug == args.factory_slug))
        if existing_factory:
            raise RuntimeError(f"Factory slug already exists: {args.factory_slug}")

        existing_email = await session.scalar(select(User).where(User.email == args.admin_email))
        if existing_email:
            raise RuntimeError(f"Admin email already exists: {args.admin_email}")

        factory = Factory(
            name=args.factory_name,
            slug=args.factory_slug,
            location=args.location,
            timezone=args.timezone,
            is_active=True,
        )
        session.add(factory)
        await session.flush()
        session.add(User(
            factory_id=factory.id,
            email=args.admin_email,
            password_hash=hash_password(args.password),
            full_name=args.admin_name,
            role="admin",
            is_active=True,
        ))
        await session.commit()

    print(f"Created pilot factory '{args.factory_slug}' and admin '{args.admin_email}'.")


async def main() -> None:
    args = parse_args()
    try:
        await create_pilot_admin(args)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"Pilot bootstrap failed: {exc}", file=sys.stderr)
        sys.exit(1)
