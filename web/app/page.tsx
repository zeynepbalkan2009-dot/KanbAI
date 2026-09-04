"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Database,
  Factory,
  Mail,
  Menu,
  Search,
  ShieldCheck,
  Upload,
  WifiOff,
  X,
} from "lucide-react";

const CONTACT_EMAIL = "zeynep.balkan2009@gmail.com";
type Lang = "en" | "tr";

const copy = {
  en: {
    navProduct: "Product",
    navWorkflow: "Workflow",
    navPilot: "Pilot",
    navBoundary: "Technical boundary",
    openDemo: "Open demo",
    requestPilot: "Request a pilot",
    badge: "Visual quality operations for manufacturing",
    hero: "Validate the image before trusting the score.",
    heroText: "KanbAI is designed around a practical factory workflow: capture the inspection image, validate that the input belongs to the inspection context, run quality inference, route uncertainty to a person and keep the decision as evidence.",
    demoCta: "Try the frontend demo",
    pilotCta: "Discuss a factory pilot",
    existingCamera: "Existing-camera approach",
    scopeGuard: "Input validation before inference",
    humanLoop: "Human-in-the-loop",
    sampleInspection: "Sample inspection",
    inScope: "INPUT IN SCOPE",
    confidence: "Sample confidence",
    illustrative: "Illustrative UI. Not live production data.",
    productLabel: "Product workspace",
    productTitle: "A quality-control workspace, not a generic AI screen.",
    productText: "The interface follows the inspection itself: production line, current image, input validation, quality recommendation, human review and traceable evidence.",
    sampleNote: "Numbers shown in this preview are illustrative UI data. The public demo does not present simulated metrics as factory traction.",
    workflowLabel: "Quality workflow",
    workflowTitle: "Bad input should stop before quality inference.",
    workflowText: "A useful visual inspection system needs more than PASS/FAIL. The workflow must first decide whether the image is usable and belongs to the configured inspection context.",
    pilotLabel: "Pilot-first deployment",
    pilotTitle: "Start with one line, one part and one painful visual check.",
    pilotText: "The first controlled factory pilot is where capture conditions, scope rules, model behavior and operator agreement should be measured with real production examples.",
    formTitle: "Pilot intake",
    formText: "Tell us where the visual check happens and what the first pilot should validate.",
    name: "Name",
    company: "Company / factory",
    email: "Work email",
    line: "Production line / station",
    problem: "What visual quality problem should the pilot test?",
    send: "Prepare pilot request",
    formNote: "This public website does not store form data yet. Submit opens your email client with the request pre-filled.",
    boundaryLabel: "Technical boundary",
    boundaryTitle: "The public demo is intentionally more honest than a fake AI demo.",
    boundaryText: "The browser can demonstrate the workflow and perform lightweight input checks. Factory-specific semantic scope validation, defect inference, persistence and camera ingestion belong to the connected pilot backend.",
    publicDemo: "Public demo",
    publicDemoTitle: "Browser-only product walkthrough",
    factoryPilot: "Factory pilot",
    factoryPilotTitle: "Connected deployment environment",
    next: "Next step",
    nextTitle: "Use the demo to understand the workflow. Use a pilot to prove the model.",
    nextText: "KanbAI should earn confidence with real factory examples, not with arbitrary demo scores.",
    contact: "Contact KanbAI",
    footer: "Visual quality operations for manufacturing.",
  },
  tr: {
    navProduct: "Ürün",
    navWorkflow: "İş akışı",
    navPilot: "Pilot",
    navBoundary: "Teknik sınırlar",
    openDemo: "Demoyu aç",
    requestPilot: "Pilot talebi",
    badge: "Üretim için görsel kalite operasyonları",
    hero: "Skora güvenmeden önce görseli doğrula.",
    heroText: "KanbAI pratik fabrika akışı etrafında tasarlanır: muayene görselini yakala, girdinin ilgili kontrol bağlamına ait olduğunu doğrula, kalite analizini çalıştır, belirsizliği insana yönlendir ve kararı kanıt olarak sakla.",
    demoCta: "Frontend demoyu dene",
    pilotCta: "Fabrika pilotunu konuşalım",
    existingCamera: "Mevcut kamera yaklaşımı",
    scopeGuard: "Analiz öncesi girdi doğrulama",
    humanLoop: "İnsan kontrollü karar",
    sampleInspection: "Örnek muayene",
    inScope: "GİRDİ KAPSAMDA",
    confidence: "Örnek güven skoru",
    illustrative: "Örnek arayüzdür. Canlı üretim verisi değildir.",
    productLabel: "Ürün çalışma alanı",
    productTitle: "Genel bir AI ekranı değil, kalite kontrol çalışma alanı.",
    productText: "Arayüz muayenenin kendisini izler: üretim hattı, mevcut görsel, girdi doğrulama, kalite önerisi, insan kontrolü ve izlenebilir kanıt.",
    sampleNote: "Bu önizlemedeki sayılar örnek UI verileridir. Herkese açık demo simüle metrikleri fabrika traction'ı olarak sunmaz.",
    workflowLabel: "Kalite iş akışı",
    workflowTitle: "Kötü girdi kalite analizine ulaşmadan durmalı.",
    workflowText: "İyi bir görsel muayene sistemi yalnızca PASS/FAIL üretmez. Önce görselin kullanılabilir ve tanımlı muayene bağlamına ait olup olmadığını belirlemelidir.",
    pilotLabel: "Pilotla başlayan kurulum",
    pilotTitle: "Bir hat, bir parça ve gerçekten problem yaratan tek bir görsel kontrolden başlayın.",
    pilotText: "İlk kontrollü fabrika pilotu; yakalama koşullarını, kapsam kurallarını, model davranışını ve operatör uyumunu gerçek üretim örnekleriyle ölçme aşamasıdır.",
    formTitle: "Pilot ön başvurusu",
    formText: "Görsel kontrolün nerede yapıldığını ve ilk pilotta neyi doğrulamak istediğinizi paylaşın.",
    name: "Ad soyad",
    company: "Şirket / fabrika",
    email: "İş e-postası",
    line: "Üretim hattı / istasyon",
    problem: "Pilot hangi görsel kalite problemini test etmeli?",
    send: "Pilot talebini hazırla",
    formNote: "Bu herkese açık website henüz form verisini saklamaz. Gönder butonu bilgileri önceden doldurulmuş e-posta taslağı olarak açar.",
    boundaryLabel: "Teknik sınırlar",
    boundaryTitle: "Herkese açık demo sahte AI demosundan bilinçli olarak daha dürüst.",
    boundaryText: "Tarayıcı ürün akışını gösterebilir ve hafif girdi kontrolleri yapabilir. Fabrikaya özel semantik kapsam doğrulama, hata analizi, veri kalıcılığı ve kamera akışı bağlı pilot backend'ine aittir.",
    publicDemo: "Herkese açık demo",
    publicDemoTitle: "Tarayıcı içi ürün akışı",
    factoryPilot: "Fabrika pilotu",
    factoryPilotTitle: "Bağlantılı kurulum ortamı",
    next: "Sonraki adım",
    nextTitle: "Akışı anlamak için demoyu kullanın. Modeli kanıtlamak için pilot yapın.",
    nextText: "KanbAI güveni rastgele demo skorlarıyla değil, gerçek fabrika örnekleriyle kazanmalı.",
    contact: "KanbAI ile iletişim",
    footer: "Üretim için görsel kalite operasyonları.",
  },
};

