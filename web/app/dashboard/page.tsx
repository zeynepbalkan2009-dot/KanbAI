"use client";

import { useEffect } from "react";
import { useInspectionStore } from "@/lib/store/inspections";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { CheckCircle, XCircle, AlertTriangle, Clock, Zap } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const DECISION_COLORS = {
  pass: "#10b981",
  fail: "#ef4444",
  review: "#f59e0b",
  pending: "#6b7280",
  error: "#dc2626",
};

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-400">{label}</p>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const labels: Record<string, string> = {
    pass: "GEÇTI", fail: "BAŞARISIZ", review: "İNCELEME",
    pending: "BEKLIYOR", error: "HATA",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full decision-${decision}`}>
      {labels[decision] ?? decision.toUpperCase()}
    </span>
  );
}

export default function DashboardPage() {
  const { inspections, stats, fetchInspections, fetchStats, isLoading } = useInspectionStore();

  useEffect(() => {
    fetchInspections();
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Pie chart data
  const pieData = stats
    ? [
        { name: "Geçti", value: stats.pass_count, color: DECISION_COLORS.pass },
        { name: "Başarısız", value: stats.fail_count, color: DECISION_COLORS.fail },
        { name: "İnceleme", value: stats.review_count, color: DECISION_COLORS.review },
      ].filter((d) => d.value > 0)
    : [];

  // Area chart — last 20 inspections over time
  const chartData = [...inspections]
    .reverse()
    .slice(-20)
    .map((i) => ({
      time: format(new Date(i.created_at), "HH:mm", { locale: tr }),
      confidence: i.confidence ? Math.round(i.confidence * 100) : null,
      pass: i.decision === "pass" ? 1 : 0,
      fail: i.decision === "fail" ? 1 : 0,
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Gerçek zamanlı kalite kontrol özeti
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Muayene" value={stats?.total ?? 0}
          sub="tüm zamanlar"
          icon={Zap} color="bg-blue-900/40 text-blue-400"
        />
        <StatCard
          label="Geçme Oranı"
          value={stats ? `${Math.round(stats.pass_rate * 100)}%` : "—"}
          sub={`${stats?.pass_count ?? 0} geçti`}
          icon={CheckCircle} color="bg-emerald-900/40 text-emerald-400"
        />
        <StatCard
          label="Hata Tespit"
          value={stats?.fail_count ?? 0}
          sub="manuel inceleme gerekebilir"
          icon={XCircle} color="bg-red-900/40 text-red-400"
        />
        <StatCard
          label="İnceleme Bekleyen"
          value={stats?.review_count ?? 0}
          sub="operatör onayı gerekli"
          icon={AlertTriangle} color="bg-amber-900/40 text-amber-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Confidence over time */}
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            Güven Skoru Trendi (son 20)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(v: number) => [`${v}%`, "Güven"]}
              />
              <Area type="monotone" dataKey="confidence" stroke="#3b82f6"
                strokeWidth={2} fill="url(#cGrad)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Karar Dağılımı</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45}
                    outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span>{d.name}</span>
                    <span className="ml-auto font-medium text-gray-200">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-600 text-sm">
              Henüz veri yok
            </div>
          )}
        </div>
      </div>

      {/* Live inspection feed */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">
            Son Muayeneler
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Canlı
          </div>
        </div>

        {isLoading && inspections.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Yükleniyor...</div>
        ) : inspections.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Henüz muayene kaydı yok
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {inspections.slice(0, 15).map((insp) => (
              <div key={insp.id}
                className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/50 transition">
                <DecisionBadge decision={insp.decision} />
                <span className="text-xs text-gray-400 font-mono truncate flex-1">
                  {insp.id.split("-")[0]}...
                </span>
                {insp.confidence != null && (
                  <span className="text-xs text-gray-500">
                    {Math.round(insp.confidence * 100)}%
                  </span>
                )}
                {insp.inference_latency_ms != null && (
                  <span className="text-xs text-gray-600">
                    {insp.inference_latency_ms}ms
                  </span>
                )}
                <span className="text-xs text-gray-600">
                  {format(new Date(insp.created_at), "HH:mm:ss")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
