"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Database,
  Factory,
  FileText,
  ShieldCheck,
  TabletSmartphone,
  Target,
  TrendingUp,
  Users,
  Wifi,
  Zap,
} from "lucide-react";

const readinessItems = [
  { label: "Docker stack validated", detail: "API, web, nginx, Postgres, Redis, MinIO, workers and MLOps are up", done: true },
  { label: "Acceptance test passing", detail: "Login, seed, activation, upload, inference, HITL, export and HTTPS routes", done: true },
  { label: "Operator capture ready", detail: "Tablet/laptop flow includes camera, fallback capture, GPS, battery and offline queue", done: true },
  { label: "Quality review ready", detail: "HITL queue supports approve, reject, wrong prediction and label correction", done: true },
  { label: "Real sample images", detail: "Collect 30-100 permission-safe images per defect family during pilot", done: false },
  { label: "Trusted tablet HTTPS", detail: "Use trusted cert/tunnel for separate-device camera trials", done: false },
];

const pilotStages = [
  { stage: "Week 0", title: "Setup", owner: "Founder + plant lead", outcome: "Station, device and smoke test green", tone: "blue" },
  { stage: "Week 1", title: "Baseline data", owner: "Operators", outcome: "Pass/fail/review examples collected", tone: "orange" },
  { stage: "Week 2", title: "Model readiness", owner: "Quality + AI", outcome: "Labeled dataset v0 and first model path", tone: "green" },
  { stage: "Weeks 3-4", title: "Pilot decision", owner: "Plant manager", outcome: "Savings, rollout scope and commercial next step", tone: "slate" },
];

const dataTargets = [
  { label: "PASS images", value: "50-100", caption: "per product family" },
  { label: "Defect images", value: "30-50", caption: "per common defect" },
  { label: "Ambiguous cases", value: "10-20", caption: "for HITL calibration" },
  { label: "Pilot dataset", value: "100+", caption: "usable labeled images" },
];

const riskRegister = [
  { risk: "Camera permission fails on tablet", mitigation: "Use trusted HTTPS or built-in demo fallback", severity: "Medium" },
  { risk: "Factory images reveal sensitive info", mitigation: "Crop/censor before pitch or model sharing", severity: "High" },
  { risk: "Mock inference challenged", mitigation: "Position demo as workflow-ready, model-ready architecture", severity: "Medium" },
  { risk: "Network unreliable on-site", mitigation: "Run local laptop demo and prepare short fallback recording", severity: "Medium" },
];

function toneClass(tone: string) {
  if (tone === "blue") return "border-[#00C2FF]/30 bg-[#00C2FF]/10 text-sky-300";
  if (tone === "orange") return "border-[#FF7A00]/30 bg-[#FF7A00]/10 text-orange-300";
  if (tone === "green") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  return "border-white/10 bg-white/[0.04] text-slate-300";
}

