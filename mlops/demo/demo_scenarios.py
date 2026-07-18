"""
Demo Scenario Engine
=====================
Generates realistic demo data for:
  1. Metal Factory (MVTec metal_nut inspiration)
  2. CNC Machining Factory (screw/precision parts)
  3. Plastic Injection Factory

Each scenario has:
  - Factory profile
  - Defect class distribution
  - Realistic KPI targets
  - Live WebSocket event stream
  - Confidence score distributions

Usage:
    python demo_scenarios.py --scenario metal --run-live
    python demo_scenarios.py --scenario all --seed-db
"""

import asyncio
import json
import random
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from typing import Optional


# ── Factory profiles ──────────────────────────────────────────────────────────

@dataclass
class DemoFactory:
    id: str
    name: str
    slug: str
    location: str
    product_type: str
    defect_classes: list[dict]
    target_pass_rate: float        # e.g. 0.95
    inspection_rate_per_hour: int  # e.g. 120
    confidence_profile: dict       # pass/fail/review confidence distributions
    demo_narrative: str


METAL_FACTORY = DemoFactory(
    id="f0000000-0000-0000-0000-000000000011",
    name="Çelik Parça Fabrikası A",
    slug="celik-fabrika-a",
    location="Adana, TR",
    product_type="Çelik Bağlantı Parçaları",
    defect_classes=[
        {"id": 1, "name": "scratch",        "label": "Çizik",         "color": "#ef4444", "weight": 0.35},
        {"id": 2, "name": "dent",           "label": "Ezik",          "color": "#f97316", "weight": 0.25},
        {"id": 3, "name": "surface_void",   "label": "Yüzey Boşluğu", "color": "#eab308", "weight": 0.20},
        {"id": 4, "name": "edge_chip",      "label": "Kenar Kırığı",  "color": "#8b5cf6", "weight": 0.15},
        {"id": 5, "name": "discoloration",  "label": "Renk Hatası",   "color": "#06b6d4", "weight": 0.05},
    ],
    target_pass_rate=0.94,
    inspection_rate_per_hour=180,
    confidence_profile={
        "pass":   {"min": 0.76, "max": 0.99, "weight": 0.94},
        "review": {"min": 0.50, "max": 0.74, "weight": 0.03},
        "fail":   {"min": 0.65, "max": 0.98, "weight": 0.03},
    },
    demo_narrative=(
        "Saatte 180 parça işleyen bu hat, geleneksel yöntemle "
        "%12 gözden kaçan hatayla çalışıyordu. AI sistemiyle "
        "bu oran %0.8'e düştü."
    ),
)

CNC_FACTORY = DemoFactory(
    id="f0000000-0000-0000-0000-000000000012",
    name="CNC İşleme Tesisi B",
    slug="cnc-fabrika-b",
    location="Bursa, TR",
    product_type="Hassas CNC İşlenmiş Parçalar",
    defect_classes=[
        {"id": 1,  "name": "scratch_head",      "label": "Kafa Çizik",      "color": "#ef4444", "weight": 0.30},
        {"id": 2,  "name": "scratch_neck",      "label": "Boyun Çizik",     "color": "#f97316", "weight": 0.25},
        {"id": 3,  "name": "thread_damage",     "label": "Diş Hasarı",      "color": "#eab308", "weight": 0.25},
        {"id": 4,  "name": "bent",              "label": "Eğilme",          "color": "#8b5cf6", "weight": 0.15},
        {"id": 5,  "name": "foreign_object",    "label": "Yabancı Cisim",   "color": "#dc2626", "weight": 0.05},
    ],
    target_pass_rate=0.97,   # CNC = high precision
    inspection_rate_per_hour=240,
    confidence_profile={
        "pass":   {"min": 0.80, "max": 0.99, "weight": 0.97},
        "review": {"min": 0.51, "max": 0.74, "weight": 0.02},
        "fail":   {"min": 0.70, "max": 0.99, "weight": 0.01},
    },
    demo_narrative=(
        "CNC hassas parçalarda 0.01mm tolerans kritik. "
        "AI sistemi diş hasarını %98.5 doğrulukla tespit ediyor."
    ),
)

