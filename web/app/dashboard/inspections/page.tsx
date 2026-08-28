"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  FileImage,
  Filter,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { devicesApi, hitlApi, inspectionsApi } from "@/lib/api";
import { useInspectionStore, type Inspection } from "@/lib/store/inspections";

interface Device {
  id: string;
  name: string;
  location_label?: string;
}

type FilterKey = "all" | "fail" | "review" | "pass" | "pending" | "out_of_scope";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "fail", label: "Defects" },
  { key: "review", label: "Needs review" },
  { key: "pass", label: "Passed" },
  { key: "out_of_scope", label: "Out of scope" },
  { key: "pending", label: "Processing" },
];

function decisionBadgeClasses(decision: string) {
  if (decision === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (decision === "fail") return "border-red-200 bg-red-50 text-red-700";
  if (decision === "review") return "border-amber-200 bg-amber-50 text-amber-700";
  if (decision === "out_of_scope") return "border-slate-200 bg-slate-100 text-slate-600";
  if (decision === "error") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function DecisionBadge({ decision }: { decision: string }) {
  const label = decision === "fail" ? "FAIL" : decision === "pass" ? "PASS" : decision === "out_of_scope" ? "OUT OF SCOPE" : decision.toUpperCase();
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${decisionBadgeClasses(decision)}`}>
      {label}
    </span>
  );
}

function nextAction(decision: string, operatorDecision?: string) {
  if (operatorDecision) return "Closed";
  if (decision === "pending") return "AI processing";
  if (decision === "error") return "Retry required";
  if (decision === "out_of_scope") return "Human scope review";
  return "Human quality review";
}

function defectLabel(item?: Inspection | null) {
  if (item?.decision === "out_of_scope") return "Outside configured product scope";
  return item?.defects?.map((d) => d.class_name).join(", ") || "No defect label";
}

export default function InspectionsPage() {
  const { inspections, fetchInspections, fetchStats, isLoading } = useInspectionStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Inspection | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const refresh = async () => {
    await Promise.all([
      fetchInspections(),
      fetchStats(),
      devicesApi.list().then(({ data }) => setDevices(data)).catch(() => undefined),
    ]);
  };

  useEffect(() => {
    refresh();
  }, [fetchInspections, fetchStats]);

  const filtered = useMemo(() => {
    return inspections.filter((item) => {
      const matchesDevice = !selectedDevice || item.device_id === selectedDevice;
      const matchesFilter = activeFilter === "all" || item.decision === activeFilter;
      const matchesQuery = !query.trim()
        || item.id.toLowerCase().includes(query.toLowerCase())
        || item.image_key?.toLowerCase().includes(query.toLowerCase())
        || item.defects?.some((d) => d.class_name.toLowerCase().includes(query.toLowerCase()));
      return matchesDevice && matchesFilter && matchesQuery;
    });
  }, [activeFilter, inspections, query, selectedDevice]);

  useEffect(() => {
    let active = true;
    let nextUrl: string | null = null;

    if (!selected?.id) {
      setImageUrl(null);
      return () => undefined;
    }

    inspectionsApi.image(selected.id).then(({ data }) => {
      if (!active) return;
      nextUrl = URL.createObjectURL(data);
      setImageUrl(nextUrl);
    }).catch(() => {
      if (active) {
        setImageUrl(null);
        toast.error("Resim yuklenemedi");
      }
    });

    return () => {
      active = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [selected?.id]);

  const handleReview = async (item: Inspection, decision: "pass" | "fail") => {
    setSubmittingReview(true);
    try {
      await hitlApi.review(item.id, {
        decision,
        corrected_label: item.defects?.[0]?.class_name ?? decision,
        notes: decision === "pass" ? "Quality reviewer approved this pilot sample." : "Quality reviewer rejected this pilot sample.",
        dataset_contribution: true,
      });
      toast.success(`Onay kaydedildi: ${decision.toUpperCase()}`);
      await refresh();
      setSelected((current) => current?.id === item.id ? { ...current, operator_decision: decision } : current);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Onay kaydedilemedi");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-sky-600">Inspection CRM</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#0b1020]">Muayene Kayitlari</h1>
            <p className="mt-1 text-sm text-slate-500">
              Telefondan gelen her kaydi ac, fotografi incele ve kalite kararini ver.
            </p>
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <Search size={15} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search inspection ID, image name or defect"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <select
              value={selectedDevice}
              onChange={(event) => setSelectedDevice(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#00C2FF]"
            >
              <option value="">All devices</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} {device.location_label ? `- ${device.location_label}` : ""}
                </option>
              ))}
            </select>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    activeFilter === filter.key ? "bg-white text-[#0b1020] shadow-sm" : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
            <Filter size={15} />
            {filtered.length} visible records from {inspections.length}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  {["Record", "Decision", "Model signal", "Defects", "Owner", "Next action", "Created", ""].map((head) => (
                    <th key={head} className="px-3 py-3 font-medium">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(item)}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                          <FileImage size={15} />
                        </div>
                        <div>
                          <p className="font-mono text-xs text-[#0b1020]">{item.id.split("-")[0]}</p>
                          <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">{item.image_key?.split("/").pop() ?? "image"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><DecisionBadge decision={item.decision} /></td>
                    <td className="px-3 py-3 text-slate-700">{item.decision !== "out_of_scope" && item.confidence ? `${Math.round(item.confidence * 100)}%` : "--"}</td>
                    <td className="px-3 py-3 text-slate-600">{defectLabel(item)}</td>
                    <td className="px-3 py-3 text-slate-500">Quality team</td>
                    <td className="px-3 py-3 text-slate-700">{nextAction(item.decision, item.operator_decision)}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">{format(new Date(item.created_at), "dd/MM HH:mm")}</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(item);
                        }}
                        className="ml-auto flex rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                        title="Open record"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                      No matching inspections.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <aside
            className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur">
              <div>
                <p className="text-xs font-semibold uppercase text-sky-600">Inspection detail</p>
                <h2 className="mt-1 font-mono text-lg font-semibold text-[#0b1020]">{selected.id}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.image_key?.split("/").pop() ?? "image"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="relative flex min-h-[360px] items-center justify-center">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Inspection evidence" className="max-h-[520px] w-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <FileImage className="mx-auto" size={42} />
                      <p className="mt-3 text-sm">Resim yukleniyor</p>
                    </div>
                  )}
                  {imageUrl && selected.decision !== "pending" && selected.decision !== "out_of_scope" && (
                    <div className={`absolute left-[18%] top-[24%] h-[32%] w-[42%] rounded-md border-[5px] ${
                      selected.decision === "pass" ? "border-emerald-500" : selected.decision === "fail" ? "border-red-500" : "border-[#FF7A00]"
                    }`}>
                      <span className={`-mt-8 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                        selected.decision === "pass" ? "bg-emerald-600 text-white" : selected.decision === "fail" ? "bg-red-600 text-white" : "bg-[#FF7A00] text-black"
                      }`}>
                        {defectLabel(selected)} {selected.confidence ? Math.round(selected.confidence * 100) : "--"}%
                      </span>
                    </div>
                  )}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Decision</p>
                  <div className="mt-2"><DecisionBadge decision={selected.decision} /></div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Model signal (not quality score)</p>
                  <p className="mt-1 text-2xl font-semibold text-[#0b1020]">
                    {selected.decision !== "out_of_scope" && selected.confidence ? `${Math.round(selected.confidence * 100)}%` : "--"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="mt-1 text-sm font-semibold text-[#0b1020]">
                    {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">AI finding</p>
                <p className="mt-2 text-lg font-semibold text-[#0b1020]">{defectLabel(selected)}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {selected.operator_decision
                    ? `Final quality decision: ${selected.operator_decision.toUpperCase()}`
                    : selected.decision === "out_of_scope"
                      ? "Bu gorsel endustriyel metal parca olarak algilanmadi; AI puanlama yapmadi."
                    : "Pilot modda bu kayit kalite sorumlusunun onayini bekler."}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 size={14} />
                  Inference latency: {selected.inference_latency_ms ? `${selected.inference_latency_ms}ms` : "--"}
                </div>
              </section>

              {!selected.operator_decision && selected.decision !== "pending" && selected.decision !== "error" && (
                <section className="grid grid-cols-2 gap-3">
                  <button
                    disabled={submittingReview}
                    onClick={() => handleReview(selected, "pass")}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <CheckCircle2 className="mx-auto mb-1" size={22} />
                    Onayla
                  </button>
                  <button
                    disabled={submittingReview}
                    onClick={() => handleReview(selected, "fail")}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle className="mx-auto mb-1" size={22} />
                    Reddet
                  </button>
                </section>
              )}

              {selected.decision === "error" && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertTriangle className="mr-2 inline" size={16} />
                  Bu kayit icin AI islemi hata vermis. Yeniden yukleme gerekebilir.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
