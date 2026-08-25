"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { inspectionsApi, hitlApi } from "@/lib/api";
import { useInspectionStore } from "@/lib/store/inspections";

const lines = [
  "Production Line 1A",
  "Production Line 1B",
  "Production Line 2A",
  "Production Line 2B",
  "Pilot Fabrika Hatti",
  "Production Line 3B",
  "Production Line 4A",
  "Production Line 4B",
  "Waste",
];

function decisionLabel(decision?: string) {
  if (decision === "pass") return "OK";
  if (decision === "fail") return "NOK";
  if (decision === "review") return "REVIEW";
  if (decision === "out_of_scope") return "SCOPE";
  if (decision === "pending") return "WAIT";
  return "--";
}

function decisionColor(decision?: string) {
  if (decision === "pass") return "border-emerald-500 bg-emerald-600 text-white";
  if (decision === "fail") return "border-red-500 bg-red-600 text-white";
  if (decision === "review") return "border-[#FF7A00] bg-[#FF7A00] text-black";
  if (decision === "out_of_scope") return "border-slate-300 bg-slate-100 text-slate-700";
  return "border-slate-300 bg-slate-600 text-white";
}

function frameColor(decision?: string) {
  if (decision === "pass") return "border-emerald-500";
  if (decision === "fail") return "border-red-500";
  if (decision === "review") return "border-[#FF7A00]";
  if (decision === "out_of_scope") return "border-slate-300";
  return "border-slate-400";
}

function decisionText(decision?: string) {
  if (decision === "pass") return "text-emerald-700";
  if (decision === "fail") return "text-red-700";
  if (decision === "review") return "text-orange-700";
  if (decision === "out_of_scope") return "text-slate-500";
  return "text-slate-500";
}

export default function DashboardPage() {
  const { inspections, stats, fetchInspections, fetchStats, isLoading } = useInspectionStore();
  const [activeLine, setActiveLine] = useState("Pilot Fabrika Hatti");
  const [query, setQuery] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pendingReviews, setPendingReviews] = useState(0);

  const refresh = async () => {
    await Promise.all([
      fetchInspections(),
      fetchStats(),
      hitlApi.stats().then(({ data }) => setPendingReviews(data.pending_reviews ?? 0)).catch(() => undefined),
    ]);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5_000);
    return () => clearInterval(interval);
  }, [fetchInspections, fetchStats]);

  const latest = inspections[0];
  const recent = inspections.slice(0, 6);
  const passRate = stats ? Math.round(stats.pass_rate * 100) : 0;
  const filteredLines = useMemo(
    () => lines.filter((line) => line.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  useEffect(() => {
    let active = true;
    let nextUrl: string | null = null;

    if (!latest?.id) {
      setImageUrl(null);
      return () => undefined;
    }

    inspectionsApi.image(latest.id).then(({ data }) => {
      if (!active) return;
      nextUrl = URL.createObjectURL(data);
      setImageUrl(nextUrl);
    }).catch(() => {
      if (active) setImageUrl(null);
    });

    return () => {
      active = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [latest?.id]);

  return (
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search line"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredLines.map((line) => (
              <button
                key={line}
                onClick={() => setActiveLine(line)}
                className={`flex w-full items-center justify-between px-5 py-4 text-left text-lg transition ${
                  activeLine === line ? "bg-[#063f63] text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{line}</span>
                {line === "Pilot Fabrika Hatti" && (
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    activeLine === line ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-700"
                  }`}>
                    live
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <main className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-sm font-semibold uppercase text-slate-500">Quality control view</p>
              <h1 className="mt-1 text-3xl font-semibold text-[#0b1020]">{activeLine}</h1>
            </div>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </header>

          <section className="p-6">
            <div className="relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-xl bg-slate-50">
              {imageUrl ? (
                <img src={imageUrl} alt="Latest inspection" className="max-h-[560px] w-full object-contain" />
              ) : (
                <div className="text-center text-slate-400">
                  <ClipboardCheck className="mx-auto" size={44} />
                  <p className="mt-3 text-sm">Telefondan muayene fotografi bekleniyor</p>
                </div>
              )}

              {latest && imageUrl && latest.decision !== "out_of_scope" && (
                <div className={`absolute inset-x-[12%] top-[18%] bottom-[12%] rounded-md border-[6px] shadow-[0_10px_35px_rgba(15,23,42,.2)] ${frameColor(latest.decision)}`}>
                  <div className={`absolute -bottom-1 left-0 rounded-tr-md px-4 py-2 text-2xl font-black ${decisionColor(latest.decision)}`}>
                    {decisionLabel(latest.decision)}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase text-slate-500">Current inspection</p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <p className={`text-5xl font-black ${decisionText(latest?.decision)}`}>
                  {decisionLabel(latest?.decision)}
                </p>
                <p className="mt-2 font-mono text-xs text-slate-400">{latest?.id?.slice(0, 8) ?? "no record"}</p>
              </div>
              {latest?.decision === "pass" ? (
                <CheckCircle2 className="text-emerald-600" size={34} />
              ) : (
                <XCircle className={latest ? "text-red-600" : "text-slate-300"} size={34} />
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Confidence</p>
                <p className="mt-1 text-2xl font-semibold text-[#0b1020]">
                  {latest?.decision !== "out_of_scope" && latest?.confidence ? `${Math.round(latest.confidence * 100)}%` : "--"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Pass rate</p>
                <p className="mt-1 text-2xl font-semibold text-[#0b1020]">{passRate}%</p>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              {latest?.decision === "out_of_scope"
                ? "Endustriyel metal parca algilanmadi; AI puanlama yapmadi."
                : latest?.defects?.map((defect) => defect.class_name).join(", ") || "Henuz hata etiketi yok"}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase text-slate-500">Pilot health</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-semibold">{stats?.total ?? 0}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Review</p>
                <p className="mt-1 text-2xl font-semibold text-amber-800">{pendingReviews}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold uppercase text-slate-500">Recent activity</p>
            <div className="space-y-2">
              {recent.length === 0 ? (
                <p className="text-sm text-slate-400">Kayit bekleniyor.</p>
              ) : recent.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-slate-600">{item.id.slice(0, 8)}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{format(new Date(item.created_at), "HH:mm:ss")}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-black ${decisionColor(item.decision)}`}>
                    {decisionLabel(item.decision)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
