"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useInspectionStore } from "@/lib/store/inspections";
import { inspectionsApi, devicesApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Upload, RefreshCw, CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";

interface Device { id: string; name: string; location_label?: string; }

function DecisionBadge({ decision }: { decision: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    pass:    { label: "GEÇTİ",      cls: "decision-pass" },
    fail:    { label: "BAŞARISIZ",  cls: "decision-fail" },
    review:  { label: "İNCELEME",   cls: "decision-review" },
    pending: { label: "BEKLİYOR",   cls: "decision-pending" },
    error:   { label: "HATA",       cls: "decision-error" },
  };
  const { label, cls } = cfg[decision] ?? { label: decision.toUpperCase(), cls: "decision-pending" };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
  );
}

export default function InspectionsPage() {
  const { inspections, fetchInspections, reviewInspection, isLoading } = useInspectionStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);

  useEffect(() => {
    fetchInspections();
    devicesApi.list().then(({ data }) => {
      setDevices(data);
      if (data.length > 0) setSelectedDevice(data[0].id);
    });
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedDevice) { toast.error("Önce cihaz seçin"); return; }
    for (const file of acceptedFiles) {
      setUploading(true);
      try {
        const { data } = await inspectionsApi.upload(selectedDevice, file);
        toast.success(`Muayene kuyruğa alındı — ID: ${data.inspection_id.split("-")[0]}`);
        fetchInspections();
      } catch (e: any) {
        toast.error(e?.response?.data?.detail ?? "Yükleme başarısız");
      } finally {
        setUploading(false);
      }
    }
  }, [selectedDevice]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: true, maxSize: 20 * 1024 * 1024,
  });

  const handleReview = async (id: string, decision: "pass" | "fail") => {
    await reviewInspection(id, decision);
    toast.success(`Operatör kararı kaydedildi: ${decision.toUpperCase()}`);
    setReviewId(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Muayeneler</h1>
          <p className="text-sm text-gray-400 mt-0.5">{inspections.length} kayıt</p>
        </div>
        <button onClick={() => fetchInspections()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800
                     hover:bg-gray-700 text-gray-300 text-sm transition">
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Yenile
        </button>
      </div>

      {/* Upload zone */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Yeni Muayene Yükle</h3>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Cihaz:</label>
          <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700
                       text-white text-sm focus:outline-none focus:border-blue-500">
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.name} {d.location_label ? `— ${d.location_label}` : ""}</option>
            ))}
          </select>
        </div>

        <div {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition
            ${isDragActive ? "border-blue-500 bg-blue-900/10" : "border-gray-700 hover:border-gray-600"}`}>
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-blue-400">
              <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Yükleniyor...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Upload size={32} />
              <p className="text-sm">
                {isDragActive ? "Bırakın!" : "Görüntü sürükleyin veya tıklayın"}
              </p>
              <p className="text-xs">JPG, PNG, WEBP • maks 20MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Inspections table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/80">
              {["ID", "Karar", "Güven", "Hata Sayısı", "Süre", "Operatör", "Tarih", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {inspections.map((insp) => (
              <tr key={insp.id} className="hover:bg-gray-800/40 transition">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                  {insp.id.split("-")[0]}
                </td>
                <td className="px-4 py-3">
                  <DecisionBadge decision={insp.decision} />
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {insp.confidence != null
                    ? `${Math.round(insp.confidence * 100)}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {insp.defects?.length ?? 0}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {insp.inference_latency_ms ? `${insp.inference_latency_ms}ms` : "—"}
                </td>
                <td className="px-4 py-3">
                  {insp.operator_decision ? (
                    <span className={`text-xs font-medium ${insp.operator_decision === "pass" ? "text-emerald-400" : "text-red-400"}`}>
                      {insp.operator_decision.toUpperCase()}
                    </span>
                  ) : insp.decision === "review" ? (
                    <span className="text-xs text-amber-400">Gerekli</span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {format(new Date(insp.created_at), "dd/MM HH:mm")}
                </td>
                <td className="px-4 py-3">
                  {(insp.decision === "review" || insp.decision === "fail") && !insp.operator_decision && (
                    <div className="flex gap-1.5">
                      <button onClick={() => handleReview(insp.id, "pass")}
                        className="p-1.5 rounded-lg bg-emerald-900/30 text-emerald-400
                                   hover:bg-emerald-900/60 transition" title="Geçti">
                        <CheckCircle size={14} />
                      </button>
                      <button onClick={() => handleReview(insp.id, "fail")}
                        className="p-1.5 rounded-lg bg-red-900/30 text-red-400
                                   hover:bg-red-900/60 transition" title="Başarısız">
                        <XCircle size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {inspections.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">
                  Henüz muayene kaydı yok. Yukarıdan görüntü yükleyin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
