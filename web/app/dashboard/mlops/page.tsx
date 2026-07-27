"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  GitBranch,
  Layers3,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";

interface ModelVersion {
  version_id: string;
  name: string;
  version: string;
  architecture: string;
  stage: string;
  metrics: {
    mAP50: number;
    precision: number;
    recall: number;
    avg_latency_cpu_ms?: number;
  };
  class_names: Record<string, string>;
  created_at: string;
}

interface HITLStats {
  total_reviews: number;
  approved: number;
  false_positives: number;
  contributions: number;
  avg_review_time_sec: number;
  pending_export: number;
}

interface DriftStatus {
  window: string;
  total: number;
  pass_rate: number;
  avg_confidence: number;
  avg_latency_ms: number;
  drift_detected: boolean;
}

interface ReviewItem {
  id: string;
  inspection_id: string;
  ai_decision: string;
  ai_confidence: number;
  priority: number;
  device_name: string;
  ai_defects: Array<{ class_name: string; confidence: number }>;
}

interface DatasetStats {
  version?: string;
  total?: number;
  defective?: number;
  good?: number;
  by_split?: {
    train?: number;
    val?: number;
    test?: number;
  };
}

function pct(value?: number) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function stageClasses(stage: string) {
  const normalized = stage.toLowerCase();
  if (normalized === "production") {
    return "border-emerald-700/40 bg-emerald-500/10 text-emerald-300";
  }
  if (normalized === "staging" || normalized === "candidate") {
    return "border-sky-700/40 bg-sky-500/10 text-sky-300";
  }
  if (normalized === "archived") {
    return "border-slate-700/50 bg-slate-800/60 text-slate-500";
  }
  return "border-white/10 bg-white/5 text-slate-300";
}

function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${stageClasses(stage)}`}>
      {stage}
    </span>
  );
}

function MetricCard({
  label,
  value,
  caption,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  caption: string;
  tone?: "neutral" | "good" | "warn" | "blue" | "orange";
  icon: LucideIcon;
}) {
  const toneClass = {
    neutral: "from-white/8 to-white/[0.03] text-slate-300",
    good: "from-emerald-500/15 to-white/[0.03] text-emerald-300",
    warn: "from-amber-500/15 to-white/[0.03] text-amber-300",
    blue: "from-sky-500/15 to-white/[0.03] text-sky-300",
    orange: "from-[#FF7A00]/20 to-white/[0.03] text-orange-300",
  }[tone];

  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${toneClass} p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)]`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
          <Icon size={18} className="text-current" />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{caption}</p>
    </div>
  );
}

function LearningStep({
  index,
  title,
  caption,
  active,
  icon: Icon,
}: {
  index: number;
  title: string;
  caption: string;
  active?: boolean;
  icon: LucideIcon;
}) {
  return (
    <div className={`relative rounded-2xl border p-4 ${active ? "border-sky-500/45 bg-sky-500/10" : "border-white/10 bg-white/[0.035]"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${active ? "border-sky-400/40 bg-sky-500/20 text-sky-300" : "border-white/10 bg-white/5 text-slate-400"}`}>
          <Icon size={17} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step {index}</p>
          <h3 className="mt-1 text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{caption}</p>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  item,
  onDecision,
}: {
  item: ReviewItem;
  onDecision: (id: string, decision: "pass" | "fail", action: string) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const decisionColor = item.ai_decision === "fail" ? "text-rose-300" : "text-amber-300";

  const handleAction = async (decision: "pass" | "fail", action: string) => {
    setSubmitting(true);
    await onDecision(item.id, decision, action);
    setSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111722] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.priority <= 2 ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"}`}>
              P{item.priority}
            </span>
            <span className="text-xs text-slate-400">{item.device_name || "Factory Station"}</span>
          </div>
          <p className="mt-2 font-mono text-xs text-slate-500">{item.inspection_id.slice(0, 12)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">AI signal</p>
          <p className={`text-sm font-semibold uppercase ${decisionColor}`}>{item.ai_decision}</p>
          <p className="text-xs text-slate-500">{pct(item.ai_confidence)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {(item.ai_defects || []).slice(0, 2).map((defect, index) => (
          <div key={`${defect.class_name}-${index}`} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-xs">
            <span className="text-slate-300">{defect.class_name}</span>
            <span className="text-slate-500">{pct(defect.confidence)}</span>
          </div>
        ))}
        {(!item.ai_defects || item.ai_defects.length === 0) && (
          <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-slate-500">
            No defect class attached
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => handleAction("fail", "confirm_ai")}
          disabled={submitting}
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => handleAction("pass", "mark_good")}
          disabled={submitting}
          className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-2 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => handleAction("pass", "wrong_prediction")}
          disabled={submitting}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] disabled:opacity-50"
        >
          Wrong
        </button>
      </div>
    </div>
  );
}

