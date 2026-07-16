import { useEffect, useState } from 'react';

// The marketing / landing page shown at the base URL ("/"). Rendered as HTML so
// the existing markup and SVGs are preserved. Recolored to the blue theme,
// emojis replaced with inline icons, and a two-tool selector added.

const LANDING_HTML = `
<style>
  /* Allow the long landing page to scroll (app's global CSS locks overflow) */
  html, body { overflow-y: auto !important; height: auto !important; }
  #root { height: auto !important; overflow: visible !important; }

  .lp *, .lp *::before, .lp *::after { margin: 0; padding: 0; box-sizing: border-box; }
  .lp {
    --bg: #0D0D12; --surface: #16161D; --surface-2: #1E1E28; --border: #2A2A36;
    --accent: #2F6FED; --accent-glow: rgba(47, 111, 237, 0.28);
    --text: #F0F0F5; --text-secondary: #9898A6; --text-muted: #606070;
    --blue: #4A90E2; --red: #C0392B; --yellow: #F1C40F; --green: #27AE60; --purple: #9B59B6;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg); color: var(--text); line-height: 1.7; -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  .lp a { color: inherit; }

  .lp nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 48px; background: rgba(13, 13, 18, 0.85);
    backdrop-filter: blur(20px); border-bottom: 1px solid var(--border);
  }
  .lp .nav-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; color: var(--text); text-decoration: none; }
  .lp .nav-brand svg { width: 28px; height: 28px; }
  .lp .nav-links { display: flex; gap: 32px; }
  .lp .nav-links a { color: var(--text-secondary); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
  .lp .nav-links a:hover { color: var(--text); }
  .lp .nav-cta { display: inline-flex; align-items: center; gap: 6px; background: var(--accent); color: #fff; padding: 8px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; transition: all 0.2s; }
  .lp .nav-cta:hover { filter: brightness(1.15); transform: translateY(-1px); }
  .lp .nav-cta svg { width: 15px; height: 15px; }

  .lp .hero {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    text-align: center; padding: 120px 24px 80px;
    background:
      radial-gradient(ellipse 60% 50% at 50% 0%, rgba(47, 111, 237, 0.10), transparent),
      radial-gradient(ellipse 40% 40% at 80% 60%, rgba(74, 144, 226, 0.06), transparent),
      var(--bg);
  }
  .lp .hero-inner { max-width: 820px; }
  .lp .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--surface-2); border: 1px solid var(--border); padding: 6px 16px; border-radius: 100px; font-size: 13px; color: var(--text-secondary); margin-bottom: 32px; }
  .lp .hero-badge svg { width: 14px; height: 14px; color: var(--accent); }
  .lp .hero-badge span { color: var(--accent); font-weight: 600; }
  .lp .hero h1 { font-size: clamp(36px, 6vw, 62px); font-weight: 900; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 24px; }
  .lp .hero h1 .highlight { background: linear-gradient(135deg, #2F6FED, #5B9BFF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .lp .hero p { font-size: 18px; color: var(--text-secondary); max-width: 620px; margin: 0 auto 40px; line-height: 1.8; }
  .lp .hero-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .lp .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: #fff; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 700; text-decoration: none; transition: all 0.25s; box-shadow: 0 4px 24px var(--accent-glow); }
  .lp .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 32px var(--accent-glow); }
  .lp .btn-secondary { display: inline-flex; align-items: center; gap: 8px; background: var(--surface-2); color: var(--text); border: 1px solid var(--border); padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; text-decoration: none; transition: all 0.25s; }
  .lp .btn-secondary:hover { border-color: var(--text-muted); transform: translateY(-2px); }
  .lp .btn-primary svg, .lp .btn-secondary svg { width: 20px; height: 20px; }

  .lp section { padding: 100px 24px; }
  .lp .container { max-width: 1100px; margin: 0 auto; }
  .lp .section-label { display: inline-block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--accent); margin-bottom: 16px; }
  .lp .section-title { font-size: clamp(28px, 4vw, 42px); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 20px; }
  .lp .section-desc { font-size: 17px; color: var(--text-secondary); max-width: 640px; line-height: 1.8; margin-bottom: 48px; }

  /* Tools / two choices */
  .lp .tools { background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .lp .tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .lp .tool-card { display: block; text-decoration: none; color: inherit; background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; transition: all 0.25s; }
  .lp .tool-card:hover { border-color: var(--accent); transform: translateY(-4px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
  .lp .tool-card-icon { width: 52px; height: 52px; background: var(--surface-2); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--accent); margin-bottom: 18px; }
  .lp .tool-card-icon svg { width: 26px; height: 26px; }
  .lp .tool-card h3 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
  .lp .tool-card p { font-size: 14px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 16px; }
  .lp .tool-card-cta { display: inline-flex; align-items: center; gap: 6px; color: var(--accent); font-weight: 600; font-size: 14px; }
  .lp .tool-card-cta svg { width: 16px; height: 16px; }

  .lp .what-is { border-bottom: 1px solid var(--border); }
  .lp .what-is-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
  .lp .what-is-text h2 { margin-bottom: 20px; }
  .lp .what-is-text p { color: var(--text-secondary); font-size: 16px; margin-bottom: 16px; }
  .lp .layer-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .lp .layer-chip { display: flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border); padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; }
  .lp .layer-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .lp .diagram-visual { background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 40px; display: flex; align-items: center; justify-content: center; min-height: 320px; }
  .lp .diagram-visual svg { width: 100%; max-width: 380px; }

  .lp .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
  .lp .feature-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px; transition: all 0.3s; }
  .lp .feature-card:hover { border-color: var(--accent); transform: translateY(-4px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
  .lp .feature-icon { width: 44px; height: 44px; background: var(--surface-2); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--accent); margin-bottom: 20px; }
  .lp .feature-icon svg { width: 22px; height: 22px; }
  .lp .feature-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
  .lp .feature-card p { font-size: 14px; color: var(--text-secondary); line-height: 1.7; }

  .lp .use-cases { background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .lp .use-case-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
  .lp .use-case-item { background: var(--bg); border: 1px solid var(--border); border-radius: 14px; padding: 28px; text-align: center; transition: border-color 0.25s; }
  .lp .use-case-item:hover { border-color: var(--accent); }
  .lp .use-case-item .u-icon { color: var(--accent); margin-bottom: 16px; display: flex; justify-content: center; }
  .lp .use-case-item .u-icon svg { width: 34px; height: 34px; }
  .lp .use-case-item h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
  .lp .use-case-item p { font-size: 13px; color: var(--text-secondary); }

  .lp .faq-list { max-width: 720px; }
  .lp .faq-item { border-bottom: 1px solid var(--border); padding: 24px 0; }
  .lp .faq-item h3 { font-size: 17px; font-weight: 700; margin-bottom: 10px; }
  .lp .faq-item p { font-size: 15px; color: var(--text-secondary); line-height: 1.8; }

  .lp .cta-section { text-align: center; background: radial-gradient(ellipse 50% 60% at 50% 100%, rgba(47, 111, 237, 0.12), transparent), var(--bg); }
  .lp .cta-section .section-title { max-width: 620px; margin: 0 auto 20px; }
  .lp .cta-section .section-desc { margin: 0 auto 40px; text-align: center; }

  .lp footer { padding: 48px 24px; border-top: 1px solid var(--border); text-align: center; }
  .lp footer p { color: var(--text-muted); font-size: 13px; }
  .lp footer a { color: var(--text-secondary); text-decoration: none; }
  .lp footer a:hover { color: var(--text); }
  .lp .footer-socials { display: flex; gap: 12px; justify-content: center; margin: 20px 0 0; }
  .lp .footer-socials a { width: 34px; height: 34px; border: 1px solid var(--border); border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all 0.2s; }
  .lp .footer-socials a:hover { color: var(--accent); border-color: var(--accent); transform: translateY(-2px); }
  .lp .footer-socials svg { width: 16px; height: 16px; }

  @media (max-width: 768px) {
    .lp nav { padding: 12px 20px; }
    .lp .nav-links { display: none; }
    .lp .tools-grid { grid-template-columns: 1fr; }
    .lp .what-is-grid { grid-template-columns: 1fr; gap: 32px; }
    .lp .diagram-visual { order: -1; }
    .lp section { padding: 64px 20px; }
  }
</style>

<div class="lp">
  <nav>
    <a href="/" class="nav-brand" aria-label="StickOut Home">
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="#1A1A2E"/>
        <line x1="6" y1="8" x2="26" y2="8" stroke="#4A90E2" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="6" y1="24" x2="26" y2="24" stroke="#4A90E2" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="16" y1="8" x2="16" y2="14" stroke="#F1C40F" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="16" y1="18" x2="16" y2="24" stroke="#27AE60" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="10" y1="16" x2="22" y2="16" stroke="#9B59B6" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="14" y="14" width="4" height="4" fill="#111" stroke="#fff" stroke-width="0.5"/>
      </svg>
      StickOut
    </a>
    <div class="nav-links">
      <a href="#tools">Tools</a>
      <a href="#what-is">What is a Stick Diagram?</a>
      <a href="#features">Features</a>
      <a href="#faq">FAQ</a>
    </div>
    <a href="#tools" class="nav-cta">Launch App <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></a>
  </nav>

  <section class="hero">
    <div class="hero-inner">
      <div class="hero-badge">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 6.9L21 11l-6.6 2.1L12 20l-2.4-6.9L3 11l6.6-2.1z"/></svg>
        <span>100% Free</span> · No sign-up required · Works in your browser
      </div>
      <h1>VLSI Layout Tools — <span class="highlight">Stick Diagrams &amp; Floor Planning</span></h1>
      <p>Draw professional CMOS stick diagrams and plan block-level floor plans online, on an interactive snap-grid canvas. Design with Metal, Polysilicon, Diffusion, Contacts and Vias — then export publication-ready PNGs in seconds.</p>
      <div class="hero-actions">
        <a href="/stick-diagram" class="btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>
          Stick Diagram Editor
        </a>
        <a href="/floor-planning" class="btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
          Floor Planning
        </a>
      </div>
    </div>
  </section>

  <section class="tools" id="tools">
    <div class="container">
      <span class="section-label">Choose Your Tool</span>
      <h2 class="section-title">Two Ways to Design</h2>
      <p class="section-desc">StickOut now includes a stick diagram editor and a block-level floor planner. Pick where you want to start — both share the same fast, snap-grid canvas.</p>
      <div class="tools-grid">
        <a class="tool-card" href="/stick-diagram">
          <div class="tool-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>
          </div>
          <h3>Stick Diagram</h3>
          <p>Draw CMOS stick diagrams with Metal, Poly, Diffusion, Contacts and Vias. Smart wire jumps, layer management, boolean-gate generation, and high-res PNG export.</p>
          <span class="tool-card-cta">Open Stick Diagram <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></span>
        </a>
        <a class="tool-card" href="/floor-planning">
          <div class="tool-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
          </div>
          <h3>Floor Planning</h3>
          <p>Plan block-level floor plans — chip boundary, I/O pins, power/ground rings, and device blocks. Group, label and arrange blocks with rectangles and wires.</p>
          <span class="tool-card-cta">Open Floor Planning <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></span>
        </a>
      </div>
    </div>
  </section>

  <section class="what-is" id="what-is">
    <div class="container">
      <div class="what-is-grid">
        <div class="what-is-text">
          <span class="section-label">Understanding the Basics</span>
          <h2 class="section-title">What is a Stick Diagram?</h2>
          <p>A <strong>stick diagram</strong> is a simplified, abstracted representation of a VLSI (Very-Large-Scale Integration) integrated circuit layout. It maps the topology of a CMOS circuit — showing transistors, wiring, and connections — without specifying exact physical dimensions.</p>
          <p>Stick diagrams are essential in <strong>IC design education</strong> and early-stage <strong>CMOS layout planning</strong>. They bridge the gap between a circuit schematic and a full mask layout, helping engineers visualize how transistors, metal interconnects, polysilicon gates, and diffusion regions are physically arranged on silicon.</p>
          <p>Each layer in a stick diagram is represented by a <strong>different color</strong>:</p>
          <div class="layer-legend">
            <div class="layer-chip"><div class="layer-dot" style="background:#4A90E2"></div> Metal 1</div>
            <div class="layer-chip"><div class="layer-dot" style="background:#C0392B"></div> Metal 2</div>
            <div class="layer-chip"><div class="layer-dot" style="background:#9B59B6"></div> Polysilicon</div>
            <div class="layer-chip"><div class="layer-dot" style="background:#F1C40F"></div> P-Diffusion</div>
            <div class="layer-chip"><div class="layer-dot" style="background:#27AE60"></div> N-Diffusion</div>
            <div class="layer-chip"><div class="layer-dot" style="background:#111;border:1px solid #888"></div> Contacts</div>
          </div>
        </div>
        <div class="diagram-visual" aria-label="Example two-input CMOS gate stick diagram">
          <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg">
            <line x1="40" y1="40" x2="280" y2="40" stroke="#4A90E2" stroke-width="4" stroke-linecap="round"/>
            <text x="10" y="44" fill="#4A90E2" font-size="13" font-family="Inter, sans-serif" font-weight="600">V<tspan font-size="9" dy="3">DD</tspan></text>
            <line x1="40" y1="220" x2="280" y2="220" stroke="#4A90E2" stroke-width="4" stroke-linecap="round"/>
            <text x="10" y="224" fill="#4A90E2" font-size="13" font-family="Inter, sans-serif" font-weight="600">V<tspan font-size="9" dy="3">SS</tspan></text>
            <line x1="60" y1="95" x2="250" y2="95" stroke="#F1C40F" stroke-width="4" stroke-linecap="round"/>
            <line x1="60" y1="165" x2="250" y2="165" stroke="#27AE60" stroke-width="4" stroke-linecap="round"/>
            <line x1="110" y1="75" x2="110" y2="185" stroke="#9B59B6" stroke-width="3" stroke-linecap="round"/>
            <line x1="200" y1="75" x2="200" y2="185" stroke="#9B59B6" stroke-width="3" stroke-linecap="round"/>
            <line x1="75" y1="40" x2="75" y2="95" stroke="#4A90E2" stroke-width="3" stroke-linecap="round"/>
            <line x1="235" y1="40" x2="235" y2="95" stroke="#4A90E2" stroke-width="3" stroke-linecap="round"/>
            <line x1="155" y1="95" x2="155" y2="130" stroke="#4A90E2" stroke-width="3" stroke-linecap="round"/>
            <line x1="155" y1="130" x2="275" y2="130" stroke="#4A90E2" stroke-width="3" stroke-linecap="round"/>
            <line x1="235" y1="130" x2="235" y2="165" stroke="#4A90E2" stroke-width="3" stroke-linecap="round"/>
            <line x1="75" y1="165" x2="75" y2="220" stroke="#4A90E2" stroke-width="3" stroke-linecap="round"/>
            <text x="118" y="152" fill="#9B59B6" font-size="13" font-family="Inter, sans-serif" font-weight="600">A</text>
            <text x="208" y="152" fill="#9B59B6" font-size="13" font-family="Inter, sans-serif" font-weight="600">B</text>
            <text x="280" y="134" fill="#4A90E2" font-size="13" font-family="Inter, sans-serif" font-weight="600">L</text>
            <rect x="70.5" y="35.5" width="9" height="9" fill="#1A1A2E" stroke="#fff" stroke-width="1.5" rx="1"/>
            <rect x="230.5" y="35.5" width="9" height="9" fill="#1A1A2E" stroke="#fff" stroke-width="1.5" rx="1"/>
            <rect x="70.5" y="90.5" width="9" height="9" fill="#1A1A2E" stroke="#fff" stroke-width="1.5" rx="1"/>
            <rect x="150.5" y="90.5" width="9" height="9" fill="#1A1A2E" stroke="#fff" stroke-width="1.5" rx="1"/>
            <rect x="230.5" y="90.5" width="9" height="9" fill="#1A1A2E" stroke="#fff" stroke-width="1.5" rx="1"/>
            <rect x="70.5" y="160.5" width="9" height="9" fill="#1A1A2E" stroke="#fff" stroke-width="1.5" rx="1"/>
            <rect x="230.5" y="160.5" width="9" height="9" fill="#1A1A2E" stroke="#fff" stroke-width="1.5" rx="1"/>
            <rect x="70.5" y="215.5" width="9" height="9" fill="#1A1A2E" stroke="#fff" stroke-width="1.5" rx="1"/>
          </svg>
        </div>
      </div>
    </div>
  </section>

  <section id="features">
    <div class="container">
      <span class="section-label">Powerful Tools</span>
      <h2 class="section-title">Everything You Need in a Stick Diagram Editor</h2>
      <p class="section-desc">StickOut is a professional-grade, browser-based EDA tool for drawing VLSI stick diagrams. No downloads, no installations — just open and start designing.</p>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
          <h3>Complete VLSI Layer Support</h3>
          <p>Draw with Metal 1, Metal 2, Polysilicon, P-Diffusion, N-Diffusion, Contacts, Vias, N-Well, Implants, and dynamically added higher metal layers — all color-coded to industry standards.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg></div>
          <h3>Interactive Grid Canvas</h3>
          <p>Pan, zoom, and snap to grid on a fully interactive HTML5 Canvas. Grid snapping keeps your wiring perfectly aligned to the manufacturing grid pitch.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg></div>
          <h3>Smart Wire Jumps</h3>
          <p>Same-layer wire crossings automatically render bridge arcs to indicate no electrical connection. Right-click any jump to toggle connection state.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg></div>
          <h3>High-Resolution PNG Export</h3>
          <p>Export your diagrams as crisp 2× PNGs with adjustable margins, transparent or solid backgrounds, and customizable label styles — ready for papers and presentations.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></div>
          <h3>Layer Management</h3>
          <p>Photoshop-style layer controls: toggle visibility, adjust opacity, and drag-and-drop to reorder the rendering stack. Organize complex CMOS layouts with ease.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg></div>
          <h3>LaTeX-Style Subscripts</h3>
          <p>Label your rails with V_{DD}, V_{SS}, and other notation — StickOut renders elegant, publication-quality serif italic subscripts, just like LaTeX.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg></div>
          <h3>Freehand Paintbrush</h3>
          <p>Annotate your diagrams with freehand brush strokes. Adjustable brush size and opacity let you mark up designs during review sessions or lectures.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg></div>
          <h3>Auto-Save &amp; Project Files</h3>
          <p>Your work is automatically saved to browser storage. Save and load complete projects as .stk files to share diagrams with classmates or colleagues.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></svg></div>
          <h3>Full Keyboard Shortcuts</h3>
          <p>Professional hotkeys: V for select, W for wire, P for contact, R for rectangle, Copy/Cut/Paste, Undo/Redo, Group, and layer reordering — all from the keyboard.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="use-cases" id="use-cases">
    <div class="container">
      <span class="section-label">Who is StickOut For?</span>
      <h2 class="section-title">Built for Students, Engineers &amp; Educators</h2>
      <p class="section-desc">Whether you're studying VLSI design, teaching a circuits class, or planning a silicon layout, StickOut is the fastest way to draw stick diagrams and floor plans online.</p>
      <div class="use-case-list">
        <div class="use-case-item">
          <div class="u-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5"/></svg></div>
          <h3>Engineering Students</h3>
          <p>Complete VLSI homework and lab assignments with a free online stick diagram maker. Export clean diagrams for your reports.</p>
        </div>
        <div class="use-case-item">
          <div class="u-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="M12 16v5"/><path d="M8 21h8"/></svg></div>
          <h3>Professors &amp; Educators</h3>
          <p>Create lecture materials and demonstration diagrams. The interactive canvas is perfect for live classroom walkthroughs of CMOS layout concepts.</p>
        </div>
        <div class="use-case-item">
          <div class="u-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg></div>
          <h3>IC Design Engineers</h3>
          <p>Quickly sketch transistor-level layouts and floor plans before committing to full EDA tools — ideal for early-stage CMOS exploration and peer reviews.</p>
        </div>
        <div class="use-case-item">
          <div class="u-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg></div>
          <h3>Research &amp; Publishing</h3>
          <p>Generate publication-quality figures for IEEE papers, theses, and technical reports with high-resolution PNG export.</p>
        </div>
      </div>
    </div>
  </section>

  <section id="faq">
    <div class="container">
      <span class="section-label">Frequently Asked Questions</span>
      <h2 class="section-title">Common Questions About Stick Diagrams</h2>
      <div class="faq-list">
        <div class="faq-item">
          <h3>What is a stick diagram in VLSI design?</h3>
          <p>A stick diagram is a simplified representation of an integrated circuit layout that shows the relative positions of transistors, wiring, polysilicon gates, and diffusion regions without exact physical dimensions. It uses color-coded lines for each fabrication layer and is a critical step between circuit schematics and full mask layouts in CMOS IC design.</p>
        </div>
        <div class="faq-item">
          <h3>How do I draw a stick diagram online?</h3>
          <p>With StickOut, open the Stick Diagram editor, select a layer (Metal, Poly, Diffusion, etc.), choose the Wire tool, and click on the canvas grid to draw. Use the Contact tool to place connections and the Label tool to annotate rails like V<sub>DD</sub> and V<sub>SS</sub>. When done, export as a high-resolution PNG.</p>
        </div>
        <div class="faq-item">
          <h3>Is StickOut free to use?</h3>
          <p>Yes, StickOut is 100% free. There are no ads, no sign-ups, and no usage limits. Use it as much as you want for homework, research, teaching, or professional IC design work.</p>
        </div>
        <div class="faq-item">
          <h3>What is the difference between a stick diagram and a layout diagram?</h3>
          <p>A stick diagram is an abstracted, topological representation showing relative placement and connectivity without precise dimensions. A layout (mask) diagram is geometrically accurate with exact widths, spacings, and coordinates ready for fabrication. Stick diagrams are drawn first to plan the layout.</p>
        </div>
        <div class="faq-item">
          <h3>Can I save and share my work?</h3>
          <p>Yes. StickOut auto-saves to your browser, and you can save projects as .stk files to share with others. For images, use the Export PNG feature with customizable backgrounds and margins.</p>
        </div>
        <div class="faq-item">
          <h3>What VLSI layers does StickOut support?</h3>
          <p>Metal 1, Metal 2, Polysilicon, P-Diffusion, N-Diffusion, Contacts, Vias, N-Well/P-Well boundaries, Demarcation lines, N+ and P+ Implants, Buried Contacts, Silicide Blocks, Thick Oxide regions, and dynamically added higher metal layers with customizable colors.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="cta-section">
    <div class="container">
      <span class="section-label">Get Started</span>
      <h2 class="section-title">Start Designing Now</h2>
      <p class="section-desc">No sign-up. No downloads. Pick a tool and start designing in seconds.</p>
      <div class="hero-actions" style="justify-content:center">
        <a href="/stick-diagram" class="btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>
          Open Stick Diagram
        </a>
        <a href="/floor-planning" class="btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
          Open Floor Planning
        </a>
      </div>
    </div>
  </section>

  <footer>
    <p>Created by <a href="https://www.appbuildersph.com/makers/aera0908" target="_blank" rel="noopener">Aira Josh Ynte</a> · Free online VLSI stick diagram &amp; floor planning tool.</p>
    <div class="footer-socials">
      <a href="https://github.com/Aera0908" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/></svg></a>
      <a href="https://www.linkedin.com/in/aira-josh-ynte/" target="_blank" rel="noopener" title="LinkedIn" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg></a>
      <a href="https://ganknow.com/Aera0908" target="_blank" rel="noopener" title="Support on Gank" aria-label="Gank"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.35-10-9.28C.36 8.07 1.9 4.5 5.2 4.5c2 0 3.3 1.06 4.05 2.13L12 9l2.75-2.37C15.5 5.56 16.8 4.5 18.8 4.5c3.3 0 4.84 3.57 3.2 7.22C19.5 16.65 12 21 12 21z"/></svg></a>
      <a href="https://appbuildersph.com/apps/stickout" target="_blank" rel="noopener" title="AppBuildersPH" aria-label="AppBuildersPH"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></a>
    </div>
  </footer>
</div>
`;

export default function Landing() {
  const [theme] = useState(() => {
    try { return localStorage.getItem('stickout-theme') || 'dark'; }
    catch { return 'dark'; }
  });

  // The landing page has its own dark palette; keep the document theme in sync
  // so any shared chrome matches.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <div dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />;
}
