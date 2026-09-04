"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
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
  { id: "8d42a9f1", time: "11:42:18", decision: "REVIEW", confidence: "82.6%", issue: "Surface anomaly", scope: "IN SCOPE" },
  { id: "9ab71c20", time: "11:41:53", decision: "PASS", confidence: "96.8%", issue: "No issue", scope: "IN SCOPE" },
  { id: "3c86f222", time: "11:39:11", decision: "PASS", confidence: "95.9%", issue: "No issue", scope: "IN SCOPE" },
  { id: "bb57d0ea", time: "11:36:44", decision: "FAIL", confidence: "94.2%", issue: "Missing component", scope: "IN SCOPE" },
];

type Lang = "en" | "tr";
type HumanDecision = "pass" | "fail" | "reinspect" | null;
type RunState = "idle" | "checking" | "sample_result" | "scope_passed" | "out_of_scope" | "capture_rejected";

type ImageMetrics = {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  saturation: number;
  edgeDensity: number;
  histogram: number[];
};

const copy = {
  en: {
    top: "Public frontend demo — production backend not connected.",
    topText: "The sample inspection can demonstrate the quality workflow. User uploads are first checked locally for capture suitability and demo-profile similarity; arbitrary uploads no longer receive a fake quality confidence score.",
    workspace: "Quality control workspace",
    backendDisconnected: "BACKEND DISCONNECTED",
    reset: "Reset",
    website: "Website",
    whatReal: "What is real here?",
    whatRealText: "The workflow mirrors KanbAI: select a line, validate the input, run quality inference, review uncertain cases and inspect evidence. Browser-side checks can reject unsuitable or clearly dissimilar inputs. Factory-specific semantic and defect inference belongs to the connected pilot backend.",
    uiWorkflow: "UI workflow ✓",
    localValidation: "Local input gate ✓",
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
    waitingText: "Upload an image or load the factory sample. Uploaded images are validated before any quality result is shown.",
    threshold: "Sample decision threshold",
    thresholdNote: "This threshold only changes the simulated result for the built-in sample. It is not applied to arbitrary uploads.",
    runSample: "Run sample inspection",
    validateInput: "Validate input",
    checking: "Checking input…",
    current: "Current inspection",
    sampleSimulation: "SAMPLE SIMULATION",
    uploadValidation: "INPUT VALIDATION",
    confidence: "Quality confidence",
    scopeScore: "Demo scope score",
    resultPass: "Sample result: no visible issue selected.",
    resultReview: "Sample result: surface anomaly routed to human review.",
    resultScopePassed: "Input passed the browser-side demo gate. A real quality result is intentionally withheld until the production inference backend is connected.",
    resultOutOfScope: "Input is too dissimilar from this demo inspection profile. Quality inference was not run and no confidence score was generated.",
    resultCaptureRejected: "Capture quality is not suitable for inspection. Improve framing, exposure, contrast or resolution and try again.",
    runToPopulate: "Validate the image to populate this panel.",
    inputGate: "Input validation",
    inputGateText: "The public demo checks resolution, exposure, contrast, visual texture and similarity to the demo inspection profile before allowing the workflow to continue.",
    resolution: "Resolution",
    exposure: "Exposure",
    contrast: "Contrast",
    texture: "Visual texture",
    pending: "Pending",
    passed: "Passed",
    blocked: "Blocked",
    backendRequired: "Backend required",
    humanReview: "Human review",
    humanReviewText: "Human quality decisions are enabled only when a quality result exists. Uploaded images that only pass the local scope gate do not receive a simulated PASS/FAIL decision.",
    approve: "Approve",
    fail: "Fail",
    reinspect: "Reinspect",
    localDecision: "Local demo decision",
    recent: "Recent activity",
    sampleRecords: "Sample records for interface demonstration only. They are not loaded from KanbAI's database.",
    evidence: "View evidence",
    evidenceTitle: "Inspection evidence",
    evidenceSubtitle: "Browser-only demo record",
    station: "Station / line",
    created: "Captured at",
    scope: "Scope validation",
    aiRecommendation: "Quality recommendation",
    humanDecision: "Human decision",
    defectContext: "Defect context",
    source: "Data source",
    persistence: "Persistence",
    sourceSample: "Built-in demo sample",
    sourceUpload: "Local browser upload",
    persistenceValue: "Not connected to database",
    audit: "Evidence timeline",
    captured: "Image captured / loaded",
    validated: "Input validation completed",
    analyzed: "Quality recommendation generated only when allowed by the demo boundary",
    reviewed: "Operator review state updated locally",
    close: "Close",
    noDecision: "Not reviewed yet",
    noRecommendation: "Not generated — production backend required",
    builtInSample: "Built-in factory sample",
    customUpload: "Custom upload",
    captureReasonResolution: "Resolution is below the demo inspection minimum.",
    captureReasonExposure: "Image is severely underexposed or overexposed.",
    captureReasonContrast: "Image contrast is too low for a reliable visual check.",
    captureReasonTexture: "The image has too little visual structure for this inspection profile.",
    scopeDisclaimer: "The browser scope score is a lightweight demo heuristic, not the factory-specific semantic model used in a connected deployment.",
  },
  tr: {
    top: "Herkese açık frontend demosu — production backend bağlı değil.",
    topText: "Yerleşik örnek muayene kalite akışını gösterebilir. Kullanıcı yüklemeleri önce tarayıcıda görüntü uygunluğu ve demo profiline benzerlik açısından kontrol edilir; rastgele görsellere artık sahte kalite güven skoru verilmez.",
    workspace: "Kalite kontrol çalışma alanı",
    backendDisconnected: "BACKEND BAĞLI DEĞİL",
    reset: "Sıfırla",
    website: "Website",
    whatReal: "Burada gerçekten ne çalışıyor?",
    whatRealText: "Akış KanbAI ürün yapısını yansıtır: hattı seç, girdiyi doğrula, kalite analizini çalıştır, belirsiz durumları insan kontrolüne yönlendir ve kanıtı incele. Tarayıcı içi kontroller uygunsuz veya demo profiline belirgin biçimde alakasız girdileri engelleyebilir. Fabrikaya özel semantik ve hata analizi bağlı pilot backend'ine aittir.",
    uiWorkflow: "UI akışı ✓",
    localValidation: "Yerel input gate ✓",
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
    waitingText: "Bir görsel yükleyin veya fabrika örneğini açın. Yüklenen görseller herhangi bir kalite sonucu gösterilmeden önce doğrulanır.",
    threshold: "Örnek karar eşiği",
    thresholdNote: "Bu eşik yalnızca yerleşik örneğin simüle kararını değiştirir. Rastgele yüklemelere uygulanmaz.",
    runSample: "Örnek muayeneyi çalıştır",
    validateInput: "Girdiyi doğrula",
    checking: "Girdi kontrol ediliyor…",
    current: "Mevcut muayene",
    sampleSimulation: "ÖRNEK SİMÜLASYON",
    uploadValidation: "GİRDİ DOĞRULAMA",
    confidence: "Kalite güven skoru",
    scopeScore: "Demo kapsam skoru",
    resultPass: "Örnek sonuç: görünür bir hata seçilmedi.",
    resultReview: "Örnek sonuç: yüzey anomalisi insan kontrolüne yönlendirildi.",
    resultScopePassed: "Girdi tarayıcı içindeki demo kontrolünü geçti. Production inference backend'i bağlı olmadığı için gerçek kalite sonucu bilinçli olarak üretilmedi.",
    resultOutOfScope: "Girdi bu demo muayene profiline yeterince benzemiyor. Kalite analizi çalıştırılmadı ve güven skoru üretilmedi.",
    resultCaptureRejected: "Görüntü kalitesi muayene için uygun değil. Kadrajı, pozlamayı, kontrastı veya çözünürlüğü iyileştirip tekrar deneyin.",
    runToPopulate: "Bu paneli doldurmak için görseli doğrulayın.",
    inputGate: "Girdi doğrulama",
    inputGateText: "Herkese açık demo; iş akışına devam etmeden önce çözünürlük, pozlama, kontrast, görsel doku ve demo muayene profiline benzerliği kontrol eder.",
    resolution: "Çözünürlük",
    exposure: "Pozlama",
    contrast: "Kontrast",
    texture: "Görsel doku",
    pending: "Bekliyor",
    passed: "Geçti",
    blocked: "Engellendi",
    backendRequired: "Backend gerekli",
    humanReview: "İnsan kontrolü",
    humanReviewText: "İnsan kalite kararı yalnızca bir kalite sonucu olduğunda açılır. Yerel kapsam kontrolünü geçen kullanıcı yüklemelerine simüle PASS/FAIL kararı verilmez.",
    approve: "Onayla",
    fail: "Hatalı",
    reinspect: "Tekrar kontrol",
    localDecision: "Yerel demo kararı",
    recent: "Son aktiviteler",
    sampleRecords: "Yalnızca arayüz gösterimi için örnek kayıtlardır. KanbAI veritabanından yüklenmezler.",
    evidence: "Kanıtı aç",
    evidenceTitle: "Muayene kanıtı",
    evidenceSubtitle: "Tarayıcı içi demo kaydı",
    station: "İstasyon / hat",
    created: "Yakalama zamanı",
    scope: "Kapsam doğrulama",
    aiRecommendation: "Kalite önerisi",
    humanDecision: "İnsan kararı",
    defectContext: "Hata bağlamı",
    source: "Veri kaynağı",
    persistence: "Kalıcılık",
    sourceSample: "Yerleşik demo örneği",
    sourceUpload: "Yerel tarayıcı yüklemesi",
    persistenceValue: "Veritabanına bağlı değil",
    audit: "Kanıt zaman çizelgesi",
    captured: "Görsel yakalandı / yüklendi",
    validated: "Girdi doğrulaması tamamlandı",
    analyzed: "Kalite önerisi yalnızca demo sınırları izin verdiğinde üretildi",
    reviewed: "Operatör kontrol state'i yerel olarak güncellendi",
    close: "Kapat",
    noDecision: "Henüz kontrol edilmedi",
    noRecommendation: "Üretilmedi — production backend gerekli",
    builtInSample: "Yerleşik fabrika örneği",
    customUpload: "Kullanıcı yüklemesi",
    captureReasonResolution: "Çözünürlük demo muayene minimumunun altında.",
    captureReasonExposure: "Görsel ciddi biçimde düşük veya yüksek pozlanmış.",
    captureReasonContrast: "Görsel kontrastı güvenilir bir kontrol için çok düşük.",
    captureReasonTexture: "Görsel bu muayene profili için yeterli görsel yapı içermiyor.",
    scopeDisclaimer: "Tarayıcıdaki kapsam skoru hafif bir demo sezgisidir; bağlı kurulumdaki fabrikaya özel semantik model değildir.",
  },
};

