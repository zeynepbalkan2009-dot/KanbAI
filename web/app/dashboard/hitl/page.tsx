"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, Database, FileText,
  MessageSquareText, RefreshCw, ScanLine, Search, ShieldCheck, Tag,
  TimerReset, UserRoundCheck, XCircle,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { hitlApi, inspectionsApi } from "@/lib/api";

type QueueItem = {
  id: string;
  device_id: string;
  decision: "review" | "fail" | "pass" | "pending" | "error" | "out_of_scope";
  confidence?: number | null;
  defects?: Array<{ class_name: string; confidence: number; bbox?: number[] }>;
  image_key: string;
  created_at: string;
  product: {
    product_id?: string | null;
    sku?: string | null;
    product_name?: string | null;
    revision?: string | null;
    industry_domain?: "steel_equipment" | "battery_assembly" | null;
    operation_stage?: string | null;
    defect_classes: string[];
    allowed_labels: string[];
  };
};

type HitlStats = {
  pending_reviews: number;
  completed_reviews: number;
  dataset_contributions: number;
};

type InboxFilter = "all" | "pass" | "fail" | "review" | "out_of_scope";

function DecisionBadge({ decision }: { decision: string }) {
  const classes: Record<string, string> = {
    fail: "border-red-200 bg-red-50 text-red-700",
    review: "border-amber-200 bg-amber-50 text-amber-700",
    pass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    out_of_scope: "border-slate-200 bg-slate-100 text-slate-600",
    pending: "border-slate-200 bg-slate-50 text-slate-500",
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[decision] ?? classes.pending}`}>
      {decision === "out_of_scope" ? "OUT OF SCOPE" : decision.toUpperCase()}
    </span>
  );
}

function filterLabel(filter: InboxFilter) {
  if (filter === "out_of_scope") return "Scope";
  return filter;
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{label}</p>
        <Icon className={tone} size={17} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-[#0b1020]">{value}</p>
    </div>
  );
}

function casePriority(item?: QueueItem) {
  if (!item) return "Normal";
  if (item.decision === "out_of_scope") return "Scope check";
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
  const [correctedLabel, setCorrectedLabel] = useState("good");
  const [notes, setNotes] = useState("Confirmed defect. Add to retraining dataset and monitor recurrence on Line 1.");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [query, setQuery] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);

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
  const labelOptions = selected?.product?.allowed_labels?.length
    ? selected.product.allowed_labels
    : ["good", "unclassified_defect", "out_of_scope"];

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
    const modelLabel = selected?.defects?.[0]?.class_name;
    setCorrectedLabel(
      modelLabel && labelOptions.includes(modelLabel)
        ? modelLabel
        : "good",
    );
  }, [selected?.id]);

  useEffect(() => {
    let active = true;
    let nextUrl: string | null = null;

    if (!selected?.id) {
      setEvidenceUrl(null);
      return () => undefined;
    }

    inspectionsApi.image(selected.id).then(({ data }) => {
      if (!active) return;
      nextUrl = URL.createObjectURL(data);
      setEvidenceUrl(nextUrl);
    }).catch(() => {
      if (active) setEvidenceUrl(null);
    });

    return () => {
      active = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [selected?.id]);

  const submit = async (decision: "pass" | "fail" | "out_of_scope") => {
    if (!selected) return;
    if (decision === "fail" && ["good", "out_of_scope"].includes(correctedLabel)) {
      toast.error("Kusurlu karari icin urun profilinden bir kusur etiketi secin");
      return;
    }
    setSubmitting(true);
    try {
      await hitlApi.review(selected.id, {
        decision,
        corrected_label: decision === "pass" ? "good" : decision === "out_of_scope" ? "out_of_scope" : correctedLabel,
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
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-sky-600">Quality CRM</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#0b1020]">Review Queue</h1>
            <p className="mt-1 text-sm text-slate-500">
              Telefondan gelen parcalari onayla, etiketi duzelt ve veri setine ekle.
            </p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="Open cases" value={stats?.pending_reviews ?? queue.length} icon={TimerReset} tone="text-amber-600" />
          <Stat label="Closed reviews" value={stats?.completed_reviews ?? 0} icon={UserRoundCheck} tone="text-emerald-600" />
          <Stat label="Dataset records" value={stats?.dataset_contributions ?? 0} icon={Database} tone="text-sky-600" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)_350px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b1020]">
                  <ClipboardCheck size={16} />
                  Case inbox
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{filteredQueue.length}</span>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <Search size={15} className="text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search case or defect"
                  className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:grid-cols-5">
                {(["all", "pass", "fail", "review", "out_of_scope"] as InboxFilter[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium capitalize ${
                      filter === item ? "bg-white text-[#0b1020] shadow-sm" : "text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    {filterLabel(item)}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[650px] overflow-y-auto p-2">
              {filteredQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-400">
                  <CheckCircle2 size={28} />
                  <p className="text-sm">No open cases</p>
                </div>
              ) : filteredQueue.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                    selected?.id === item.id ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <DecisionBadge decision={item.decision} />
                      <p className="mt-2 font-mono text-xs text-slate-700">{item.id.split("-")[0]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-900">{item.decision !== "out_of_scope" && item.confidence ? `${Math.round(item.confidence * 100)}%` : "--"}</p>
                      <p className="mt-1 text-xs text-slate-400">{casePriority(item)}</p>
                    </div>
                  </div>
                  <p className="truncate text-xs text-slate-500">{item.defects?.map((d) => d.class_name).join(", ") || "No label"}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>Owner: Quality team</span>
                    <span>{ageLabel(item)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b1020]">
                  <ScanLine size={16} />
                  Case evidence
                </h2>
                <p className="mt-1 font-mono text-xs text-slate-400">{selected?.id ?? "No case selected"}</p>
                {selected?.product?.sku && (
                  <p className="mt-1 text-xs font-medium text-sky-700">
                    {selected.product.sku} / {selected.product.product_name} {selected.product.revision ? `/ ${selected.product.revision}` : ""}
                  </p>
                )}
              </div>
              {selected && <DecisionBadge decision={selected.decision} />}
            </div>

            <div className="relative aspect-[16/10] bg-slate-50">
              {evidenceUrl ? (
                <img src={evidenceUrl} alt="Inspection evidence" className="h-full w-full object-contain" />
              ) : (
                <div className="absolute inset-8 rounded-[28px] border border-slate-200 bg-white shadow-inner" />
              )}
              {selected?.decision !== "out_of_scope" && (
                <div className={`absolute left-[19%] top-[31%] h-[29%] w-[38%] rounded-lg border-2 ${
                  selected?.decision === "pass" ? "border-emerald-500" : selected?.decision === "fail" ? "border-red-500" : "border-[#FF7A00]"
                }`}>
                  <span className={`-mt-8 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                    selected?.decision === "pass" ? "bg-emerald-600 text-white" : selected?.decision === "fail" ? "bg-red-600 text-white" : "bg-[#FF7A00] text-black"
                  }`}>
                    {selected?.defects?.[0]?.class_name ?? (selected?.decision === "pass" ? "good part" : "unlabeled anomaly")} {selected?.confidence ? Math.round(selected.confidence * 100) : 91}%
                  </span>
                </div>
              )}
              <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur">
                <p className="text-xs text-slate-600">{selected?.image_key ?? "Queue is empty"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selected?.defects ?? []).map((defect) => (
                    <span key={`${defect.class_name}-${defect.confidence}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                      {defect.class_name} {Math.round(defect.confidence * 100)}%
                    </span>
                  ))}
                  {selected?.decision === "out_of_scope" && (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      not an industrial metal part
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 border-t border-slate-200 p-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Priority</p>
                <p className="mt-1 text-sm font-semibold text-[#0b1020]">{casePriority(selected)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">SLA age</p>
                <p className="mt-1 text-sm font-semibold text-[#0b1020]">{ageLabel(selected)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Next step</p>
                <p className="mt-1 text-sm font-semibold text-[#0b1020]">
                  {selected?.decision === "out_of_scope" ? "Reject from AI scoring" : "Human validation"}
                </p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0b1020]">
                <Tag size={16} />
                Case fields
              </h2>
              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-500">Correct label</span>
                <select value={correctedLabel} onChange={(event) => setCorrectedLabel(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#00C2FF]">
                  {labelOptions.map((label) => <option key={label} value={label}>{label}</option>)}
                </select>
              </label>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p><b>Domain:</b> {selected?.product?.industry_domain ?? "not configured"}</p>
                <p className="mt-1"><b>Operation:</b> {selected?.product?.operation_stage ?? "not configured"}</p>
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs text-slate-500">Resolution notes</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#00C2FF]" />
              </label>
              <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700">
                <Database className="mr-2 inline" size={14} />
                Dataset contribution: YES
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0b1020]">
                <ShieldCheck size={16} />
                Close case
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button disabled={!selected || submitting} onClick={() => submit("pass")} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40">
                  <CheckCircle2 className="mx-auto mb-1" size={20} /> Uygun (PASS)
                </button>
                <button disabled={!selected || submitting} onClick={() => submit("fail")} className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40">
                  <XCircle className="mx-auto mb-1" size={20} /> Kusurlu (FAIL)
                </button>
                <button disabled={!selected || submitting} onClick={() => submit("out_of_scope")} className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40">
                  <AlertTriangle className="mr-2 inline" size={18} /> Kapsam disi
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0b1020]">
                <MessageSquareText size={16} />
                Activity
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex gap-3">
                  <Clock3 size={14} className="mt-0.5 text-slate-400" />
                  <div>
                    <p className="text-slate-700">Pilot sample is waiting for human review</p>
                    <p className="mt-0.5 text-slate-400">{ageLabel(selected)}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <FileText size={14} className="mt-0.5 text-slate-400" />
                  <div>
                    <p className="text-slate-700">Dataset record will be created on close</p>
                    <p className="mt-0.5 text-slate-400">Pending quality decision</p>
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
