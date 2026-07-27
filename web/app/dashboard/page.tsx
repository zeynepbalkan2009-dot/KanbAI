"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useInspectionStore } from "@/lib/store/inspections";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowRight, Building2, Camera, CheckCircle2, ClipboardCheck,
  Clock3, Factory, Gauge, Search, ShieldAlert, Sparkles, Zap,
} from "lucide-react";
import { format } from "date-fns";

const toneByDecision: Record<string, string> = {
  pass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  fail: "border-red-500/25 bg-red-500/10 text-red-300",
  review: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  pending: "border-white/10 bg-white/5 text-white/45",
  error: "border-red-500/25 bg-red-500/10 text-red-300",
};

const labelByDecision: Record<string, string> = {
  pass: "PASS",
  fail: "FAIL",
  review: "REVIEW",
  pending: "PENDING",
  error: "ERROR",
};

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f131c] p-4 shadow-lg shadow-black/15">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-white/45">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-xs text-white/40">{helper}</p>
        </div>
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneByDecision[decision] ?? toneByDecision.pending}`}>
      {labelByDecision[decision] ?? decision.toUpperCase()}
    </span>
  );
}

function ActionLink({
  href,
  label,
  detail,
  icon: Icon,
}: {
  href: string;
  label: string;
  detail: string;
  icon: React.ElementType;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#00C2FF]/40 hover:bg-[#00C2FF]/10">
      <div className="rounded-lg bg-white/5 p-2 text-[#00C2FF]">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="truncate text-xs text-white/40">{detail}</p>
      </div>
      <ArrowRight size={15} className="text-white/25 transition group-hover:text-[#00C2FF]" />
    </Link>
  );
}

export default function DashboardPage() {
  const { inspections, stats, fetchInspections, fetchStats, isLoading } = useInspectionStore();

  useEffect(() => {
    fetchInspections();
    fetchStats();
    const interval = setInterval(() => {
      fetchInspections();
      fetchStats();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchInspections, fetchStats]);

  const latest = inspections.slice(0, 8);
  const openReviewCount = stats?.review_count ?? 0;
  const failCount = stats?.fail_count ?? 0;
  const passRate = stats ? Math.round(stats.pass_rate * 100) : 0;
  const avgConfidence = stats?.avg_confidence ? Math.round(stats.avg_confidence * 100) : 0;

  const chartData = useMemo(
    () => [...inspections]
      .reverse()
      .slice(-20)
      .map((item) => ({
        time: format(new Date(item.created_at), "HH:mm"),
        confidence: item.confidence ? Math.round(item.confidence * 100) : null,
      })),
    [inspections],
  );

  const pipeline = [
    { label: "Captured", value: stats?.total ?? 0, icon: Camera, tone: "text-[#00C2FF]" },
    { label: "AI processed", value: (stats?.pass_count ?? 0) + failCount + openReviewCount, icon: Sparkles, tone: "text-blue-300" },
    { label: "Needs HITL", value: failCount + openReviewCount, icon: ClipboardCheck, tone: "text-amber-300" },
    { label: "Closed pass", value: stats?.pass_count ?? 0, icon: CheckCircle2, tone: "text-emerald-300" },
  ];

  return (
    <div className="min-h-full bg-[#090B10] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl border border-white/10 bg-[#0f131c] p-5 shadow-xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-xl border border-[#00C2FF]/25 bg-[#00C2FF]/10 p-3 text-[#00C2FF]">
                <Factory size={24} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-white">Demo Fabrika A</h1>
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    Production demo
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/50">
                  Industrial AI quality account workspace - inspections, HITL, dataset and model operations.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex min-w-[220px] items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/45">
                <Search size={15} />
                Search inspections, devices...
              </div>
              <Link href="/dashboard/capture" className="inline-flex items-center gap-2 rounded-lg bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-black hover:bg-[#ff8c22]">
                <Camera size={16} />
                New inspection
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Inspections" value={stats?.total ?? 0} helper="All time production checks" icon={Zap} tone="bg-blue-500/10 text-blue-300" />
          <MetricCard label="Pass rate" value={`${passRate}%`} helper={`${stats?.pass_count ?? 0} accepted parts`} icon={Gauge} tone="bg-emerald-500/10 text-emerald-300" />
          <MetricCard label="Detected defects" value={failCount} helper="Requires traceability" icon={ShieldAlert} tone="bg-red-500/10 text-red-300" />
          <MetricCard label="Open reviews" value={openReviewCount} helper="Quality team action needed" icon={AlertTriangle} tone="bg-amber-500/10 text-amber-300" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Factory quality trend</h2>
                <p className="mt-1 text-xs text-white/40">Last 20 inspection confidence scores</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/45">
                Avg {avgConfidence || "--"}%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C2FF" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#00C2FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2430" />
                <XAxis dataKey="time" tick={{ fill: "#667085", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#667085", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10 }}
                  labelStyle={{ color: "#cbd5e1" }}
                  formatter={(value: number) => [`${value}%`, "Confidence"]}
                />
                <Area type="monotone" dataKey="confidence" stroke="#00C2FF" strokeWidth={2} fill="url(#confidenceGradient)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-4">
              <h2 className="mb-3 text-sm font-semibold text-white">Quick actions</h2>
              <div className="space-y-2">
                <ActionLink href="/dashboard/capture" label="Operator capture" detail="Tablet camera / demo camera" icon={Camera} />
                <ActionLink href="/dashboard/hitl" label="Review queue" detail={`${failCount + openReviewCount} items need attention`} icon={ClipboardCheck} />
                <ActionLink href="/dashboard/mlops" label="Learning cycle" detail="Dataset, retrain, model registry" icon={Sparkles} />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-4">
              <h2 className="mb-3 text-sm font-semibold text-white">Account status</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-white/60">
                  <span className="inline-flex items-center gap-2"><Building2 size={15} /> Factory</span>
                  <span className="font-medium text-white">Demo Fabrika A</span>
                </div>
                <div className="flex items-center justify-between text-white/60">
                  <span className="inline-flex items-center gap-2"><Clock3 size={15} /> Shift</span>
                  <span className="font-medium text-white">Gunduz</span>
                </div>
                <div className="flex items-center justify-between text-white/60">
                  <span className="inline-flex items-center gap-2"><Sparkles size={15} /> Model</span>
                  <span className="font-medium text-white">mock-v1.0-demo</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Inspection pipeline</h2>
              <span className="text-xs text-white/35">Today</span>
            </div>
            <div className="space-y-3">
              {pipeline.map(({ label, value, icon: Icon, tone }, index) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`rounded-lg bg-white/5 p-2 ${tone}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white">{label}</p>
                      <p className="text-sm font-semibold text-white">{value}</p>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/5">
                      <div className="h-1.5 rounded-full bg-[#00C2FF]" style={{ width: `${Math.max(8, 100 - index * 18)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f131c]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Recent activity</h2>
                <p className="mt-1 text-xs text-white/40">Latest inspections and AI decisions</p>
              </div>
              <Link href="/dashboard/inspections" className="text-xs font-medium text-[#00C2FF] hover:text-white">
                View all
              </Link>
            </div>

            {isLoading && latest.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/40">Loading activity...</div>
            ) : latest.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/40">No inspections yet.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {latest.map((item) => (
                  <div key={item.id} className="grid grid-cols-[130px_minmax(0,1fr)_90px_90px_72px] items-center gap-3 px-5 py-3 text-sm hover:bg-white/[0.03]">
                    <DecisionBadge decision={item.decision} />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-white/70">{item.id}</p>
                      <p className="mt-1 truncate text-xs text-white/35">{item.defects?.[0]?.class_name ?? "no defect label"}</p>
                    </div>
                    <p className="text-xs text-white/55">{item.confidence ? `${Math.round(item.confidence * 100)}%` : "--"}</p>
                    <p className="text-xs text-white/35">{item.inference_latency_ms ? `${item.inference_latency_ms}ms` : "--"}</p>
                    <p className="text-right text-xs text-white/35">{format(new Date(item.created_at), "HH:mm")}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
