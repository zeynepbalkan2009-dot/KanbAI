"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useInspectionStore } from "@/lib/store/inspections";
import { devicesApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  AlertTriangle, CheckCircle2, FileImage, Filter, RefreshCw,
  Search, Smartphone, XCircle,
} from "lucide-react";
import { format } from "date-fns";

interface Device {
  id: string;
  name: string;
  location_label?: string;
}

type FilterKey = "all" | "fail" | "review" | "pass" | "pending";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "fail", label: "Defects" },
  { key: "review", label: "Needs review" },
  { key: "pass", label: "Passed" },
  { key: "pending", label: "Processing" },
];

function DecisionBadge({ decision }: { decision: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    pass: { label: "PASS", cls: "decision-pass" },
    fail: { label: "FAIL", cls: "decision-fail" },
    review: { label: "REVIEW", cls: "decision-review" },
    pending: { label: "PENDING", cls: "decision-pending" },
    error: { label: "ERROR", cls: "decision-error" },
  };
  const { label, cls } = cfg[decision] ?? { label: decision.toUpperCase(), cls: "decision-pending" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

function nextAction(decision: string, operatorDecision?: string) {
  if (operatorDecision) return "Closed";
  if (decision === "fail" || decision === "review") return "Quality review";
  if (decision === "pending") return "AI processing";
  if (decision === "error") return "Retry required";
  return "No action";
}

export default function InspectionsPage() {
  const { inspections, fetchInspections, reviewInspection, isLoading } = useInspectionStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchInspections();
    devicesApi.list().then(({ data }) => {
      setDevices(data);
      if (data.length > 0) setSelectedDevice(data[0].id);
    });
  }, [fetchInspections]);

  const filtered = useMemo(() => {
    return inspections.filter((item) => {
      const matchesFilter = activeFilter === "all" || item.decision === activeFilter;
      const matchesQuery = !query.trim()
        || item.id.toLowerCase().includes(query.toLowerCase())
        || item.defects?.some((d) => d.class_name.toLowerCase().includes(query.toLowerCase()));
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, inspections, query]);

  const handleReview = async (id: string, decision: "pass" | "fail") => {
    await reviewInspection(id, decision);
    toast.success(`Review saved: ${decision.toUpperCase()}`);
  };

  return (
    <div className="min-h-full bg-[#090B10] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00C2FF]">Inspection CRM</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Inspections</h1>
            <p className="mt-1 text-sm text-white/45">Search, triage, and close factory quality records.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/capture" className="inline-flex items-center gap-2 rounded-lg bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-black hover:bg-[#ff8c22]">
              <Smartphone size={16} />
              Telefon linki
            </Link>
            <button onClick={() => fetchInspections()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-2xl border border-white/10 bg-[#0f131c] p-4 xl:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                <Search size={15} className="text-white/35" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search inspection ID or defect label"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
              </div>
              <div className="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      activeFilter === filter.key ? "bg-white/10 text-white" : "text-white/45 hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-4">
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Filter size={15} />
              {filtered.length} visible records from {inspections.length}
            </div>
            <select
              value={selectedDevice}
              onChange={(event) => setSelectedDevice(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#151a24] px-3 py-2 text-sm text-white outline-none focus:border-[#00C2FF]"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} {device.location_label ? `- ${device.location_label}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/35">
                  {["Record", "Decision", "Confidence", "Defects", "Owner", "Next action", "Created", ""].map((head) => (
                    <th key={head} className="px-3 py-3 font-medium">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.03]">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-white/5 p-2 text-white/45">
                          <FileImage size={15} />
                        </div>
                        <div>
                          <p className="font-mono text-xs text-white">{item.id.split("-")[0]}</p>
                          <p className="mt-0.5 text-xs text-white/35">{item.image_key?.split("/").pop() ?? "image"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><DecisionBadge decision={item.decision} /></td>
                    <td className="px-3 py-3 text-white/70">{item.confidence ? `${Math.round(item.confidence * 100)}%` : "--"}</td>
                    <td className="px-3 py-3 text-white/60">{item.defects?.map((d) => d.class_name).join(", ") || "None"}</td>
                    <td className="px-3 py-3 text-white/55">Quality team</td>
                    <td className="px-3 py-3 text-white/70">{nextAction(item.decision, item.operator_decision)}</td>
                    <td className="px-3 py-3 text-xs text-white/40">{format(new Date(item.created_at), "dd/MM HH:mm")}</td>
                    <td className="px-3 py-3">
                      {(item.decision === "review" || item.decision === "fail") && !item.operator_decision ? (
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleReview(item.id, "pass")} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-300 hover:bg-emerald-500/20" title="Approve">
                            <CheckCircle2 size={14} />
                          </button>
                          <button onClick={() => handleReview(item.id, "fail")} className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-300 hover:bg-red-500/20" title="Reject">
                            <XCircle size={14} />
                          </button>
                        </div>
                      ) : item.decision === "error" ? (
                        <AlertTriangle className="ml-auto text-red-300" size={16} />
                      ) : null}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-white/35">
                      No matching inspections.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
