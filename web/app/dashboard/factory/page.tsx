"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Factory,
  Gauge,
  MapPin,
  Radio,
  RefreshCw,
  ShieldAlert,
  TabletSmartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { inspectionsApi, devicesApi, setupApi } from "@/lib/api";

type Inspection = {
  id: string;
  decision: string;
  confidence?: number;
  created_at: string;
  inference_latency_ms?: number;
  image_key?: string;
  defects?: Array<{ class_name: string; confidence?: number }>;
};

type Device = {
  id: string;
  name: string;
  status: string;
  is_active: boolean;
  station_id?: string;
  location_label?: string;
  last_seen_at?: string;
};

type Station = {
  id: string;
  name: string;
  code?: string;
  status?: string;
};

type ProductionLine = {
  id: string;
  name: string;
  code?: string;
  status?: string;
};

type Stats = {
  total: number;
  pass_count: number;
  fail_count: number;
  review_count: number;
  pass_rate: number;
  avg_confidence?: number;
};

const stationPositions = [
  { x: 12, y: 42 },
  { x: 32, y: 28 },
  { x: 52, y: 50 },
  { x: 72, y: 34 },
  { x: 86, y: 58 },
];

function healthForStation(station: Station, devices: Device[], inspections: Inspection[]) {
  const stationDevices = devices.filter((device) => device.station_id === station.id);
  const online = stationDevices.some((device) => device.is_active && ["active", "online"].includes(device.status));
  const recentFailures = inspections.slice(0, 8).filter((item) => item.decision === "fail" || item.decision === "review").length;

  if (!online) return { label: "Needs pairing", tone: "amber", score: 62 };
  if (recentFailures >= 3) return { label: "Quality risk", tone: "red", score: 71 };
  if (recentFailures >= 1) return { label: "Watch", tone: "amber", score: 84 };
  return { label: "Stable", tone: "green", score: 96 };
}

function toneClasses(tone: string) {
  if (tone === "green") return "border-emerald-400/35 bg-emerald-400/15 text-emerald-200";
  if (tone === "red") return "border-red-400/35 bg-red-400/15 text-red-200";
  return "border-amber-400/35 bg-amber-400/15 text-amber-200";
}

function dotClass(tone: string) {
  if (tone === "green") return "bg-emerald-400 shadow-[0_0_22px_rgba(52,211,153,0.75)]";
  if (tone === "red") return "bg-red-400 shadow-[0_0_22px_rgba(248,113,113,0.75)]";
  return "bg-amber-300 shadow-[0_0_22px_rgba(252,211,77,0.75)]";
}

