"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ClipboardCheck,
  Database,
  Factory,
  Gauge,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  Users,
  WifiOff,
  X,
} from "lucide-react";

const CONTACT_EMAIL = "zeynep.balkan2009@gmail.com";
const demoMailto = `mailto:${CONTACT_EMAIL}?subject=KanbAI%20Demo%20Request`;
const pilotMailto = `mailto:${CONTACT_EMAIL}?subject=KanbAI%20Factory%20Pilot`;

const featureCards = [
  {
    icon: Camera,
    title: "Inspection view",
    text: "Bring the latest visual inspection into a quality-control workspace built around production lines and stations.",
  },
  {
    icon: ClipboardCheck,
    title: "Human review",
    text: "Route uncertain cases to an operator instead of hiding model uncertainty behind a single score.",
  },
  {
    icon: Activity,
    title: "Traceable decisions",
    text: "Keep inspection result, confidence, defect context and human decision together for later analysis.",
  },
];

const workflowSteps = [
  { n: "01", title: "Capture", text: "A camera or pilot capture flow supplies the inspection image." },
  { n: "02", title: "Analyze", text: "The vision layer produces a quality recommendation and confidence." },
  { n: "03", title: "Review", text: "Uncertain or critical cases are routed to the quality team." },
  { n: "04", title: "Record", text: "Verified decisions become structured quality evidence for the factory." },
];

function StatusBadge({ status }: { status: "PASS" | "REVIEW" | "FAIL" }) {
  const style =
    status === "PASS"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "FAIL"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";
  return <span className={`rounded-md border px-2 py-1 text-[9px] font-black ${style}`}>{status}</span>;
}

