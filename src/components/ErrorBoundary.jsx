import React from 'react';
import { Cpu, RefreshCw, AlertTriangle, RotateCcw, Home, Copy, Check, ExternalLink, ShieldAlert, Terminal } from 'lucide-react';
import './ErrorPages.css';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
      resetConfirmed: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('StickOut Uncaught ErrorBoundary Exception:', error, errorInfo);
    this.setState({ errorInfo });
    document.title = '500: Circuit Fault — StickOut';

    // Allow scrolling when error page renders
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
  }

  handleReload = () => {
    window.location.reload();
  };

  handleSafeHome = () => {
    window.location.href = '/';
  };

  handleResetStorage = () => {
    try {
      // Clear relevant StickOut local storage keys to heal from corrupted state
      const stickKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('stick_') || key.includes('elements') || key.includes('canvas') || key.includes('autosave'))) {
          stickKeys.push(key);
        }
      }
      stickKeys.forEach(k => localStorage.removeItem(k));
      this.setState({ resetConfirmed: true });
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } catch (e) {
      console.error('Failed to clear storage:', e);
      window.location.href = '/';
    }
  };

  handleCopyReport = () => {
    const { error, errorInfo } = this.state;
    const report = [
      '================ STICKOUT CRASH REPORT ================',
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
      `Error Name: ${error?.name || 'Unknown'}`,
      `Error Message: ${error?.message || 'No message'}`,
      '',
      '--- Error Stack Trace ---',
      error?.stack || 'No stack trace available',
      '',
      '--- React Component Stack ---',
      errorInfo?.componentStack || 'No component stack available',
      '======================================================='
    ].join('\n');

    navigator.clipboard?.writeText(report).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  handleReportIssue = () => {
    const { error } = this.state;
    const title = encodeURIComponent(`[Crash] ${error?.name || 'Error'}: ${error?.message || 'Application Panic'}`);
    const body = encodeURIComponent(
      `### What happened?\nA critical error interrupted StickOut CAD execution.\n\n` +
      `**URL:** \`${window.location.href}\`\n` +
      `**Error:** \`${error?.name}: ${error?.message}\`\n\n` +
      `\`\`\`\n${error?.stack || ''}\n\`\`\`\n`
    );
    window.open(`https://github.com/Aera0908/stick-diagram/issues/new?title=${title}&body=${body}`, '_blank', 'noopener,noreferrer');
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, copied, showDetails, resetConfirmed } = this.state;
      const errorName = error?.name || 'RuntimeError';
      const errorMessage = error?.message || 'An unexpected silicon core exception occurred.';

      return (
        <div className="error-page-container">
          <div className="error-page-grid-bg" />

          {/* Navigation Bar */}
          <header className="error-navbar">
            <div className="error-nav-left">
              <a href="/" className="error-brand-link">
                <Cpu size={16} />
                <span>StickOut</span>
              </a>
              <span className="error-status-badge danger">
                <span className="error-status-indicator" />
                ERR_500 // CORE_FAULT
              </span>
            </div>
            <div className="error-nav-links">
              <button onClick={this.handleReload} className="error-nav-btn">
                <RefreshCw size={13} />
                <span>Reload</span>
              </button>
              <button onClick={this.handleSafeHome} className="error-nav-btn">
                <Home size={13} />
                <span>Home</span>
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="error-main-content">
            {/* Telemetry Header Bar */}
            <div className="error-telemetry-bar">
              <div className="error-telemetry-left">
                <ShieldAlert size={14} style={{ color: 'var(--danger)' }} />
                <span>[INTERRUPT] HARDWARE_FAULT_HANDLER: TRIPPED</span>
              </div>
              <div className="error-telemetry-right">
                <span>ACTION: <strong>HALT_AND_CATCH_FIRE</strong></span>
                <span>SUBSTRATE: <strong>CAD_ENGINE_CRASH</strong></span>
                <span>STATE: <strong>FAILSAFE_ACTIVE</strong></span>
              </div>
            </div>

            {/* Hero Card */}
            <div className="error-hero-card danger">
              <div className="error-code-badge danger">
                500
                <small>Core Exception</small>
              </div>

              <div>
                <h1 className="error-title">Critical Circuit Fault: Application Panic</h1>
                <p className="error-description">
                  An unhandled exception occurred during canvas rendering or state computation.
                  The application halted execution to prevent corrupting your layout data.
                </p>
              </div>

              {/* Tripped Circuit Breaker SVG Diagram */}
              <div className="error-schematic-visual" aria-label="Schematic showing tripped circuit breaker">
                <svg 
                  className="error-schematic-svg" 
                  viewBox="0 0 640 100" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="cadGrid500" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  
                  <rect width="640" height="100" fill="url(#cadGrid500)" />

                  {/* VDD Power Rail */}
                  <line x1="20" y1="20" x2="620" y2="20" stroke="#EF4444" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="24" y="16" fill="#EF4444" fontFamily="var(--font-mono)" fontSize="9">VDD_FAULT (OVERCURRENT)</text>

                  {/* Power Source */}
                  <rect x="30" y="44" width="70" height="32" fill="#14161B" stroke="#EDEDF2" strokeWidth="1.5" />
                  <text x="65" y="64" fill="#EDEDF2" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" textAnchor="middle">CORE_PWR</text>

                  {/* Line to Breaker */}
                  <line x1="100" y1="60" x2="210" y2="60" stroke="#EDEDF2" strokeWidth="2.5" />
                  <circle cx="210" cy="60" r="4" fill="#EDEDF2" />

                  {/* Tripped / Open Switch (Circuit Breaker Tripped) */}
                  <line x1="210" y1="60" x2="275" y2="35" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="280" cy="60" r="4" fill="#EF4444" stroke="#EF4444" />
                  
                  {/* Warning arc / spark at switch */}
                  <path d="M 265 42 Q 280 48 275 58" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="2 2" />
                  <text x="245" y="28" fill="#EF4444" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700">BREAKER_TRIPPED</text>

                  {/* Line after open breaker (dead) */}
                  <line x1="284" y1="60" x2="440" y2="60" stroke="#575B66" strokeWidth="2" strokeDasharray="4 4" />

                  {/* Faulty CAD Core Node */}
                  <rect x="440" y="44" width="160" height="32" fill="#14161B" stroke="#EF4444" strokeWidth="1.5" />
                  <text x="520" y="64" fill="#EF4444" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" textAnchor="middle">ENGINE_HALTED (0V)</text>

                  {/* Ground reference */}
                  <line x1="20" y1="92" x2="620" y2="92" stroke="#383D4A" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="24" y="88" fill="#575B66" fontFamily="var(--font-mono)" fontSize="9">GND_PLANE</text>
                </svg>
              </div>

              {/* Error Message Box */}
              <div className="error-path-box" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                <div>
                  <span className="error-path-label">Fault Signature:</span>
                  <span className="error-path-value">{errorName}: {errorMessage}</span>
                </div>
                <button 
                  className={`error-copy-btn ${copied ? 'copied' : ''}`}
                  onClick={this.handleCopyReport}
                  title="Copy full crash diagnostics to clipboard"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Report Copied' : 'Copy Crash Report'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="error-actions-group">
                <button 
                  onClick={this.handleReload} 
                  className="error-btn-primary"
                >
                  <RefreshCw size={14} />
                  <span>Reload Application</span>
                </button>
                <button 
                  onClick={this.handleSafeHome} 
                  className="error-btn-secondary"
                >
                  <Home size={14} />
                  <span>Return to Homepage</span>
                </button>
                <button 
                  onClick={this.handleResetStorage} 
                  className="error-btn-danger"
                  title="Clears saved canvas elements that may be corrupted"
                >
                  <RotateCcw size={14} />
                  <span>{resetConfirmed ? 'Storage Cleared! Reloading...' : 'Reset CAD Storage & Restart'}</span>
                </button>
                <button 
                  onClick={this.handleReportIssue} 
                  className="error-btn-secondary"
                >
                  <ExternalLink size={14} />
                  <span>Report on GitHub</span>
                </button>
              </div>
            </div>

            {/* Technical Diagnostics Accordion */}
            <div className="error-diagnostics-box">
              <div className="error-diagnostics-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={14} />
                  <span>CRASH_DIAGNOSTICS & STACK_TRACE</span>
                </div>
                <button 
                  onClick={() => this.setState({ showDetails: !showDetails })}
                  style={{
                    background: 'none',
                    border: '1px solid var(--ui-border)',
                    color: 'var(--text-secondary)',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer'
                  }}
                >
                  {showDetails ? 'Hide Diagnostics' : 'Inspect Stack Trace'}
                </button>
              </div>

              {showDetails && (
                <div className="error-diagnostics-body">
                  <div style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 600 }}>
                    {error?.toString()}
                  </div>
                  <div>
                    {error?.stack || 'No JS stack trace captured.'}
                  </div>
                  {errorInfo?.componentStack && (
                    <div className="error-stack-component">
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                        COMPONENT STACK:
                      </div>
                      {errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>

          {/* Footer */}
          <footer className="error-footer">
            <div>
              <span>StickOut CAD Crash Handler · Auto-Diagnostic Safety Mode</span>
            </div>
            <div>
              <a href="https://github.com/Aera0908/stick-diagram" target="_blank" rel="noopener noreferrer">
                github.com/Aera0908/stick-diagram
              </a>
            </div>
          </footer>
        </div>
      );
    }

    return this.props.children;
  }
}
