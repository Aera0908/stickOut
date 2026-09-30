import { useState, useEffect } from 'react';
import { Cpu, Home, Layers, Layout, ArrowLeft, Copy, Check, Search, ExternalLink, Compass } from 'lucide-react';
import { navigate } from '../router.jsx';
import './ErrorPages.css';

const ROUTES_DIRECTORY = [
  {
    path: '/stick-diagram',
    title: 'Stick Diagram Editor',
    icon: Layers,
    description: 'Interactive VLSI CAD canvas. Draw Metal 1, Metal 2, Polysilicon, Diffusion, Contacts, and Vias.',
    tag: 'PRIMARY EDA',
    actionText: 'Launch Stick Editor'
  },
  {
    path: '/cmos-diagram',
    title: 'CMOS Schematic Editor',
    icon: Cpu,
    description: 'Transistor-level PMOS and NMOS circuit designer with Boolean gate synthesis and netlist tools.',
    tag: 'SCHEMATIC',
    actionText: 'Launch CMOS Editor'
  },
  {
    path: '/floor-planning',
    title: 'VLSI Floor Planning',
    icon: Layout,
    description: 'Hierarchical macro block floorplanner, aspect ratio optimization, and die area estimation.',
    tag: 'LAYOUT',
    actionText: 'Launch Floorplanner'
  },
  {
    path: '/',
    title: 'StickOut Homepage',
    icon: Home,
    description: 'Project overview, documentation, interactive examples, export guidelines, and tutorials.',
    tag: 'DOCS & GUIDE',
    actionText: 'Go to Homepage'
  }
];

