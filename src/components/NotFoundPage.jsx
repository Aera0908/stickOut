import { useEffect } from 'react';
import { Cpu } from 'lucide-react';
import { navigate } from '../router.jsx';
import './ErrorPages.css';

export default function NotFoundPage({ currentPath = window.location.pathname }) {
  useEffect(() => {
    document.title = 'Page Not Found — StickOut';

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

  const handleNav = (targetPath, e) => {
    if (e) e.preventDefault();
    navigate(targetPath);
  };

  const displayPath = currentPath || window.location.pathname || '';
  const showPath = displayPath && displayPath !== '/' && displayPath !== '/404' && displayPath !== '/404.html';

  return (
    <div className="error-page-container">
      {/* Navbar */}
      <header className="error-navbar">
        <div className="error-nav-left">
          <a href="/" onClick={(e) => handleNav('/', e)} className="error-brand-link">
            <Cpu size={15} />
            <span>StickOut</span>
          </a>
          <span className="error-nav-badge">404</span>
        </div>
        <nav className="error-nav-links">
          <a href="/stick-diagram" onClick={(e) => handleNav('/stick-diagram', e)} className="error-nav-link">Stick Diagram</a>
          <a href="/cmos-diagram" onClick={(e) => handleNav('/cmos-diagram', e)} className="error-nav-link">CMOS Schematic</a>
          <a href="/floor-planning" onClick={(e) => handleNav('/floor-planning', e)} className="error-nav-link">Floor Planning</a>
          <a href="/stick-diagram" onClick={(e) => handleNav('/stick-diagram', e)} className="error-nav-btn">
            Open Editor
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="error-main-content">
        <div className="error-num">404</div>
        <h1 className="error-heading">Page not found</h1>
        <p className="error-paragraph">
          The page you are looking for doesn't exist, has been removed, or the link may be broken.
        </p>

        {showPath && (
          <div className="error-path-tag">
            <span>Path:</span>
            <code>{displayPath}</code>
          </div>
        )}

        <div className="error-btn-group">
          <a href="/" onClick={(e) => handleNav('/', e)} className="error-btn-primary">
            Return to Homepage
          </a>
          <a href="/stick-diagram" onClick={(e) => handleNav('/stick-diagram', e)} className="error-btn-secondary">
            Stick Diagram Editor
          </a>
          <a href="/cmos-diagram" onClick={(e) => handleNav('/cmos-diagram', e)} className="error-btn-secondary">
            CMOS Schematic
          </a>
          <a href="/floor-planning" onClick={(e) => handleNav('/floor-planning', e)} className="error-btn-secondary">
            Floor Planning
          </a>
        </div>

        <section className="error-links-section">
          <div className="error-links-title">Available CAD Tools</div>
          <div className="error-links-grid">
            <a href="/stick-diagram" onClick={(e) => handleNav('/stick-diagram', e)} className="error-link-card">
              <div className="error-link-card-title">
                <span>Stick Diagram</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>&rarr;</span>
              </div>
              <p className="error-link-card-desc">
                Interactive canvas with Metal, Poly, Diffusion layers, contacts, and vias.
              </p>
            </a>
            <a href="/cmos-diagram" onClick={(e) => handleNav('/cmos-diagram', e)} className="error-link-card">
              <div className="error-link-card-title">
                <span>CMOS Schematic</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>&rarr;</span>
              </div>
              <p className="error-link-card-desc">
                Transistor-level PMOS and NMOS schematic designer with Boolean synthesis.
              </p>
            </a>
            <a href="/floor-planning" onClick={(e) => handleNav('/floor-planning', e)} className="error-link-card">
              <div className="error-link-card-title">
                <span>Floor Planning</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>&rarr;</span>
              </div>
              <p className="error-link-card-desc">
                Hierarchical block placement, aspect ratio budgeting, and die area estimation.
              </p>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="error-footer">
        <div>StickOut — Free Online VLSI Stick Diagram Maker &amp; Editor</div>
        <div>
          <a href="https://github.com/Aera0908/stick-diagram" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