function DecisionPill({ decision }: { decision: string }) {
  const style = decision === "PASS"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : decision === "FAIL"
      ? "border-red-200 bg-red-50 text-red-700"
      : decision === "OUT OF SCOPE" || decision === "REJECTED"
        ? "border-red-200 bg-red-50 text-red-700"
        : decision === "READY"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-amber-200 bg-amber-50 text-amber-700";
  return <span className={`rounded-md border px-2 py-1 text-[10px] font-black ${style}`}>{decision}</span>;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  if (!aa || !bb) return 0;
  return dot / Math.sqrt(aa * bb);
}

async function readImageMetrics(url: string): Promise<ImageMetrics> {
  const image = new Image();
  image.src = url;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Image could not be decoded"));
  });

  const maxSide = 180;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(image, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const gray = new Float32Array(width * height);
  const histogram = Array.from({ length: 64 }, () => 0);
  let sum = 0;
  let sumSq = 0;
  let saturationSum = 0;

  for (let p = 0, i = 0; i < data.length; i += 4, p += 1) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    gray[p] = lum;
    sum += lum;
    sumSq += lum * lum;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    saturationSum += max === 0 ? 0 : (max - min) / max;
    const rb = Math.min(3, Math.floor(r * 4));
    const gb = Math.min(3, Math.floor(g * 4));
    const bb = Math.min(3, Math.floor(b * 4));
    histogram[rb * 16 + gb * 4 + bb] += 1;
  }

  const pixels = width * height;
  const brightness = sum / pixels;
  const variance = Math.max(0, sumSq / pixels - brightness * brightness);
  const contrast = Math.sqrt(variance);
  const saturation = saturationSum / pixels;
  let edgeSum = 0;
  let edgeCount = 0;

  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const idx = y * width + x;
      edgeSum += Math.abs(gray[idx] - gray[idx + 1]);
      edgeSum += Math.abs(gray[idx] - gray[idx + width]);
      edgeCount += 2;
    }
  }

  const normalizedHistogram = histogram.map((value) => value / pixels);
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    brightness,
    contrast,
    saturation,
    edgeDensity: edgeCount ? edgeSum / edgeCount : 0,
    histogram: normalizedHistogram,
  };
}

