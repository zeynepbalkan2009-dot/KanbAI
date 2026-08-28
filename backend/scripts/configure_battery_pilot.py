"""Idempotently configure one existing product and line for battery pilot collection.

This creates no inspections, labels, users, or battery units. It only applies a
safe product profile and the six canonical traceability stations.
"""

import argparse
import asyncio
import sys

from sqlalchemy import select

from app.infrastructure.database.models import Factory, Product, ProductionLine, Station
from app.infrastructure.database.session import AsyncSessionLocal, engine


STATIONS = (
    (1, "BAT-CELL-QC", "Cell Preparation & Incoming QC", "incoming_visual_qc"),
    (2, "BAT-MODULE", "Module Assembly", "assembly_visual_qc"),
    (3, "BAT-WELD", "Welding & Busbar Integration", "weld_visual_qc"),
    (4, "BAT-BMS", "BMS & Harness Connection", "bms_visual_qc"),
    (5, "BAT-SEAL", "Packaging & Sealing", "sealing_visual_qc"),
    (6, "BAT-EOL", "EOL & Final QC", "eol_test"),
)

DEFECT_CLASSES = [
    "wrong_cell_type",
    "barcode_mismatch",
    "missing_cell",
    "reversed_polarity",
    "isolation_plate_missing",
    "assembly_misalignment",
    "weld_anomaly",
    "busbar_misalignment",
    "connector_not_seated",
    "harness_misroute",
    "insulation_damage",
    "gasket_damage",
    "foreign_object",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--factory-slug", required=True)
    parser.add_argument("--product-sku", required=True)
    parser.add_argument("--line-code", required=True)
    return parser.parse_args()


async def configure(args: argparse.Namespace) -> None:
    async with AsyncSessionLocal() as session:
        factory = await session.scalar(select(Factory).where(Factory.slug == args.factory_slug))
        if not factory:
            raise RuntimeError(f"Factory not found: {args.factory_slug}")
        product = await session.scalar(select(Product).where(
            Product.factory_id == factory.id,
            Product.sku == args.product_sku,
            Product.deleted_at.is_(None),
        ))
        if not product:
            raise RuntimeError(f"Product not found in factory: {args.product_sku}")
        line = await session.scalar(select(ProductionLine).where(
            ProductionLine.factory_id == factory.id,
            ProductionLine.code == args.line_code,
            ProductionLine.deleted_at.is_(None),
        ))
        if not line:
            raise RuntimeError(f"Production line not found in factory: {args.line_code}")

        policy = dict(product.defect_policy or {})
        policy.update({
            "industry_domain": "battery_assembly",
            "operation_stage": "battery_traceability_workflow",
            "inspection_mode": "data_collection",
            "capture_mode": "fixed_station",
            "capture_strategy": "manual",
            "native_camera_required": False,
            "alignment_overlay_required": True,
            "defect_classes": DEFECT_CLASSES,
            "human_review_required": True,
            "quality_decision_enabled": False,
            "automatic_pass": False,
        })
        product.defect_policy = policy

        created = 0
        updated = 0
        for step_id, code, name, station_type in STATIONS:
            station = await session.scalar(select(Station).where(
                Station.factory_id == factory.id,
                Station.code == code,
                Station.deleted_at.is_(None),
            ))
            metadata = {
                "workflow": "battery_assembly_v1",
                "workflow_step": step_id,
                "automatic_quality_decision": False,
            }
            if station:
                station.name = name
                station.production_line_id = line.id
                station.station_type = station_type
                station.status = "active"
                station.metadata_json = metadata
                updated += 1
            else:
                session.add(Station(
                    factory_id=factory.id,
                    production_line_id=line.id,
                    name=name,
                    code=code,
                    station_type=station_type,
                    status="active",
                    metadata_json=metadata,
                ))
                created += 1
        await session.commit()
        print(
            f"Configured battery pilot product={product.sku} line={line.code}; "
            f"stations_created={created} stations_updated={updated}."
        )


async def main() -> None:
    args = parse_args()
    try:
        await configure(args)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"Battery pilot configuration failed: {exc}", file=sys.stderr)
        sys.exit(1)
