"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Factory,
  Gauge,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

const CONTACT_EMAIL = "zeynep.balkan2009@gmail.com";
const demoMailto = `mailto:${CONTACT_EMAIL}?subject=KanbAI%20Demo%20Request`;
const pilotMailto = `mailto:${CONTACT_EMAIL}?subject=KanbAI%20Factory%20Pilot`;

const inspections = [
  { id: "IN-1048", station: "Line 2 · Housing", result: "PASS", confidence: "98.4%", time: "09:42" },
  { id: "IN-1047", station: "Line 2 · Housing", result: "REVIEW", confidence: "78.1%", time: "09:41" },
  { id: "IN-1046", station: "Line 1 · Surface", result: "PASS", confidence: "96.8%", time: "09:39" },
  { id: "IN-1045", station: "Line 3 · Assembly", result: "FAIL", confidence: "94.2%", time: "09:36" },
];

const featureCards = [
  {
    icon: Camera,
    title: "Connect inspection points",
    text: "Use existing cameras where possible, or define the right camera and lighting setup for a new station.",
  },
  {
    icon: ShieldCheck,
    title: "Keep people in control",
    text: "AI handles repetitive visual checks while uncertain cases are routed to operators for review.",
  },
  {
    icon: BarChart3,
    title: "Manage quality from one place",
    text: "Track inspections, defect trends, station performance and human validation from a single workspace.",
  },
];

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "PASS"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "FAIL"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles}`}>{status}</span>;
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white text-slate-900 selection:bg-blue-100">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Main navigation">
          <Link href="#top" className="flex items-center gap-2.5" aria-label="KanbAI home" onClick={() => setMenuOpen(false)}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
              <CircleDot className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-[-0.03em] text-slate-950">Kanb<span className="text-blue-600">AI</span></span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
            <a href="#platform" className="transition hover:text-slate-950">Platform</a>
            <a href="#workflow" className="transition hover:text-slate-950">How it works</a>
            <a href="#teams" className="transition hover:text-slate-950">For teams</a>
            <a href="#pilot" className="transition hover:text-slate-950">Pilot</a>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/demo" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">View product</Link>
            <a href={demoMailto} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Book a demo <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 lg:hidden" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-4 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-1">
              {["platform", "workflow", "teams", "pilot"].map((item) => (
                <a key={item} href={`#${item}`} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold capitalize text-slate-700 hover:bg-slate-50">{item === "teams" ? "For teams" : item === "workflow" ? "How it works" : item}</a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/demo" className="rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold">View product</Link>
                <a href={demoMailto} className="rounded-lg bg-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white">Book a demo</a>
              </div>
            </div>
          </div>
        )}
      </header>

      <section id="top" className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.08),transparent_65%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5" /> Visual quality management for factories
            </div>
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-6xl">
              Manage visual quality like a modern software workflow.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              KanbAI brings camera-based inspection, operator review and quality analytics into one simple workspace for production teams.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={demoMailto} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Book a demo <ArrowRight className="h-4 w-4" /></a>
              <Link href="/demo" className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">Explore the product</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Existing cameras supported</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Human review built in</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Pilot-friendly setup</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
              <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
                <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /></div>
                <span className="text-[10px] font-semibold text-slate-400">KanbAI Workspace</span>
                <div className="w-12" />
              </div>

              <div className="grid min-h-[470px] grid-cols-[72px_1fr] sm:grid-cols-[180px_1fr]">
                <aside className="border-r border-slate-200 bg-slate-50/80 p-3">
                  <div className="mb-5 hidden px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:block">Workspace</div>
                  <div className="grid gap-1.5 text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-2 text-blue-700"><LayoutDashboard className="h-4 w-4" /><span className="hidden sm:inline">Overview</span></div>
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2"><Camera className="h-4 w-4" /><span className="hidden sm:inline">Inspections</span></div>
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2"><ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">Review queue</span></div>
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2"><Activity className="h-4 w-4" /><span className="hidden sm:inline">Quality trends</span></div>
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2"><Settings className="h-4 w-4" /><span className="hidden sm:inline">Stations</span></div>
                  </div>
                </aside>

                <div className="min-w-0 bg-white">
                  <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 sm:px-5">
                    <div><p className="text-xs font-bold text-slate-900">Quality overview</p><p className="mt-0.5 hidden text-[10px] text-slate-400 sm:block">Today · Factory A</p></div>
                    <div className="flex items-center gap-2 text-slate-400"><Search className="h-4 w-4" /><Bell className="h-4 w-4" /><span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-[9px] font-bold text-white">ZB</span></div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                      {[
                        ["1,284", "Inspections", "Today"],
                        ["96.7%", "Pass rate", "+1.8%"],
                        ["18", "Needs review", "Open"],
                        ["4", "Active stations", "Online"],
                      ].map(([value, label, meta]) => (
                        <div key={label} className="rounded-xl border border-slate-200 p-3.5">
                          <p className="text-xl font-bold tracking-tight text-slate-950">{value}</p>
                          <div className="mt-1 flex items-center justify-between gap-2"><span className="text-[10px] font-medium text-slate-500">{label}</span><span className="text-[9px] font-semibold text-blue-600">{meta}</span></div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
                      <div className="rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                          <div><p className="text-[11px] font-bold text-slate-900">Inspection volume</p><p className="text-[9px] text-slate-400">Last 8 hours</p></div>
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="flex h-32 items-end gap-2 px-4 pb-4 pt-5">
                          {[42, 58, 48, 71, 63, 86, 77, 94, 82, 100, 88, 96].map((height, index) => <div key={index} className="flex-1 rounded-t-sm bg-blue-100"><div className="w-full rounded-t-sm bg-blue-600" style={{ height: `${height}%` }} /></div>)}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between"><p className="text-[11px] font-bold text-slate-900">Live stations</p><span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 4 online</span></div>
                        <div className="mt-4 grid gap-2">
                          {["Line 1 · Surface", "Line 2 · Housing", "Line 3 · Assembly"].map((station, i) => <div key={station} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><div><p className="text-[10px] font-semibold text-slate-700">{station}</p><p className="mt-0.5 text-[9px] text-slate-400">Camera {i + 1}</p></div><span className="h-2 w-2 rounded-full bg-emerald-500" /></div>)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><p className="text-[11px] font-bold text-slate-900">Recent inspections</p><span className="text-[9px] font-semibold text-blue-600">View all</span></div>
                      <div className="divide-y divide-slate-100">
                        {inspections.map((row) => (
                          <div key={row.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 sm:grid-cols-[90px_1fr_80px_60px_45px]">
                            <span className="hidden text-[10px] font-semibold text-slate-500 sm:block">{row.id}</span>
                            <span className="truncate text-[10px] font-semibold text-slate-700">{row.station}</span>
                            <StatusBadge status={row.result} />
                            <span className="hidden text-[10px] text-slate-500 sm:block">{row.confidence}</span>
                            <span className="hidden text-[10px] text-slate-400 sm:block">{row.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-blue-600">One workspace for visual quality</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">Less switching between cameras, spreadsheets and manual notes.</h2>
          <p className="mt-5 text-base leading-7 text-slate-600">KanbAI connects the inspection point with the people responsible for quality, so every decision has context and every issue can be followed up.</p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-lg font-bold text-slate-950">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="border-y border-slate-200 bg-slate-50 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-blue-600">Simple workflow</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">AI does the first check. Your team owns the final decision.</h2>
              <p className="mt-5 text-base leading-7 text-slate-600">KanbAI is designed to fit around the quality team instead of replacing it.</p>
              <div className="mt-7 grid gap-4">
                {[
                  ["01", "Capture", "A connected camera sends the inspection image."],
                  ["02", "Classify", "KanbAI returns PASS, REVIEW or FAIL."],
                  ["03", "Review", "Operators validate uncertain and critical cases."],
                  ["04", "Improve", "Verified decisions strengthen the factory-specific dataset."],
                ].map(([step, title, text]) => (
                  <div key={step} className="flex gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-blue-100 bg-white text-xs font-bold text-blue-600">{step}</span>
                    <div><p className="text-sm font-bold text-slate-900">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div><p className="text-sm font-bold text-slate-900">Review queue</p><p className="mt-1 text-xs text-slate-500">18 cases need attention</p></div>
                <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">All stations</button>
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  ["Surface anomaly", "Line 2 · Housing", "78%", "REVIEW"],
                  ["Missing component", "Line 3 · Assembly", "94%", "FAIL"],
                  ["Edge inconsistency", "Line 1 · Surface", "81%", "REVIEW"],
                ].map(([issue, station, confidence, status]) => (
                  <div key={issue} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{issue}</p><p className="mt-1 text-xs text-slate-500">{station} · {confidence} confidence</p></div>
                    <div className="flex items-center gap-3"><StatusBadge status={status} /><button className="hidden rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white sm:inline-flex">Review</button></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="teams" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-600">Built for the people who run quality</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">One system, different views for every team.</h2>
            <p className="mt-5 text-base leading-7 text-slate-600">Operators need quick decisions. Quality managers need evidence. Plant managers need trends. KanbAI keeps those views connected.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [Users, "Operators", "Review flagged inspections and keep production moving."],
              [Gauge, "Quality managers", "Track defects, approvals and station performance."],
              [Factory, "Plant leaders", "See quality trends and where intervention is needed."],
            ].map(([Icon, title, text]) => {
              const CardIcon = Icon as typeof Users;
              return (
                <article key={title as string} className="rounded-2xl border border-slate-200 p-5">
                  <CardIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="mt-4 text-sm font-bold text-slate-950">{title as string}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pilot" className="border-t border-slate-200 bg-slate-950 py-20 text-white lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-300">Start with one inspection point</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">You do not need a full factory rollout to see if KanbAI fits.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Pick one repetitive visual quality task. We define the camera setup, baseline the current process and run a controlled pilot with your quality team.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a href={pilotMailto} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">Request a pilot <ArrowRight className="h-4 w-4" /></a>
            <Link href="/demo" className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5">View product demo</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white"><CircleDot className="h-4 w-4" /></span><div><p className="text-sm font-extrabold tracking-[-0.03em] text-slate-950">Kanb<span className="text-blue-600">AI</span></p><p className="text-xs text-slate-500">Visual quality management for manufacturing.</p></div></div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500"><a href="#platform" className="hover:text-slate-900">Platform</a><a href="#workflow" className="hover:text-slate-900">How it works</a><a href="#pilot" className="hover:text-slate-900">Pilot</a><a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-slate-900">Contact</a></div>
          <p className="text-xs text-slate-400">© 2026 KanbAI</p>
        </div>
      </footer>
    </main>
  );
}
