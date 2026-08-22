"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const inspections = [
  { id: "QC-10482", line: "Line 01", product: "Housing A", result: "PASS", confidence: "99.1%", time: "13:42:18" },
  { id: "QC-10481", line: "Line 02", product: "Housing B", result: "DEFECT", confidence: "97.4%", time: "13:41:52" },
  { id: "QC-10480", line: "Line 01", product: "Housing A", result: "PASS", confidence: "98.7%", time: "13:41:29" },
  { id: "QC-10479", line: "Line 03", product: "Cover C", result: "PASS", confidence: "99.6%", time: "13:40:57" },
];

const steps = ["Capture", "AI Analysis", "Human Review", "Decision"];

export default function DemoPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [threshold, setThreshold] = useState(85);
  const [photoName, setPhotoName] = useState("No inspection image selected");
  const [aiRan, setAiRan] = useState(false);
  const [humanDecision, setHumanDecision] = useState<"approved" | "rejected" | null>(null);

  const confidence = useMemo(() => Math.min(99.2, 92.4 + threshold / 100), [threshold]);
  const aiResult = threshold >= 90 ? "PASS" : "REVIEW";

  function runInspection() {
    setAiRan(true);
    setHumanDecision(null);
    setActiveStep(2);
  }

  function chooseDecision(decision: "approved" | "rejected") {
    setHumanDecision(decision);
    setActiveStep(3);
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <header className="border-b border-white/10 bg-[#0a0d12]/95 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div><div className="text-xl font-bold tracking-tight">KanbAI</div><div className="text-xs text-gray-500">AI Quality Intelligence</div></div>
          <div className="flex items-center gap-3"><span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">INTERACTIVE DEMO</span><Link href="/" className="text-sm text-gray-400 hover:text-white">Back to website</Link></div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><p className="mb-2 text-sm font-medium text-cyan-400">SIMULATED FACTORY ENVIRONMENT</p><h1 className="text-3xl font-bold tracking-tight md:text-4xl">Quality Control Command Center</h1><p className="mt-2 max-w-3xl text-sm text-gray-400">Walk through a complete KanbAI inspection: capture a product image, set the AI confidence threshold, review the result and let a human operator make the final decision.</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-gray-400">No real production data · Demo only</div>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-[#0d1118] p-6 shadow-2xl shadow-cyan-950/10">
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((step, index) => <button key={step} onClick={() => index <= activeStep && setActiveStep(index)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${index === activeStep ? "bg-cyan-400 text-black" : index < activeStep ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-gray-500"}`}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">{index + 1}</span>{step}</button>)}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">1. Capture Product Image</h2><p className="mt-1 text-xs text-gray-500">Use a factory camera or upload a sample image.</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-gray-400">CAMERA 07</span></div>
              <div className="mt-5 flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/15 bg-gradient-to-br from-slate-800/70 via-slate-900 to-black">
                <div className="text-center"><div className="mx-auto flex h-20 w-28 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/5"><div className="h-10 w-14 rounded border border-cyan-300/60" /></div><p className="mt-3 text-xs text-gray-500">{photoName}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <label className="cursor-pointer rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-gray-200">Take / Upload Photo<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setPhotoName(file.name); setActiveStep(1); setAiRan(false); setHumanDecision(null); } }} /></label>
                <button onClick={() => { setPhotoName("Sample_Housing_A_10483.jpg"); setActiveStep(1); setAiRan(false); setHumanDecision(null); }} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5">Use Sample Image</button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-5">
              <div><h2 className="font-semibold">2. Configure AI Inspection</h2><p className="mt-1 text-xs text-gray-500">Tune the confidence threshold before analysis.</p></div>
              <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-end justify-between"><div><div className="text-xs uppercase tracking-wide text-gray-500">AI confidence threshold</div><div className="mt-2 text-4xl font-bold">{threshold}%</div></div><div className="text-right text-xs text-gray-500">Recommended<br /><span className="text-cyan-300">85–95%</span></div></div>
                <input aria-label="AI confidence threshold" type="range" min="60" max="99" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="mt-6 w-full accent-cyan-400" />
                <div className="mt-3 flex justify-between text-[10px] text-gray-600"><span>More sensitive</span><span>More selective</span></div>
              </div>
              <button disabled={!photoName || photoName === "No inspection image selected"} onClick={runInspection} className="mt-4 w-full rounded-lg bg-cyan-400 px-4 py-3 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-30">Run AI Inspection</button>
            </div>
          </div>

          {aiRan && <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">3. AI Analysis Result</h2><p className="mt-1 text-xs text-gray-500">Model v2.4.1 · simulated inference</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">{aiResult}</span></div>
              <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg border border-white/10 bg-black/20 p-4"><div className="text-[10px] uppercase text-gray-500">Confidence</div><div className="mt-1 text-2xl font-bold">{confidence.toFixed(1)}%</div></div><div className="rounded-lg border border-white/10 bg-black/20 p-4"><div className="text-[10px] uppercase text-gray-500">Inference</div><div className="mt-1 text-2xl font-bold">42 ms</div></div></div>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4"><div className="flex justify-between text-xs"><span className="text-gray-400">Detected class</span><span className="font-semibold">{aiResult === "PASS" ? "No visible defect" : "Surface anomaly"}</span></div><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${confidence}%` }} /></div></div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0d1118] p-5">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">4. Human Approval</h2><p className="mt-1 text-xs text-gray-500">AI recommends; operator makes the final decision.</p></div><span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1 text-[10px] text-amber-300">HUMAN-IN-THE-LOOP</span></div>
              <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-300">Review the AI result before releasing this inspection to the production record. This step is intentionally simulated and does not write to a backend.</div>
              <div className="mt-4 grid grid-cols-2 gap-3"><button onClick={() => chooseDecision("approved")} className={`rounded-lg border px-4 py-3 text-xs font-bold ${humanDecision === "approved" ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-gray-300 hover:bg-white/5"}`}>✓ Approve</button><button onClick={() => chooseDecision("rejected")} className={`rounded-lg border px-4 py-3 text-xs font-bold ${humanDecision === "rejected" ? "border-red-400 bg-red-400/10 text-red-300" : "border-white/10 text-gray-300 hover:bg-white/5"}`}>✕ Reject / Reinspect</button></div>
              {humanDecision && <div className="mt-4 rounded-lg bg-white/[0.03] p-3 text-xs text-gray-400">Decision recorded in demo state: <span className="font-semibold text-white">{humanDecision.toUpperCase()}</span></div>}
            </div>
          </div>}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[['Production Lines','3','All systems operational'],['Inspections Today','12,847','+8.4% vs yesterday'],['Defect Rate','1.8%','↓ 0.6% this week'],['Cameras Online','18 / 18','100% availability']].map(([label,value,detail]) => <div key={label} className="rounded-2xl border border-white/10 bg-[#0d1118] p-5"><div className="text-xs uppercase tracking-wide text-gray-500">{label}</div><div className="mt-3 text-3xl font-bold">{value}</div><div className="mt-2 text-xs text-emerald-400">{detail}</div></div>)}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Live Inspection Monitor</h2><p className="mt-1 text-xs text-gray-500">AI inspection stream · simulated</p></div><span className="flex items-center gap-2 text-xs text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" />LIVE</span></div><div className="mt-5 grid gap-4 md:grid-cols-3">{['Camera 01 · Line 01','Camera 07 · Line 02','Camera 14 · Line 03'].map((camera,i)=><div key={camera} className="overflow-hidden rounded-xl border border-white/10 bg-black"><div className="flex aspect-video items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black"><div className="relative h-20 w-28 rounded-lg border border-dashed border-cyan-400/40 bg-slate-700/30"><div className="absolute inset-4 rounded border border-cyan-400/70" /><span className="absolute -right-2 -top-2 rounded bg-cyan-400 px-1.5 py-0.5 text-[9px] font-bold text-black">{i===1?'DEFECT':'PASS'}</span></div></div><div className="flex justify-between px-3 py-2 text-[11px]"><span className="text-gray-400">{camera}</span><span className={i===1?'text-amber-400':'text-emerald-400'}>{i===1?'97.4%':'99.1%'}</span></div></div>)}</div></div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-6"><h2 className="font-semibold">Quality Alerts</h2><div className="mt-5 space-y-3"><div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"><div className="text-sm font-medium text-amber-300">Surface defect detected</div><div className="mt-1 text-xs text-gray-500">Line 02 · 13:41:52 · Confidence 97.4%</div></div><div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><div className="text-sm font-medium">Line 03 threshold normal</div><div className="mt-1 text-xs text-gray-500">No action required · 13:40:57</div></div><div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><div className="text-sm font-medium">Model health optimal</div><div className="mt-1 text-xs text-gray-500">Model v2.4.1 · Last update 2h ago</div></div></div></div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d1118] p-6"><div className="flex items-end justify-between"><div><h2 className="font-semibold">Recent Inspections</h2><p className="mt-1 text-xs text-gray-500">Continuous inspection history</p></div><span className="text-xs text-gray-500">12,847 inspections today</span></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500"><tr><th className="pb-3">Inspection</th><th className="pb-3">Line</th><th className="pb-3">Product</th><th className="pb-3">Result</th><th className="pb-3">Confidence</th><th className="pb-3">Time</th></tr></thead><tbody>{inspections.map((row)=><tr key={row.id} className="border-b border-white/5"><td className="py-4 font-medium">{row.id}</td><td className="py-4 text-gray-400">{row.line}</td><td className="py-4 text-gray-400">{row.product}</td><td className="py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.result==='PASS'?'bg-emerald-400/10 text-emerald-400':'bg-amber-400/10 text-amber-300'}`}>{row.result}</span></td><td className="py-4 text-gray-300">{row.confidence}</td><td className="py-4 text-gray-500">{row.time}</td></tr>)}</tbody></table></div></div>

        <div className="mt-6 grid gap-6 md:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-[#0d1118] p-6"><h2 className="font-semibold">Continuous Learning</h2><p className="mt-2 text-sm text-gray-400">Inspection feedback is converted into training data for model improvement.</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[78%] rounded-full bg-cyan-400" /></div><div className="mt-2 flex justify-between text-xs text-gray-500"><span>Model v2.4.1</span><span>78% training cycle</span></div></div><div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6"><div className="text-xs font-semibold uppercase tracking-wide text-cyan-300">What this demonstrates</div><ul className="mt-4 space-y-2 text-sm text-gray-300"><li>• Capture → AI inference → human approval</li><li>• Adjustable confidence threshold</li><li>• Automated defect detection</li><li>• Production-line analytics</li><li>• Continuous model improvement workflow</li></ul></div></div>
      </section>
    </main>
  );
}
