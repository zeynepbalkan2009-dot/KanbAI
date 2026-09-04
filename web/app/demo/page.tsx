"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  RefreshCw,
  Search,
  Upload,
  WifiOff,
  X,
  XCircle,
} from "lucide-react";

const productionLines = [
  "Production Line 1A",
  "Production Line 1B",
  "Production Line 2A",
  "Pilot Factory Line",
  "Production Line 3B",
];

const recentActivity = [
  { id: "8d42a9f1", time: "11:42:18", decision: "REVIEW", confidence: "82.6%", issue: "Surface anomaly" },
  { id: "9ab71c20", time: "11:41:53", decision: "PASS", confidence: "96.8%", issue: "No issue" },
  { id: "3c86f222", time: "11:39:11", decision: "PASS", confidence: "95.9%", issue: "No issue" },
  { id: "bb57d0ea", time: "11:36:44", decision: "FAIL", confidence: "94.2%", issue: "Missing component" },
];

type Lang = "en" | "tr";
type HumanDecision = "pass" | "fail" | "reinspect" | null;

const copy = {
  en: {
    top: "Public frontend demo — backend not connected.",
    topText: "This page does not use KanbAI's backend API, database, production camera ingestion or real AI inference endpoint. Images, scores and decisions shown here are browser-only demo data.",
    workspace: "Quality control workspace",
    backendDisconnected: "BACKEND DISCONNECTED",
    reset: "Reset",
    website: "Website",
    whatReal: "What is real here?",
    whatRealText: "The interface and workflow mirror the KanbAI product structure: line selection, inspection image, AI recommendation, human review and recent activity. The public page intentionally does not send requests to the production backend.",
    uiWorkflow: "UI workflow ✓",
    localInteraction: "Local interaction ✓",
    backendApi: "Backend API —",
    cameraFeed: "Camera feed —",
    productionLines: "Production lines",
    searchLine: "Search line",
    frontendStatus: "Frontend status",
    localUi: "Local UI state",
    active: "Active",
    notConnected: "Not connected",
    database: "Database persistence",
    qualityView: "Quality control view",
    upload: "Upload image",
    sample: "Load sample",
    waiting: "Inspection image waiting",
    waitingText: "Upload an image or load the sample to try the browser-only workflow.",
    threshold: "Demo confidence threshold",
    thresholdNote: "This slider changes only the simulated frontend decision. No model request is made.",
    run: "Run demo inspection",
    current: "Current inspection",
    simulated: "SIMULATED",
    confidence: "Confidence",
    resultPass: "Demo result: no visible issue selected.",
    resultReview: "Demo result: surface anomaly routed to human review.",
    runToPopulate: "Run the demo inspection to populate this panel.",
    humanReview: "Human review",
    humanReviewText: "The operator owns the final quality decision. These buttons update local browser state only.",
    approve: "Approve",
    fail: "Fail",
    reinspect: "Reinspect",
    localDecision: "Local demo decision",
    recent: "Recent activity",
    sampleRecords: "Sample records for interface demonstration only. They are not loaded from KanbAI's database.",
    evidence: "View evidence",
    evidenceTitle: "Inspection evidence",
    evidenceSubtitle: "Browser-only sample record",
    station: "Station / line",
    created: "Captured at",
    aiRecommendation: "AI recommendation",
    humanDecision: "Human decision",
    defectContext: "Defect context",
    source: "Data source",
    persistence: "Persistence",
    sourceValue: "Sample frontend state",
    persistenceValue: "Not connected to database",
    audit: "Evidence timeline",
    captured: "Image captured / loaded",
    analyzed: "Frontend demo recommendation generated",
    reviewed: "Operator review state updated locally",
    close: "Close",
    noDecision: "Not reviewed yet",
  },
  tr: {
    top: "Herkese açık frontend demosu — backend bağlı değil.",
    topText: "Bu sayfa KanbAI backend API'sini, veritabanını, gerçek üretim kamera akışını veya gerçek AI inference endpoint'ini kullanmaz. Görseller, skorlar ve kararlar yalnızca tarayıcı içindeki demo verileridir.",
    workspace: "Kalite kontrol çalışma alanı",
    backendDisconnected: "BACKEND BAĞLI DEĞİL",
    reset: "Sıfırla",
    website: "Website",
    whatReal: "Burada gerçekten ne çalışıyor?",
    whatRealText: "Arayüz ve iş akışı gerçek KanbAI ürün yapısını yansıtır: hat seçimi, muayene görseli, AI önerisi, insan kontrolü ve son aktiviteler. Bu herkese açık sayfa production backend'e istek göndermez.",
    uiWorkflow: "UI akışı ✓",
    localInteraction: "Yerel etkileşim ✓",
    backendApi: "Backend API —",
    cameraFeed: "Kamera akışı —",
    productionLines: "Üretim hatları",
    searchLine: "Hat ara",
    frontendStatus: "Frontend durumu",
    localUi: "Yerel UI state",
    active: "Aktif",
    notConnected: "Bağlı değil",
    database: "Veritabanı kalıcılığı",
    qualityView: "Kalite kontrol görünümü",
    upload: "Görsel yükle",
    sample: "Örnek yükle",
    waiting: "Muayene görseli bekleniyor",
    waitingText: "Tarayıcı içi akışı denemek için görsel yükleyin veya örnek görseli açın.",
    threshold: "Demo güven eşiği",
    thresholdNote: "Bu slider yalnızca simüle edilmiş frontend kararını değiştirir. Modele istek gönderilmez.",
    run: "Demo muayenesini çalıştır",
    current: "Mevcut muayene",
    simulated: "SİMÜLE",
    confidence: "Güven skoru",
    resultPass: "Demo sonucu: görünür bir hata seçilmedi.",
    resultReview: "Demo sonucu: yüzey anomalisi insan kontrolüne yönlendirildi.",
    runToPopulate: "Bu paneli doldurmak için demo muayenesini çalıştırın.",
    humanReview: "İnsan kontrolü",
    humanReviewText: "Nihai kalite kararı operatöre aittir. Bu butonlar yalnızca tarayıcıdaki yerel state'i değiştirir.",
    approve: "Onayla",
    fail: "Hatalı",
    reinspect: "Tekrar kontrol",
    localDecision: "Yerel demo kararı",
    recent: "Son aktiviteler",
    sampleRecords: "Yalnızca arayüz gösterimi için örnek kayıtlardır. KanbAI veritabanından yüklenmezler.",
    evidence: "Kanıtı aç",
    evidenceTitle: "Muayene kanıtı",
    evidenceSubtitle: "Tarayıcı içi örnek kayıt",
    station: "İstasyon / hat",
    created: "Yakalama zamanı",
    aiRecommendation: "AI önerisi",
    humanDecision: "İnsan kararı",
    defectContext: "Hata bağlamı",
    source: "Veri kaynağı",
    persistence: "Kalıcılık",
    sourceValue: "Örnek frontend state",
    persistenceValue: "Veritabanına bağlı değil",
    audit: "Kanıt zaman çizelgesi",
    captured: "Görsel yakalandı / yüklendi",
    analyzed: "Frontend demo önerisi üretildi",
    reviewed: "Operatör kontrol state'i yerel olarak güncellendi",
    close: "Kapat",
    noDecision: "Henüz kontrol edilmedi",
  },
};