function getCaptureBlockReason(metrics: ImageMetrics) {
  if (metrics.width < 480 || metrics.height < 320) return "resolution";
  if (metrics.brightness < 0.08 || metrics.brightness > 0.92) return "exposure";
  if (metrics.contrast < 0.055) return "contrast";
  if (metrics.edgeDensity < 0.018) return "texture";
  return null;
}

function getScopeScore(metrics: ImageMetrics, reference: ImageMetrics) {
  const histogramSimilarity = clamp(cosineSimilarity(metrics.histogram, reference.histogram));
  const brightnessSimilarity = 1 - clamp(Math.abs(metrics.brightness - reference.brightness) / 0.35);
  const contrastSimilarity = 1 - clamp(Math.abs(metrics.contrast - reference.contrast) / 0.22);
  const edgeSimilarity = 1 - clamp(Math.abs(metrics.edgeDensity - reference.edgeDensity) / 0.16);
  const saturationSimilarity = 1 - clamp(Math.abs(metrics.saturation - reference.saturation) / 0.35);
  return Math.round(100 * (
    histogramSimilarity * 0.58 +
    brightnessSimilarity * 0.11 +
    contrastSimilarity * 0.11 +
    edgeSimilarity * 0.12 +
    saturationSimilarity * 0.08
  ));
}

