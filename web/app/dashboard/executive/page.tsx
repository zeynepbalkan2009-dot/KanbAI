"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useInspectionStore } from "@/lib/store/inspections";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Brain,
  Building2,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Database,
  Factory,
  GitBranch,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { format } from "date-fns";

const defectMix = [
  { name: "Crack", value: 42 },
  { name: "Burr", value: 28 },
  { name: "Scratch", value: 18 },
  { name: "Edge chip", value: 12 },
];

const learningCurve = [
  { week: "W1", accuracy: 82 },
  { week: "W2", accuracy: 85 },
  { week: "W3", accuracy: 88 },
  { week: "W4", accuracy: 91 },
  { week: "W5", accuracy: 93 },
  { week: "W6", accuracy: 95 },
];

const operatorRows = [
  { name: "Line A / Station 3", cases: 312, confirm: "97%", status: "Excellent" },
  { name: "Line B / Station 1", cases: 284, confirm: "94%", status: "Stable" },
  { name: "Line C / Final QC", cases: 228, confirm: "91%", status: "Watch" },
];

function ExecutiveMetric({
  label,
  value,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111722] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-emerald-300">{delta}</p>
    </div>
  );
}

function StoryStep({
  title,
  text,
  icon: Icon,
}: {
  title: string;
  text: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-[#00C2FF]/25 bg-[#00C2FF]/10 p-2 text-[#00C2FF]">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
        </div>
      </div>
    </div>
  );
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "orange" | "blue" | "green";
}) {
  const cls = {
    default: "border-white/10 bg-white/[0.04] text-slate-300",
    orange: "border-[#FF7A00]/30 bg-[#FF7A00]/10 text-orange-300",
    blue: "border-[#00C2FF]/30 bg-[#00C2FF]/10 text-sky-300",
    green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  }[tone];

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

export default function ExecutiveDashboardPage() {
  const { inspections, stats, fetchInspections, fetchStats } = useInspectionStore();
  const [primingDemo, setPrimingDemo] = useState(false);

  useEffect(() => {
    fetchInspections();
    fetchStats();
  }, [fetchInspections, fetchStats]);

  const passRate = Math.round((stats?.pass_rate ?? 0.88) * 100);
  const totalInspections = stats?.total ?? Math.max(inspections.length, 8);
  const failCount = stats?.fail_count ?? 1;
  const avgConfidence = Math.round((stats?.avg_confidence ?? 0.91) * 100);
  const estimatedSavings = useMemo(() => {
    const preventedEscapes = Math.max(failCount, 1) * 18;
    return preventedEscapes * 1450;
  }, [failCount]);
  const liveFeed = inspections.slice(0, 5);

  const handlePrimeDemo = async () => {
    setPrimingDemo(true);
    try {
      await api.post("/mlops/demo/seed?scenario=metal&count=100&reset=true");
      await Promise.all([fetchInspections(), fetchStats()]);
      toast.success("Demo data is ready for the investor flow");
    } catch {
      toast.error("Demo data could not be prepared");
    } finally {
      setPrimingDemo(false);
    }
  };

  return (
    <div className="min-h-full bg-[#090B10] p-4 text-slate-200 md:p-6">
      <div className="mx-auto max-w-[1560px] space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#111722] shadow-[0_30px_120px_rgba(0,0,0,0.36)]">
          <div className="grid min-h-[360px] grid-cols-1 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap gap-2">
                <Pill tone="orange">YC / a16z Speedrun narrative</Pill>
                <Pill tone="green">Factory pilot demo</Pill>
              </div>
              <h1 className="mt-7 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Every inspection becomes training data.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
                KanbAI turns factory quality control into a continuous learning loop: operators capture defects, AI makes the first call, quality teams validate edge cases, and each factory builds its own improving model.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/capture"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
                >
                  Run live inspection
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/dashboard/mlops"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
                >
                  Show learning loop
                  <GitBranch size={16} />
                </Link>
                <button
                  onClick={handlePrimeDemo}
                  disabled={primingDemo}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#00C2FF]/25 bg-[#00C2FF]/10 px-5 py-3 text-sm font-semibold text-sky-200 transition hover:bg-[#00C2FF]/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Database size={16} />
                  {primingDemo ? "Preparing..." : "Prime demo data"}
                </button>
              </div>
            </div>

            <div className="relative border-t border-white/10 bg-[#090B10] p-6 xl:border-l xl:border-t-0">
              <div className="absolute right-6 top-6 rounded-full border border-[#00C2FF]/30 bg-[#00C2FF]/10 px-3 py-1 text-xs font-semibold text-sky-300">
                Live factory account
              </div>
              <div className="mt-10 grid grid-cols-2 gap-3">
                <ExecutiveMetric label="Inspections today" value={`${totalInspections}`} delta="+31% vs manual baseline" icon={Camera} tone="bg-[#00C2FF]/10 text-sky-300" />
                <ExecutiveMetric label="Pass rate" value={`${passRate}%`} delta="Stable production quality" icon={CheckCircle2} tone="bg-emerald-500/10 text-emerald-300" />
                <ExecutiveMetric label="Defects caught" value={`${Math.max(failCount, 1)}`} delta="Escape risk reduced" icon={ShieldCheck} tone="bg-rose-500/10 text-rose-300" />
                <ExecutiveMetric label="AI confidence" value={`${avgConfidence}%`} delta="Human-in-loop on edge cases" icon={Brain} tone="bg-[#FF7A00]/10 text-orange-300" />
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#111722] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Demo readiness</p>
                    <p className="mt-1 text-xs text-slate-500">Use this before a live YC, investor, or factory call.</p>
                  </div>
                  <Pill tone="green">Scripted path</Pill>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  {["Login", "Capture", "AI fail", "HITL", "Learning Ops", "ROI close"].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                      <CheckCircle2 size={13} className="text-emerald-300" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Why now</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Industrial AI needs a CRM layer</h2>
              </div>
              <Pill tone="blue">Moat: factory dataset</Pill>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              <StoryStep icon={Factory} title="Factories have visual defects" text="Manual inspection is inconsistent, slow, and hard to measure across shifts." />
              <StoryStep icon={Users} title="Humans still matter" text="Quality engineers validate uncertain cases instead of trusting a black-box model." />
              <StoryStep icon={Database} title="Data compounds" text="Each reviewed inspection improves the customer-specific dataset and reduces future review load." />
              <StoryStep icon={Zap} title="Retraining closes the loop" text="The platform connects inspection, HITL, dataset, model registry and deployment in one workflow." />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Learning curve</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Accuracy improves as the factory works</h2>
              </div>
              <Pill tone="green">+13 pts in 6 weeks</Pill>
            </div>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={learningCurve}>
                  <defs>
                    <linearGradient id="accuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C2FF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#00C2FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} domain={[75, 100]} />
                  <Tooltip contentStyle={{ background: "#111722", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="accuracy" stroke="#00C2FF" strokeWidth={3} fill="url(#accuracy)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6 xl:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Executive ROI</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Factory health and savings</h2>
              </div>
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-right">
                <p className="text-xs text-emerald-300/70">Estimated monthly savings</p>
                <p className="text-2xl font-semibold text-emerald-300">${estimatedSavings.toLocaleString("en-US")}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <ExecutiveMetric label="Rejected parts" value={`${Math.max(failCount, 1) * 18}`} delta="Before customer escape" icon={Target} tone="bg-rose-500/10 text-rose-300" />
              <ExecutiveMetric label="Review automation" value="74%" delta="Less manual triage" icon={ClipboardCheck} tone="bg-[#00C2FF]/10 text-sky-300" />
              <ExecutiveMetric label="Payback period" value="7 mo" delta="Pilot to plant rollout" icon={CircleDollarSign} tone="bg-emerald-500/10 text-emerald-300" />
            </div>

            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={defectMix}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#111722", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
                  <Bar dataKey="value" fill="#FF7A00" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Demo script</p>
            <h2 className="mt-2 text-xl font-semibold text-white">90-second flow</h2>
            <div className="mt-5 space-y-3">
              {[
                ["1", "Open capture", "Operator takes or simulates one inspection photo."],
                ["2", "AI finds crack", "Show confidence, decision and bounding box."],
                ["3", "HITL review", "Quality manager closes the case and contributes data."],
                ["4", "Learning Ops", "Show dataset growth and next model path."],
                ["5", "Executive ROI", "Close with savings, moat and rollout path."],
              ].map(([step, title, text]) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF7A00] text-xs font-bold text-black">{step}</div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Top operators</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Station leaderboard</h2>
            <div className="mt-5 space-y-3">
              {operatorRows.map((row) => (
                <div key={row.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{row.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.cases} cases reviewed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-300">{row.confirm}</p>
                      <p className="text-xs text-slate-500">{row.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live signal</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Latest inspections</h2>
              </div>
              <Pill tone="blue">WebSocket-ready</Pill>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Inspection</th>
                    <th className="px-4 py-3 font-semibold">Decision</th>
                    <th className="px-4 py-3 font-semibold">Confidence</th>
                    <th className="px-4 py-3 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {liveFeed.map((item) => (
                    <tr key={item.id} className="bg-[#0D121B]">
                      <td className="px-4 py-3 font-mono text-xs text-white">{item.id.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.decision === "fail" ? "bg-rose-500/10 text-rose-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                          {(item.decision || "pending").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{item.confidence ? `${Math.round(item.confidence * 100)}%` : "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(item.created_at), "HH:mm:ss")}</td>
                    </tr>
                  ))}
                  {liveFeed.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                        Run a live inspection to populate the executive feed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