const features = {
  en: [
    [ShieldCheck, "Input validation", "Check whether the capture is usable and sufficiently aligned with the configured inspection context before a quality score appears."],
    [Camera, "Inspection workspace", "Keep production line, station and current inspection image in one operational view."],
    [ClipboardCheck, "Human review", "Route uncertain cases to an operator instead of hiding model uncertainty behind one number."],
    [Activity, "Traceable evidence", "Keep the input decision, quality result, defect context and human decision together for later analysis."],
  ],
  tr: [
    [ShieldCheck, "Girdi doğrulama", "Kalite skoru oluşmadan önce görüntünün kullanılabilir ve tanımlı muayene bağlamıyla yeterince uyumlu olup olmadığını kontrol edin."],
    [Camera, "Muayene çalışma alanı", "Üretim hattını, istasyonu ve mevcut muayene görselini tek operasyonel görünümde tutun."],
    [ClipboardCheck, "İnsan kontrolü", "Model belirsizliğini tek bir sayının arkasına saklamak yerine şüpheli durumları operatöre yönlendirin."],
    [Activity, "İzlenebilir kanıt", "Girdi kararını, kalite sonucunu, hata bağlamını ve insan kararını sonraki analizler için birlikte tutun."],
  ],
};

const workflow = {
  en: [
    ["01", "Capture", "Receive the inspection image from the configured camera or pilot capture flow."],
    ["02", "Validate input", "Reject poor captures and inputs that do not fit the configured inspection context."],
    ["03", "Analyze", "Run the factory-specific visual model only after the input gate passes."],
    ["04", "Review", "Route uncertain or critical cases to the quality team."],
    ["05", "Record", "Store the validated result and human decision as structured quality evidence."],
  ],
  tr: [
    ["01", "Yakalama", "Muayene görselini tanımlı kamera veya pilot yakalama akışından alın."],
    ["02", "Girdiyi doğrula", "Kötü yakalamaları ve tanımlı muayene bağlamına uymayan girdileri engelleyin."],
    ["03", "Analiz", "Fabrikaya özel görsel modeli yalnızca girdi kontrolü geçtikten sonra çalıştırın."],
    ["04", "Kontrol", "Belirsiz veya kritik durumları kalite ekibine yönlendirin."],
    ["05", "Kayıt", "Doğrulanmış sonucu ve insan kararını yapılandırılmış kalite kanıtı olarak saklayın."],
  ],
};

