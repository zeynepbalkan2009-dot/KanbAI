"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Database,
  Filter,
  Gauge,
  ImageIcon,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Users,
  WifiOff,
  X,
  XCircle,
} from "lucide-react";

const demoRows = [
  { id: "IN-01048", time: "11:42", station: "Housing · Station 02", line: "Line 2", result: "PASS", confidence: "98.4%", issue: "—" },
  { id: "IN-01047", time: "11:41", station: "Housing · Station 02", line: "Line 2", result: "REVIEW", confidence: "82.6%", issue: "Surface anomaly" },
  { id: "IN-01046", time: "11:39", station: "Surface · Station 01", line: "Line 1", result: "PASS", confidence: "96.8%", issue: "—" },
  { id: "IN-01045", time: "11:36", station: "Assembly · Station 03", line: "Line 3", result: "FAIL", confidence: "94.2%", issue: "Missing component" },
  { id: "IN-01044", time: "11:34", station: "Surface · Station 01", line: "Line 1", result: "PASS", confidence: "97.1%", issue: "—" },
];

const queueRows = [
  { id: "IN-01047", issue: "Surface anomaly", station: "Housing · Station 02", confidence: "82.6%", age: "1 min" },
  { id: "IN-01043", issue: "Edge inconsistency", station: "Surface · Station 01", confidence: "79.8%", age: "5 min" },
  { id: "IN-01039", issue: "Possible scratch", station: "Housing · Station 02", confidence: "76.4%", age: "11 min" },
];

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "PASS"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "FAIL"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  const Icon = status === "PASS" ? CheckCircle2 : status === "FAIL" ? XCircle : AlertTriangle;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles}`}>
      <Icon className="h-3 w-3" /> {status}
    </span>
  );
}

export default function DemoPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedView, setSelectedView] = useState<"overview" | "review">("overview");
  const [threshold, setThreshold] = useState(88);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isObjectUrl, setIsObjectUrl] = useState(false);
  const [analysisRun, setAnalysisRun] = useState(false);
  const [decision, setDecision] = useState<"approved" | "failed" | "reinspect" | null>(null);

  useEffect(() => {
    return () => {
      if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl, isObjectUrl]);

  const confidence = 82.6;
  const aiResult = confidence >= threshold ? "PASS" : "REVIEW";

  const loadSample = () => {
    if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl("/marketing/hero-factory.png");
    setIsObjectUrl(false);
    setAnalysisRun(false);
    setDecision(null);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isObjectUrl && imageUrl) URL.revokeObjectURL(imageUrl);
    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);
    setIsObjectUrl(true);
    setAnalysisRun(false);
    setDecision(null);
  };

  const runInspection = () => {
    if (!imageUrl) return;
    setAnalysisRun(true);
    setDecision(null);
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 selection:bg-blue-100">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-950">
        <div className="mx-auto flex max-w-[1500px] items-start justify-center gap-2 text-xs leading-5 sm:items-center">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 sm:mt-0" />
          <p>
            <strong>Interactive frontend demo.</strong> Backend API, database persistence, real AI inference service and factory camera ingestion are <strong>not connected on this public page.</strong> All values and outcomes below are simulated and reset when the page reloads.
          </p>
        </div>
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileNavOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 lg:hidden" aria-label="Open navigation">
              <Menu className="h-4 w-4" />
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200"><CircleDot className="h-5 w-5" /></span>
              <div>
                <p className="text-base font-extrabold tracking-[-0.03em] text-slate-950">Kanb<span className="text-blue-600">AI</span></p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quality workspace</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 sm:inline-flex">BACKEND DISCONNECTED</span>
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500"><Search className="h-4 w-4" /></button>
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500"><Bell className="h-4 w-4" /></button>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">ZB</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[230px_1fr]">
        <aside className="hidden min-h-[calc(100vh-106px)] border-r border-slate-200 bg-white p-4 lg:block">
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Workspace</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">Factory A · Demo</p><p className="mt-0.5 text-[10px] text-slate-400">Sample environment</p></div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          <nav className="grid gap-1 text-sm font-medium text-slate-600">
            <button onClick={() => setSelectedView("overview")} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left ${selectedView === "overview" ? "bg-blue-50 font-semibold text-blue-700" : "hover:bg-slate-50"}`}><LayoutDashboard className="h-4 w-4" /> Overview</button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"><Camera className="h-4 w-4" /> Inspections</button>
            <button onClick={() => setSelectedView("review")} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left ${selectedView === "review" ? "bg-blue-50 font-semibold text-blue-700" : "hover:bg-slate-50"}`}><span className="flex items-center gap-3"><ShieldCheck className="h-4 w-4" /> Review queue</span><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">3</span></button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"><Activity className="h-4 w-4" /> Quality trends</button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"><Gauge className="h-4 w-4" /> Stations</button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"><Users className="h-4 w-4" /> Team</button>
          </nav>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"><Settings className="h-4 w-4" /> Settings</button>
            <Link href="/" className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Back to website</Link>
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-amber-800"><WifiOff className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.12em]">Demo mode</span></div>
            <p className="mt-2 text-[10px] leading-4 text-amber-800/80">No server requests are sent from this public demo. Data exists only in this browser session.</p>
          </div>
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-slate-950/30" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation overlay" />
            <aside className="relative h-full w-72 bg-white p-4 shadow-xl">
              <div className="mb-5 flex items-center justify-between"><p className="text-sm font-bold">KanbAI Demo</p><button onClick={() => setMobileNavOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200"><X className="h-4 w-4" /></button></div>
              <nav className="grid gap-1 text-sm font-medium text-slate-700">
                <button onClick={() => { setSelectedView("overview"); setMobileNavOpen(false); }} className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-blue-700"><LayoutDashboard className="h-4 w-4" /> Overview</button>
                <button onClick={() => { setSelectedView("review"); setMobileNavOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5"><ShieldCheck className="h-4 w-4" /> Review queue</button>
                <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5"><ArrowLeft className="h-4 w-4" /> Back to website</Link>
              </nav>
            </aside>
          </div>
        )}

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-3xl">{selectedView === "overview" ? "Quality operations" : "Review queue"}</h1>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">INTERACTIVE DEMO</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Factory A · Sample workspace · simulated frontend data</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Filter className="h-3.5 w-3.5" /> All stations</button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><SlidersHorizontal className="h-3.5 w-3.5" /> Filters</button>
              <button onClick={() => { setAnalysisRun(false); setDecision(null); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><RefreshCw className="h-3.5 w-3.5" /> Reset demo</button>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"><Database className="h-4 w-4" /></span>
                <div><p className="text-sm font-bold text-slate-900">Frontend prototype — backend integration pending</p><p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">This page demonstrates the intended KanbAI product workflow. Authentication, database storage, production camera streams, model inference endpoints, audit persistence and factory integrations are not connected here.</p></div>
              </div>
              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700">NO BACKEND CONNECTION</span>
            </div>
          </div>

          {selectedView === "overview" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["128", "Sample inspections", "Demo data"],
                  ["93.8%", "Sample pass rate", "Demo data"],
                  ["3", "Open reviews", "Demo queue"],
                  ["3 / 3", "Sample stations", "Simulated"],
                ].map(([value, label, meta]) => (
                  <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30">
                    <div className="flex items-start justify-between"><div><p className="text-2xl font-extrabold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold text-slate-600">{label}</p></div><MoreHorizontal className="h-4 w-4 text-slate-300" /></div>
                    <p className="mt-3 text-[10px] font-medium text-slate-400">{meta}</p>
                  </article>
                ))}
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
                <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
                    <div><p className="text-sm font-bold text-slate-900">Inspection activity</p><p className="mt-0.5 text-[10px] text-slate-400">Sample volume · last 8 hours</p></div>
                    <button className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">Today <ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex h-52 items-end gap-2 border-b border-l border-slate-200 px-2 pb-0">
                      {[34, 46, 41, 63, 55, 72, 68, 84, 76, 91, 82, 88, 73, 79, 86, 92].map((height, index) => (
                        <div key={index} className="group relative flex-1">
                          <div className="w-full rounded-t-sm bg-blue-500/90 transition group-hover:bg-blue-600" style={{ height: `${height * 1.7}px` }} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-between text-[9px] font-medium text-slate-400"><span>04:00</span><span>06:00</span><span>08:00</span><span>10:00</span><span>12:00</span></div>
                  </div>
                </article>

                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30">
                  <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-900">Station health</p><p className="mt-0.5 text-[10px] text-slate-400">Simulated connection state</p></div><span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> 3 online</span></div>
                  <div className="mt-5 grid gap-3">
                    {[
                      ["Station 01", "Surface inspection", "Line 1", "Online"],
                      ["Station 02", "Housing inspection", "Line 2", "Review pending"],
                      ["Station 03", "Assembly check", "Line 3", "Online"],
                    ].map(([name, task, line, state], index) => (
                      <div key={name} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${index === 1 ? "bg-amber-500" : "bg-emerald-500"}`} /><p className="text-xs font-bold text-slate-800">{name}</p></div><span className="text-[9px] font-semibold text-slate-400">{line}</span></div>
                        <p className="mt-1.5 text-[10px] text-slate-500">{task}</p><p className={`mt-2 text-[9px] font-semibold ${index === 1 ? "text-amber-600" : "text-emerald-600"}`}>{state}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center">
                  <div><p className="text-sm font-bold text-slate-900">Recent inspections</p><p className="mt-0.5 text-[10px] text-slate-400">Sample records generated for this demo</p></div>
                  <div className="flex items-center gap-2"><button className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600">Result: All</button><button onClick={() => setSelectedView("review")} className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-semibold text-white">Open review queue</button></div>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[780px]">
                    <div className="grid grid-cols-[95px_1.4fr_.7fr_.75fr_.75fr_1fr_60px] border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      <span>ID</span><span>Station</span><span>Line</span><span>Result</span><span>Confidence</span><span>Issue</span><span>Time</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {demoRows.map((row) => (
                        <div key={row.id} className="grid grid-cols-[95px_1.4fr_.7fr_.75fr_.75fr_1fr_60px] items-center px-4 py-3 text-[11px] text-slate-600 hover:bg-slate-50">
                          <span className="font-semibold text-slate-500">{row.id}</span><span className="font-semibold text-slate-800">{row.station}</span><span>{row.line}</span><span><StatusBadge status={row.result} /></span><span className="font-medium">{row.confidence}</span><span>{row.issue}</span><span>{row.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-5">
                  <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
                    <div><p className="text-sm font-bold text-slate-900">Try a sample inspection</p><p className="mt-1 text-xs text-slate-500">Runs entirely in your browser. No image is uploaded to a KanbAI server.</p></div>
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-bold text-blue-700">CLIENT-SIDE DEMO</span>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
                    <div>
                      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {imageUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageUrl} alt="Inspection sample" className="h-full w-full object-cover" />
                            {analysisRun && <div className="absolute inset-[12%] rounded-lg border-2 border-amber-400 shadow-[0_0_0_999px_rgba(15,23,42,0.12)]"><span className="absolute -top-7 left-0 rounded bg-amber-500 px-2 py-1 text-[9px] font-bold text-white">SIMULATED DETECTION · SURFACE REGION</span></div>}
                          </>
                        ) : (
                          <div className="text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-slate-400 shadow-sm"><ImageIcon className="h-5 w-5" /></span><p className="mt-3 text-xs font-semibold text-slate-600">No image selected</p><p className="mt-1 text-[10px] text-slate-400">Use the sample or choose a local image.</p></div>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"><Upload className="h-3.5 w-3.5" /> Choose image<input type="file" accept="image/*" className="hidden" onChange={handleUpload} /></label>
                        <button onClick={loadSample} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Camera className="h-3.5 w-3.5" /> Use sample</button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-800">Inspection rule</p><span className="text-[9px] font-semibold text-slate-400">Sample model</span></div>
                      <div className="mt-5 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Review threshold</p><p className="mt-1 text-3xl font-extrabold text-slate-950">{threshold}%</p></div><p className="text-right text-[9px] leading-4 text-slate-400">Higher threshold<br />routes more cases to review</p></div>
                      <input type="range" min="70" max="98" value={threshold} onChange={(event) => { setThreshold(Number(event.target.value)); setAnalysisRun(false); setDecision(null); }} className="mt-5 w-full accent-blue-600" />
                      <button disabled={!imageUrl} onClick={runInspection} className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30">Run simulated inspection</button>
                      <p className="mt-3 text-[9px] leading-4 text-slate-400">No model endpoint is called. The result below is deterministic demo logic used only to illustrate the workflow.</p>
                    </div>
                  </div>
                </article>

                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="text-sm font-bold text-slate-900">Inspection result</p><p className="mt-1 text-xs text-slate-500">AI recommendation → human decision</p></div>{analysisRun ? <StatusBadge status={aiResult} /> : <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-400">WAITING</span>}</div>

                  {!analysisRun ? (
                    <div className="grid min-h-64 place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Activity className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-slate-700">Run a sample inspection</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">Choose an image and run the browser-only simulation to see the review flow.</p></div></div>
                  ) : (
                    <div className="pt-4">
                      <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Demo confidence</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{confidence}%</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Rule threshold</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{threshold}%</p></div></div>
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-amber-900">Surface anomaly</p><p className="mt-1 text-[10px] leading-4 text-amber-800/80">Sample detection for demonstrating the operator review step.</p></div><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" /></div></div>
                      <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Human decision</p><div className="mt-2 grid grid-cols-3 gap-2"><button onClick={() => setDecision("approved")} className={`rounded-lg border px-2 py-2.5 text-[10px] font-bold ${decision === "approved" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Check className="mx-auto mb-1 h-3.5 w-3.5" />Approve</button><button onClick={() => setDecision("failed")} className={`rounded-lg border px-2 py-2.5 text-[10px] font-bold ${decision === "failed" ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><X className="mx-auto mb-1 h-3.5 w-3.5" />Fail</button><button onClick={() => setDecision("reinspect")} className={`rounded-lg border px-2 py-2.5 text-[10px] font-bold ${decision === "reinspect" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><RefreshCw className="mx-auto mb-1 h-3.5 w-3.5" />Reinspect</button></div></div>
                      {decision && <div className="mt-3 rounded-lg bg-slate-900 px-3 py-3 text-xs text-white"><span className="text-slate-400">Demo final decision: </span><strong>{decision === "approved" ? "APPROVED" : decision === "failed" ? "FAILED" : "REINSPECTION REQUESTED"}</strong><p className="mt-1 text-[9px] font-normal leading-4 text-slate-400">In a connected deployment this action would be persisted with user, timestamp, evidence and production context.</p></div>}
                    </div>
                  )}
                </article>
              </div>
            </>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
              <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center"><div><p className="text-sm font-bold text-slate-900">Cases requiring operator review</p><p className="mt-1 text-xs text-slate-500">Sample queue · browser-only demo</p></div><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Oldest first</button></div>
                <div className="divide-y divide-slate-100">
                  {queueRows.map((row, index) => (
                    <div key={row.id} className={`p-4 sm:p-5 ${index === 0 ? "bg-blue-50/40" : ""}`}>
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600"><AlertTriangle className="h-4 w-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-900">{row.issue}</p><StatusBadge status="REVIEW" /></div><p className="mt-1 text-xs text-slate-500">{row.id} · {row.station}</p><p className="mt-1 text-[10px] text-slate-400">Demo confidence {row.confidence} · waiting {row.age}</p></div></div>
                        <button onClick={() => { setSelectedView("overview"); loadSample(); }} className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white">Review case</button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
                <p className="text-sm font-bold text-slate-900">How the production version differs</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">The public demo intentionally stops at the frontend interaction layer.</p>
                <div className="mt-5 grid gap-3">
                  {[
                    ["Camera ingestion", "Not connected", false],
                    ["Inference API", "Not connected", false],
                    ["Database & audit trail", "Not connected", false],
                    ["Operator workflow UI", "Demonstrated", true],
                    ["Review decisions", "Browser-only", true],
                  ].map(([name, state, shown]) => (
                    <div key={name as string} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-3"><span className="text-xs font-semibold text-slate-700">{name as string}</span><span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${shown ? "text-blue-600" : "text-amber-600"}`}>{shown ? <CheckCircle2 className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{state as string}</span></div>
                  ))}
                </div>
              </article>
            </div>
          )}

          <div className="mt-6 flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center">
            <div><p className="text-xs font-bold text-slate-800">About this demo</p><p className="mt-1 text-[10px] leading-4 text-slate-400">UI behavior is implemented client-side to show how KanbAI is intended to operate. It does not demonstrate real production accuracy, throughput, factory connectivity or backend persistence.</p></div>
            <Link href="/" className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-blue-600"><ArrowLeft className="h-3.5 w-3.5" /> Back to KanbAI website</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