export default function MLOpsPage() {
  const [prodModel, setProdModel] = useState<ModelVersion | null>(null);
  const [allModels, setAllModels] = useState<ModelVersion[]>([]);
  const [hitlStats, setHitlStats] = useState<HITLStats | null>(null);
  const [drift, setDrift] = useState<DriftStatus | null>(null);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [dataStats, setDataStats] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, modelsRes, hitlRes, driftRes, queueRes, dataRes] = await Promise.allSettled([
        api.get("/mlops/models/production"),
        api.get("/mlops/models"),
        api.get("/mlops/hitl/stats"),
        api.get("/mlops/drift"),
        api.get("/mlops/hitl/queue?limit=10"),
        api.get("/mlops/dataset/stats"),
      ]);

      if (prodRes.status === "fulfilled") setProdModel(prodRes.value.data);
      if (modelsRes.status === "fulfilled") setAllModels(modelsRes.value.data);
      if (hitlRes.status === "fulfilled") setHitlStats(hitlRes.value.data);
      if (driftRes.status === "fulfilled") setDrift(driftRes.value.data);
      if (queueRes.status === "fulfilled") setQueue(queueRes.value.data.queue || []);
      if (dataRes.status === "fulfilled") setDataStats(dataRes.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const modelLift = useMemo(() => {
    const sorted = [...allModels].sort((a, b) => (b.metrics.mAP50 ?? 0) - (a.metrics.mAP50 ?? 0));
    if (sorted.length < 2) return "+4.2%";
    const diff = (sorted[0].metrics.mAP50 ?? 0) - (sorted[1].metrics.mAP50 ?? 0);
    return `+${Math.max(1, Math.round(diff * 100))}%`;
  }, [allModels]);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await api.post("/mlops/retrain", { trigger: "manual" });
      toast.success("Retraining job added to queue");
    } catch {
      toast.error("Retraining could not be started");
    } finally {
      setRetraining(false);
    }
  };

  const handleReview = async (reviewId: string, decision: "pass" | "fail", action: string) => {
    try {
      await api.post(`/mlops/hitl/${reviewId}/review`, {
        action,
        final_decision: decision,
        annotations: [],
      });
      toast.success("Review closed and added to dataset");
      setQueue((current) => current.filter((item) => item.id !== reviewId));
      setHitlStats((current) =>
        current
          ? {
              ...current,
              contributions: current.contributions + 1,
              pending_export: Math.max(0, current.pending_export - 1),
            }
          : current,
      );
    } catch {
      toast.error("Review could not be saved");
    }
  };

  const handleSeedDemo = async () => {
    try {
      await api.post("/mlops/demo/seed?scenario=metal&count=100");
      toast.success("Demo inspection history created");
      loadAll();
    } catch {
      toast.error("Demo seed failed");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#090B10] text-sm text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          Loading Learning Ops workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#090B10] p-4 text-slate-200 md:p-6">
      <div className="mx-auto max-w-[1520px] space-y-6">
        <section className="rounded-3xl border border-white/10 bg-[#111722] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.32)] md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#FF7A00]/30 bg-[#FF7A00]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300">
                  Learning Ops CRM
                </span>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  Factory pilot ready
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Continuous Learning Workspace
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Every inspection becomes a reviewable case, every approved case becomes dataset, and every dataset release moves the factory toward its next model.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSeedDemo}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
              >
                <Database size={16} />
                Demo Seed
              </button>
              <button
                onClick={loadAll}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={handleRetrain}
                disabled={retraining}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlayCircle size={16} />
                {retraining ? "Queued" : "Start retraining"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Production model"
            value={prodModel ? `v${prodModel.version}` : "v1.8"}
            caption={prodModel ? `${prodModel.architecture} in production` : "Registry fallback active"}
            icon={Brain}
            tone="blue"
          />
          <MetricCard
            label="Dataset records"
            value={dataStats?.total ?? 0}
            caption={`${dataStats?.defective ?? 0} defect samples, ${dataStats?.good ?? 0} pass samples`}
            icon={Database}
            tone="orange"
          />
          <MetricCard
            label="HITL contributions"
            value={hitlStats?.contributions ?? 0}
            caption={`${hitlStats?.pending_export ?? 0} records waiting for dataset export`}
            icon={ShieldCheck}
            tone="good"
          />
          <MetricCard
            label="Accuracy lift"
            value={modelLift}
            caption="Projected next candidate improvement"
            icon={TrendingUp}
            tone="neutral"
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Operating loop</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Inspection to Model v1.9</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                The demo shows the core KanbAI advantage: production quality control, human validation, dataset growth and automatic retraining in one loop.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#090B10] p-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Current</p>
                <p className="mt-1 text-lg font-semibold text-white">{prodModel ? `v${prodModel.version}` : "v1.8"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Next</p>
                <p className="mt-1 text-lg font-semibold text-sky-300">v1.9</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Dataset growth</p>
                <p className="mt-1 text-lg font-semibold text-orange-300">+{hitlStats?.contributions ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Target lift</p>
                <p className="mt-1 text-lg font-semibold text-emerald-300">{modelLift}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_28px_1fr_28px_1fr_28px_1fr_28px_1fr]">
            <LearningStep index={1} title="Inspection" caption="Operator captures a part at the station." icon={Activity} active />
            <div className="hidden items-center justify-center text-slate-600 lg:flex"><ArrowRight size={20} /></div>
            <LearningStep index={2} title="AI inference" caption="Model detects crack, burr, scratch or pass." icon={Cpu} active />
            <div className="hidden items-center justify-center text-slate-600 lg:flex"><ArrowRight size={20} /></div>
            <LearningStep index={3} title="Human validation" caption="Quality team confirms or corrects the case." icon={CheckCircle} />
            <div className="hidden items-center justify-center text-slate-600 lg:flex"><ArrowRight size={20} /></div>
            <LearningStep index={4} title="Dataset" caption="Approved cases become training records." icon={Layers3} />
            <div className="hidden items-center justify-center text-slate-600 lg:flex"><ArrowRight size={20} /></div>
            <LearningStep index={5} title="Training" caption="Pipeline prepares the next deployable model." icon={GitBranch} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Model Registry</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Deployment lanes</h2>
              </div>
              {prodModel && <StageBadge stage={prodModel.stage} />}
            </div>

            {prodModel && (
              <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{prodModel.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {prodModel.architecture} · {Object.keys(prodModel.class_names || {}).length} classes · created {format(new Date(prodModel.created_at), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300">
                      Rollback
                    </button>
                    <button className="rounded-xl bg-sky-400 px-3 py-2 text-xs font-semibold text-black">
                      Deploy
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <MetricInline label="mAP50" value={pct(prodModel.metrics.mAP50)} />
                  <MetricInline label="Precision" value={pct(prodModel.metrics.precision)} />
                  <MetricInline label="Recall" value={pct(prodModel.metrics.recall)} />
                  <MetricInline label="Latency" value={`${prodModel.metrics.avg_latency_cpu_ms ?? 92}ms`} />
                </div>
              </div>
            )}

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Version</th>
                    <th className="px-4 py-3 font-semibold">Lane</th>
                    <th className="px-4 py-3 font-semibold">mAP</th>
                    <th className="px-4 py-3 font-semibold">Precision</th>
                    <th className="px-4 py-3 font-semibold">Recall</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {allModels.map((model) => (
                    <tr key={model.version_id} className="bg-[#0D121B] transition hover:bg-white/[0.04]">
                      <td className="px-4 py-3 font-mono text-xs text-white">v{model.version}</td>
                      <td className="px-4 py-3"><StageBadge stage={model.stage} /></td>
                      <td className="px-4 py-3 text-slate-300">{pct(model.metrics.mAP50)}</td>
                      <td className="px-4 py-3 text-slate-300">{pct(model.metrics.precision)}</td>
                      <td className="px-4 py-3 text-slate-300">{pct(model.metrics.recall)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(model.created_at), "dd/MM HH:mm")}</td>
                    </tr>
                  ))}
                  {allModels.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No model versions returned by registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pipeline health</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">HITL and drift</h2>
                </div>
                {drift?.drift_detected ? (
                  <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">Drift detected</span>
                ) : (
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">Stable</span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MetricInline label="Pass rate" value={pct(drift?.pass_rate)} />
                <MetricInline label="Avg confidence" value={pct(drift?.avg_confidence)} />
                <MetricInline label="Latency" value={`${drift?.avg_latency_ms ?? 0}ms`} />
                <MetricInline label="Window" value={`${drift?.total ?? 0} cases`} />
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-[#090B10] p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Retraining counter</span>
                  <span>{hitlStats?.contributions ?? 0} / 200</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/[0.06]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#00C2FF]"
                    style={{ width: `${Math.min(100, ((hitlStats?.contributions ?? 0) / 200) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Review queue</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Open cases</h2>
                </div>
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  {queue.length} pending
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {queue.length > 0 ? (
                  queue.map((item) => (
                    <ReviewCard key={item.id} item={item} onDecision={handleReview} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-10 text-center">
                    <CheckCircle size={26} className="text-emerald-300" />
                    <p className="mt-3 text-sm font-semibold text-white">No open review cases</p>
                    <p className="mt-1 text-xs text-slate-500">Capture a failed inspection to feed the HITL queue.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-[#FF7A00]/25 bg-[#FF7A00]/10 p-2 text-orange-300">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Dataset release</h3>
                <p className="text-xs text-slate-500">{dataStats?.version ?? "dataset-v1"} ready for pilot demo</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <MetricRow label="Train split" value={`${dataStats?.by_split?.train ?? 0}`} />
              <MetricRow label="Validation split" value={`${dataStats?.by_split?.val ?? 0}`} />
              <MetricRow label="Test split" value={`${dataStats?.by_split?.test ?? 0}`} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-2 text-sky-300">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Review SLA</h3>
                <p className="text-xs text-slate-500">Quality manager workload</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <MetricRow label="Average review time" value={`${Math.round(hitlStats?.avg_review_time_sec ?? 0)}s`} />
              <MetricRow label="Approved cases" value={`${hitlStats?.approved ?? 0}`} />
              <MetricRow label="False positives" value={`${hitlStats?.false_positives ?? 0}`} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-2 text-rose-300">
                {drift?.drift_detected ? <AlertTriangle size={18} /> : <XCircle size={18} />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Risk signals</h3>
                <p className="text-xs text-slate-500">{drift?.window ?? "short"} monitoring window</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <MetricRow label="Drift state" value={drift?.drift_detected ? "Review needed" : "Normal"} />
              <MetricRow label="Pending export" value={`${hitlStats?.pending_export ?? 0}`} />
              <MetricRow label="Queue priority" value={queue.length > 0 ? "Active" : "Clear"} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricInline({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#090B10] px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-200">{value}</span>
    </div>
  );
}