function Metric({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111722] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{caption}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(tone)}`}>
      {children}
    </span>
  );
}

export default function PilotWorkspacePage() {
  const completedReadiness = readinessItems.filter((item) => item.done).length;
  const readinessPercent = Math.round((completedReadiness / readinessItems.length) * 100);

  return (
    <div className="min-h-full bg-[#090B10] p-4 text-slate-200 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl border border-white/10 bg-[#111722] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.32)] md:p-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_420px] xl:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="orange">Factory pilot CRM</Pill>
                <Pill tone="green">Investor-ready workflow</Pill>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Pilot Workspace
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Manage the first factory trial like a familiar account workspace: scope, readiness, data collection, risk, owners and next actions in one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/dashboard/capture" className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400">
                  Run station capture
                  <Camera size={16} />
                </Link>
                <Link href="/dashboard/hitl" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]">
                  Open review queue
                  <ClipboardCheck size={16} />
                </Link>
                <Link href="/dashboard/mlops" className="inline-flex items-center gap-2 rounded-xl border border-[#00C2FF]/25 bg-[#00C2FF]/10 px-5 py-3 text-sm font-semibold text-sky-200 transition hover:bg-[#00C2FF]/15">
                  Show model path
                  <Brain size={16} />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#090B10] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Readiness score</p>
                  <p className="mt-2 text-4xl font-semibold text-white">{readinessPercent}%</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-emerald-300">
                  <ShieldCheck size={30} />
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#00C2FF] to-emerald-400" style={{ width: `${readinessPercent}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-slate-500">Account</p>
                  <p className="mt-1 font-semibold text-white">Demo Fabrika A</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-slate-500">Stage</p>
                  <p className="mt-1 font-semibold text-emerald-300">Pilot ready</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Pilot scope" value="1 line" caption="1-2 stations, one product family" icon={Factory} tone="bg-[#00C2FF]/10 text-sky-300" />
          <Metric label="Capture target" value="100+" caption="usable labeled images" icon={Database} tone="bg-[#FF7A00]/10 text-orange-300" />
          <Metric label="Operator SLA" value="<30s" caption="capture-to-submit target" icon={Clock3} tone="bg-emerald-500/10 text-emerald-300" />
          <Metric label="Decision gate" value="4 wks" caption="pilot to rollout decision" icon={TrendingUp} tone="bg-violet-500/10 text-violet-300" />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Readiness checklist</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Demo day controls</h2>
              </div>
              <Pill tone="green">{completedReadiness}/{readinessItems.length} done</Pill>
            </div>
            <div className="mt-5 space-y-3">
              {readinessItems.map((item) => (
                <div key={item.label} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {item.done ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pilot plan</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Four-week account motion</h2>
              </div>
              <Pill tone="blue">Factory trial</Pill>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {pilotStages.map((item) => (
                <div key={item.stage} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Pill tone={item.tone}>{item.stage}</Pill>
                    <Activity size={16} className="text-slate-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-xs text-slate-500">Owner: {item.owner}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.outcome}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6 xl:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dataset plan</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Factory image collection targets</h2>
              </div>
              <Pill tone="orange">Dataset v0</Pill>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
              {dataTargets.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-[#090B10] p-4">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.caption}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center gap-3">
                {["pass", "crack", "scratch", "dent", "stain", "missing_part", "unknown_defect"].map((label) => (
                  <span key={label} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Next actions</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Pilot close checklist</h2>
            <div className="mt-5 space-y-3">
              {[
                ["Confirm inspection station", Factory],
                ["Collect permission-safe images", Camera],
                ["Estimate scrap/rework cost", CircleDollarSign],
                ["Review HITL corrections", Users],
                ["Prepare rollout decision", Target],
              ].map(([label, Icon]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="rounded-xl bg-[#00C2FF]/10 p-2 text-sky-300">
                    <Icon size={16} />
                  </div>
                  <span className="text-sm font-medium text-slate-300">{label as string}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Risk register</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Known pilot risks</h2>
              </div>
              <Pill tone="slate">Managed</Pill>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Risk</th>
                    <th className="px-4 py-3 font-semibold">Mitigation</th>
                    <th className="px-4 py-3 font-semibold">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {riskRegister.map((item) => (
                    <tr key={item.risk} className="bg-[#0D121B]">
                      <td className="px-4 py-3 text-slate-300">{item.risk}</td>
                      <td className="px-4 py-3 text-slate-500">{item.mitigation}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${item.severity === "High" ? "border-rose-500/25 bg-rose-500/10 text-rose-300" : "border-amber-500/25 bg-amber-500/10 text-amber-300"}`}>
                          {item.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Artifacts</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Pilot handoff package</h2>
            <div className="mt-5 space-y-3">
              {[
                ["Factory handoff", "Room setup, demo flow and recovery", FACTORY_PILOT_HANDOFF_LABEL],
                ["Pilot one-pager", "Scope, timeline, metrics and responsibilities", PILOT_ONE_PAGER_LABEL],
                ["Data protocol", "Image labels, privacy and model-readiness criteria", DATA_PROTOCOL_LABEL],
              ].map(([title, detail, file]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#FF7A00]/10 p-2 text-orange-300">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                      <p className="mt-3 font-mono text-[11px] text-slate-500">{file}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-4">
            {[
              ["Device activation", "Pair tablet to station", TabletSmartphone, "/dashboard/devices"],
              ["Live station feed", "Capture the next part", Wifi, "/dashboard/capture"],
              ["Quality CRM", "Review inspection records", ClipboardCheck, "/dashboard/inspections"],
              ["Continuous learning", "Show model registry", Zap, "/dashboard/mlops"],
            ].map(([title, detail, Icon, href]) => (
              <Link key={title as string} href={href as string} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#00C2FF]/25 hover:bg-[#00C2FF]/[0.06]">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-white/[0.05] p-2 text-slate-300 group-hover:text-sky-300">
                    <Icon size={17} />
                  </div>
                  <ArrowRight size={16} className="text-slate-600 group-hover:text-sky-300" />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{title as string}</p>
                <p className="mt-1 text-xs text-slate-500">{detail as string}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const FACTORY_PILOT_HANDOFF_LABEL = "FACTORY_PILOT_HANDOFF.md";
const PILOT_ONE_PAGER_LABEL = "PILOT_PROPOSAL_ONE_PAGER.md";
const DATA_PROTOCOL_LABEL = "FACTORY_DATA_COLLECTION_PROTOCOL.md";
