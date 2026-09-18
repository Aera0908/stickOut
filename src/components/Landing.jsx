import { useEffect, useState } from 'react';
import { navigate } from '../router.jsx';

// ============================================================================
// STICKOUT — MINIMALIST INDUSTRIAL VLSI CAD INTERFACE
// Utilitarian, flat, quiet engineering aesthetic.
// No oblong tags, no rounded cards, no glowing sci-fi gimmicks.
// ============================================================================

const LANDING_HTML = `
<style>
  /* Allow landing page to scroll */
  html, body { overflow-y: auto !important; height: auto !important; background: #0E0F12 !important; }
  #root { height: auto !important; overflow: visible !important; }

  .min-eda *, .min-eda *::before, .min-eda *::after {
    margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important;
  }

  .min-eda {
    --bg: #0E0F12;
    --surface: #14161B;
    --surface-hover: #1A1D23;
    --border: #23262E;
    --border-subtle: #1C1E25;
    --border-hover: #383D4A;
    --text: #EDEDF2;
    --text-secondary: #8E93A0;
    --text-muted: #575B66;
    --accent: #3B82F6;
    --accent-hover: #2563EB;
    --mono: 'JetBrains Mono', 'Roboto Mono', 'Consolas', monospace;
    --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

    font-family: var(--sans);
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }

  .min-eda a { color: inherit; text-decoration: none; }

  /* Navigation Bar */
  .min-eda .navbar {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    height: 52px; padding: 0 32px;
    background: #0E0F12f2;
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(8px);
  }
  .min-eda .nav-brand {
    display: flex; align-items: center; gap: 10px;
    font-size: 15px; font-weight: 700; letter-spacing: -0.01em; color: var(--text);
  }
  .min-eda .nav-brand-badge {
    font-family: var(--mono); font-size: 11px; font-weight: 500;
    color: var(--text-muted); border: 1px solid var(--border); padding: 1px 6px;
  }
  .min-eda .nav-links { display: flex; align-items: center; gap: 28px; }
  .min-eda .nav-link {
    font-size: 13px; color: var(--text-secondary); transition: color 0.15s;
  }
  .min-eda .nav-link:hover { color: var(--text); }
  .min-eda .nav-btn {
    display: inline-flex; align-items: center;
    background: var(--text); color: var(--bg);
    font-size: 12px; font-weight: 600; padding: 7px 14px;
    border: 1px solid var(--text); transition: all 0.15s;
  }
  .min-eda .nav-btn:hover { background: #fff; border-color: #fff; }

  /* Container */
  .min-eda .container { max-width: 1120px; margin: 0 auto; padding: 0 32px; }

  /* Hero Section */
  .min-eda .hero {
    padding: 72px 0 64px;
    border-bottom: 1px solid var(--border);
  }
  .min-eda .eyebrow {
    font-family: var(--mono); font-size: 12px; font-weight: 500;
    color: var(--text-secondary); margin-bottom: 16px;
  }
  .min-eda .hero-title {
    font-size: clamp(32px, 4.5vw, 48px);
    font-weight: 700; line-height: 1.15; letter-spacing: -0.03em;
    color: var(--text); margin-bottom: 20px; max-width: 820px;
  }
  .min-eda .hero-desc {
    font-size: 16px; color: var(--text-secondary); max-width: 680px;
    line-height: 1.7; margin-bottom: 32px;
  }
  .min-eda .hero-buttons { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 48px; }
  .min-eda .btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--accent); color: #fff; border: 1px solid var(--accent);
    padding: 11px 22px; font-size: 13px; font-weight: 600; transition: background 0.15s;
  }
  .min-eda .btn-primary:hover { background: var(--accent-hover); }
  .min-eda .btn-secondary {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    padding: 11px 22px; font-size: 13px; font-weight: 500; transition: all 0.15s;
  }
  .min-eda .btn-secondary:hover { background: var(--surface-hover); border-color: var(--border-hover); }

  /* Schematic Preview Canvas Frame */
  .min-eda .preview-frame {
    border: 1px solid var(--border); background: #0A0B0E;
    position: relative;
  }
  .min-eda .preview-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; border-bottom: 1px solid var(--border);
    background: var(--surface); font-family: var(--mono); font-size: 11px;
    color: var(--text-secondary);
  }
  .min-eda .preview-body {
    padding: 24px; display: flex; justify-content: center; align-items: center;
    background-image: 
      linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 20px 20px;
  }
  .min-eda .preview-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 16px; border-top: 1px solid var(--border);
    background: var(--surface); font-family: var(--mono); font-size: 11px;
    color: var(--text-muted);
  }

  /* Section Styles */
  .min-eda section.block { padding: 64px 0; border-bottom: 1px solid var(--border); }
  .min-eda .section-title {
    font-size: 20px; font-weight: 700; letter-spacing: -0.02em;
    margin-bottom: 8px; color: var(--text);
  }
  .min-eda .section-desc {
    font-size: 14px; color: var(--text-secondary); margin-bottom: 32px; max-width: 640px;
  }

  /* Tools Split (3-Column Clean Flat) */
  .min-eda .tools-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--border); background: var(--border); gap: 1px;
  }
  .min-eda .tool-item {
    background: var(--surface); padding: 32px 24px;
    display: flex; flex-direction: column; justify-content: space-between;
    transition: background 0.15s;
  }
  .min-eda .tool-item:hover { background: var(--surface-hover); }
  .min-eda .tool-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; color: var(--text); }
  .min-eda .tool-text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; }
  .min-eda .tool-link {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--mono); font-size: 12px; font-weight: 500;
    color: var(--accent); transition: color 0.15s;
  }
  .min-eda .tool-link:hover { color: #60A5FA; }

  /* Minimal Data Table */
  .min-eda .table-container {
    border: 1px solid var(--border); overflow-x: auto;
  }
  .min-eda .data-table {
    width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;
    background: var(--surface);
  }
  .min-eda .data-table th {
    background: #111317; color: var(--text-muted); font-family: var(--mono);
    font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 10px 16px; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border);
  }
  .min-eda .data-table td {
    padding: 12px 16px; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border);
    color: var(--text-secondary); vertical-align: middle;
  }
  .min-eda .data-table tr:last-child td { border-bottom: none; }
  .min-eda .data-table tr:hover td { background: rgba(255, 255, 255, 0.015); }
  .min-eda .layer-name-cell {
    display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text);
  }
  .min-eda .layer-color-sq {
    width: 10px; height: 10px; flex-shrink: 0;
  }

  /* Features Grid (Clean 3-Column) */
  .min-eda .features-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--border); background: var(--border); gap: 1px;
  }
  .min-eda .feature-box {
    background: var(--surface); padding: 28px 24px;
  }
  .min-eda .feature-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--text); }
  .min-eda .feature-body { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }

  /* Shortcuts Matrix */
  .min-eda .shortcuts-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    border: 1px solid var(--border); background: var(--border); gap: 1px;
  }
  .min-eda .sc-box {
    background: var(--surface); padding: 14px 18px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .min-eda .sc-label { font-size: 12px; color: var(--text-secondary); }
  .min-eda .sc-key {
    font-family: var(--mono); font-size: 11px; font-weight: 600;
    color: var(--text); background: #0D0F12; border: 1px solid var(--border);
    padding: 2px 7px;
  }

  /* FAQ List */
  .min-eda .faq-list {
    border: 1px solid var(--border); background: var(--surface);
  }
  .min-eda .faq-entry {
    padding: 24px 28px; border-bottom: 1px solid var(--border);
  }
  .min-eda .faq-entry:last-child { border-bottom: none; }
  .min-eda .faq-question {
    font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 8px;
  }
  .min-eda .faq-answer {
    font-size: 13px; color: var(--text-secondary); line-height: 1.7;
  }

  /* Bottom Launch Action */
  .min-eda .launch-block {
    padding: 48px; border: 1px solid var(--border); background: var(--surface);
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 24px; margin: 64px 0;
  }
  .min-eda .launch-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .min-eda .launch-sub { font-size: 13px; color: var(--text-secondary); }

  /* Footer */
  .min-eda footer {
    border-top: 1px solid var(--border); padding: 36px 0;
    font-size: 12px; color: var(--text-muted); background: #0A0B0E;
  }
  .min-eda .footer-content {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 16px;
  }
  .min-eda .footer-links { display: flex; gap: 20px; }
  .min-eda .footer-links a { color: var(--text-secondary); }
  .min-eda .footer-links a:hover { color: var(--text); }

  @media (max-width: 860px) {
    .min-eda .navbar { padding: 0 20px; }
    .min-eda .container { padding: 0 20px; }
    .min-eda .tools-grid { grid-template-columns: 1fr; }
    .min-eda .features-grid { grid-template-columns: 1fr; }
    .min-eda .shortcuts-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .min-eda .nav-links { display: none; }
    .min-eda .shortcuts-grid { grid-template-columns: 1fr; }
    .min-eda .launch-block { padding: 24px; }
  }
</style>

<div class="min-eda">
  <!-- Minimal Header -->
  <nav class="navbar">
    <div class="nav-brand">
      <a href="/">StickOut</a>
      <span class="nav-brand-badge">VLSI CAD</span>
    </div>
    <div class="nav-links">
      <a href="#tools" class="nav-link">Tools</a>
      <a href="#layers" class="nav-link">Layers</a>
      <a href="#features" class="nav-link">Features</a>
      <a href="#shortcuts" class="nav-link">Shortcuts</a>
      <a href="#faq" class="nav-link">FAQ</a>
      <a href="/stick-diagram" class="nav-btn">Launch Editor</a>
    </div>
  </nav>

  <!-- Hero -->
  <header class="hero">
    <div class="container">
      <div class="eyebrow">Free, browser-based VLSI design suite</div>
      <h1 class="hero-title">VLSI stick diagram and CMOS layout editor.</h1>
      <p class="hero-desc">
        Draw CMOS stick diagrams, transistor-level schematics, and block floor plans directly in your browser. Design with standard semiconductor fabrication layers, automatic wire jumpers, and export publication-ready PNGs. No sign-ups or installation required.
      </p>

      <div class="hero-buttons">
        <a href="/stick-diagram" class="btn-primary">Stick Diagram Editor</a>
        <a href="/cmos-diagram" class="btn-secondary">CMOS Schematic</a>
        <a href="/floor-planning" class="btn-secondary">Floor Planning</a>
      </div>

      <!-- Clean Schematic Viewport Preview -->
      <div class="preview-frame">
        <div class="preview-header">
          <span>CMOS 2-Input NAND Gate Stick Diagram</span>
          <span>Grid: 20λ Pitch</span>
        </div>
        <div class="preview-body">
          <svg viewBox="0 0 340 240" xmlns="http://www.w3.org/2000/svg" style="width:100%; max-width:340px; display:block;">
            <!-- Grid Lines -->
            <g stroke="#1A1D24" stroke-width="1">
              <line x1="20" y1="30" x2="320" y2="30"/>
              <line x1="20" y1="85" x2="320" y2="85"/>
              <line x1="20" y1="155" x2="320" y2="155"/>
              <line x1="20" y1="210" x2="320" y2="210"/>
              <line x1="110" y1="15" x2="110" y2="225"/>
              <line x1="190" y1="15" x2="190" y2="225"/>
            </g>

            <!-- VDD Rail (Metal 1) -->
            <line x1="20" y1="30" x2="320" y2="30" stroke="#4A90E2" stroke-width="4"/>
            <text x="24" y="24" fill="#4A90E2" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="600">VDD (M1)</text>

            <!-- VSS Rail (Metal 1) -->
            <line x1="20" y1="210" x2="320" y2="210" stroke="#4A90E2" stroke-width="4"/>
            <text x="24" y="226" fill="#4A90E2" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="600">VSS (M1)</text>

            <!-- P-Diffusion Active Strip (Yellow) -->
            <line x1="50" y1="85" x2="270" y2="85" stroke="#F1C40F" stroke-width="4"/>
            <text x="276" y="89" fill="#F1C40F" font-family="'JetBrains Mono', monospace" font-size="9">P-DIFF</text>

            <!-- N-Diffusion Active Strip (Green) -->
            <line x1="50" y1="155" x2="270" y2="155" stroke="#27AE60" stroke-width="4"/>
            <text x="276" y="159" fill="#27AE60" font-family="'JetBrains Mono', monospace" font-size="9">N-DIFF</text>

            <!-- Demarcation Line -->
            <line x1="20" y1="120" x2="320" y2="120" stroke="#6E554D" stroke-width="1" stroke-dasharray="6,4"/>

            <!-- Polysilicon Gates (Purple) -->
            <line x1="120" y1="60" x2="120" y2="180" stroke="#9B59B6" stroke-width="3.5"/>
            <text x="116" y="52" fill="#9B59B6" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600">A</text>

            <line x1="200" y1="60" x2="200" y2="180" stroke="#9B59B6" stroke-width="3.5"/>
            <text x="196" y="52" fill="#9B59B6" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600">B</text>

            <!-- Vertical M1 Interconnects -->
            <line x1="75" y1="30" x2="75" y2="85" stroke="#4A90E2" stroke-width="2.5"/>
            <line x1="245" y1="30" x2="245" y2="85" stroke="#4A90E2" stroke-width="2.5"/>
            <line x1="160" y1="85" x2="160" y2="120" stroke="#4A90E2" stroke-width="2.5"/>
            <line x1="160" y1="120" x2="250" y2="120" stroke="#4A90E2" stroke-width="2.5"/>
            <line x1="245" y1="120" x2="245" y2="155" stroke="#4A90E2" stroke-width="2.5"/>
            <line x1="75" y1="155" x2="75" y2="210" stroke="#4A90E2" stroke-width="2.5"/>

            <!-- Output Label -->
            <text x="258" y="124" fill="#4A90E2" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600">Y = !(A·B)</text>

            <!-- Contacts (Clean Boxes with cross) -->
            <rect x="71" y="26" width="8" height="8" fill="#0A0B0E" stroke="#FFF" stroke-width="1.2"/>
            <line x1="71" y1="26" x2="79" y2="34" stroke="#FFF" stroke-width="0.8"/>
            <line x1="71" y1="34" x2="79" y2="26" stroke="#FFF" stroke-width="0.8"/>

            <rect x="241" y="26" width="8" height="8" fill="#0A0B0E" stroke="#FFF" stroke-width="1.2"/>
            <line x1="241" y1="26" x2="249" y2="34" stroke="#FFF" stroke-width="0.8"/>
            <line x1="241" y1="34" x2="249" y2="26" stroke="#FFF" stroke-width="0.8"/>

            <rect x="71" y="81" width="8" height="8" fill="#0A0B0E" stroke="#FFF" stroke-width="1.2"/>
            <line x1="71" y1="81" x2="79" y2="89" stroke="#FFF" stroke-width="0.8"/>
            <line x1="71" y1="89" x2="79" y2="81" stroke="#FFF" stroke-width="0.8"/>

            <rect x="156" y="81" width="8" height="8" fill="#0A0B0E" stroke="#FFF" stroke-width="1.2"/>
            <line x1="156" y1="81" x2="164" y2="89" stroke="#FFF" stroke-width="0.8"/>
            <line x1="156" y1="89" x2="164" y2="81" stroke="#FFF" stroke-width="0.8"/>

            <rect x="241" y="81" width="8" height="8" fill="#0A0B0E" stroke="#FFF" stroke-width="1.2"/>
            <line x1="241" y1="81" x2="249" y2="89" stroke="#FFF" stroke-width="0.8"/>
            <line x1="241" y1="89" x2="249" y2="81" stroke="#FFF" stroke-width="0.8"/>

            <rect x="71" y="151" width="8" height="8" fill="#0A0B0E" stroke="#FFF" stroke-width="1.2"/>
            <line x1="71" y1="151" x2="79" y2="159" stroke="#FFF" stroke-width="0.8"/>
            <line x1="71" y1="159" x2="79" y2="151" stroke="#FFF" stroke-width="0.8"/>

            <rect x="241" y="151" width="8" height="8" fill="#0A0B0E" stroke="#FFF" stroke-width="1.2"/>
            <line x1="241" y1="151" x2="249" y2="159" stroke="#FFF" stroke-width="0.8"/>
            <line x1="241" y1="159" x2="249" y2="151" stroke="#FFF" stroke-width="0.8"/>

            <rect x="71" y="206" width="8" height="8" fill="#0A0B0E" stroke="#FFF" stroke-width="1.2"/>
            <line x1="71" y1="206" x2="79" y2="214" stroke="#FFF" stroke-width="0.8"/>
            <line x1="71" y1="214" x2="79" y2="206" stroke="#FFF" stroke-width="0.8"/>
          </svg>
        </div>
        <div class="preview-footer">
          <span>Layers: Metal 1 · Polysilicon · P-Diffusion · N-Diffusion · Contacts</span>
          <span>Output: High-res PNG &amp; .stk files</span>
        </div>
      </div>
    </div>
  </header>

  <!-- Three Tools -->
  <section class="block" id="tools">
    <div class="container">
      <h2 class="section-title">Design Tools</h2>
      <p class="section-desc">Choose an editor to start. All three share the same snap-grid canvas, hotkeys, and export engine.</p>

      <div class="tools-grid">
        <div class="tool-item">
          <div>
            <h3 class="tool-title">Stick Diagram</h3>
            <p class="tool-text">
              Draw topological CMOS stick diagrams using Metal, Polysilicon, Diffusion, Contacts, and Vias. Includes automatic same-layer wire jump detection, full layer hierarchy management, and Boolean gate generation.
            </p>
          </div>
          <a href="/stick-diagram" class="tool-link">Open Stick Diagram &rarr;</a>
        </div>

        <div class="tool-item">
          <div>
            <h3 class="tool-title">CMOS Schematic</h3>
            <p class="tool-text">
              Assemble transistor-level schematics with PMOS, NMOS, VDD, and VSS symbols. Crossing lines form automatic bridge arcs, and connection nodes mark electrically tied nets.
            </p>
          </div>
          <a href="/cmos-diagram" class="tool-link">Open CMOS Schematic &rarr;</a>
        </div>

        <div class="tool-item">
          <div>
            <h3 class="tool-title">Floor Planning</h3>
            <p class="tool-text">
              Plan chip boundaries, peripheral I/O pad rings, and core power/ground mesh trunks. Group and arrange block functional units with dimensions and interconnects.
            </p>
          </div>
          <a href="/floor-planning" class="tool-link">Open Floor Planning &rarr;</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Layer Specification Table -->
  <section class="block" id="layers">
    <div class="container">
      <h2 class="section-title">Fabrication Layers</h2>
      <p class="section-desc">Color-coded standard layers adhering to Mead-Conway VLSI design rules.</p>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Layer</th>
              <th>Color Code</th>
              <th>Material</th>
              <th>Function</th>
              <th>Minimum Width</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="layer-name-cell">
                  <span class="layer-color-sq" style="background:#4A90E2"></span>
                  <span>Metal 1 (M1)</span>
                </div>
              </td>
              <td><code>#4A90E2</code></td>
              <td>Aluminum / Copper</td>
              <td>Primary horizontal interconnect &amp; power rails</td>
              <td>3λ</td>
            </tr>
            <tr>
              <td>
                <div class="layer-name-cell">
                  <span class="layer-color-sq" style="background:#C0392B"></span>
                  <span>Metal 2 (M2)</span>
                </div>
              </td>
              <td><code>#C0392B</code></td>
              <td>Aluminum / Copper</td>
              <td>Orthogonal vertical routing &amp; global buses</td>
              <td>4λ</td>
            </tr>
            <tr>
              <td>
                <div class="layer-name-cell">
                  <span class="layer-color-sq" style="background:#9B59B6"></span>
                  <span>Polysilicon</span>
                </div>
              </td>
              <td><code>#9B59B6</code></td>
              <td>Polycrystalline Silicon</td>
              <td>Transistor gates &amp; local interconnects</td>
              <td>2λ</td>
            </tr>
            <tr>
              <td>
                <div class="layer-name-cell">
                  <span class="layer-color-sq" style="background:#27AE60"></span>
                  <span>N-Diffusion</span>
                </div>
              </td>
              <td><code>#27AE60</code></td>
              <td>N+ Doped Silicon</td>
              <td>NMOS channels, source &amp; drain active regions</td>
              <td>2λ</td>
            </tr>
            <tr>
              <td>
                <div class="layer-name-cell">
                  <span class="layer-color-sq" style="background:#F1C40F"></span>
                  <span>P-Diffusion</span>
                </div>
              </td>
              <td><code>#F1C40F</code></td>
              <td>P+ Doped Silicon</td>
              <td>PMOS channels, source &amp; drain active regions</td>
              <td>2λ</td>
            </tr>
            <tr>
              <td>
                <div class="layer-name-cell">
                  <span class="layer-color-sq" style="background:#111; border:1px solid #888;"></span>
                  <span>Contact Cut</span>
                </div>
              </td>
              <td><code>#111111</code></td>
              <td>Tungsten (W) Plug</td>
              <td>Vertical junction: Metal 1 to Poly or Diffusion</td>
              <td>2λ × 2λ</td>
            </tr>
            <tr>
              <td>
                <div class="layer-name-cell">
                  <span class="layer-color-sq" style="background:#FF00FF"></span>
                  <span>Via Cut</span>
                </div>
              </td>
              <td><code>#FF00FF</code></td>
              <td>Tungsten / Copper</td>
              <td>Vertical junction: Metal 1 to Metal 2</td>
              <td>2λ × 2λ</td>
            </tr>
            <tr>
              <td>
                <div class="layer-name-cell">
                  <span class="layer-color-sq" style="background:#795548"></span>
                  <span>N-Well / P-Well</span>
                </div>
              </td>
              <td><code>#795548</code></td>
              <td>Doped Well Region</td>
              <td>Tub isolation for complementary transistors</td>
              <td>Boundary</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Key Features -->
  <section class="block" id="features">
    <div class="container">
      <h2 class="section-title">Features</h2>
      <p class="section-desc">Focused capabilities designed for electronic engineering workflows.</p>

      <div class="features-grid">
        <div class="feature-box">
          <h3 class="feature-title">Boolean Gate Synthesis</h3>
          <p class="feature-body">
            Input arbitrary logic equations like <code>!(A &amp; B) | C</code>. The synthesizer discovers dual-graph Euler paths to minimize diffusion breaks and produce standard cell layouts.
          </p>
        </div>
        <div class="feature-box">
          <h3 class="feature-title">Automatic Wire Jumpers</h3>
          <p class="feature-body">
            Crossing wires on the same fabrication layer automatically render jumper arcs to indicate no electrical connection. Toggle connection dots with the junction tool.
          </p>
        </div>
        <div class="feature-box">
          <h3 class="feature-title">Grid Pitch Snapping</h3>
          <p class="feature-body">
            Strict 20px grid snapping keeps lines and contacts aligned to scalable lambda pitches. Supports pan and smooth zoom from 0.25× to 4.0×.
          </p>
        </div>
        <div class="feature-box">
          <h3 class="feature-title">Layer Management</h3>
          <p class="feature-body">
            Toggle visibility, adjust opacity, and reorder the rendering stack. Supports 14 standard masks plus dynamic higher-metal layers up to Metal 10.
          </p>
        </div>
        <div class="feature-box">
          <h3 class="feature-title">LaTeX-Style Labels</h3>
          <p class="feature-body">
            Label supply rails and input pins with standard subscript syntax (e.g. <code>V_{DD}</code> and <code>V_{SS}</code>) rendered as serif mathematical typography.
          </p>
        </div>
        <div class="feature-box">
          <h3 class="feature-title">High-Resolution Export</h3>
          <p class="feature-body">
            Export 2× resolution PNGs with transparent or solid backgrounds, optimized for IEEE papers, lecture slides, and lab reports. Save and reload <code>.stk</code> project files.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Shortcuts -->
  <section class="block" id="shortcuts">
    <div class="container">
      <h2 class="section-title">Keyboard Shortcuts</h2>
      <p class="section-desc">Direct keyboard hotkeys for rapid diagram creation.</p>

      <div class="shortcuts-grid">
        <div class="sc-box">
          <span class="sc-label">Select / Move</span>
          <span class="sc-key">V</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Draw Wire</span>
          <span class="sc-key">W</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Place Contact / Via</span>
          <span class="sc-key">P</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Draw Rectangle</span>
          <span class="sc-key">R</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Add Text Label</span>
          <span class="sc-key">L</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Boolean Synthesis</span>
          <span class="sc-key">B</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Measure Distance</span>
          <span class="sc-key">M</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Toggle Junction</span>
          <span class="sc-key">J</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Eraser</span>
          <span class="sc-key">E</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Undo</span>
          <span class="sc-key">Ctrl+Z</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Redo</span>
          <span class="sc-key">Ctrl+Y</span>
        </div>
        <div class="sc-box">
          <span class="sc-label">Save Project</span>
          <span class="sc-key">Ctrl+S</span>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="block" id="faq">
    <div class="container">
      <h2 class="section-title">Frequently Asked Questions</h2>
      <p class="section-desc">Common questions regarding VLSI stick diagrams and the editor.</p>

      <div class="faq-list">
        <div class="faq-entry">
          <h3 class="faq-question">What is a stick diagram in VLSI design?</h3>
          <p class="faq-answer">
            A stick diagram is a simplified representation of an integrated circuit layout that shows the relative positions of transistors, wiring, polysilicon gates, and diffusion regions without specifying exact geometric dimensions. It bridges the gap between circuit schematics and full mask layouts (GDSII).
          </p>
        </div>
        <div class="faq-entry">
          <h3 class="faq-question">How do I draw a stick diagram online?</h3>
          <p class="faq-answer">
            Open the Stick Diagram editor, choose a fabrication layer (Metal, Poly, Diffusion, etc.), select the Wire tool (W), and click on the grid to route paths. Place Contacts (P) at layer junctions, and add Labels (L) for pins and power rails like V<sub>DD</sub> and V<sub>SS</sub>.
          </p>
        </div>
        <div class="faq-entry">
          <h3 class="faq-question">Is StickOut free to use?</h3>
          <p class="faq-answer">
            Yes, StickOut is 100% free and open-source. There are no accounts, subscriptions, or ads. All work runs locally in your browser and auto-saves to your local storage.
          </p>
        </div>
        <div class="faq-entry">
          <h3 class="faq-question">What is the difference between a stick diagram and a mask layout?</h3>
          <p class="faq-answer">
            A stick diagram is an abstracted, topological plan showing relative placement and connectivity without exact dimensions. A geometric layout is physically accurate with precise widths, spacings, and coordinates ready for lithography. Stick diagrams are drawn first to optimize transistor ordering and routing channels.
          </p>
        </div>
      </div>

      <!-- Simple Launch CTA Box -->
      <div class="launch-block">
        <div>
          <h3 class="launch-title">Start designing in your browser</h3>
          <p class="launch-sub">Free, instant access. No account or downloads needed.</p>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a href="/stick-diagram" class="btn-primary">Open Stick Diagram</a>
          <a href="/cmos-diagram" class="btn-secondary">Open CMOS Schematic</a>
          <a href="/floor-planning" class="btn-secondary">Open Floor Planning</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Minimal Footer -->
  <footer>
    <div class="container">
      <div class="footer-content">
        <div>
          <span>StickOut — Open-source VLSI stick diagram and CMOS layout tool.</span>
          <span style="margin-left:8px;">Created by <a href="https://github.com/Aera0908" target="_blank" rel="noopener" style="color:var(--text-secondary);">Aira Josh Ynte</a>.</span>
        </div>
        <div class="footer-links">
          <a href="https://github.com/Aera0908/stick-diagram" target="_blank" rel="noopener">GitHub</a>
          <a href="https://www.linkedin.com/in/aira-josh-ynte/" target="_blank" rel="noopener">LinkedIn</a>
          <a href="https://ganknow.com/Aera0908" target="_blank" rel="noopener">Support</a>
        </div>
      </div>
    </div>
  </footer>
</div>
`;

export default function Landing() {
  const [theme] = useState(() => {
    try { return localStorage.getItem('stickout-theme') || 'dark'; }
    catch { return 'dark'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleClick = (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    // Allow hash anchors to smoothly scroll
    if (href.startsWith('#')) return;
    // External links or new tab
    if (href.startsWith('http') || href.startsWith('mailto') || anchor.target === '_blank') return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    navigate(href);
  };

  return <div onClick={handleClick} dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />;
}
