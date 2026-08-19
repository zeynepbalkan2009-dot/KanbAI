"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  MonitorCheck,
  RefreshCw,
  Search,
  Smartphone,
  XCircle,
} from "lucide-react";
import { inspectionsApi } from "@/lib/api";
import { useInspectionStore } from "@/lib/store/inspections";

const lines = [
  "Production Line 1A",
  "Production Line 1B",
  "Production Line 2A",
  "Production Line 2B",
  "GERMAKSAN Pilot Line",
  "Production Line 3B",
  "Production Line 4A",
  "Production Line 4B",
  "Waste",
];

function decisionLabel(decision?: string) {
  if (decision === "pass") return "OK";
  if (decision === "fail") return "NOK";
  if (decision === "review") return "REVIEW";
  if (decision === "pending") return "WAIT";
  return "--";
}

function decisionClasses(decision?: string) {
  if (decision === "pass") return "border-emerald-500 text-emerald-300";
  if (decision === "fail") return "border-red-500 text-red-300";
  if (decision === "review") return "border-[#FF7A00] text-orange-300";
  return "border-white/25 text-white/55";
}

function frameClasses(decision?: string) {
  if (decision === "pass") return "border-emerald-500 text-emerald-500";
  if (decision === "fail") return "border-red-500 text-red-500";
  if (decision === "review") return "border-[#FF7A00] text-[#FF7A00]";
  return "border-white/30 text-white/50";
}

export default function DashboardPage() {
  const { inspections, stats, fetchInspections, fetchStats, isLoading } = useInspectionStore();
  const [activeLine, setActiveLine] = useState("GERMAKSAN Pilot Line");
  const [query, setQuery] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchInspections();
    fetchStats();
    const interval = setInterval(() => {
      fetchInspections();
      fetchStats();
    }, 8_000);
    return () => clearInterval(interval);
  }, [fetchInspections, fetchStats]);

  const latest = inspections[0];
  const recent = inspections.slice(0, 7);
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
    <div className="min-h-full bg-[#090B10] p-4 text-white md:p-6">
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[330px_minmax(0,1fr)_300px]">
        <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f131c]">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <Search size={16} className="text-white/35" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search line"
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
              />
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {filteredLines.map((line) => (
              <button
                key={line}
                onClick={() => setActiveLine(line)}
                className={`flex w-full items-center justify-between px-5 py-4 text-left text-sm transition ${
                  activeLine === line ? "bg-[#00C2FF]/12 text-[#8de9ff]" : "text-white/65 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span>{line}</span>
                {line === "GERMAKSAN Pilot Line" && (
                  <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                    live
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <main className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f131c]">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00C2FF]">Quality view</p>
              <h1 className="mt-1 text-2xl font-semibold">{activeLine}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchInspections();
                  fetchStats();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
              <Link
                href="/dashboard/hitl"
                className="inline-flex items-center gap-2 rounded-xl bg-[#00C2FF] px-4 py-2 text-sm font-bold text-black"
              >
                <ClipboardCheck size={16} />
                Review
              </Link>
            </div>
          </header>

          <section className="p-5">
            <div className="relative min-h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-black">
              {imageUrl ? (
                <img src={imageUrl} alt="Latest inspection" className="h-full min-h-[520px] w-full object-contain" />
              ) : (
                <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 text-white/40">
                  <MonitorCheck size={38} />
                  <p className="text-sm">Telefon fotografi bekleniyor</p>
                </div>
              )}

              {latest && imageUrl && (
                <div className={`absolute inset-8 rounded-2xl border-[6px] shadow-[0_0_40px_rgba(0,0,0,.45)] backdrop-blur-[1px] ${frameClasses(latest.decision)}`}>
                  <div className={`absolute -bottom-1 left-0 rounded-tr-xl px-4 py-2 text-2xl font-black ${latest.decision === "fail" ? "bg-red-600 text-white" : latest.decision === "review" ? "bg-[#FF7A00] text-black" : "bg-emerald-600 text-white"}`}>
                    {decisionLabel(latest.decision)}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Current inspection</p>
            <div className={`mt-4 rounded-2xl border p-4 ${decisionClasses(latest?.decision)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-4xl font-black">{decisionLabel(latest?.decision)}</p>
                  <p className="mt-2 font-mono text-xs text-white/45">{latest?.id?.slice(0, 8) ?? "no record"}</p>
                </div>
                {latest?.decision === "pass" ? <CheckCircle2 size={30} /> : <XCircle size={30} />}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-white/40">Guven</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {latest?.confidence ? `${Math.round(latest.confidence * 100)}%` : "--"}
                  </p>
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-white/40">Pass rate</p>
                  <p className="mt-1 text-xl font-semibold text-white">{passRate}%</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/55">
                {latest?.defects?.map((defect) => defect.class_name).join(", ") || "Henuz hata etiketi yok"}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Activity</p>
            <div className="space-y-2">
              {recent.length === 0 ? (
                <p className="text-sm text-white/40">Kayit bekleniyor.</p>
              ) : recent.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-white/70">{item.id.slice(0, 8)}</p>
                    <p className="mt-0.5 text-[11px] text-white/35">{format(new Date(item.created_at), "HH:mm:ss")}</p>
                  </div>
                  <span className={`rounded-md border px-2 py-1 text-xs font-black ${decisionClasses(item.decision)}`}>
                    {decisionLabel(item.decision)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Phone input</p>
            <p className="text-sm leading-6 text-white/55">
              Fotograf sadece telefondaki operator ekranindan gelir.
            </p>
            <Link
              href="/dashboard/capture"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10"
            >
              <Smartphone size={16} />
              Telefon linki
              <ExternalLink size={14} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