function Metric({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111722] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{caption}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const tone =
    decision === "pass"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
      : decision === "fail"
        ? "border-red-500/25 bg-red-500/10 text-red-300"
        : decision === "review"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-white/10 bg-white/5 text-white/45";

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${tone}`}>{decision}</span>;
}

export default function FactoryOverviewPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [inspectionRes, statsRes, deviceRes, stationRes, lineRes] = await Promise.all([
        inspectionsApi.list({ limit: 24 }),
        inspectionsApi.stats(),
        devicesApi.list(),
        setupApi.stations({ active_only: true }),
        setupApi.productionLines({ active_only: true }),
      ]);
      setInspections(inspectionRes.data);
      setStats(statsRes.data);
      setDevices(deviceRes.data);
      setStations(stationRes.data);
      setLines(lineRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 20_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const onlineDevices = devices.filter((device) => device.is_active && ["active", "online"].includes(device.status)).length;
  const failOrReview = inspections.filter((item) => item.decision === "fail" || item.decision === "review").length;
  const passRate = stats ? Math.round(stats.pass_rate * 100) : 0;
  const avgConfidence = stats?.avg_confidence ? Math.round(stats.avg_confidence * 100) : 0;

  const stationHealth = useMemo(
    () => stations.map((station, index) => ({
      station,
      position: stationPositions[index % stationPositions.length],
      health: healthForStation(station, devices, inspections),
      devices: devices.filter((device) => device.station_id === station.id),
    })),
    [devices, inspections, stations],
  );

  const primaryLine = lines[0]?.name || "Line 1";

  return (
    <div className="min-h-full bg-[#090B10] p-4 text-slate-200 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-3xl border border-white/10 bg-[#111722] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.32)] md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#00C2FF]/30 bg-[#00C2FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                  Factory Digital Twin
                </span>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Live pilot workspace
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Demo Fabrika A
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Line, station, device and inspection health in one operational control surface for factory teams.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadAll}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07] disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Factory health" value={failOrReview > 2 ? "At risk" : "Stable"} caption={`${primaryLine} monitored`} icon={Factory} tone="bg-[#00C2FF]/10 text-sky-300" />
          <Metric label="Pass rate" value={`${passRate}%`} caption={`${stats?.pass_count ?? 0} accepted parts`} icon={Gauge} tone="bg-emerald-500/10 text-emerald-300" />
          <Metric label="AI cameras" value={`${onlineDevices}/${devices.length}`} caption="Online factory endpoints" icon={TabletSmartphone} tone="bg-[#FF7A00]/10 text-orange-300" />
          <Metric label="Open risk" value={failOrReview} caption="Fail or review records" icon={ShieldAlert} tone="bg-red-500/10 text-red-300" />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <div className="relative min-h-[560px] overflow-hidden rounded-3xl border border-white/10 bg-[#0D121B] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.32)]">
            <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:42px_42px]" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Production line</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{primaryLine}</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Radio size={14} />
                Realtime
              </span>
            </div>

            <div className="relative z-10 mt-12 h-[420px] rounded-[28px] border border-white/10 bg-black/25 p-5">
              <div className="absolute left-[8%] right-[8%] top-1/2 h-3 -translate-y-1/2 rounded-full bg-[#182233] shadow-[0_0_36px_rgba(0,194,255,0.12)]" />
              <div className="absolute left-[8%] right-[8%] top-[calc(50%+42px)] h-px bg-[#00C2FF]/20" />
              <div className="absolute left-[8%] right-[8%] top-[calc(50%-42px)] h-px bg-[#FF7A00]/20" />

              {stationHealth.map(({ station, position, health, devices: stationDevices }, index) => (
                <div
                  key={station.id}
                  className="absolute w-[190px] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                >
                  <div className="rounded-2xl border border-white/10 bg-[#111722]/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{station.code || `ST-${index + 1}`}</p>
                        <h3 className="mt-1 truncate text-sm font-semibold text-white">{station.name}</h3>
                      </div>
                      <span className={`h-3 w-3 rounded-full ${dotClass(health.tone)}`} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className={`rounded-full border px-2 py-1 font-semibold ${toneClasses(health.tone)}`}>{health.label}</span>
                      <span className="text-slate-400">{health.score}%</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{stationDevices.length} device</span>
                      <span>{stationDevices.some((device) => device.is_active) ? "paired" : "unpaired"}</span>
                    </div>
                  </div>
                </div>
              ))}

              {stationHealth.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <Factory size={34} className="mx-auto text-slate-600" />
                    <p className="mt-3 text-sm font-semibold text-white">No stations configured</p>
                    <p className="mt-1 text-xs text-slate-500">Prime demo data or create the first station.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-[#111722] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Station readiness</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Action list</h2>
                </div>
                <AlertTriangle size={19} className={failOrReview > 0 ? "text-amber-300" : "text-emerald-300"} />
              </div>
              <div className="mt-5 space-y-3">
                {stationHealth.map(({ station, health, devices: stationDevices }) => (
                  <div key={station.id} className="rounded-2xl border border-white/10 bg-[#0D121B] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{station.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{stationDevices.length} paired endpoint</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses(health.tone)}`}>{health.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#111722] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live activity</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Inspection feed</h2>
                </div>
                <Activity size={19} className="text-[#00C2FF]" />
              </div>

              <div className="mt-5 space-y-3">
                {inspections.slice(0, 6).map((inspection) => (
                  <div key={inspection.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-[#0D121B] p-3">
                    <div className="rounded-xl bg-white/[0.04] p-2 text-slate-400">
                      {inspection.decision === "pass" ? <CheckCircle2 size={17} className="text-emerald-300" /> : <AlertTriangle size={17} className="text-amber-300" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-white">{inspection.id.split("-")[0]}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {inspection.defects?.[0]?.class_name || "surface inspection"} / {inspection.confidence ? `${Math.round(inspection.confidence * 100)}%` : "--"}
                      </p>
                    </div>
                    <DecisionBadge decision={inspection.decision} />
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#00C2FF]/10 p-2.5 text-sky-300">
                <Cpu size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI inference layer</p>
                <p className="mt-1 text-xs text-slate-500">Average confidence {avgConfidence || "--"}%</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300">
                <Wifi size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Connectivity</p>
                <p className="mt-1 text-xs text-slate-500">{onlineDevices} endpoint active for tablet/laptop demo</p>
              </div>
            </div>
          </div>
          <Link href="/dashboard/devices" className="group rounded-3xl border border-white/10 bg-[#111722] p-5 transition hover:border-[#00C2FF]/40 hover:bg-[#00C2FF]/10">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#FF7A00]/10 p-2.5 text-orange-300">
                {onlineDevices > 0 ? <MapPin size={18} /> : <WifiOff size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Manage device pairing</p>
                <p className="mt-1 text-xs text-slate-500">Open Factory Device CRM</p>
              </div>
              <ArrowRight size={16} className="text-slate-600 group-hover:text-[#00C2FF]" />
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}
