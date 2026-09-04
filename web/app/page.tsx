"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  Camera,
  Check,
  ChevronRight,
  CircleDollarSign,
  Cpu,
  Database,
  Eye,
  Factory,
  Gauge,
  Layers3,
  Linkedin,
  Mail,
  Menu,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  X,
  Zap,
} from "lucide-react";

const CONTACT_EMAIL = "zeynep.balkan2009@gmail.com";
const pilotMailto = `mailto:${CONTACT_EMAIL}?subject=KanbAI%20Factory%20Pilot`;
const investorMailto = `mailto:${CONTACT_EMAIL}?subject=KanbAI%20Validation%20Round`;

const workflow = [
  {
    icon: Camera,
    step: "01",
    title: "Capture",
    text: "Use an existing camera, a recommended setup, or even a smartphone for initial validation.",
  },
  {
    icon: BrainCircuit,
    step: "02",
    title: "Infer",
    text: "KanbAI analyzes each frame and classifies the part as PASS, REVIEW, or FAIL.",
  },
  {
    icon: ShieldCheck,
    step: "03",
    title: "Validate",
    text: "Quality teams confirm or correct uncertain cases. AI recommends; humans stay in control.",
  },
  {
    icon: Database,
    step: "04",
    title: "Learn",
    text: "Every validated decision becomes structured, factory-specific training data.",
  },
];

const valueCards = [
  {
    icon: Camera,
    title: "Existing cameras welcome",
    text: "KanbAI is the AI quality layer, not another hardware replacement project.",
  },
  {
    icon: Workflow,
    title: "Built around factory work",
    text: "Inspection, human review, evidence, and model improvement live in one workflow.",
  },
  {
    icon: Layers3,
    title: "Factory-specific intelligence",
    text: "Validated decisions accumulate into a governed dataset competitors cannot copy.",
  },
];

const pricing = [
  {
    name: "Starter",
    range: "1–5 devices",
    price: "$129",
    suffix: "/ device / month",
    description: "Start with one painful inspection point and prove value before expanding.",
  },
  {
    name: "Growth",
    range: "6–20 devices",
    price: "$99",
    suffix: "/ device / month",
    description: "Expand across multiple stations or production lines after validation.",
    featured: true,
  },
  {
    name: "Enterprise",
    range: "Full fleet",
    price: "Custom",
    suffix: "",
    description: "Factory-wide rollout, audit requirements, and tailored deployment support.",
  },
];