PLASTIC_FACTORY = DemoFactory(
    id="f0000000-0000-0000-0000-000000000013",
    name="Plastik Enjeksiyon Fabrikası C",
    slug="plastik-fabrika-c",
    location="İzmir, TR",
    product_type="Plastik Enjeksiyon Kalıp Parçaları",
    defect_classes=[
        {"id": 1, "name": "sink_mark",      "label": "Çökme İzi",       "color": "#ef4444", "weight": 0.30},
        {"id": 2, "name": "flash",          "label": "Çapak",           "color": "#f97316", "weight": 0.28},
        {"id": 3, "name": "weld_line",      "label": "Kaynak Çizgisi",  "color": "#eab308", "weight": 0.20},
        {"id": 4, "name": "short_shot",     "label": "Eksik Dolum",     "color": "#8b5cf6", "weight": 0.12},
        {"id": 5, "name": "burn_mark",      "label": "Yanık İzi",       "color": "#dc2626", "weight": 0.10},
    ],
    target_pass_rate=0.91,   # Plastic = more variation
    inspection_rate_per_hour=320,
    confidence_profile={
        "pass":   {"min": 0.75, "max": 0.99, "weight": 0.91},
        "review": {"min": 0.50, "max": 0.74, "weight": 0.05},
        "fail":   {"min": 0.62, "max": 0.97, "weight": 0.04},
    },
    demo_narrative=(
        "Plastik enjeksiyonda üretim hızı yüksek, "
        "geleneksel QC'de %15 kaçan hata mevcut. "
        "AI sistemi saatte 320 parçayı işliyor."
    ),
)

ALL_FACTORIES = {
    "metal":   METAL_FACTORY,
    "cnc":     CNC_FACTORY,
    "plastic": PLASTIC_FACTORY,
}


# ── Inspection event generator ────────────────────────────────────────────────

class DemoEventGenerator:
    def __init__(self, factory: DemoFactory, seed: int = 42):
        self.factory = factory
        random.seed(seed)

    def generate_inspection_event(self, inspection_id: Optional[str] = None) -> dict:
        """Generate one realistic inspection result."""
        import uuid

        profile = self.factory.confidence_profile
        outcomes = list(profile.keys())
        weights  = [profile[o]["weight"] for o in outcomes]
        decision = random.choices(outcomes, weights=weights)[0]

        conf_range = profile[decision]
        confidence = round(random.uniform(conf_range["min"], conf_range["max"]), 4)

        defects = []
        if decision != "pass":
            # Pick 1-3 defect classes weighted
            n = random.randint(1, 3) if decision == "fail" else 1
            for _ in range(n):
                cls = random.choices(
                    self.factory.defect_classes,
                    weights=[d["weight"] for d in self.factory.defect_classes],
                )[0]
                x1 = random.uniform(0.05, 0.55)
                y1 = random.uniform(0.05, 0.55)
                x2 = min(x1 + random.uniform(0.08, 0.35), 0.95)
                y2 = min(y1 + random.uniform(0.08, 0.35), 0.95)
                defects.append({
                    "class_id":   cls["id"],
                    "class_name": cls["name"],
                    "label":      cls["label"],
                    "confidence": round(random.uniform(
                        conf_range["min"], confidence
                    ), 4),
                    "color":      cls["color"],
                    "bbox_norm":  [
                        round((x1+x2)/2, 4), round((y1+y2)/2, 4),
                        round(x2-x1, 4),     round(y2-y1, 4),
                    ],
                })

        latency = random.randint(180, 3800) if decision == "pass" else random.randint(2100, 4200)

        return {
            "type":          "inspection.completed",
            "inspection_id": inspection_id or str(uuid.uuid4()),
            "factory_id":    self.factory.id,
            "factory_name":  self.factory.name,
            "decision":      decision,
            "confidence":    confidence,
            "defects":       defects,
            "defect_count":  len(defects),
            "latency_ms":    latency,
            "model_version": "mock-v1.2",
            "product_type":  self.factory.product_type,
            "timestamp":     datetime.now(timezone.utc).isoformat(),
        }

    def generate_dashboard_snapshot(self, total: int = 500) -> dict:
        """Realistic dashboard KPI snapshot for demo seeding."""
        events = [self.generate_inspection_event() for _ in range(total)]

        pass_count   = sum(1 for e in events if e["decision"] == "pass")
        fail_count   = sum(1 for e in events if e["decision"] == "fail")
        review_count = sum(1 for e in events if e["decision"] == "review")
        pass_rate    = pass_count / total

        all_confs = [e["confidence"] for e in events if e["decision"] != "pass"]
        avg_conf  = round(sum(all_confs) / len(all_confs), 4) if all_confs else 0.0

        defect_freq: dict[str, int] = {}
        for e in events:
            for d in e["defects"]:
                defect_freq[d["class_name"]] = defect_freq.get(d["class_name"], 0) + 1

        avg_latency = round(sum(e["latency_ms"] for e in events) / total)

        return {
            "factory":       self.factory.name,
            "product_type":  self.factory.product_type,
            "period":        "last_24h",
            "total":         total,
            "pass_count":    pass_count,
            "fail_count":    fail_count,
            "review_count":  review_count,
            "pass_rate":     round(pass_rate, 4),
            "fail_rate":     round(fail_count / total, 4),
            "avg_confidence": avg_conf,
            "avg_latency_ms": avg_latency,
            "defect_frequency": defect_freq,
            "narrative":     self.factory.demo_narrative,
            "target_pass_rate": self.factory.target_pass_rate,
            "vs_target":     round(pass_rate - self.factory.target_pass_rate, 4),
        }


