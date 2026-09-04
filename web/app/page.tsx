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
  ClipboardCheck,
  Factory,
  Filter,
  Gauge,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";

const CONTACT_EMAIL = "zeynep.balkan2009@gmail.com";
const demoMailto = `mailto:${CONTACT_EMAIL}?subject=KanbAI%20Demo%20Request`;
const pilotMailto = `mailto:${CONTACT_EMAIL}?subject=KanbAI%20Factory%20Pilot`;

const inspections = [
  { id: "IN-1052", station: "Housing inspection", line: "Line 2", result: "PASS", confidence: "98.4%", issue: "—", time: "10:14" },
  { id: "IN-1051", station: "Housing inspection", line: "Line 2", result: "REVIEW", confidence: "78.1%", issue: "Surface mark", time: "10:12" },
  { id: "IN-1050", station: "Surface check", line: "Line 1", result: "PASS", confidence: "96.8%", issue: "—", time: "10:09" },
  { id: "IN-1049", station: "Assembly check", line: "Line 3", result: "FAIL", confidence: "94.2%", issue: "Missing part", time: "10:06" },
  { id: "IN-1048", station: "Surface check", line: "Line 1", result: "PASS", confidence: "97.5%", issue: "—", time: "10:02" },
];

const queue = [
  { issue: "Surface mark", station: "Housing inspection", part: "A17-2041", confidence: "78%", status: "REVIEW" },
  { issue: "Missing component", station: "Assembly check", part: "B04-1187", confidence: "94%", status: "FAIL" },
  { issue: "Edge inconsistency", station: "Surface check", part: "C12-3310", confidence: "81%", status: "REVIEW" },
];

