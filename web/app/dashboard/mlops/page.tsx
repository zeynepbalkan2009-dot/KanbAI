"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Brain, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, TrendingDown, Database,
  Cpu, Activity, ChevronRight, Clock,
} from "lucide-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricPill({
  label, value, good, warn,
}: { label: string; value: string | number; good?: boolean; warn?: boolean }) {
  const cls = good
    ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/50"
    : warn
    ? "bg-amber-900/30 text-amber-400 border-amber-800/50"
    : "bg-gray-800/60 text-gray-300 border-gray-700/50";
  return (
    <div className={`flex flex-col px-4 py-3 rounded-lg border ${cls}`}>
      <span className="text-xs opacity-70 mb-0.5">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const cfg: Record<string, string> = {
    production: "bg-emerald-900/40 text-emerald-400 border-emerald-700/50",
    staging:    "bg-blue-900/40 text-blue-400 border-blue-700/50",
    development:"bg-gray-800/60 text-gray-400 border-gray-700/50",
    archived:   "bg-gray-900/60 text-gray-600 border-gray-800/50",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg[stage] ?? cfg.development}`}>
      {stage.toUpperCase()}
    </span>
  );
}

// ── Review item card ──────────────────────────────────────────────────────────

function ReviewCard({
  item, onDecision,
}: {
  item: ReviewItem;
  onDecision: (id: string, decision: "pass" | "fail", action: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (decision: "pass" | "fail", action: string) => {
    setSubmitting(true);
    await onDecision(item.id, decision, action);
    setSubmitting(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${item.priority <= 2 ? "bg-red-900/40 text-red-400" : "bg-amber-900/40 text-amber-400"}`}>
              P{item.priority}
            </span>
            <span className="text-xs text-gray-400">{item.device_name}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            {item.inspection_id.split("-")[0]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">AI Kararı</p>
          <p className={`text-sm font-bold ${
            item.ai_decision === "fail" ? "text-red-400" : "text-amber-400"
          }`}>
            {item.ai_decision.toUpperCase()}
          </p>
          <p className="text-xs text-gray-500">{Math.round(item.ai_confidence * 100)}%</p>
        </div>
      </div>

      {/* Detected defects */}
      {item.ai_defects?.length > 0 && (
        <div className="space-y-1">
          {item.ai_defects.slice(0, 2).map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-gray-300">{d.class_name}</span>
              <span className="text-gray-500 ml-auto">{Math.round(d.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleAction("pass", "confirm_ai")}
          disabled={submitting}
          className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg
                     bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-400
                     text-xs font-medium transition border border-emerald-800/30
                     disabled:opacity-50"
        >
          <CheckCircle size={14} />
          Onayla
        </button>
        <button
          onClick={() => handleAction("fail", "correct_bbox")}
          disabled={submitting}
          className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg
                     bg-red-900/20 hover:bg-red-900/40 text-red-400
                     text-xs font-medium transition border border-red-800/30
                     disabled:opacity-50"
        >
          <XCircle size={14} />
          Reddet
        </button>
        <button
          onClick={() => handleAction("pass", "mark_good")}
          disabled={submitting}
          className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg
                     bg-gray-800/60 hover:bg-gray-700 text-gray-400
                     text-xs font-medium transition border border-gray-700/50
                     disabled:opacity-50"
        >
          <AlertTriangle size={14} />
          Yanlış+
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MLOpsPage() {
  const [prodModel, setProdModel]   = useState<ModelVersion | null>(null);
  const [allModels, setAllModels]   = useState<ModelVersion[]>([]);
  const [hitlStats, setHitlStats]   = useState<HITLStats | null>(null);
  const [drift, setDrift]           = useState<DriftStatus | null>(null);
  const [queue, setQueue]           = useState<ReviewItem[]>([]);
  const [dataStats, setDataStats]   = useState<any>(null);
  const [loading, setLoading]       = useState(true);
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
      if (prodRes.status === "fulfilled")   setProdModel(prodRes.value.data);
      if (modelsRes.status === "fulfilled") setAllModels(modelsRes.value.data);
      if (hitlRes.status === "fulfilled")   setHitlStats(hitlRes.value.data);
      if (driftRes.status === "fulfilled")  setDrift(driftRes.value.data);
      if (queueRes.status === "fulfilled")  setQueue(queueRes.value.data.queue || []);
      if (dataRes.status === "fulfilled")   setDataStats(dataRes.value.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await api.post("/mlops/retrain", { trigger: "manual" });
      toast.success("Yeniden eğitim kuyruğa alındı!");
    } catch {
      toast.error("Yeniden eğitim başlatılamadı");
    }
    setRetraining(false);
  };

  const handleReview = async (reviewId: string, decision: "pass" | "fail", action: string) => {
    try {
      await api.post(`/mlops/hitl/${reviewId}/review`, {
        action,
        final_decision: decision,
        annotations: [],
      });
      toast.success("Değerlendirme kaydedildi → dataset'e eklendi");
      setQueue((q) => q.filter((i) => i.id !== reviewId));
      setHitlStats((s) => s ? { ...s, contributions: s.contributions + 1 } : s);
    } catch {
      toast.error("Değerlendirme kaydedilemedi");
    }
  };

  const handleSeedDemo = async () => {
    try {
      await api.post("/mlops/demo/seed?scenario=metal&count=100");
      toast.success("100 demo muayene oluşturuldu!");
      loadAll();
    } catch {
      toast.error("Demo seed başarısız");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          MLOps paneli yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain size={20} className="text-blue-400" />
            MLOps & AI Yönetimi
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Model registry, drift izleme, HITL pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedDemo}
            className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700
                       text-gray-300 text-sm transition flex items-center gap-2"
          >
            <Database size={14} />
            Demo Seed
          </button>
          <button
            onClick={loadAll}
            className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700
                       text-gray-300 text-sm transition flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Yenile
          </button>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                       text-white text-sm font-medium transition
                       flex items-center gap-2 disabled:opacity-50"
          >
            <Cpu size={14} />
            {retraining ? "Kuyruğa alındı..." : "Yeniden Eğit"}
          </button>
        </div>
      </div>

      {/* Production model banner */}
      {prodModel && (
        <div className="bg-gradient-to-r from-blue-950/60 to-gray-900 border border-blue-800/40
                        rounded-xl p-5 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <StageBadge stage={prodModel.stage} />
              <span className="text-white font-semibold">{prodModel.name}</span>
              <span className="text-gray-400 text-sm">v{prodModel.version}</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <MetricPill label="mAP50"
                value={`${Math.round((prodModel.metrics.mAP50 || 0) * 100)}%`}
                good={(prodModel.metrics.mAP50 || 0) >= 0.85} />
              <MetricPill label="Precision"
                value={`${Math.round((prodModel.metrics.precision || 0) * 100)}%`}
                good={(prodModel.metrics.precision || 0) >= 0.85} />
              <MetricPill label="Recall"
                value={`${Math.round((prodModel.metrics.recall || 0) * 100)}%`}
                good={(prodModel.metrics.recall || 0) >= 0.80} />
              <MetricPill label="Mimari"
                value={prodModel.architecture} />
            </div>
          </div>
          <div className="text-right text-xs text-gray-500 whitespace-nowrap">
            <p>Sınıflar: {Object.keys(prodModel.class_names || {}).length}</p>
            <p className="mt-1">{format(new Date(prodModel.created_at), "dd/MM/yyyy")}</p>
          </div>
        </div>
      )}

      {/* 3-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* HITL Stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Activity size={15} className="text-amber-400" />
            HITL Pipeline
          </h3>
          {hitlStats ? (
            <div className="space-y-3">
              {[
                { label: "Toplam İnceleme",    value: hitlStats.total_reviews },
                { label: "Onaylanan",          value: hitlStats.approved,
                  note: `${Math.round((hitlStats.approved / Math.max(hitlStats.total_reviews, 1)) * 100)}%` },
                { label: "Yanlış Pozitif",     value: hitlStats.false_positives,
                  warn: hitlStats.false_positives > 10 },
                { label: "Dataset Katkısı",    value: hitlStats.contributions,
                  good: hitlStats.contributions >= 50 },
                { label: "Dışa Aktarılacak",   value: hitlStats.pending_export },
                { label: "Ort. İnceleme Süresi", value: `${Math.round(hitlStats.avg_review_time_sec || 0)}s` },
              ].map(({ label, value, note, warn, good }) => (
                <div key={label} className="flex items-center justify-between
                                            py-2 border-b border-gray-800/60 last:border-0">
                  <span className="text-xs text-gray-500">{label}</span>
                  <div className="flex items-center gap-2">
                    {note && <span className="text-xs text-gray-600">{note}</span>}
                    <span className={`text-sm font-semibold
                      ${good ? "text-emerald-400" : warn ? "text-red-400" : "text-gray-200"}`}>
                      {value}
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Retraining hedefe ilerleme</span>
                  <span>{hitlStats.contributions} / 200</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-800">
                  <div
                    className="h-1.5 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, (hitlStats.contributions / 200) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">Veri yok</p>
          )}
        </div>

        {/* Drift + Dataset */}
        <div className="space-y-4">
          {/* Drift */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <TrendingDown size={15} className={drift?.drift_detected ? "text-red-400" : "text-emerald-400"} />
              Model Drift
              {drift?.drift_detected && (
                <span className="text-xs bg-red-900/40 text-red-400 border border-red-700/50
                                 px-2 py-0.5 rounded-full ml-auto">
                  ⚠ TESPİT EDİLDİ
                </span>
              )}
            </h3>
            {drift && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Geçme Oranı (6s)", value: `${Math.round(drift.pass_rate * 100)}%` },
                  { label: "Ort. Güven",       value: `${Math.round(drift.avg_confidence * 100)}%` },
                  { label: "Ort. Gecikme",     value: `${drift.avg_latency_ms}ms` },
                  { label: "Pencere",          value: drift.total + " kayıt" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-800/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-semibold text-gray-200">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dataset stats */}
          {dataStats && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Database size={15} className="text-purple-400" />
                Dataset — {dataStats.version}
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: "Toplam",    value: dataStats.total },
                  { label: "Hatalı",   value: dataStats.defective },
                  { label: "Temiz",    value: dataStats.good },
                  { label: "Train",    value: dataStats.by_split?.train },
                  { label: "Val",      value: dataStats.by_split?.val },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1
                                              border-b border-gray-800/40 last:border-0">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-300 font-medium">{value ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HITL Review queue */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Clock size={15} className="text-amber-400" />
              İnceleme Kuyruğu
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full
              ${queue.length > 0 ? "bg-amber-900/40 text-amber-400" : "bg-gray-800 text-gray-500"}`}>
              {queue.length} bekleyen
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-600 gap-2">
              <CheckCircle size={24} />
              <p className="text-sm">Bekleyen inceleme yok</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {queue.map((item) => (
                <ReviewCard key={item.id} item={item} onDecision={handleReview} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All model versions table */}
      {allModels.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300">Tüm Model Versiyonları</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Versiyon", "Mimari", "mAP50", "Precision", "Recall", "Durum", "Tarih"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium
                                         text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {allModels.map((m) => (
                <tr key={m.version_id} className="hover:bg-gray-800/30 transition">
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">v{m.version}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{m.architecture}</td>
                  <td className="px-4 py-3 text-gray-300">{Math.round((m.metrics.mAP50 || 0) * 100)}%</td>
                  <td className="px-4 py-3 text-gray-300">{Math.round((m.metrics.precision || 0) * 100)}%</td>
                  <td className="px-4 py-3 text-gray-300">{Math.round((m.metrics.recall || 0) * 100)}%</td>
                  <td className="px-4 py-3"><StageBadge stage={m.stage} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(m.created_at), "dd/MM HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