export default function DemoPage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = copy[lang];
  const [activeLine, setActiveLine] = useState("Pilot Factory Line");
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState(88);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isObjectUrl, setIsObjectUrl] = useState(false);
  const [isSample, setIsSample] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [humanDecision, setHumanDecision] = useState<HumanDecision>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(recentActivity[0]);
  const [referenceMetrics, setReferenceMetrics] = useState<ImageMetrics | null>(null);
  const [imageMetrics, setImageMetrics] = useState<ImageMetrics | null>(null);
  const [scopeScore, setScopeScore] = useState<number | null>(null);
  const [captureReason, setCaptureReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    readImageMetrics("/marketing/hero-factory.png")
      .then((metrics) => { if (!cancelled) setReferenceMetrics(metrics); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl, isObjectUrl]);

  const filteredLines = useMemo(
    () => productionLines.filter((line) => line.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const confidence = 82.6;
  const sampleResult = confidence >= threshold ? "PASS" : "REVIEW";
  const displayResult = runState === "sample_result"
    ? sampleResult
    : runState === "scope_passed"
      ? "READY"
      : runState === "out_of_scope"
        ? "OUT OF SCOPE"
        : runState === "capture_rejected"
          ? "REJECTED"
          : runState === "checking"
            ? "CHECKING"
            : "WAIT";

  const clearAnalysis = () => {
    setRunState("idle");
    setHumanDecision(null);
    setImageMetrics(null);
    setScopeScore(null);
    setCaptureReason(null);
  };

  const loadSample = () => {
    if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl("/marketing/hero-factory.png");
    setIsObjectUrl(false);
    setIsSample(true);
    clearAnalysis();
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setIsObjectUrl(true);
    setIsSample(false);
    clearAnalysis();
    event.target.value = "";
  };

  const reset = () => {
    if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setIsObjectUrl(false);
    setIsSample(false);
    clearAnalysis();
    setThreshold(88);
    setEvidenceOpen(false);
  };

  const runInspection = async () => {
    if (!imageUrl) return;
    setHumanDecision(null);
    setRunState("checking");
    setScopeScore(null);
    setCaptureReason(null);

    if (isSample) {
      const metrics = referenceMetrics ?? await readImageMetrics(imageUrl);
      setImageMetrics(metrics);
      setScopeScore(100);
      setRunState("sample_result");
      return;
    }

    try {
      const metrics = await readImageMetrics(imageUrl);
      setImageMetrics(metrics);
      const reason = getCaptureBlockReason(metrics);
      if (reason) {
        setCaptureReason(reason);
        setRunState("capture_rejected");
        return;
      }
      const reference = referenceMetrics ?? await readImageMetrics("/marketing/hero-factory.png");
      const score = getScopeScore(metrics, reference);
      setScopeScore(score);
      setRunState(score >= 58 ? "scope_passed" : "out_of_scope");
    } catch {
      setCaptureReason("resolution");
      setRunState("capture_rejected");
    }
  };

  const captureReasonText = captureReason === "resolution"
    ? t.captureReasonResolution
    : captureReason === "exposure"
      ? t.captureReasonExposure
      : captureReason === "contrast"
        ? t.captureReasonContrast
        : t.captureReasonTexture;

  const resultText = runState === "sample_result"
    ? (sampleResult === "PASS" ? t.resultPass : t.resultReview)
    : runState === "scope_passed"
      ? t.resultScopePassed
      : runState === "out_of_scope"
        ? t.resultOutOfScope
        : runState === "capture_rejected"
          ? `${t.resultCaptureRejected} ${captureReasonText}`
          : t.runToPopulate;

  const metricStatus = (kind: "resolution" | "exposure" | "contrast" | "texture") => {
    if (!imageMetrics) return t.pending;
    if (captureReason === kind) return t.blocked;
    return t.passed;
  };

  const openCurrentEvidence = () => {
    const decision = runState === "sample_result" ? sampleResult : displayResult;
    setSelectedRecord({
      id: "demo-current",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      decision,
      confidence: runState === "sample_result" ? `${confidence}%` : "--",
      issue: runState === "sample_result" ? (sampleResult === "PASS" ? "No issue" : "Surface anomaly") : t.noRecommendation,
      scope: runState === "sample_result" || runState === "scope_passed" ? "IN SCOPE" : displayResult,
    });
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
            <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4"><span className="rounded-lg bg-emerald-50 px-3 py-2 font-bold text-emerald-700">{t.uiWorkflow}</span><span className="rounded-lg bg-emerald-50 px-3 py-2 font-bold text-emerald-700">{t.localValidation}</span><span className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-500">{t.backendApi}</span><span className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-500">{t.cameraFeed}</span></div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t.productionLines}</p><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchLine} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></div></div>
            <div className="divide-y divide-slate-100">{filteredLines.map((line) => <button key={line} onClick={() => setActiveLine(line)} className={`flex w-full items-center justify-between px-5 py-4 text-left text-base transition ${activeLine === line ? "bg-[#063f63] text-white" : "text-slate-700 hover:bg-slate-50"}`}><span>{line}</span>{line === "Pilot Factory Line" && <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${activeLine === line ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"}`}>DEMO</span>}</button>)}</div>
            <div className="border-t border-slate-200 p-4"><p className="text-xs font-semibold text-slate-700">{t.frontendStatus}</p><div className="mt-3 space-y-2 text-[11px] text-slate-500"><div className="flex justify-between"><span>{t.localUi}</span><span className="font-semibold text-emerald-600">{t.active}</span></div><div className="flex justify-between"><span>{t.inputGate}</span><span className="font-semibold text-emerald-600">{t.active}</span></div><div className="flex justify-between"><span>Backend API</span><span className="font-semibold text-amber-700">{t.notConnected}</span></div><div className="flex justify-between"><span>{t.database}</span><span className="font-semibold text-amber-700">{t.notConnected}</span></div></div></div>
          </aside>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{t.qualityView}</p><h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#0b1020] sm:text-3xl">{activeLine}</h1></div><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Upload className="h-3.5 w-3.5" /> {t.upload}<input type="file" accept="image/*" className="hidden" onChange={handleUpload} /></label><button onClick={loadSample} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{t.sample}</button></div></header>
            <div className="p-5 sm:p-6">
              <div className="relative flex min-h-[470px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 lg:min-h-[540px]">
                {imageUrl ? <>
                  <img src={imageUrl} alt="Demo inspection" className="max-h-[540px] w-full object-contain" />
                  {runState !== "idle" && runState !== "checking" && <div className={`absolute inset-x-[12%] bottom-[12%] top-[18%] rounded-md border-[6px] shadow-[0_10px_35px_rgba(15,23,42,.2)] ${runState === "sample_result" ? (sampleResult === "PASS" ? "border-emerald-500" : "border-orange-400") : runState === "scope_passed" ? "border-blue-500" : "border-red-500"}`}><div className={`absolute -bottom-1 left-0 rounded-tr-md px-4 py-2 text-xl font-black ${runState === "sample_result" ? (sampleResult === "PASS" ? "bg-emerald-600 text-white" : "bg-orange-400 text-slate-950") : runState === "scope_passed" ? "bg-blue-600 text-white" : "bg-red-600 text-white"}`}>{displayResult}</div></div>}
                  {runState === "checking" && <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-[1px]"><div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-lg">{t.checking}</div></div>}
                  <div className="absolute left-4 top-4 rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-[10px] font-bold text-slate-600 shadow-sm">{isSample ? t.builtInSample : t.customUpload}</div>
                </> : <div className="max-w-sm text-center text-slate-400"><ClipboardCheck className="mx-auto h-11 w-11" /><p className="mt-3 text-sm font-semibold text-slate-500">{t.waiting}</p><p className="mt-2 text-xs leading-5">{t.waitingText}</p></div>}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-slate-800">{t.inputGate}</p><p className="mt-1 max-w-2xl text-[11px] leading-5 text-slate-500">{t.inputGateText}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${runState === "scope_passed" || runState === "sample_result" ? "bg-emerald-100 text-emerald-700" : runState === "out_of_scope" || runState === "capture_rejected" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-500"}`}>{runState === "scope_passed" || runState === "sample_result" ? t.passed.toUpperCase() : runState === "out_of_scope" || runState === "capture_rejected" ? t.blocked.toUpperCase() : t.pending.toUpperCase()}</span></div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">{[[t.resolution,"resolution"],[t.exposure,"exposure"],[t.contrast,"contrast"],[t.texture,"texture"]].map(([label,kind]) => <div key={kind} className="rounded-lg border border-slate-200 bg-white p-2.5"><p className="text-slate-400">{label}</p><p className={`mt-1 font-bold ${metricStatus(kind as "resolution" | "exposure" | "contrast" | "texture") === t.blocked ? "text-red-600" : imageMetrics ? "text-emerald-600" : "text-slate-400"}`}>{metricStatus(kind as "resolution" | "exposure" | "contrast" | "texture")}</p></div>)}</div>
                {!isSample && scopeScore !== null && <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]"><span className="text-slate-500">{t.scopeScore}</span><span className={`font-black ${scopeScore >= 58 ? "text-emerald-700" : "text-red-700"}`}>{scopeScore}%</span></div>}
                {!isSample && <p className="mt-2 text-[9px] leading-4 text-slate-400">{t.scopeDisclaimer}</p>}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><div><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">{t.threshold}</span><span className="font-bold text-slate-950">{threshold}%</span></div><input disabled={!isSample} type="range" min="60" max="99" value={threshold} onChange={(event) => { setThreshold(Number(event.target.value)); if (runState === "sample_result") setRunState("idle"); setHumanDecision(null); }} className="mt-3 w-full accent-[#063f63] disabled:opacity-30" /><p className="mt-2 text-[10px] text-slate-400">{t.thresholdNote}</p></div><button disabled={!imageUrl || runState === "checking"} onClick={runInspection} className="rounded-xl bg-[#063f63] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-30">{runState === "checking" ? t.checking : isSample ? t.runSample : t.validateInput}</button></div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{t.current}</p><span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">{isSample ? t.sampleSimulation : t.uploadValidation}</span></div><div className="mt-4 flex items-start justify-between gap-4"><div><p className={`text-4xl font-black ${displayResult === "PASS" ? "text-emerald-700" : displayResult === "REVIEW" ? "text-orange-700" : displayResult === "READY" ? "text-blue-700" : displayResult === "OUT OF SCOPE" || displayResult === "REJECTED" ? "text-red-700" : "text-slate-300"}`}>{displayResult}</p><p className="mt-2 font-mono text-xs text-slate-400">demo-current</p></div>{displayResult === "PASS" ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : displayResult === "REVIEW" ? <AlertTriangle className="h-8 w-8 text-orange-500" /> : displayResult === "READY" ? <ShieldCheck className="h-8 w-8 text-blue-600" /> : <XCircle className={`h-8 w-8 ${displayResult === "OUT OF SCOPE" || displayResult === "REJECTED" ? "text-red-500" : "text-slate-300"}`} />}</div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{t.confidence}</p><p className="mt-1 text-2xl font-semibold text-[#0b1020]">{runState === "sample_result" ? `${confidence}%` : "--"}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{t.scopeScore}</p><p className="mt-1 text-2xl font-semibold text-[#0b1020]">{scopeScore !== null ? `${scopeScore}%` : "--"}</p></div></div><p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{resultText}</p>{runState === "scope_passed" && <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-800">{t.backendRequired}</div>}<button disabled={runState === "idle" || runState === "checking"} onClick={openCurrentEvidence} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30"><FileText className="h-3.5 w-3.5" /> {t.evidence}</button></section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{t.humanReview}</p><p className="mt-2 text-xs leading-5 text-slate-500">{t.humanReviewText}</p><div className="mt-4 grid grid-cols-3 gap-2"><button disabled={runState !== "sample_result"} onClick={() => setHumanDecision("pass")} className={`rounded-lg border px-2 py-2.5 text-[10px] font-bold disabled:opacity-30 ${humanDecision === "pass" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{t.approve}</button><button disabled={runState !== "sample_result"} onClick={() => setHumanDecision("fail")} className={`rounded-lg border px-2 py-2.5 text-[10px] font-bold disabled:opacity-30 ${humanDecision === "fail" ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 text-slate-600"}`}>{t.fail}</button><button disabled={runState !== "sample_result"} onClick={() => setHumanDecision("reinspect")} className={`rounded-lg border px-2 py-2.5 text-[10px] font-bold disabled:opacity-30 ${humanDecision === "reinspect" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600"}`}>{t.reinspect}</button></div>{humanDecision && <div className="mt-3 rounded-lg bg-blue-50 p-3 text-[11px] font-semibold text-blue-800">{t.localDecision}: {humanDecision.toUpperCase()}</div>}</section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{t.recent}</p><div className="space-y-2">{recentActivity.map((item) => <button key={item.id} onClick={() => { setSelectedRecord(item); setEvidenceOpen(true); }} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 text-left hover:border-slate-200 hover:bg-slate-50"><div className="min-w-0"><p className="truncate font-mono text-xs text-slate-600">{item.id}</p><p className="mt-0.5 text-[11px] text-slate-400">{item.time}</p></div><DecisionPill decision={item.decision} /></button>)}</div><p className="mt-3 text-[9px] leading-4 text-slate-400">{t.sampleRecords}</p></section>
          </aside>
        </div>
      </div>

      {evidenceOpen && <div className="fixed inset-0 z-[80] flex justify-end"><button onClick={() => setEvidenceOpen(false)} className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px]" aria-label={t.close} /><aside className="relative h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-sm font-extrabold text-slate-950">{t.evidenceTitle}</p><p className="mt-1 text-xs text-slate-400">{t.evidenceSubtitle}</p></div><button onClick={() => setEvidenceOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200"><X className="h-4 w-4" /></button></div><div className="p-5"><div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between"><div><p className="font-mono text-xs text-slate-400">{selectedRecord.id}</p><p className="mt-2 text-2xl font-black text-slate-950">{selectedRecord.decision}</p></div><DecisionPill decision={selectedRecord.decision} /></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400">{t.confidence}</p><p className="mt-1 font-bold text-slate-900">{selectedRecord.confidence}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-slate-400">{t.scopeScore}</p><p className="mt-1 font-bold text-slate-900">{selectedRecord.id === "demo-current" && scopeScore !== null ? `${scopeScore}%` : "100%"}</p></div></div></div><dl className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4 text-xs"><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.station}</dt><dd className="text-right font-semibold text-slate-700">{activeLine}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.created}</dt><dd className="font-semibold text-slate-700">{selectedRecord.time}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.scope}</dt><dd className="text-right font-semibold text-slate-700">{selectedRecord.scope}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.aiRecommendation}</dt><dd className="text-right font-semibold text-slate-700">{selectedRecord.id === "demo-current" && runState !== "sample_result" ? t.noRecommendation : selectedRecord.decision}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.humanDecision}</dt><dd className="font-semibold text-slate-700">{humanDecision ? humanDecision.toUpperCase() : t.noDecision}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.defectContext}</dt><dd className="text-right font-semibold text-slate-700">{selectedRecord.issue}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.source}</dt><dd className="text-right font-semibold text-amber-700">{selectedRecord.id === "demo-current" ? (isSample ? t.sourceSample : t.sourceUpload) : t.sourceSample}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">{t.persistence}</dt><dd className="text-right font-semibold text-amber-700">{t.persistenceValue}</dd></div></dl><div className="mt-5 rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{t.audit}</p><div className="mt-4 space-y-4 text-xs text-slate-600">{[t.captured, t.validated, t.analyzed, t.reviewed].map((item, i) => <div key={item} className="flex gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 2 && selectedRecord.id === "demo-current" && runState !== "sample_result" ? "bg-slate-300" : i === 3 && !humanDecision ? "bg-slate-300" : "bg-blue-600"}`} /><span>{item}</span></div>)}</div></div><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">{t.top} {t.topText}</div></div></aside></div>}
    </main>
  );
}