function DecisionPill({ decision }: { decision: string }) {
  const style = decision === "PASS" ? "border-emerald-500 bg-emerald-600 text-white" : decision === "FAIL" ? "border-red-500 bg-red-600 text-white" : "border-orange-400 bg-orange-400 text-slate-950";
  return <span className={`rounded-md border px-2 py-1 text-[10px] font-black ${style}`}>{decision}</span>;
}

export default function DemoPage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = copy[lang];
  const [activeLine, setActiveLine] = useState("Pilot Factory Line");
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState(88);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isObjectUrl, setIsObjectUrl] = useState(false);
  const [analysisRun, setAnalysisRun] = useState(false);
  const [humanDecision, setHumanDecision] = useState<HumanDecision>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(recentActivity[0]);

  useEffect(() => () => { if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl, isObjectUrl]);

  const filteredLines = useMemo(() => productionLines.filter((line) => line.toLowerCase().includes(query.toLowerCase())), [query]);
  const confidence = 82.6;
  const result = analysisRun ? (confidence >= threshold ? "PASS" : "REVIEW") : "WAIT";

  const loadSample = () => {
    if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl("/marketing/hero-factory.png");
    setIsObjectUrl(false);
    setAnalysisRun(false);
    setHumanDecision(null);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setIsObjectUrl(true);
    setAnalysisRun(false);
    setHumanDecision(null);
  };

  const reset = () => {
    if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setIsObjectUrl(false);
    setAnalysisRun(false);
    setHumanDecision(null);
    setThreshold(88);
    setEvidenceOpen(false);
  };

  const openCurrentEvidence = () => {
    setSelectedRecord({ id: "demo-8d42a9f1", time: "11:42:18", decision: result === "WAIT" ? "REVIEW" : result, confidence: analysisRun ? `${confidence}%` : "--", issue: result === "PASS" ? "No issue" : "Surface anomaly" });
    setEvidenceOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] items-start gap-3 text-xs leading-5 text-amber-950 sm:items-center">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 sm:mt-0" />
          <p><strong>{t.top}</strong> {t.topText}</p>
          <span className="ml-auto hidden shrink-0 rounded-full border border-amber-300 bg-white px-3 py-1 text-[10px] font-bold text-amber-800 xl:inline-flex">DEMO MODE</span>
        </div>
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#063f63] text-white"><Camera className="h-4 w-4" /></span>
            <div><p className="text-base font-extrabold tracking-[-0.03em] text-slate-950">Kanb<span className="text-blue-600">AI</span></p><p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">{t.workspace}</p></div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-[10px] font-bold"><button onClick={() => setLang("en")} className={`rounded px-2 py-1 ${lang === "en" ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}>EN</button><button onClick={() => setLang("tr")} className={`rounded px-2 py-1 ${lang === "tr" ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}>TR</button></div>
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 sm:inline-flex">{t.backendDisconnected}</span>
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" /> {t.reset}</button>
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"><ArrowLeft className="h-3.5 w-3.5" /> {t.website}</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] p-4 md:p-6">
        <div className="mb-5 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><AlertTriangle className="h-5 w-5" /></span><div><p className="text-sm font-bold text-slate-950">{t.whatReal}</p><p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">{t.whatRealText}</p></div></div>
            <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4"><span className="rounded-lg bg-emerald-50 px-3 py-2 font-bold text-emerald-700">{t.uiWorkflow}</span><span className="rounded-lg bg-emerald-50 px-3 py-2 font-bold text-emerald-700">{t.localInteraction}</span><span className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-500">{t.backendApi}</span><span className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-500">{t.cameraFeed}</span></div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t.productionLines}</p><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchLine} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></div></div>
            <div className="divide-y divide-slate-100">{filteredLines.map((line) => <button key={line} onClick={() => setActiveLine(line)} className={`flex w-full items-center justify-between px-5 py-4 text-left text-base transition ${activeLine === line ? "bg-[#063f63] text-white" : "text-slate-700 hover:bg-slate-50"}`}><span>{line}</span>{line === "Pilot Factory Line" && <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${activeLine === line ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"}`}>DEMO</span>}</button>)}</div>
            <div className="border-t border-slate-200 p-4"><p className="text-xs font-semibold text-slate-700">{t.frontendStatus}</p><div className="mt-3 space-y-2 text-[11px] text-slate-500"><div className="flex justify-between"><span>{t.localUi}</span><span className="font-semibold text-emerald-600">{t.active}</span></div><div className="flex justify-between"><span>Backend API</span><span className="font-semibold text-amber-700">{t.notConnected}</span></div><div className="flex justify-between"><span>{t.database}</span><span className="font-semibold text-amber-700">{t.notConnected}</span></div></div></div>
          </aside>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{t.qualityView}</p><h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#0b1020] sm:text-3xl">{activeLine}</h1></div><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Upload className="h-3.5 w-3.5" /> {t.upload}<input type="file" accept="image/*" className="hidden" onChange={handleUpload} /></label><button onClick={loadSample} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{t.sample}</button></div></header>
            <div className="p-5 sm:p-6">
              <div className="relative flex min-h-[480px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 lg:min-h-[560px]">
                {imageUrl ? <><img src={imageUrl} alt="Demo inspection" className="max-h-[560px] w-full object-contain" />{analysisRun && <div className={`absolute inset-x-[12%] bottom-[12%] top-[18%] rounded-md border-[6px] shadow-[0_10px_35px_rgba(15,23,42,.2)] ${result === "PASS" ? "border-emerald-500" : "border-orange-400"}`}><div className={`absolute -bottom-1 left-0 rounded-tr-md px-4 py-2 text-2xl font-black ${result === "PASS" ? "bg-emerald-600 text-white" : "bg-orange-400 text-slate-950"}`}>{result}</div></div>}</> : <div className="max-w-sm text-center text-slate-400"><ClipboardCheck className="mx-auto h-11 w-11" /><p className="mt-3 text-sm font-semibold text-slate-500">{t.waiting}</p><p className="mt-2 text-xs leading-5">{t.waitingText}</p></div>}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><div><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">{t.threshold}</span><span className="font-bold text-slate-950">{threshold}%</span></div><input type="range" min="60" max="99" value={threshold} onChange={(event) => { setThreshold(Number(event.target.value)); setAnalysisRun(false); setHumanDecision(null); }} className="mt-3 w-full accent-[#063f63]" /><p className="mt-2 text-[10px] text-slate-400">{t.thresholdNote}</p></div><button disabled={!imageUrl} onClick={() => { setAnalysisRun(true); setHumanDecision(null); }} className="rounded-xl bg-[#063f63] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-30">{t.run}</button></div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{t.current}</p><span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">{t.simulated}</span></div><div className="mt-4 flex items-start justify-between gap-4"><div><p className={`text-5xl font-black ${result === "PASS" ? "text-emerald-700" : result === "REVIEW" ? "text-orange-700" : "text-slate-300"}`}>{result}</p><p className="mt-2 font-mono text-xs text-slate-400">demo-8d42a9f1</p></div>{result === "PASS" ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : result === "REVIEW" ? <AlertTriangle className="h-8 w-8 text-orange-500" /> : <XCircle className="h-8 w-8 text-slate-300" />}</div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{t.confidence}</p><p className="mt-1 text-2xl font-semibold text-[#0b1020]">{analysisRun ? `${confidence}%` : "--"}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Threshold</p><p className="mt-1 text-2xl font-semibold text-[#0b1020]">{threshold}%</p></div></div><p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{analysisRun ? (result === "PASS" ? t.resultPass : t.resultReview) : t.runToPopulate}</p><button onClick={openCurrentEvidence} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><FileText className="h-3.5 w-3.5" /> {t.evidence}</button></section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{t.humanReview}</p><p className="mt-2 text-xs leading-5 text-slate-500">{t.humanReviewText}</p><div className="mt-4 grid grid-cols-3 gap-2"><button disabled={!analysisRun} onClick={() => setHumanDecision("pass")} className={`rounded-lg border px-2 py-2.5 text-[10px] font-bold disabled:opacity-30 ${humanDecision === "pass" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{t.approve}</button><button disabled={!analysisRun} onClick={() => setHumanDecision("fail")} className={`rounded-lg border px-2 py-2.5 text-[10px] font-bold disabled:opacity-30 ${humanDecision === "fail" ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 text-slate-600"}`}>{t.fail}</button><button disabled={!analysisRun} onClick={() => setHumanDecision("reinspect")} className={`rounded-lg border px-2 py-2.5 text-[10px] font-bold disabled:opacity-30 ${humanDecision === "reinspect" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600"}`}>{t.reinspect}</button></div>{humanDecision && <div className="mt-3 rounded-lg bg-blue-50 p-3 text-[11px] font-semibold text-blue-800">{t.localDecision}: {humanDecision.toUpperCase()}</div>}</section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{t.recent}</p><div className="space-y-2">{recentActivity.map((item) => <button key={item.id} onClick={() => { setSelectedRecord(item); setEvidenceOpen(true); }} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 text-left hover:border-slate-200 hover:bg-slate-50"><div className="min-w-0"><p className="truncate font-mono text-xs text-slate-600">{item.id}</p><p className="mt-0.5 text-[11px] text-slate-400">{item.time}</p></div><DecisionPill decision={item.decision} /></button>)}</div><p className="mt-3 text-[9px] leading-4 text-slate-400">{t.sampleRecords}</p></section>
          </aside>
        </div>
      </div>

      {evidenceOpen && <div className="fixed inset-0 z-[80] flex justify-end"><button onClick={() => setEvidenceOpen(false)} className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px]" aria-label={t.close} /><aside className="relative h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-sm font-extrabold text-slate-950">{t.evidenceTitle}</p><p className="mt-1 text-xs text-slate-400">{t.evidenceSubtitle}</p></div><button onClick={() => setEvidenceOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200"><X className="h-4 w-4" /></button></div><div className="p-5"><div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between"><div><p className="font-mono text-xs text-slate-400">{selectedRecord.id}</p><p className="mt-2 text-3xl font-black text-slate-950">{selectedRecord.decision}</p></div><DecisionPill decision={selectedRecord.decision} /></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400">{t.confidence}</p><p className="mt-1 font-bold text-slate-900">{selectedRecord.confidence}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400">Threshold</p><p className="mt-1 font-bold text-slate-900">{threshold}%</p></div></div></div><dl className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4 text-xs"><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.station}</dt><dd className="text-right font-semibold text-slate-700">{activeLine}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.created}</dt><dd className="font-semibold text-slate-700">{selectedRecord.time}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.aiRecommendation}</dt><dd className="font-semibold text-slate-700">{selectedRecord.decision}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.humanDecision}</dt><dd className="font-semibold text-slate-700">{humanDecision ? humanDecision.toUpperCase() : t.noDecision}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.defectContext}</dt><dd className="text-right font-semibold text-slate-700">{selectedRecord.issue}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.source}</dt><dd className="text-right font-semibold text-amber-700">{t.sourceValue}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.persistence}</dt><dd className="text-right font-semibold text-amber-700">{t.persistenceValue}</dd></div></dl><div className="mt-5 rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{t.audit}</p><div className="mt-4 space-y-4 text-xs text-slate-600">{[t.captured, t.analyzed, t.reviewed].map((item, i) => <div key={item} className="flex gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 2 && !humanDecision ? "bg-slate-300" : "bg-blue-600"}`} /><span>{item}</span></div>)}</div></div><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">{t.top} {t.topText}</div></div></aside></div>}
    </main>
  );
}