export default function NotFoundPage({ currentPath = window.location.pathname }) {
  const [copied, setCopied] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Allow body scrolling when viewing the error page
  useEffect(() => {
    document.title = '404: Net Not Found — StickOut';

    const originalOverflow = document.body.style.overflowY;
    const originalHeight = document.body.style.height;
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';

    return () => {
      document.documentElement.style.overflowY = '';
      document.documentElement.style.height = '';
      document.body.style.overflowY = originalOverflow;
      document.body.style.height = originalHeight;
    };
  }, []);

  const handleCopyPath = () => {
    const fullUrl = window.location.href;
    navigator.clipboard?.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNav = (targetPath, e) => {
    if (e) e.preventDefault();
    navigate(targetPath);
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  const filteredRoutes = ROUTES_DIRECTORY.filter(r => 
    r.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    r.path.toLowerCase().includes(filterQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const displayPath = currentPath || window.location.pathname || '/unknown';

  return (
    <div className="error-page-container">
      {/* Background Engineering Grid */}
      <div className="error-page-grid-bg" />

      {/* Top CAD Navigation Bar */}
      <header className="error-navbar">
        <div className="error-nav-left">
          <a href="/" onClick={(e) => handleNav('/', e)} className="error-brand-link">
            <Cpu size={16} />
            <span>StickOut</span>
          </a>
          <span className="error-status-badge warning">
            <span className="error-status-indicator" />
            ERR_404 // NET_NOT_FOUND
          </span>
        </div>
        <nav className="error-nav-links">
          <a href="/stick-diagram" onClick={(e) => handleNav('/stick-diagram', e)} className="error-nav-link">Stick Diagram</a>
          <a href="/cmos-diagram" onClick={(e) => handleNav('/cmos-diagram', e)} className="error-nav-link">CMOS Schematic</a>
          <a href="/floor-planning" onClick={(e) => handleNav('/floor-planning', e)} className="error-nav-link">Floor Planning</a>
          <a href="/" onClick={(e) => handleNav('/', e)} className="error-nav-btn">
            <Home size={13} />
            <span>Home</span>
          </a>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="error-main-content">
        {/* Telemetry Status Bar */}
        <div className="error-telemetry-bar">
          <div className="error-telemetry-left">
            <span>[DIAGNOSTICS] ROUTING_RESOLVER: UNROUTED_PIN</span>
          </div>
          <div className="error-telemetry-right">
            <span>SUBSTRATE: <strong>CMOS_0.18µm</strong></span>
            <span>IMPEDANCE: <strong>HIGH-Z (FLOATING)</strong></span>
            <span>COORDINATE: <strong>[X: 0x0000, Y: 0x0000]</strong></span>
          </div>
        </div>

        {/* Hero Card */}
        <div className="error-hero-card warning">
          <div className="error-code-badge">
            404
            <small>Net Unresolved</small>
          </div>

          <div>
            <h1 className="error-title">Open Circuit: Node Not Found</h1>
            <p className="error-description">
              The routing engine could not map the requested netlist address to any active silicon layer, 
              schematic block, or CAD layout canvas. The node may have been re-routed, moved, or never placed on the mask.
            </p>
          </div>

          {/* Schematic Circuit Wire Diagram */}
          <div className="error-schematic-visual" aria-label="Schematic showing open circuit trace">
            <svg 
              className="error-schematic-svg" 
              viewBox="0 0 640 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background subgrid */}
              <defs>
                <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
                </pattern>
                <linearGradient id="activeTraceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#3B82F6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="floatingTraceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#575B66" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              
              <rect width="640" height="100" fill="url(#cadGrid)" />

              {/* VDD Power Rail */}
              <line x1="20" y1="20" x2="620" y2="20" stroke="#383D4A" strokeWidth="1" strokeDasharray="3 3" />
              <text x="24" y="16" fill="#575B66" fontFamily="var(--font-mono)" fontSize="9">VDD_RAIL</text>

              {/* Input Terminal Pad */}
              <rect x="30" y="44" width="60" height="32" fill="#14161B" stroke="#3B82F6" strokeWidth="1.5" />
              <text x="60" y="64" fill="#3B82F6" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" textAnchor="middle">IN_PAD</text>

              {/* Connected Wire Trace */}
              <line x1="90" y1="60" x2="220" y2="60" stroke="url(#activeTraceGrad)" strokeWidth="3" />
              <circle cx="220" cy="60" r="4" fill="#3B82F6" />

              {/* Logic Buffer Node */}
              <polygon points="220,46 256,60 220,74" fill="#14161B" stroke="#EDEDF2" strokeWidth="1.2" />
              <circle cx="260" cy="60" r="3.5" fill="#14161B" stroke="#EDEDF2" strokeWidth="1.2" />

              {/* Trace leading to break */}
              <line x1="264" y1="60" x2="330" y2="60" stroke="#F59E0B" strokeWidth="2.5" />

              {/* Open Circuit Fault Point */}
              <circle cx="330" cy="60" r="6" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="1.5" />
              <line x1="326" y1="56" x2="334" y2="64" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
              <line x1="334" y1="56" x2="326" y2="64" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
              
              {/* Broken Gap Indicator */}
              <path d="M 338 52 Q 350 45 362 52" fill="none" stroke="#EF4444" strokeWidth="1" strokeDasharray="2 2" />
              <text x="350" y="42" fill="#EF4444" fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" textAnchor="middle">× OPEN ×</text>

              {/* Floating Unconnected Wire */}
              <line x1="370" y1="60" x2="480" y2="60" stroke="url(#floatingTraceGrad)" strokeWidth="2" strokeDasharray="4 4" />
              
              {/* Missing Node Destination Pad */}
              <rect x="480" y="44" width="130" height="32" fill="#14161B" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3 3" />
              <text x="545" y="64" fill="#EF4444" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" textAnchor="middle">NULL_PIN: 404</text>

              {/* Oscilloscope Probe marker */}
              <path d="M 425 60 L 425 82 L 445 82" fill="none" stroke="#8E93A0" strokeWidth="1" />
              <text x="450" y="86" fill="#8E93A0" fontFamily="var(--font-mono)" fontSize="9">HIGH-Z (0.00 V)</text>

              {/* VSS Ground Rail */}
              <line x1="20" y1="92" x2="620" y2="92" stroke="#383D4A" strokeWidth="1" strokeDasharray="3 3" />
              <text x="24" y="88" fill="#575B66" fontFamily="var(--font-mono)" fontSize="9">VSS_RAIL</text>
            </svg>
          </div>

          {/* Requested Path Box */}
          <div className="error-path-box">
            <div>
              <span className="error-path-label">Attempted Routing Target:</span>
              <span className="error-path-value">{displayPath}</span>
            </div>
            <button 
              className={`error-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopyPath}
              title="Copy URL to clipboard"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied URL' : 'Copy Path'}</span>
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="error-actions-group">
            <button 
              onClick={(e) => handleNav('/stick-diagram', e)} 
              className="error-btn-primary"
            >
              <Layers size={14} />
              <span>Launch Stick Diagram Editor</span>
            </button>
            <button 
              onClick={(e) => handleNav('/cmos-diagram', e)} 
              className="error-btn-secondary"
            >
              <Cpu size={14} />
              <span>CMOS Schematic</span>
            </button>
            <button 
              onClick={handleGoBack} 
              className="error-btn-secondary"
            >
              <ArrowLeft size={14} />
              <span>Return to Previous Page</span>
            </button>
          </div>
        </div>

        {/* Available CAD Endpoints Directory */}
        <section className="error-directory-section">
          <div className="error-section-header">
            <div className="error-section-title">
              <Compass size={14} />
              <span>Valid Circuit Endpoints & Tools</span>
            </div>
            <div className="error-search-input-wrap">
              <Search size={13} className="error-search-icon" />
              <input 
                type="text" 
                className="error-search-input"
                placeholder="Filter valid routes..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="error-routes-grid">
            {filteredRoutes.length > 0 ? (
              filteredRoutes.map((route) => {
                const IconComponent = route.icon;
                return (
                  <a 
                    key={route.path}
                    href={route.path}
                    onClick={(e) => handleNav(route.path, e)}
                    className="error-route-card"
                  >
                    <div className="error-route-card-top">
                      <div className="error-route-icon">
                        <IconComponent size={16} />
                      </div>
                      <div className="error-route-meta">
                        <div className="error-route-title">
                          <span>{route.title}</span>
                        </div>
                        <span className="error-route-path">{route.path}</span>
                      </div>
                    </div>
                    <p className="error-route-desc">{route.description}</p>
                    <div className="error-route-footer">
                      <span>{route.tag}</span>
                      <span className="error-route-action">
                        {route.actionText} →
                      </span>
                    </div>
                  </a>
                );
              })
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No routes matching "{filterQuery}". <button onClick={() => setFilterQuery('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>Clear filter</button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="error-footer">
        <div>
          <span>StickOut CAD Suite v1.0 · Open Source VLSI Layout Engine</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="https://github.com/Aera0908/stick-diagram" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>GitHub Repository</span>
            <ExternalLink size={11} />
          </a>
          <a href="/" onClick={(e) => handleNav('/', e)}>
            <span>Home</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