const milestones = [
  ["Now", "Working product foundation"],
  ["Next", "Controlled factory validation"],
  ["Then", "Measured AI vs. human agreement"],
  ["Commercial", "Paid pilot or initial SaaS contract"],
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#071016] text-slate-100 selection:bg-cyan-300 selection:text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#071016]/85 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Main navigation">
          <Link href="#top" className="flex items-center gap-3" aria-label="KanbAI home" onClick={() => setMenuOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-300">
              <ScanLine className="h-5 w-5" />
            </span>
            <span className="text-xl font-black tracking-[-0.04em] text-white">Kanb<span className="text-cyan-300">AI</span></span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-300 lg:flex">
            <a className="transition hover:text-white" href="#product">Product</a>
            <a className="transition hover:text-white" href="#workflow">How it works</a>
            <a className="transition hover:text-white" href="#pilot">Pilot</a>
            <a className="transition hover:text-white" href="#pricing">Pricing</a>
            <a className="transition hover:text-white" href="#investors">Investors</a>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/demo" className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5">
              Product demo
            </Link>
            <a href={pilotMailto} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">
              Request a pilot <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#071016] px-5 py-5 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {["product", "workflow", "pilot", "pricing", "investors"].map((item) => (
                <a key={item} href={`#${item}`} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold capitalize text-slate-200 hover:bg-white/5">
                  {item === "workflow" ? "How it works" : item}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link href="/demo" className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold" onClick={() => setMenuOpen(false)}>Product demo</Link>
                <a href={pilotMailto} className="rounded-xl bg-cyan-300 px-4 py-3 text-center text-sm font-bold text-slate-950">Request pilot</a>
              </div>
            </div>
          </div>
        )}
      </header>

      <section id="top" className="relative pt-32 sm:pt-36">
        <div className="pointer-events-none absolute left-1/2 top-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:pb-28">
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300" /> Pilot-ready product
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300">
                Validation round · $50K
              </span>
            </div>

            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">AI quality intelligence for manufacturing</p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              Turn the cameras you already have into <span className="text-cyan-300">AI quality inspection.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              KanbAI helps production teams detect visual defects, route uncertain cases to human review, and turn every verified inspection into factory-specific quality intelligence.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={pilotMailto} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200">
                Request a factory pilot <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/[0.07]">
                Explore interactive demo <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">Public demo uses simulated data. Live factory validation is the next milestone.</p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                [Camera, "Camera-agnostic", "Connect what you have"],
                [ShieldCheck, "Human-in-the-loop", "Quality team stays in control"],
                [Database, "Learning loop", "Verified cases become training data"],
              ].map(([Icon, title, text]) => {
                const CardIcon = Icon as typeof Camera;
                return (
                  <div key={title as string} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <CardIcon className="mb-3 h-5 w-5 text-cyan-300" />
                    <p className="text-sm font-bold text-white">{title as string}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{text as string}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
            <div className="relative aspect-[4/4.3] overflow-hidden rounded-[30px] border border-white/10 bg-slate-900 shadow-2xl shadow-cyan-950/30">
              <Image src="/marketing/hero-factory.png" alt="Industrial manufacturing inspection point" fill priority sizes="(max-width: 1024px) 100vw, 48vw" className="object-cover opacity-75" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071016] via-transparent to-[#071016]/30" />
              <div className="absolute left-[27%] top-[14%] h-[59%] w-px bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,.9)]" />
              <div className="absolute left-5 right-5 top-5 flex items-center justify-between rounded-2xl border border-white/10 bg-[#071016]/75 px-4 py-3 backdrop-blur-xl">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Inspection station</p>
                  <p className="mt-1 text-sm font-bold text-white">Machined Housing · A17</p>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black text-emerald-200">CAMERA ONLINE</span>
              </div>

              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-[#071016]/90 p-5 backdrop-blur-xl sm:left-auto sm:w-[340px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">AI decision</span>
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-200">REVIEW</span>
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-white">Surface anomaly</p>
                    <p className="mt-1 text-xs text-slate-400">Route to quality operator before final decision.</p>
                  </div>
                  <Eye className="mt-1 h-5 w-5 shrink-0 text-cyan-300" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {["PASS", "REVIEW", "FAIL"].map((status) => (
                    <div key={status} className={`rounded-lg border px-2 py-2 text-center text-[9px] font-black ${status === "REVIEW" ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200" : "border-white/10 bg-white/[0.03] text-slate-500"}`}>{status}</div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                  <BadgeCheck className="h-4 w-4 text-emerald-300" /> Human confirmation becomes structured training data
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-px px-5 sm:px-8 lg:grid-cols-3">
          {valueCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="border-b border-white/10 py-8 lg:border-b-0 lg:border-r lg:px-8 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
                <Icon className="mb-4 h-6 w-6 text-cyan-300" />
                <h2 className="text-lg font-black tracking-tight text-white">{card.title}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{card.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">The problem</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] text-white sm:text-5xl">Quality control still breaks at the visual layer.</h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">Manual visual inspection is slow, attention-heavy, and structurally inconsistent across people and shifts. Traditional machine vision can solve parts of the problem — but often with specialized hardware and heavy integration.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Eye, title: "Manual inspection", text: "Operator variability makes consistency difficult to maintain shift after shift." },
              { icon: Zap, title: "Defects are expensive", text: "Late detection increases scrap, rework, and avoidable production downtime." },
              { icon: CircleDollarSign, title: "High entry cost", text: "Traditional vision projects can require dedicated hardware and upfront engineering." },
              { icon: Target, title: "Missing learning loop", text: "Inspection decisions are rarely converted into a governed data asset that improves over time." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><Icon className="h-5 w-5" /></div>
                  <h3 className="text-lg font-black text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0a151d] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Deploy without a hardware reset</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">No camera? No problem. Already have cameras? Even better.</h2>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <article className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.055] p-7 sm:p-9">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="relative">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Path A</span>
                <Camera className="mt-8 h-8 w-8 text-cyan-300" />
                <h3 className="mt-5 text-2xl font-black text-white">Connect what you have.</h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">If a factory already has suitable cameras, connect them. KanbAI is camera-agnostic by design and focuses on the quality intelligence layer.</p>
              </div>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-9">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Path B</span>
              <Gauge className="mt-8 h-8 w-8 text-cyan-300" />
              <h3 className="mt-5 text-2xl font-black text-white">We specify the setup.</h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">When no suitable camera exists, KanbAI can recommend camera, lens, position, angle, and lighting for the inspection use case. A smartphone can support initial pilot validation.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">How it works</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">The model detects defects. The workflow creates the moat.</h2>
          </div>
          <p className="max-w-lg text-sm leading-7 text-slate-400">Inspections + human decisions + production context + traceable evidence become a factory-specific data asset that improves with use.</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {workflow.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.step} className="group rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-cyan-300/[0.035]">
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300"><Icon className="h-5 w-5" /></div>
                  <span className="text-xs font-black tracking-[0.16em] text-slate-600">{item.step}</span>
                </div>
                <h3 className="mt-8 text-xl font-black text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Why KanbAI</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Built to make industrial AI accessible.</h2>
              <p className="mt-6 text-base leading-7 text-slate-400">The goal is not to sell another isolated model. It is to give production teams a low-friction quality operating layer that starts small and compounds in value.</p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#071016]">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] border-b border-white/10 bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 sm:text-xs">
                <div className="p-4 sm:p-5">Capability</div><div className="p-4 sm:p-5">Traditional vision</div><div className="p-4 sm:p-5">AI platforms</div><div className="bg-cyan-300/[0.08] p-4 text-cyan-200 sm:p-5">KanbAI</div>
              </div>
              {[
                ["Hardware", "Dedicated", "Often specialized", "Existing cameras"],
                ["Deployment", "Engineering-heavy", "Enterprise-oriented", "Low-friction pilot"],
                ["Pricing", "CapEx + integration", "Enterprise pricing", "Device-based SaaS"],
                ["Learning loop", "Limited", "AI-centric", "Human + AI + factory data"],
              ].map((row) => (
                <div key={row[0]} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] border-b border-white/10 text-[11px] leading-5 text-slate-400 last:border-b-0 sm:text-sm">
                  <div className="p-4 font-bold text-white sm:p-5">{row[0]}</div><div className="p-4 sm:p-5">{row[1]}</div><div className="p-4 sm:p-5">{row[2]}</div><div className="bg-cyan-300/[0.05] p-4 font-semibold text-slate-200 sm:p-5">{row[3]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pilot" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="overflow-hidden rounded-[32px] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.11] via-white/[0.03] to-transparent">
          <div className="grid gap-10 p-7 sm:p-10 lg:grid-cols-[1fr_.9fr] lg:p-14">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Factory validation</p>
              <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Start with one painful inspection point.</h2>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">The first pilot is designed to prove image consistency, defect detection, and human agreement on a live production line — before expanding across stations.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {["4–8 week controlled pilot", "Baseline → result", "Human-verified decisions"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#071016]/50 px-3 py-2 text-xs font-semibold text-slate-200"><Check className="h-3.5 w-3.5 text-emerald-300" /> {item}</span>
                ))}
              </div>
              <a href={pilotMailto} className="mt-9 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-6 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200">Discuss a pilot <ArrowRight className="h-4 w-4" /></a>
            </div>

            <div className="relative min-h-[330px] overflow-hidden rounded-2xl border border-white/10">
              <Image src="/marketing/factory-line.png" alt="Manufacturing line with machined components" fill sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover opacity-70" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071016] via-[#071016]/10 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-[#071016]/85 p-5 backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Immediate wedge</p>
                <p className="mt-2 text-lg font-black text-white">Machined metal inspection</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">Expansion target: high-value inspection workflows including battery & energy storage manufacturing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-y border-white/10 bg-[#0a151d] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Simple recurring SaaS</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Prove ROI on one station. Expand when it works.</h2>
            <p className="mt-5 text-sm leading-7 text-slate-400">Factories pay based on registered inspection devices — transparent, predictable, and scalable from a single line to a full fleet.</p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricing.map((plan) => (
              <article key={plan.name} className={`relative rounded-3xl border p-7 ${plan.featured ? "border-cyan-300/40 bg-cyan-300/[0.065]" : "border-white/10 bg-white/[0.025]"}`}>
                {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-cyan-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-950">Expansion path</span>}
                <p className="text-sm font-black text-white">{plan.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{plan.range}</p>
                <div className="mt-8 flex items-end gap-2"><span className="text-4xl font-black tracking-[-0.04em] text-white">{plan.price}</span>{plan.suffix && <span className="pb-1 text-xs text-slate-500">{plan.suffix}</span>}</div>
                <p className="mt-6 text-sm leading-6 text-slate-400">{plan.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="investors" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">For investors</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">From working product to factory proof.</h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">KanbAI is raising a $50K validation round to move from working product infrastructure into the first controlled factory validation. Scale capital is intended to follow measured performance and commercial proof.</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><Cpu className="h-5 w-5 text-cyan-300" /><p className="mt-4 text-sm font-black text-white">Product foundation operational</p><p className="mt-1 text-xs leading-5 text-slate-400">Architecture, inference pipeline, dashboard, and review workflow.</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><BarChart3 className="h-5 w-5 text-cyan-300" /><p className="mt-4 text-sm font-black text-white">No invented traction</p><p className="mt-1 text-xs leading-5 text-slate-400">Next claims will be based on measured production validation.</p></div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href={investorMailto} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">Investor contact <Mail className="h-4 w-4" /></a>
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white">Inspect product demo <ChevronRight className="h-4 w-4" /></Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Validation roadmap</p>
                <p className="mt-2 text-lg font-black text-white">Measurable milestones only</p>
              </div>
              <Sparkles className="h-6 w-6 text-cyan-300" />
            </div>
            <div className="grid gap-3">
              {milestones.map(([stage, milestone], index) => (
                <div key={stage} className="grid grid-cols-[42px_1fr] gap-4 rounded-2xl border border-white/10 bg-[#071016]/60 p-4">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-black ${index === 0 ? "bg-emerald-300/10 text-emerald-200" : "bg-white/[0.04] text-slate-500"}`}>{index + 1}</span>
                  <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">{stage}</p><p className="mt-1 text-sm font-bold text-white">{milestone}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Founder</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Engineering context. Commercial execution.</h2>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#071016] p-7 sm:p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div>
                <p className="text-2xl font-black text-white">Zeynep Balkan</p>
                <p className="mt-1 text-sm font-bold text-cyan-300">Founder & CEO · BSc. Mechanical Engineering</p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">Building KanbAI around a practical goal: make high-quality visual inspection deployable for factories without requiring a massive automation budget.</p>
              </div>
              <a href="https://www.linkedin.com/in/zeynep-balkan-3709a8193/" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/5"><Linkedin className="h-4 w-4" /> LinkedIn</a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-[100px]" />
        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
          <Factory className="mx-auto h-8 w-8 text-cyan-300" />
          <h2 className="mt-6 text-4xl font-black tracking-[-0.045em] text-white sm:text-5xl">One inspection point can be the start of a smarter factory.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">Bring one measurable visual quality problem. KanbAI will start there, prove the workflow, and build the path to scale.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={pilotMailto} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-3.5 text-sm font-black text-slate-950">Request a pilot <ArrowRight className="h-4 w-4" /></a>
            <a href={investorMailto} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-bold text-white">Investor introduction <Mail className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#050b10]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-9 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300"><ScanLine className="h-4 w-4" /></span>
            <div><p className="font-black tracking-[-0.03em] text-white">Kanb<span className="text-cyan-300">AI</span></p><p className="mt-0.5 text-xs text-slate-500">AI-powered quality intelligence for manufacturing.</p></div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-400">
            <a href="#product" className="hover:text-white">Product</a><a href="#pilot" className="hover:text-white">Pilot</a><a href="#pricing" className="hover:text-white">Pricing</a><a href="#investors" className="hover:text-white">Investors</a><a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">Contact</a>
          </div>
          <p className="text-xs text-slate-600">© 2026 KanbAI</p>
        </div>
      </footer>
    </main>
  );
}
