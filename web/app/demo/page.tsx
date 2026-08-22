"use client";

import Link from "next/link";
import { useState } from "react";

const steps = ["Capture", "AI Analysis", "Human Review", "Decision"];

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const [threshold, setThreshold] = useState(90);
  const [image, setImage] = useState(false);
  const [decision, setDecision] = useState<"approved" | "reinspect" | null>(null);

  const confidence = threshold >= 90 ? 97.4 : 83.6;
  const result = confidence >= threshold ? "PASS" : "REVIEW";

  const useSample = () => {
    setImage(true);
    setStep(1);
    setDecision(null);
  };

  const runAI = () => {
    setStep(2);
    setDecision(null);
  };

  const decide = (value: "approved" | "reinspect") => {
    setDecision(value);
    setStep(3);
  };

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <header className="border-b border-white/10 bg-[#090c11] px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div><div className="text-xl font-bold">KanbAI</div><div className="text-[11px] text-gray-500">AI QUALITY INTELLIGENCE</div></div>
          <div className="flex items-center gap-3"><span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold tracking-wider text-cyan-300">LIVE PRODUCT DEMO</span><Link href="/" className="text-xs text-gray-500 hover:text-white">Website</Link></div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-7">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Simulated factory environment</div>
          <div className="mt-2 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><h1 className="text-3xl font-bold md:text-4xl">AI Visual Inspection</h1><p className="mt-2 max-w-2xl text-sm text-gray-400">See the complete quality-control loop: capture → AI detection → human verification → production decision.</p></div><div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-gray-500">SIMULATION · NO REAL FACTORY DATA</div></div>
        </div>

        <div className="mb-5 grid grid-cols-4 overflow-hidden rounded-xl border border-white/10 bg-[#0d1118]">
          {steps.map((name, i) => <button key={name} onClick={() => i <= step && setStep(i)} className={`relative px-2 py-4 text-center text-xs transition ${i === step ? "bg-cyan-400/10 text-cyan-300" : i < step ? "text-emerald-300" : "text-gray-600"}`}><span className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border border-current text-[10px] font-bold">{i < step ? "✓" : i + 1}</span><span className="hidden sm:block">{name}</span>{i === step && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}</button>)}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Step 01</div><h2 className="mt-1 text-lg font-semibold">Capture product</h2></div><span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-gray-500">CAMERA 07</span></div>
            <div className="mt-5 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-black">
              {image ? <div className="relative h-48 w-64 rounded-xl border border-cyan-400/50 bg-slate-700/30 shadow-2xl"><div className="absolute left-8 top-7 h-32 w-48 rounded-lg border-2 border-cyan-300/80" /><div className="absolute left-8 top-3 rounded bg-cyan-400 px-2 py-1 text-[9px] font-bold text-black">PRODUCT DETECTED</div><div className="absolute bottom-3 left-3 text-[9px] text-cyan-200">Housing A · frame 10483</div></div> : <div className="text-center"><div className="mx-auto flex h-24 w-32 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02]"><div className="h-10 w-14 rounded border border-gray-500" /></div><p className="mt-3 text-xs text-gray-500">No image captured</p></div>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><label className="cursor-pointer rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-black">Take / Upload Photo<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.[0]) useSample(); }} /></label><button onClick={useSample} className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/5">Use sample image</button></div>
            <p className="mt-3 text-[10px] text-gray-600">In the real product, this frame would arrive from an industrial camera. This public demo uses simulated data only.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Step 02</div><h2 className="mt-1 text-lg font-semibold">Configure AI inspection</h2><p className="mt-2 text-xs text-gray-500">Choose how strict the inspection model should be.</p>
            <div className="mt-7 rounded-xl border border-white/10 bg-black/20 p-5"><div className="flex items-end justify-between"><div><div className="text-[10px] uppercase tracking-wider text-gray-500">Confidence threshold</div><div className="mt-2 text-4xl font-bold">{threshold}%</div></div><div className="text-right text-[10px] text-gray-600">Sensitivity<br /><span className="text-cyan-300">{threshold < 80 ? "High" : threshold < 92 ? "Balanced" : "Strict"}</span></div></div><input type="range" min="60" max="99" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="mt-7 w-full accent-cyan-400" /><div className="mt-2 flex justify-between text-[9px] text-gray-600"><span>Catch more defects</span><span>Reduce false positives</span></div></div>
            <button disabled={!image} onClick={runAI} className="mt-4 w-full rounded-lg bg-cyan-400 py-3 text-xs font-bold text-black disabled:opacity-25">Run AI inspection</button>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-white/[0.03] p-3"><div className="text-lg font-bold">42ms</div><div className="text-[9px] text-gray-600">Inference</div></div><div className="rounded-lg bg-white/[0.03] p-3"><div className="text-lg font-bold">v2.4.1</div><div className="text-[9px] text-gray-600">Model</div></div><div className="rounded-lg bg-white/[0.03] p-3"><div className="text-lg font-bold">YOLO</div><div className="text-[9px] text-gray-600">Vision</div></div></div>
          </div>
        </div>

        {step >= 2 && <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Step 03</div><h2 className="mt-1 text-lg font-semibold">AI analysis</h2></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${result === "PASS" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{result}</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-black/20 p-4"><div className="text-[9px] uppercase text-gray-500">Confidence</div><div className="mt-1 text-3xl font-bold">{confidence}%</div></div><div className="rounded-xl bg-black/20 p-4"><div className="text-[9px] uppercase text-gray-500">Threshold</div><div className="mt-1 text-3xl font-bold">{threshold}%</div></div></div><div className="mt-3 rounded-xl bg-black/20 p-4"><div className="flex justify-between text-xs"><span className="text-gray-400">Detection</span><span className="font-semibold">{result === "PASS" ? "No visible defect" : "Surface anomaly"}</span></div><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${confidence}%` }} /></div></div></div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Step 04</div><h2 className="mt-1 text-lg font-semibold">Human review</h2></div><span className="rounded-md border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-[9px] text-amber-300">HUMAN-IN-THE-LOOP</span></div><p className="mt-3 text-xs leading-5 text-gray-400">AI provides the recommendation. An operator reviews the evidence and makes the final quality decision.</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => decide("approved")} className={`rounded-lg border py-3 text-xs font-bold ${decision === "approved" ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-gray-300 hover:bg-white/5"}`}>✓ Approve</button><button onClick={() => decide("reinspect")} className={`rounded-lg border py-3 text-xs font-bold ${decision === "reinspect" ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/10 text-gray-300 hover:bg-white/5"}`}>↻ Reinspect</button></div>{decision && <div className="mt-4 rounded-lg bg-white/[0.03] p-3 text-xs text-gray-400">Final decision: <span className="font-bold text-white">{decision === "approved" ? "APPROVED FOR PRODUCTION" : "SENT FOR REINSPECTION"}</span></div>}</div>
        </div>}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Production Lines","3","Operational"],["Inspections Today","12,847","+8.4%"],["Defect Rate","1.8%","↓ 0.6%"],["Cameras Online","18 / 18","100%"]].map(([a,b,c]) => <div key={a} className="rounded-xl border border-white/10 bg-[#0d1118] p-4"><div className="text-[10px] uppercase tracking-wider text-gray-600">{a}</div><div className="mt-2 text-2xl font-bold">{b}</div><div className="mt-1 text-[10px] text-emerald-400">{c}</div></div>)}</div>

        <div className="mt-7 grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5"><h2 className="font-semibold">Live line monitor</h2><p className="mt-1 text-xs text-gray-600">Simulated industrial camera feeds</p><div className="mt-4 grid grid-cols-3 gap-2">{["Line 01","Line 02","Line 03"].map((line,i)=><div key={line} className="overflow-hidden rounded-lg border border-white/10"><div className="flex aspect-video items-center justify-center bg-gradient-to-br from-slate-800 to-black"><div className="h-10 w-14 rounded border border-cyan-400/50" /></div><div className="flex justify-between p-2 text-[9px]"><span className="text-gray-500">{line}</span><span className={i===1?"text-amber-300":"text-emerald-300"}>{i===1?"DEFECT":"PASS"}</span></div></div>)}</div></div><div className="rounded-2xl border border-white/10 bg-[#0d1118] p-5"><h2 className="font-semibold">Quality intelligence</h2><div className="mt-4 space-y-2 text-xs"><div className="flex justify-between rounded-lg bg-white/[0.03] p-3"><span className="text-gray-500">Surface defects</span><span>42 today</span></div><div className="flex justify-between rounded-lg bg-white/[0.03] p-3"><span className="text-gray-500">Model confidence</span><span className="text-emerald-300">98.2%</span></div><div className="flex justify-between rounded-lg bg-white/[0.03] p-3"><span className="text-gray-500">Human reviews</span><span>186</span></div></div></div></div>

        <div className="mt-7 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-xs text-gray-400"><span className="font-semibold text-cyan-300">Demo note:</span> Every interaction above is simulated in the browser. No login, backend, customer account or production data is required.</div>
      </section>
    </main>
  );
}