const featureCards = [
  {
    icon: Camera,
    title: "Inspection stations",
    text: "Connect existing cameras, organize inspection points, and see station health from one place.",
  },
  {
    icon: ClipboardCheck,
    title: "Review queue",
    text: "Route uncertain or failed inspections to the right people without losing production context.",
  },
  {
    icon: BarChart3,
    title: "Quality analytics",
    text: "Follow defect patterns, pass rates, station performance, and operator decisions over time.",
  },
];

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "PASS"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "FAIL"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold ${styles}`}>{status}</span>;
}

function ProductWorkspace() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.12)]">
      <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /></div>
          <span className="ml-2 hidden text-[10px] font-medium text-slate-400 sm:inline">app.kanbai.ai / workspace</span>
        </div>
        <span className="rounded-md bg-slate-50 px-2 py-1 text-[9px] font-medium text-slate-400">Illustrative workspace</span>
      </div>

      <div className="grid min-w-[920px] grid-cols-[188px_1fr]">
        <aside className="flex min-h-[610px] flex-col border-r border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center gap-2 px-2 py-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-white"><CircleDot className="h-4 w-4" /></span>
            <div><p className="text-xs font-extrabold tracking-[-0.02em] text-slate-900">Kanb<span className="text-blue-600">AI</span></p><p className="text-[9px] text-slate-400">Factory A</p></div>
            <ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="mt-5 px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Workspace</div>
          <nav className="mt-2 grid gap-1 text-[11px] font-medium text-slate-600">
            <div className="flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-2 text-blue-700"><LayoutDashboard className="h-4 w-4" /> Overview</div>
            <div className="flex items-center gap-2 rounded-md px-2.5 py-2"><Camera className="h-4 w-4" /> Inspections</div>
            <div className="flex items-center gap-2 rounded-md px-2.5 py-2"><ClipboardCheck className="h-4 w-4" /> Review queue <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">18</span></div>
            <div className="flex items-center gap-2 rounded-md px-2.5 py-2"><Activity className="h-4 w-4" /> Quality trends</div>
            <div className="flex items-center gap-2 rounded-md px-2.5 py-2"><Factory className="h-4 w-4" /> Stations</div>
          </nav>

          <div className="mt-6 px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Manage</div>
          <nav className="mt-2 grid gap-1 text-[11px] font-medium text-slate-600">
            <div className="flex items-center gap-2 rounded-md px-2.5 py-2"><Users className="h-4 w-4" /> Team</div>
            <div className="flex items-center gap-2 rounded-md px-2.5 py-2"><Settings className="h-4 w-4" /> Settings</div>
          </nav>

          <div className="mt-auto rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-slate-700">System status</span><span className="h-2 w-2 rounded-full bg-emerald-500" /></div>
            <p className="mt-1 text-[9px] text-slate-400">4 stations connected</p>
          </div>
        </aside>

        <div className="min-w-0 bg-white">
          <header className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
            <div>
              <div className="flex items-center gap-2"><h3 className="text-sm font-bold text-slate-900">Quality overview</h3><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">LIVE</span></div>
              <p className="mt-0.5 text-[9px] text-slate-400">Production monitoring · Today</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-400"><Search className="h-3.5 w-3.5" /></button>
              <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-400"><Bell className="h-3.5 w-3.5" /></button>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white">ZB</div>
            </div>
          </header>

          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold text-slate-500">Overview</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">Today&apos;s production quality</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600"><Filter className="h-3 w-3" /> All lines</button>
                <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">Today <ChevronDown className="h-3 w-3" /></button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                ["1,284", "Inspections", "+8.2%"],
                ["96.7%", "Pass rate", "+1.8%"],
                ["18", "Open reviews", "Needs action"],
                ["4 / 4", "Stations online", "Healthy"],
              ].map(([value, label, meta], index) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-3.5">
                  <div className="flex items-start justify-between gap-2"><p className="text-xl font-bold tracking-[-0.03em] text-slate-950">{value}</p><span className={`mt-1 h-2 w-2 rounded-full ${index === 2 ? "bg-amber-400" : "bg-emerald-500"}`} /></div>
                  <p className="mt-1 text-[10px] font-medium text-slate-500">{label}</p>
                  <p className={`mt-2 text-[9px] font-semibold ${index === 2 ? "text-amber-600" : "text-blue-600"}`}>{meta}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-[1.35fr_.65fr] gap-4">
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div><p className="text-[11px] font-bold text-slate-900">Inspection activity</p><p className="mt-0.5 text-[9px] text-slate-400">Hourly processed parts</p></div>
                  <button className="text-slate-400"><MoreHorizontal className="h-4 w-4" /></button>
                </div>
                <div className="relative h-36 px-4 pb-4 pt-5">
                  <div className="absolute inset-x-4 top-8 border-t border-dashed border-slate-200" />
                  <div className="absolute inset-x-4 top-20 border-t border-dashed border-slate-200" />
                  <div className="flex h-full items-end gap-2">
                    {[55, 62, 48, 69, 75, 66, 81, 73, 88, 84, 92, 86].map((height, index) => (
                      <div key={index} className="relative z-10 flex-1 rounded-t bg-blue-100"><div className="absolute inset-x-0 bottom-0 rounded-t bg-blue-600" style={{ height: `${height}%` }} /></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3"><p className="text-[11px] font-bold text-slate-900">Station health</p><p className="mt-0.5 text-[9px] text-slate-400">Live connections</p></div>
                <div className="divide-y divide-slate-100 px-4">
                  {["Surface check", "Housing inspection", "Assembly check", "Final visual"].map((station, index) => (
                    <div key={station} className="flex items-center justify-between py-2.5">
                      <div><p className="text-[10px] font-semibold text-slate-700">{station}</p><p className="mt-0.5 text-[9px] text-slate-400">Line {index + 1} · Camera {index + 1}</p></div>
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div><p className="text-[11px] font-bold text-slate-900">Recent inspections</p><p className="mt-0.5 text-[9px] text-slate-400">Latest decisions across connected stations</p></div>
                <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[9px] font-semibold text-slate-600"><SlidersHorizontal className="h-3 w-3" /> Filters</button>
              </div>
              <div className="grid grid-cols-[82px_1.3fr_.65fr_70px_70px_1fr_48px] border-b border-slate-100 bg-slate-50 px-4 py-2 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400">
                <span>ID</span><span>Station</span><span>Line</span><span>Result</span><span>Confidence</span><span>Issue</span><span>Time</span>
              </div>
              <div className="divide-y divide-slate-100">
                {inspections.map((row) => (
                  <div key={row.id} className="grid grid-cols-[82px_1.3fr_.65fr_70px_70px_1fr_48px] items-center px-4 py-2.5 text-[9px] text-slate-600">
                    <span className="font-semibold text-slate-500">{row.id}</span>
                    <span className="font-semibold text-slate-700">{row.station}</span>
                    <span>{row.line}</span>
                    <StatusBadge status={row.result} />
                    <span>{row.confidence}</span>
                    <span className={row.issue === "—" ? "text-slate-300" : "font-medium text-slate-700"}>{row.issue}</span>
                    <span className="text-slate-400">{row.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white text-slate-900 selection:bg-blue-100">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Main navigation">
          <Link href="#top" className="flex items-center gap-2.5" aria-label="KanbAI home" onClick={() => setMenuOpen(false)}>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-white"><CircleDot className="h-5 w-5" /></span>
            <span className="text-lg font-extrabold tracking-[-0.03em] text-slate-950">Kanb<span className="text-blue-600">AI</span></span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
            <a href="#platform" className="hover:text-slate-950">Platform</a>
            <a href="#workflow" className="hover:text-slate-950">Workflow</a>
            <a href="#teams" className="hover:text-slate-950">Teams</a>
            <a href="#pilot" className="hover:text-slate-950">Pilot</a>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/demo" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">View product</Link>
            <a href={demoMailto} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Book a demo <ArrowRight className="h-4 w-4" /></a>
          </div>

          <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 lg:hidden" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-4 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-1">
              {["platform", "workflow", "teams", "pilot"].map((item) => (
                <a key={item} href={`#${item}`} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold capitalize text-slate-700 hover:bg-slate-50">{item}</a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2"><Link href="/demo" className="rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold">View product</Link><a href={demoMailto} className="rounded-lg bg-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white">Book a demo</a></div>
            </div>
          </div>
        )}
      </header>

      <section id="top" className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-5 pb-12 pt-20 text-center sm:px-8 lg:pb-16 lg:pt-24">
          <p className="text-sm font-semibold text-blue-600">Visual quality management for manufacturing</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-extrabold leading-[1.03] tracking-[-0.055em] text-slate-950 sm:text-6xl">One workspace for every visual inspection.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">KanbAI brings camera inspection, operator review, station monitoring, and quality analytics into a familiar operations workspace.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={demoMailto} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Book a demo <ArrowRight className="h-4 w-4" /></a>
            <Link href="/demo" className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">Explore the product</Link>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Existing cameras supported</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Human review built in</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Start with one station</span>
          </div>
        </div>

        <div className="mx-auto max-w-[1380px] px-4 pb-20 sm:px-6 lg:px-8">
          <div className="overflow-x-auto pb-3"><ProductWorkspace /></div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-blue-600">Platform</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">A quality operations system, not another isolated AI tool.</h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-600">Teams can see where inspections happen, what the model decided, which cases require a person, and how quality changes over time — without stitching together camera feeds, spreadsheets, and notes.</p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-base font-bold text-slate-950">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="border-y border-slate-200 bg-slate-50 py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-600">Review workflow</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">AI checks first. Your quality team makes the final call.</h2>
            <p className="mt-5 text-base leading-7 text-slate-600">Operators only need to focus on the cases that need attention. Every review stays attached to the part, station, image, and production context.</p>
            <div className="mt-7 grid gap-3">
              {["PASS continues without interruption", "REVIEW enters the operator queue", "FAIL is recorded with traceable evidence"].map((item) => <div key={item} className="flex items-center gap-2.5 text-sm font-medium text-slate-700"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}</div>)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><p className="text-sm font-bold text-slate-900">Review queue</p><p className="mt-1 text-xs text-slate-500">18 open cases · oldest 7 min</p></div>
              <div className="flex gap-2"><button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><Filter className="h-3.5 w-3.5" /> All stations</button><button className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400"><MoreHorizontal className="h-4 w-4" /></button></div>
            </div>
            <div className="divide-y divide-slate-100">
              {queue.map((item) => (
                <div key={item.part} className="grid gap-4 px-5 py-4 sm:grid-cols-[1.2fr_.8fr_90px_84px] sm:items-center">
                  <div><p className="text-sm font-semibold text-slate-900">{item.issue}</p><p className="mt-1 text-xs text-slate-500">{item.station} · Part {item.part}</p></div>
                  <div className="text-xs text-slate-500">Model confidence <span className="font-semibold text-slate-700">{item.confidence}</span></div>
                  <StatusBadge status={item.status} />
                  <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Review</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="teams" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-semibold text-blue-600">Built for production teams</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">The same system, with the right view for each role.</h2></div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            [Users, "Operators", "See flagged inspections, review cases quickly, and keep the line moving."],
            [Gauge, "Quality managers", "Track defect patterns, decisions, station performance, and evidence."],
            [Factory, "Plant leaders", "Follow high-level quality trends and where intervention is needed."],
          ].map(([Icon, title, text]) => {
            const CardIcon = Icon as typeof Users;
            return <article key={title as string} className="rounded-xl border border-slate-200 p-6"><CardIcon className="h-5 w-5 text-blue-600" /><h3 className="mt-5 text-base font-bold text-slate-950">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p></article>;
          })}
        </div>
      </section>

      <section id="pilot" className="border-t border-slate-200 bg-slate-950 py-20 text-white lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-300">Factory pilot</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Start with one repetitive visual inspection.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Choose one inspection point, connect the camera setup, define the review workflow, and measure the result with your quality team before expanding.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><a href={pilotMailto} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">Request a pilot <ArrowRight className="h-4 w-4" /></a><Link href="/demo" className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">View product demo</Link></div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white"><CircleDot className="h-4 w-4" /></span><div><p className="text-sm font-extrabold tracking-[-0.03em] text-slate-950">Kanb<span className="text-blue-600">AI</span></p><p className="text-xs text-slate-500">Visual quality management for manufacturing.</p></div></div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500"><a href="#platform" className="hover:text-slate-900">Platform</a><a href="#workflow" className="hover:text-slate-900">Workflow</a><a href="#pilot" className="hover:text-slate-900">Pilot</a><a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-slate-900">Contact</a></div>
          <p className="text-xs text-slate-400">© 2026 KanbAI</p>
        </div>
      </footer>
    </main>
  );
}