# ── Live demo stream ──────────────────────────────────────────────────────────

async def run_live_demo(factory_key: str, redis_url: str, interval_sec: float = 2.0):
    """
    Streams live inspection events to Redis PubSub.
    Use for real-time dashboard demo.
    """
    import redis.asyncio as aioredis
    factory = ALL_FACTORIES[factory_key]
    generator = DemoEventGenerator(factory)

    r = aioredis.from_url(redis_url, decode_responses=True)
    channel = f"ws:tenant:{factory.id}"

    print(f"\n🏭  Live Demo: {factory.name}")
    print(f"   Channel: {channel}")
    print(f"   Target pass rate: {factory.target_pass_rate*100:.0f}%")
    print(f"   Press Ctrl+C to stop\n")

    count = 0
    try:
        while True:
            event = generator.generate_inspection_event()
            await r.publish(channel, json.dumps(event, default=str))
            count += 1
            dec = event["decision"]
            conf = event["confidence"]
            icon = {"pass": "✅", "fail": "❌", "review": "⚠️"}.get(dec, "?")
            print(f"  {icon} [{count:4d}] {dec:6s}  conf={conf:.3f}  "
                  f"latency={event['latency_ms']}ms")
            await asyncio.sleep(interval_sec)
    finally:
        await r.aclose()


# ── DB seed ───────────────────────────────────────────────────────────────────

def print_demo_snapshots():
    """Print demo dashboard data for all factories."""
    for key, factory in ALL_FACTORIES.items():
        gen = DemoEventGenerator(factory)
        snap = gen.generate_dashboard_snapshot(total=500)
        print(f"\n{'='*60}")
        print(f"  🏭 {snap['factory']} ({snap['product_type']})")
        print(f"{'='*60}")
        print(f"  Total inspections:  {snap['total']}")
        print(f"  Pass rate:          {snap['pass_rate']*100:.1f}%  "
              f"(target: {snap['target_pass_rate']*100:.1f}%)")
        print(f"  Fail count:         {snap['fail_count']}")
        print(f"  Review count:       {snap['review_count']}")
        print(f"  Avg confidence:     {snap['avg_confidence']:.3f}")
        print(f"  Avg latency:        {snap['avg_latency_ms']}ms")
        print(f"  Top defects:")
        for cls, cnt in sorted(snap["defect_frequency"].items(),
                                key=lambda x: -x[1])[:3]:
            print(f"    • {cls:20s}: {cnt}")
        print(f"\n  Narrative: {snap['narrative']}")


if __name__ == "__main__":
    import argparse, os

    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", choices=["metal","cnc","plastic","all"], default="all")
    parser.add_argument("--run-live", action="store_true")
    parser.add_argument("--interval", type=float, default=2.0)
    args = parser.parse_args()

    if args.run_live:
        redis_url = os.environ.get("REDIS_URL", "redis://:redispassword123@localhost:6379/0")
        asyncio.run(run_live_demo(args.scenario, redis_url, args.interval))
    else:
        print_demo_snapshots()