function Status({ children, tone = "amber" }: { children: React.ReactNode; tone?: "amber" | "emerald" | "blue" }) {
  const style = tone === "emerald" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tone === "blue" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700";
  return <span className={`rounded-md border px-2 py-1 text-[9px] font-black ${style}`}>{children}</span>;
}

function ProductPreview({ lang }: { lang: Lang }) {
  const tr = lang === "tr";
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.12)]">
      <div className="min-w-[1000px]">
        <div className="flex h-11 items-center justify-between border-b border-slate-200 px-4"><div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /></div><span className="text-[10px] font-semibold text-slate-400">KanbAI · {tr ? "örnek ürün görünümü" : "illustrative product view"}</span><Status tone="blue">SAMPLE DATA</Status></div>
        <div className="grid grid-cols-[230px_minmax(0,1fr)_285px] bg-[#f5f7fb] p-4">
          <aside className="overflow-hidden rounded-l-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-3"><div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Search className="h-3.5 w-3.5 text-slate-400" /><span className="text-[10px] text-slate-400">{tr ? "Hat ara" : "Search line"}</span></div></div>{["Production Line 1A","Production Line 1B","Pilot Factory Line","Production Line 3B"].map((line) => <div key={line} className={`border-b border-slate-100 px-4 py-3 text-[11px] ${line === "Pilot Factory Line" ? "bg-[#063f63] font-semibold text-white" : "text-slate-600"}`}>{line}</div>)}</aside>
          <main className="border-y border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{tr ? "Kalite kontrol görünümü" : "Quality control view"}</p><p className="mt-1 text-base font-bold text-slate-900">Pilot Factory Line</p></div><div className="p-4"><div className="relative h-[330px] overflow-hidden rounded-lg bg-slate-100"><Image src="/marketing/hero-factory.png" alt="Illustrative factory inspection" fill sizes="520px" className="object-cover opacity-85" /><div className="marketing-scan" /><div className="absolute inset-x-[13%] bottom-[12%] top-[17%] rounded border-[5px] border-amber-400"><div className="absolute -bottom-1 left-0 rounded-tr bg-amber-400 px-3 py-1.5 text-sm font-black text-slate-950">REVIEW</div></div></div><p className="mt-2 text-center text-[9px] text-slate-400">{tr ? "Örnek ekran — canlı fabrika verisi değildir" : "Illustrative screen — not live factory data"}</p></div></main>
          <aside className="rounded-r-xl border border-slate-200 bg-white p-3"><section className="rounded-xl border border-slate-100 p-3"><p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{tr ? "Girdi doğrulama" : "Input validation"}</p><div className="mt-3 flex items-center justify-between"><div><p className="text-sm font-bold text-slate-900">{tr ? "Muayene profili" : "Inspection profile"}</p><p className="mt-1 text-[9px] text-slate-400">Housing · Station 02</p></div><Status tone="emerald">IN SCOPE</Status></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-slate-50 p-2"><p className="text-[8px] text-slate-400">{tr ? "Yakalama" : "Capture"}</p><p className="mt-1 text-xs font-bold text-emerald-700">PASS</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="text-[8px] text-slate-400">{tr ? "Kapsam" : "Scope"}</p><p className="mt-1 text-xs font-bold text-emerald-700">PASS</p></div></div></section><section className="mt-3 rounded-xl border border-slate-100 p-3"><p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{tr ? "Kalite sonucu" : "Quality result"}</p><div className="mt-3 flex items-end justify-between"><div><p className="text-3xl font-black text-orange-700">REVIEW</p><p className="mt-1 font-mono text-[9px] text-slate-400">8d42a9f1</p></div><Status>82.6%</Status></div></section></aside>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", line: "", problem: "" });
  const t = copy[lang];

  const submitPilot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = lang === "tr" ? "KanbAI Fabrika Pilot Talebi" : "KanbAI Factory Pilot Request";
    const body = [
      `${lang === "tr" ? "Ad" : "Name"}: ${form.name}`,
      `${lang === "tr" ? "Şirket / fabrika" : "Company / factory"}: ${form.company}`,
      `Email: ${form.email}`,
      `${lang === "tr" ? "Hat / istasyon" : "Line / station"}: ${form.line}`,
      "",
      `${lang === "tr" ? "Pilot problemi" : "Pilot problem"}:`,
      form.problem,
    ].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 selection:bg-blue-100">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="#top" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#063f63] text-white"><CircleDot className="h-5 w-5" /></span><span className="text-lg font-extrabold tracking-[-0.03em] text-slate-950">Kanb<span className="text-blue-600">AI</span></span></Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex"><a href="#product">{t.navProduct}</a><a href="#workflow">{t.navWorkflow}</a><a href="#pilot">{t.navPilot}</a><a href="#boundary">{t.navBoundary}</a></div>
          <div className="hidden items-center gap-2 lg:flex"><div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-[10px] font-bold"><button onClick={() => setLang("en")} className={`rounded px-2 py-1 ${lang === "en" ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}>EN</button><button onClick={() => setLang("tr")} className={`rounded px-2 py-1 ${lang === "tr" ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}>TR</button></div><Link href="/demo" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">{t.openDemo}</Link><a href="#pilot-form" className="inline-flex items-center gap-2 rounded-lg bg-[#063f63] px-4 py-2 text-sm font-semibold text-white">{t.requestPilot} <ArrowRight className="h-4 w-4" /></a></div>
          <button onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 lg:hidden" aria-label="Toggle navigation">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </nav>
        {menuOpen && <div className="border-t border-slate-200 bg-white px-5 py-4 lg:hidden"><div className="mx-auto grid max-w-7xl gap-1"><div className="mb-2 flex w-fit rounded-lg border border-slate-200 p-1 text-xs font-bold"><button onClick={() => setLang("en")} className={`rounded px-3 py-1.5 ${lang === "en" ? "bg-slate-900 text-white" : "text-slate-500"}`}>EN</button><button onClick={() => setLang("tr")} className={`rounded px-3 py-1.5 ${lang === "tr" ? "bg-slate-900 text-white" : "text-slate-500"}`}>TR</button></div>{[["product",t.navProduct],["workflow",t.navWorkflow],["pilot",t.navPilot],["boundary",t.navBoundary]].map(([id,label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700">{label}</a>)}<div className="mt-3 grid grid-cols-2 gap-2"><Link href="/demo" className="rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold">{t.openDemo}</Link><a href="#pilot-form" onClick={() => setMenuOpen(false)} className="rounded-lg bg-[#063f63] px-3 py-2.5 text-center text-sm font-semibold text-white">{t.requestPilot}</a></div></div></div>}
      </header>

      <section id="top" className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(2,132,199,0.10),transparent_65%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-24">
          <div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><Factory className="h-3.5 w-3.5" /> {t.badge}</div><h1 className="max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-6xl">{t.hero}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{t.heroText}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#063f63] px-5 py-3 text-sm font-semibold text-white">{t.demoCta} <ArrowRight className="h-4 w-4" /></Link><a href="#pilot-form" className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800">{t.pilotCta}</a></div><div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500">{[t.existingCamera,t.scopeGuard,t.humanLoop].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}</span>)}</div></div>
          <div className="relative mx-auto w-full max-w-2xl"><div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.16)]"><Image src="/marketing/hero-factory.png" alt="Factory visual inspection" fill priority sizes="(max-width:1024px) 100vw, 54vw" className="object-cover opacity-90" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" /><div className="marketing-scan" /><div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/20 bg-white/95 p-4 shadow-xl backdrop-blur sm:left-auto sm:w-72"><div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{t.sampleInspection}</p><p className="mt-1 text-sm font-bold text-slate-900">Housing · Station 02</p></div><Status tone="emerald">{t.inScope}</Status></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><div><p className="text-[9px] text-slate-400">{t.confidence}</p><p className="mt-1 text-xl font-black text-orange-700">82.6%</p></div><Status>REVIEW</Status></div><p className="mt-3 text-[9px] leading-4 text-slate-400">{t.illustrative}</p></div></div></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20"><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">{features[lang].map(([Icon,title,text]) => { const I = Icon as typeof Camera; return <article key={title as string} className="rounded-2xl border border-slate-200 bg-white p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#063f63]"><I className="h-5 w-5" /></span><h2 className="mt-5 text-lg font-bold text-slate-950">{title as string}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p></article>; })}</div></section>

      <section id="product" className="border-y border-slate-200 bg-slate-50 py-20 lg:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-semibold text-blue-700">{t.productLabel}</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">{t.productTitle}</h2><p className="mt-5 text-base leading-7 text-slate-600">{t.productText}</p></div><div className="mt-12"><ProductPreview lang={lang} /></div><div className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><p>{t.sampleNote}</p></div></div></section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24"><div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-start"><div><p className="text-sm font-semibold text-blue-700">{t.workflowLabel}</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">{t.workflowTitle}</h2><p className="mt-5 text-base leading-7 text-slate-600">{t.workflowText}</p></div><div className="grid gap-4 sm:grid-cols-2">{workflow[lang].map(([n,title,text], index) => <div key={n} className={`rounded-2xl border p-5 ${index === 1 ? "border-blue-200 bg-blue-50/50" : "border-slate-200"}`}><span className="text-xs font-black text-blue-700">{n}</span><h3 className="mt-3 text-base font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}</div></div></section>

      <section id="pilot" className="border-y border-slate-200 bg-slate-950 py-20 text-white lg:py-24"><div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start"><div><p className="text-sm font-semibold text-blue-300">{t.pilotLabel}</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">{t.pilotTitle}</h2><p className="mt-5 max-w-xl text-base leading-7 text-slate-300">{t.pilotText}</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{[[Camera,lang === "tr" ? "Muayene noktası" : "Inspection point"],[ShieldCheck,lang === "tr" ? "Kapsam profili" : "Scope profile"],[Upload,lang === "tr" ? "Yakalama akışı" : "Capture flow"],[Database,lang === "tr" ? "Kanıt" : "Evidence"]].map(([Icon,label]) => { const I = Icon as typeof Camera; return <div key={label as string} className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><I className="h-5 w-5 text-blue-300" /><p className="mt-3 text-sm font-bold">{label as string}</p></div>; })}</div></div><form id="pilot-form" onSubmit={submitPilot} className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#063f63]"><Mail className="h-5 w-5" /></span><div><h3 className="text-lg font-extrabold">{t.formTitle}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{t.formText}</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">{t.name}<input required value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label><label className="text-xs font-semibold text-slate-700">{t.company}<input required value={form.company} onChange={(e) => setForm({...form,company:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label><label className="text-xs font-semibold text-slate-700">{t.email}<input required type="email" value={form.email} onChange={(e) => setForm({...form,email:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label><label className="text-xs font-semibold text-slate-700">{t.line}<input value={form.line} onChange={(e) => setForm({...form,line:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label></div><label className="mt-4 block text-xs font-semibold text-slate-700">{t.problem}<textarea required rows={4} value={form.problem} onChange={(e) => setForm({...form,problem:e.target.value})} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label><button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#063f63] px-4 py-3 text-sm font-bold text-white">{t.send} <ArrowRight className="h-4 w-4" /></button><p className="mt-3 text-[10px] leading-5 text-slate-400">{t.formNote}</p></form></div></section>

      <section id="boundary" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-semibold text-blue-700">{t.boundaryLabel}</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">{t.boundaryTitle}</h2><p className="mt-5 text-base leading-7 text-slate-600">{t.boundaryText}</p></div><div className="mt-12 grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><WifiOff className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">{t.publicDemo}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{t.publicDemoTitle}</h3></div></div><div className="mt-6 grid gap-3 text-sm text-slate-600">{(lang === "tr" ? ["Etkileşimli kalite kontrol arayüzü", "Yerel çözünürlük / pozlama / kontrast kontrolleri", "Demo profiline hafif benzerlik kontrolü", "Kullanıcı yüklemesine sahte PASS/FAIL veya güven skoru verilmez"] : ["Interactive quality-control interface", "Local resolution / exposure / contrast checks", "Lightweight similarity check against the demo profile", "No fake PASS/FAIL or confidence score for arbitrary uploads"]).map((item) => <div key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{item}</span></div>)}</div><Link href="/demo" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700">{t.openDemo} <ArrowRight className="h-4 w-4" /></Link></article><article className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-[#063f63]"><Factory className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">{t.factoryPilot}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{t.factoryPilotTitle}</h3></div></div><div className="mt-6 grid gap-3 text-sm text-slate-600">{(lang === "tr" ? ["Fabrikaya özel parça ve muayene profili", "Bağlı model endpoint'i ve gerçek hata sınıflandırması", "Backend/API ve kanıt kalıcılığı", "Gerçek üretim bağlamında insan kontrolü ve model uyumu ölçümü"] : ["Factory-specific part and inspection profile", "Connected model endpoint and real defect classification", "Backend/API and evidence persistence", "Human review and model-agreement measurement in real production context"]).map((item) => <div key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span>{item}</span></div>)}</div><a href="#pilot-form" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700">{t.requestPilot} <ArrowRight className="h-4 w-4" /></a></article></div></section>

      <section className="border-t border-slate-200 bg-slate-50 py-20"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-sm font-semibold text-blue-700">{t.next}</p><h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">{t.nextTitle}</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{t.nextText}</p></div><div className="flex flex-col gap-3"><Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#063f63] px-5 py-3 text-sm font-bold text-white">{t.openDemo} <ArrowRight className="h-4 w-4" /></Link><a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800">{t.contact}</a></div></div></div></section>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#063f63] text-white"><CircleDot className="h-4 w-4" /></span><div><p className="text-sm font-extrabold text-slate-950">Kanb<span className="text-blue-600">AI</span></p><p className="text-xs text-slate-500">{t.footer}</p></div></div><div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500"><a href="#product">{t.navProduct}</a><a href="#workflow">{t.navWorkflow}</a><a href="#pilot">{t.navPilot}</a><Link href="/demo">Demo</Link><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></div><p className="text-xs text-slate-400">© 2026 KanbAI</p></div></footer>
    </main>
  );
}
