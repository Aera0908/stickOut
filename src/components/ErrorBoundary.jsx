import React from 'react';
import { Cpu } from 'lucide-react';
import './ErrorPages.css';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      resetConfirmed: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('StickOut Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
    document.title = 'Application Error — StickOut';

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
      }, 600);
    } catch (e) {
      console.error('Failed to clear storage:', e);
      window.location.href = '/';
    }
  };

  handleCopyReport = () => {
    const { error, errorInfo } = this.state;
    const report = [
      'StickOut Crash Report',
      `URL: ${window.location.href}`,
      `Error: ${error?.name}: ${error?.message}`,
      '',
      'Stack:',
      error?.stack || 'No stack trace',
      '',
      'Component Stack:',
      errorInfo?.componentStack || 'No component stack'
    ].join('\n');

    navigator.clipboard?.writeText(report).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, copied, resetConfirmed } = this.state;
      const errorMessage = error?.message || 'An unexpected runtime error occurred.';

      return (
        <div className="error-page-container">
          <header className="error-navbar">
            <div className="error-nav-left">
              <a href="/" className="error-brand-link">
                <Cpu size={15} />
                <span>StickOut</span>
              </a>
              <span className="error-nav-badge">Error</span>
            </div>
            <div className="error-nav-links">
              <button onClick={this.handleReload} className="error-nav-btn">
                Reload Page
              </button>
            </div>
          </header>

          <main className="error-main-content">
            <div className="error-num">500</div>
            <h1 className="error-heading">Something went wrong</h1>
            <p className="error-paragraph">
              An unexpected error interrupted the application. You can reload the page, return to the homepage, or reset cached data if corrupted session state is causing repeated crashes.
            </p>

            <div className="error-diagnostics-box">
              <div className="error-diagnostics-msg">
                {error?.name || 'Error'}: {errorMessage}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button 
                  onClick={this.handleCopyReport}
                  style={{
                    background: 'var(--surface-hover)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer'
                  }}
                >
                  {copied ? 'Copied' : 'Copy error details'}
                </button>
              </div>
              {error?.stack && (
                <div className="error-diagnostics-stack">
                  {error.stack}
                  {errorInfo?.componentStack && `\n\nComponent trace:${errorInfo.componentStack}`}
                </div>
              )}
            </div>

            <div className="error-btn-group">
              <button onClick={this.handleReload} className="error-btn-primary">
                Reload Page
              </button>
              <button onClick={this.handleSafeHome} className="error-btn-secondary">
                Return to Homepage
              </button>
              <button 
                onClick={this.handleResetStorage} 
                className="error-btn-danger"
                title="Clears local storage in case saved canvas data is causing a crash"
              >
                {resetConfirmed ? 'Storage Cleared. Reloading...' : 'Clear Storage & Restart'}
              </button>
            </div>
          </main>

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

    return this.props.children;
  }
}
