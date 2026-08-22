"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const pilotMailto = "mailto:zeynep.balkan2009@gmail.com?subject=KanbAI%20Factory%20Pilot";
const investorMailto = "mailto:zeynep.balkan2009@gmail.com?subject=KanbAI%20Investor%20Intro";

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="marketing">
      <header className="marketing-nav-wrap">
        <nav className="marketing-container marketing-nav" aria-label="Main navigation">
          <Link className="marketing-brand" href="#top" aria-label="KanbAI home"><span>Kanb</span><b>AI</b></Link>
          <div className={`marketing-nav-links ${menuOpen ? "is-open" : ""}`}>
            <a href="#product" onClick={closeMenu}>Product</a><a href="#how" onClick={closeMenu}>How it works</a><a href="#pilot" onClick={closeMenu}>Pilot</a><a href="#investors" onClick={closeMenu}>Investors</a>
          </div>
          <div className="marketing-nav-actions"><a className="marketing-btn marketing-btn-primary" href={pilotMailto}>Request a pilot</a><Link className="marketing-btn marketing-btn-outline" href="/demo">View product demo</Link><button className="marketing-menu" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button></div>
        </nav>
      </header>

      <section className="marketing-hero marketing-container" id="top">
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow">AI QUALITY INTELLIGENCE FOR MANUFACTURING</p>
          <h1>AI quality inspection,<br /><span>built for the factory floor.</span></h1>
          <p className="marketing-lead">KanbAI detects visual defects, assists quality teams and turns every inspection into production intelligence.</p>
          <div className="marketing-actions"><Link className="marketing-btn marketing-btn-primary marketing-btn-large" href="/demo">Explore the product demo</Link><a className="marketing-btn marketing-btn-outline marketing-btn-large" href={investorMailto}>For investors →</a></div>
          <p className="marketing-demo-note">Interactive demo uses simulated factory data; pilot results are human-verified.</p>
          <div className="marketing-proof-row"><span>↓ Fewer defects</span><span>↑ Higher quality</span><span>↓ Lower rework</span></div>
        </div>
        <div className="marketing-hero-visual"><Image src="/marketing/hero-factory.png" alt="Industrial component being inspected by a vision camera" fill priority sizes="(max-width: 980px) 100vw, 50vw" /><div className="marketing-scan" /><div className="marketing-inspection-card" aria-label="Example inspection result"><small>Workflow demo</small><strong>Part: Housing A17</strong><div className="marketing-status"><span>!</span> REVIEW</div><div className="marketing-issue">Surface anomaly</div><div className="marketing-confidence"><span>Confidence</span><b>Example</b></div><div className="marketing-bar"><i /></div><div className="marketing-card-actions"><span>Human review</span><span>Traceable record</span></div></div></div>
      </section>

      <section className="marketing-feature-strip" id="product"><div className="marketing-container marketing-strip-grid"><article><div className="marketing-icon">◎</div><div><b>Computer Vision AI</b><p>Detect visual defects and anomalies.</p></div></article><article><div className="marketing-icon">⌂</div><div><b>Factory workflow</b><p>Designed around inspection points.</p></div></article><article><div className="marketing-icon">◉</div><div><b>Human-in-the-loop</b><p>Keep quality teams in control.</p></div></article><article><div className="marketing-icon">↗</div><div><b>Quality intelligence</b><p>Turn inspections into actionable insights.</p></div></article></div></section>

      <section className="marketing-section marketing-container" id="how"><div className="marketing-section-head"><div><p className="marketing-eyebrow">HOW IT WORKS</p><h2>See. Decide. Learn.</h2></div><p>From inspection to continuous quality improvement — without replacing the quality team.</p></div><div className="marketing-steps"><article><span>01</span><h3>Capture</h3><p>Get images from a production inspection point.</p></article><article><span>02</span><h3>Inspect</h3><p>AI analyzes the product for visual defects and anomalies.</p></article><article><span>03</span><h3>Verify</h3><p>Operators review uncertain or critical cases.</p></article><article><span>04</span><h3>Improve</h3><p>Verified results become structured quality intelligence.</p></article></div></section>

      <section className="marketing-section marketing-why" id="why"><div className="marketing-container marketing-why-grid"><div className="marketing-why-image"><Image src="/marketing/factory-line.png" alt="Manufacturing line with machined components" fill sizes="(max-width: 980px) 100vw, 45vw" /></div><div><p className="marketing-eyebrow">WHY KANBAI</p><h2>Not just a vision model.<br />A quality operating layer.</h2><p className="marketing-large">KanbAI connects inspection, human review, evidence and learning in one traceable workflow.</p><div className="marketing-mini-grid"><div><b>Production context</b><p>Image, result and line context together.</p></div><div><b>Quality workflow</b><p>Human review where it matters.</p></div><div><b>Traceable evidence</b><p>Every review has a durable record.</p></div><div><b>Continuous learning</b><p>Improve with verified examples.</p></div></div></div></div></section>

      <section className="marketing-section marketing-container" id="pilot"><div className="marketing-pilot-card"><div><p className="marketing-eyebrow">FACTORY PILOT</p><h2>Start with one inspection point.</h2><p>Begin with one measurable visual quality problem, establish a baseline, and compare KanbAI with the existing process.</p></div><div className="marketing-pilot-meta"><div><b>4–8 weeks</b><span>Controlled pilot</span></div><div><b>Baseline → Result</b><span>Measurable before / after</span></div><div><b>Human verified</b><span>Quality team stays in control</span></div></div><a className="marketing-btn marketing-btn-primary marketing-btn-large" href={pilotMailto}>Request a pilot</a></div></section>

      <section className="marketing-section marketing-investors" id="investors"><div className="marketing-container marketing-investors-grid"><div><p className="marketing-eyebrow">FOR INVESTORS</p><h2>Building the quality intelligence layer for manufacturing.</h2><p className="marketing-large">The next milestone is to prove measurable value in a real factory, convert the pilot into a paid deployment, and repeat.</p></div><div className="marketing-milestones"><div><span>Now</span><b>Pilot-ready product</b></div><div><span>Next</span><b>Real manufacturing deployment</b></div><div><span>Then</span><b>Measured ROI + paid rollout</b></div><div><span>Scale</span><b>Repeat across lines and factories</b></div></div></div><div className="marketing-container marketing-investor-cta"><p>Want to inspect the product workflow?</p><Link className="marketing-btn marketing-btn-outline" href="/demo">View the interactive demo →</Link></div></section>

      <section className="marketing-section marketing-founder"><div className="marketing-container marketing-founder-card"><div><p className="marketing-eyebrow">FOUNDER</p><h2>Built from an engineering and startup perspective.</h2></div><div><p className="marketing-founder-name">Zeynep Balkan</p><p className="marketing-large">Founder & CEO. Building KanbAI around a practical goal: make visual quality inspection measurable, deployable and scalable for real factories.</p><a className="marketing-btn marketing-btn-outline" href="https://www.linkedin.com/in/zeynep-balkan-3709a8193/" target="_blank" rel="noreferrer">Founder LinkedIn →</a></div></div></section>

      <section className="marketing-final-cta"><div className="marketing-container marketing-final-grid"><div><p className="marketing-eyebrow">KANBAI</p><h2>Let&apos;s make manufacturing quality measurable.</h2></div><div className="marketing-actions"><a className="marketing-btn marketing-btn-primary marketing-btn-large" href={pilotMailto}>Request a pilot</a><a className="marketing-btn marketing-btn-outline marketing-btn-large" href={investorMailto}>Investor contact</a></div></div></section>
      <footer className="marketing-footer"><div className="marketing-container marketing-footer-grid"><div><Link className="marketing-brand" href="#top"><span>Kanb</span><b>AI</b></Link><p>AI-powered quality intelligence for manufacturing.</p></div><div className="marketing-footer-links"><a href="#product">Product</a><a href="#pilot">Pilot</a><a href="#investors">Investors</a><a href={pilotMailto}>Contact</a></div><small>© 2026 KanbAI</small></div></footer>
    </main>
  );
}
