"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, Database, FileText,
  MessageSquareText, RefreshCw, ScanLine, Search, ShieldCheck, Tag,
  TimerReset, UserRoundCheck, XCircle,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { hitlApi } from "@/lib/api";

type QueueItem = {
  id: string;
  device_id: string;
  decision: "review" | "fail" | "pass" | "pending" | "error";
  confidence?: number;
  defects?: Array<{ class_name: string; confidence: number; bbox?: number[] }>;
  image_key: string;
  created_at: string;
};

type HitlStats = {
  pending_reviews: number;
  completed_reviews: number;
  dataset_contributions: number;
};

type InboxFilter = "all" | "fail" | "review";

const labelOptions = ["crack", "edge_chip", "scratch", "dent", "surface_void", "good"];

function DecisionBadge({ decision }: { decision: string }) {
  const classes: Record<string, string> = {
    fail: "border-red-500/30 bg-red-500/10 text-red-300",
    review: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    pass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    pending: "border-white/10 bg-white/5 text-white/50",
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[decision] ?? classes.pending}`}>
      {decision.toUpperCase()}
    </span>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f131c] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/45">{label}</p>
        <Icon className={tone} size={17} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function casePriority(item?: QueueItem) {
  if (!item) return "Normal";
  if (item.decision === "fail" && (item.confidence ?? 0) >= 0.9) return "P1 Critical";
  if (item.decision === "fail") return "P2 High";
  return "P3 Review";
}

function ageLabel(item?: QueueItem) {
  if (!item?.created_at) return "--";
  return formatDistanceToNowStrict(new Date(item.created_at), { addSuffix: true });
}

export default function HitlPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<HitlStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correctedLabel, setCorrectedLabel] = useState("crack");
  const [notes, setNotes] = useState("Confirmed defect. Add to retraining dataset and monitor recurrence on Line 1.");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [query, setQuery] = useState("");

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchesFilter = filter === "all" || item.decision === filter;
      const matchesQuery = !query.trim()
        || item.id.toLowerCase().includes(query.toLowerCase())
        || item.defects?.some((defect) => defect.class_name.toLowerCase().includes(query.toLowerCase()));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, queue]);

  const selected = useMemo(
    () => filteredQueue.find((item) => item.id === selectedId) ?? filteredQueue[0],
    [filteredQueue, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([hitlApi.queue(), hitlApi.stats()]);
      setQueue(queueRes.data);
      setStats(statsRes.data);
      setSelectedId((current) => current ?? queueRes.data[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selected?.defects?.[0]?.class_name) {
      setCorrectedLabel(selected.defects[0].class_name);
    }
  }, [selected?.id]);

  const submit = async (decision: "pass" | "fail" | "wrong_prediction" | "needs_retrain") => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await hitlApi.review(selected.id, {
        decision,
        corrected_label: correctedLabel,
        notes,
        dataset_contribution: true,
      });
      toast.success("Case closed and added to dataset");
      setQueue((items) => items.filter((item) => item.id !== selected.id));
      setSelectedId(null);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Review could not be saved");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-[#090B10] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00C2FF]">Quality CRM</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Review Queue</h1>
            <p className="mt-1 text-sm text-white/50">
              Triage AI exceptions, correct labels, and convert inspections into governed training data.
            </p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="Open cases" value={stats?.pending_reviews ?? queue.length} icon={TimerReset} tone="text-amber-300" />
          <Stat label="Closed reviews" value={stats?.completed_reviews ?? 0} icon={UserRoundCheck} tone="text-emerald-300" />
          <Stat label="Dataset records" value={stats?.dataset_contributions ?? 0} icon={Database} tone="text-[#00C2FF]" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)_350px]">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f131c]">
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <ClipboardCheck size={16} />
                  Case inbox
                </h2>
                <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/45">{filteredQueue.length}</span>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <Search size={15} className="text-white/35" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search case or defect"
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                {(["all", "fail", "review"] as InboxFilter[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium capitalize ${
                      filter === item ? "bg-white/10 text-white" : "text-white/45 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[650px] overflow-y-auto p-2">
              {filteredQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-white/40">
                  <CheckCircle2 size={28} />
                  <p className="text-sm">No open cases</p>
                </div>
              ) : filteredQueue.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                    selected?.id === item.id ? "border-[#00C2FF]/45 bg-[#00C2FF]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <DecisionBadge decision={item.decision} />
                      <p className="mt-2 font-mono text-xs text-white/70">{item.id.split("-")[0]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-white">{Math.round((item.confidence ?? 0) * 100)}%</p>
                      <p className="mt-1 text-xs text-white/35">{casePriority(item)}</p>
                    </div>
                  </div>
                  <p className="truncate text-xs text-white/45">{item.defects?.map((d) => d.class_name).join(", ") || "No label"}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-white/35">
                    <span>Owner: Quality team</span>
                    <span>{ageLabel(item)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f131c]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <ScanLine size={16} />
                  Case evidence
                </h2>
                <p className="mt-1 font-mono text-xs text-white/35">{selected?.id ?? "No case selected"}</p>
              </div>
              {selected && <DecisionBadge decision={selected.decision} />}
            </div>

            <div className="relative aspect-[16/10] bg-[radial-gradient(circle_at_40%_35%,#202633,#07080c_70%)]">
              <div className="absolute inset-8 rounded-[28px] border border-white/10 bg-black/20 shadow-inner" />
              <div className="absolute left-[19%] top-[31%] h-[29%] w-[38%] rounded-lg border-2 border-[#FF7A00] bg-[#FF7A00]/10 shadow-[0_0_35px_rgba(255,122,0,.25)]">
                <span className="-mt-8 inline-flex rounded-md bg-[#FF7A00] px-2 py-1 text-xs font-semibold text-black">
                  {selected?.defects?.[0]?.class_name ?? "crack"} {selected?.confidence ? Math.round(selected.confidence * 100) : 91}%
                </span>
              </div>
              <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/10 bg-black/50 p-3 backdrop-blur">
                <p className="text-xs text-white/65">{selected?.image_key ?? "Queue is empty"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selected?.defects ?? []).map((defect) => (
                    <span key={`${defect.class_name}-${defect.confidence}`} className="rounded-full border border-[#FF7A00]/25 bg-[#FF7A00]/10 px-2 py-1 text-xs text-[#ffd1a3]">
                      {defect.class_name} {Math.round(defect.confidence * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-3">
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-white/40">Priority</p>
                <p className="mt-1 text-sm font-semibold text-white">{casePriority(selected)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-white/40">SLA age</p>
                <p className="mt-1 text-sm font-semibold text-white">{ageLabel(selected)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-white/40">Next step</p>
                <p className="mt-1 text-sm font-semibold text-white">Human validation</p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-5">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                <Tag size={16} />
                Case fields
              </h2>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/45">Correct label</span>
                <select value={correctedLabel} onChange={(event) => setCorrectedLabel(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#151a24] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00C2FF]">
                  {labelOptions.map((label) => <option key={label} value={label}>{label}</option>)}
                </select>
              </label>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs text-white/45">Resolution notes</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full resize-none rounded-lg border border-white/10 bg-[#151a24] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00C2FF]" />
              </label>
              <div className="mt-4 rounded-lg border border-[#00C2FF]/25 bg-[#00C2FF]/10 p-3 text-xs text-[#b9efff]">
                <Database className="mr-2 inline" size={14} />
                Dataset contribution: YES
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-5">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck size={16} />
                Close case
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button disabled={!selected || submitting} onClick={() => submit("pass")} className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-40">
                  <CheckCircle2 className="mx-auto mb-1" size={20} /> Approve
                </button>
                <button disabled={!selected || submitting} onClick={() => submit("fail")} className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/15 disabled:opacity-40">
                  <XCircle className="mx-auto mb-1" size={20} /> Reject
                </button>
                <button disabled={!selected || submitting} onClick={() => submit("wrong_prediction")} className="col-span-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-500/15 disabled:opacity-40">
                  <AlertTriangle className="mr-2 inline" size={18} /> Wrong prediction
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-5">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                <MessageSquareText size={16} />
                Activity
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex gap-3">
                  <Clock3 size={14} className="mt-0.5 text-white/35" />
                  <div>
                    <p className="text-white/70">AI flagged case for review</p>
                    <p className="mt-0.5 text-white/35">{ageLabel(selected)}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <FileText size={14} className="mt-0.5 text-white/35" />
                  <div>
                    <p className="text-white/70">Dataset record will be created on close</p>
                    <p className="mt-0.5 text-white/35">Pending quality decision</p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