function ProductPreview() {
  const lines = ["Production Line 1A", "Production Line 1B", "Pilot Factory Line", "Production Line 3B"];
  const recent = [
    ["8d42a9f1", "11:42", "REVIEW"],
    ["9ab71c20", "11:41", "PASS"],
    ["3c86f222", "11:39", "PASS"],
  ] as const;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.12)]">
      <div className="min-w-[980px]">
        <div className="flex h-11 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /></div>
          <span className="text-[10px] font-semibold text-slate-400">KanbAI quality control workspace · illustrative product view</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">SAMPLE DATA</span>
        </div>

        <div className="grid grid-cols-[230px_minmax(0,1fr)_250px] bg-[#f5f7fb] p-4">
          <aside className="overflow-hidden rounded-l-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Search className="h-3.5 w-3.5 text-slate-400" /><span className="text-[10px] text-slate-400">Search line</span></div>
            </div>
            <div className="divide-y divide-slate-100">
              {lines.map((line) => <div key={line} className={`flex items-center justify-between px-4 py-3 text-[11px] ${line === "Pilot Factory Line" ? "bg-[#063f63] font-semibold text-white" : "text-slate-600"}`}><span>{line}</span>{line === "Pilot Factory Line" && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[8px] font-bold">DEMO</span>}</div>)}
            </div>
          </aside>

          <main className="border-y border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Quality control view</p><p className="mt-1 text-base font-bold text-slate-900">Pilot Factory Line</p></div>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-semibold text-slate-600"><RefreshCw className="h-3 w-3" /> Refresh</span>
            </div>
            <div className="p-4">
              <div className="relative flex h-[330px] items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                <Image src="/marketing/hero-factory.png" alt="Illustrative factory inspection" fill sizes="520px" className="object-cover opacity-80" />
                <div className="absolute inset-x-[13%] bottom-[12%] top-[17%] rounded border-[5px] border-amber-400 shadow-lg">
                  <div className="absolute -bottom-1 left-0 rounded-tr bg-amber-400 px-3 py-1.5 text-sm font-black text-slate-950">REVIEW</div>
                </div>
              </div>
              <p className="mt-2 text-center text-[9px] text-slate-400">Illustrative product screen — not live factory data</p>
            </div>
          </main>

          <aside className="rounded-r-xl border border-slate-200 bg-white p-3">
            <section className="rounded-xl border border-slate-100 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Current inspection</p>
              <div className="mt-3 flex items-start justify-between"><div><p className="text-3xl font-black text-orange-700">REVIEW</p><p className="mt-1 font-mono text-[9px] text-slate-400">8d42a9f1</p></div><ShieldCheck className="h-6 w-6 text-orange-500" /></div>
              <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-slate-50 p-2"><p className="text-[8px] text-slate-400">Confidence</p><p className="mt-1 text-base font-bold">82.6%</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="text-[8px] text-slate-400">Threshold</p><p className="mt-1 text-base font-bold">88%</p></div></div>
              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[9px] leading-4 text-slate-500">Surface anomaly routed to human review.</p>
            </section>
            <section className="mt-3 rounded-xl border border-slate-100 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Recent activity</p>
              <div className="mt-2 space-y-2">{recent.map(([id, time, status]) => <div key={id} className="flex items-center justify-between rounded-lg border border-slate-100 px-2 py-2"><div><p className="font-mono text-[9px] text-slate-600">{id}</p><p className="text-[8px] text-slate-400">{time}</p></div><StatusBadge status={status} /></div>)}</div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white text-slate-900 selection:bg-blue-100">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Main navigation">
          <Link href="#top" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#063f63] text-white"><CircleDot className="h-5 w-5" /></span><span className="text-lg font-extrabold tracking-[-0.03em] text-slate-950">Kanb<span className="text-blue-600">AI</span></span></Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex"><a href="#product" className="hover:text-slate-950">Product</a><a href="#workflow" className="hover:text-slate-950">Workflow</a><a href="#pilot" className="hover:text-slate-950">Pilot</a><a href="#boundary" className="hover:text-slate-950">Technical boundary</a></div>
          <div className="hidden items-center gap-3 lg:flex"><Link href="/demo" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Open demo</Link><a href={pilotMailto} className="inline-flex items-center gap-2 rounded-lg bg-[#063f63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#052f4a]">Request a pilot <ArrowRight className="h-4 w-4" /></a></div>
          <button onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 lg:hidden" aria-label="Toggle navigation">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </nav>
        {menuOpen && <div className="border-t border-slate-200 bg-white px-5 py-4 lg:hidden"><div className="mx-auto grid max-w-7xl gap-1">{[["product","Product"],["workflow","Workflow"],["pilot","Pilot"],["boundary","Technical boundary"]].map(([id,label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{label}</a>)}<div className="mt-3 grid grid-cols-2 gap-2"><Link href="/demo" className="rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold">Open demo</Link><a href={pilotMailto} className="rounded-lg bg-[#063f63] px-3 py-2.5 text-center text-sm font-semibold text-white">Request pilot</a></div></div></div>}
      </header>

      <section id="top" className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(2,132,199,0.10),transparent_65%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><Factory className="h-3.5 w-3.5" /> Visual quality operations for manufacturing</div>
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-6xl">Visual inspection your quality team can actually operate.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">KanbAI brings inspection images, AI recommendations, human review and quality evidence into one workflow designed for the factory floor.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#063f63] px-5 py-3 text-sm font-semibold text-white hover:bg-[#052f4a]">Try the frontend demo <ArrowRight className="h-4 w-4" /></Link><a href={pilotMailto} className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">Discuss a factory pilot</a></div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Existing-camera approach</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Human-in-the-loop</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Pilot-first deployment</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
              <Image src="/marketing/hero-factory.png" alt="Factory visual inspection" fill priority sizes="(max-width:1024px) 100vw, 54vw" className="object-cover opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
              <div className="marketing-scan" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-3 rounded-xl border border-white/20 bg-white/95 p-4 shadow-xl backdrop-blur sm:left-auto sm:w-64">
                <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Sample inspection</p><p className="mt-1 text-sm font-bold text-slate-900">Housing · Station 02</p></div><StatusBadge status="REVIEW" /></div>
                <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Confidence</span><span className="font-bold text-slate-900">82.6%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[83%] rounded-full bg-amber-400" /></div>
                <p className="text-[9px] leading-4 text-slate-400">Illustrative UI. Not live production data.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-18 sm:px-8 lg:py-20">
        <div className="grid gap-5 md:grid-cols-3">{featureCards.map((card) => { const Icon = card.icon; return <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#063f63]"><Icon className="h-5 w-5" /></span><h2 className="mt-5 text-lg font-bold text-slate-950">{card.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p></article>; })}</div>
      </section>

      <section id="product" className="border-y border-slate-200 bg-slate-50 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-semibold text-blue-700">Product workspace</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">Built around the inspection, not around an AI chatbot.</h2><p className="mt-5 text-base leading-7 text-slate-600">The product interface follows the real quality-control flow: choose a production line, inspect the latest image, see the recommendation and review recent decisions.</p></div>
          <div className="mt-12"><ProductPreview /></div>
          <div className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><p>Numbers shown in this website preview are illustrative UI data. We do not present simulated metrics as factory traction.</p></div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start"><div><p className="text-sm font-semibold text-blue-700">Quality workflow</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">AI makes a recommendation. Quality keeps control.</h2><p className="mt-5 text-base leading-7 text-slate-600">KanbAI is designed to make model output operational: visible, reviewable and connected to a final human decision.</p></div><div className="grid gap-4 sm:grid-cols-2">{workflowSteps.map((step) => <div key={step.n} className="rounded-2xl border border-slate-200 p-5"><span className="text-xs font-black text-blue-700">{step.n}</span><h3 className="mt-3 text-base font-bold text-slate-950">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p></div>)}</div></div>
      </section>

      <section id="pilot" className="border-y border-slate-200 bg-slate-950 py-20 text-white lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><p className="text-sm font-semibold text-blue-300">Pilot-first deployment</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Start with one line and one painful visual check.</h2><p className="mt-5 max-w-xl text-base leading-7 text-slate-300">A controlled pilot is the right place to validate image quality, model behavior, operator agreement and the integration path before a broader rollout.</p><a href={pilotMailto} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-950">Request a pilot discussion <ArrowRight className="h-4 w-4" /></a></div><div className="grid gap-3 sm:grid-cols-2">{[[Camera,"Inspection point","Define part, defect criteria, camera position and lighting context."],[Upload,"Capture flow","Collect controlled images from the selected station or pilot device."],[Gauge,"Validation","Compare recommendations with the quality team&apos;s actual decisions."],[Database,"Evidence","Build a governed set of reviewed examples for the factory workflow."]].map(([Icon,title,text]) => { const I = Icon as typeof Camera; return <div key={title as string} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><I className="h-5 w-5 text-blue-300" /><h3 className="mt-4 text-sm font-bold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text as string}</p></div>; })}</div></div></div>
      </section>

      <section id="boundary" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-semibold text-blue-700">Technical boundary</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">The public demo is intentionally not the production backend.</h2><p className="mt-5 text-base leading-7 text-slate-600">We keep the public product walkthrough honest about what is connected and what belongs to a factory deployment.</p></div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><WifiOff className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">Public demo</p><h3 className="mt-1 text-xl font-bold text-slate-950">Browser-only product walkthrough</h3></div></div><div className="mt-6 grid gap-3 text-sm text-slate-600">{["Interactive UI and workflow", "Local sample image / upload preview", "Simulated recommendation and review state", "No production API, database or camera connection"].map((item) => <div key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{item}</span></div>)}</div><Link href="/demo" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700">Open public demo <ArrowRight className="h-4 w-4" /></Link></article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-[#063f63]"><Factory className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Factory pilot</p><h3 className="mt-1 text-xl font-bold text-slate-950">Connected deployment environment</h3></div></div><div className="mt-6 grid gap-3 text-sm text-slate-600">{["Factory-specific capture setup", "Backend/API and evidence persistence", "Model endpoint connected to the pilot workflow", "Human review and pilot measurement with real production context"].map((item) => <div key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span>{item}</span></div>)}</div><a href={pilotMailto} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700">Discuss deployment <ArrowRight className="h-4 w-4" /></a></article>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-sm font-semibold text-blue-700">Next step</p><h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">See the interface first. Validate the factory workflow second.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">The public demo shows how KanbAI is intended to work. A pilot is where camera conditions, model performance and operator agreement get measured with real data.</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#063f63] px-5 py-3 text-sm font-bold text-white">Open demo <ArrowRight className="h-4 w-4" /></Link><a href={demoMailto} className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800">Contact KanbAI</a></div></div></div>
      </section>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#063f63] text-white"><CircleDot className="h-4 w-4" /></span><div><p className="text-sm font-extrabold text-slate-950">Kanb<span className="text-blue-600">AI</span></p><p className="text-xs text-slate-500">Visual quality operations for manufacturing.</p></div></div><div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500"><a href="#product">Product</a><a href="#workflow">Workflow</a><a href="#pilot">Pilot</a><Link href="/demo">Demo</Link><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></div><p className="text-xs text-slate-400">© 2026 KanbAI</p></div></footer>
    </main>
  );
}
