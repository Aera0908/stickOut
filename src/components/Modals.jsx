import { useState } from 'react';
import { Cpu, Layers, Grid3X3, FileText, Bug, FolderOpen, Mail, ExternalLink, Copy, Check } from 'lucide-react';

const BUG_REPORT_EMAIL = 'stickout.bug@gmail.com';
const GITHUB_REPO_URL = 'https://github.com/Aera0908/stickOut';

export default function Modals({
  // Template Modal
  mode = 'stick',
  showModal,
  hasAutosave,
  resumeAutosave,
  startBlank,
  startTemplate,
  handleLoadProject,

  // Export Modal
  showExportModal,
  setShowExportModal,
  previewCanvasRef,
  exportBgType,
  setExportBgType,
  exportTextColor,
  setExportTextColor,
  exportMargin,
  setExportMargin,
  handleDownloadPNG,

  // Feedback Modal
  showFeedbackModal,
  setShowFeedbackModal,
  feedbackName,
  setFeedbackName,
  feedbackTitle,
  setFeedbackTitle,
  feedbackDesc,
  setFeedbackDesc,
  feedbackStatus,
  setFeedbackStatus
}) {
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);

  const getSubject = () => {
    return `[StickOut Bug/Feedback] ${feedbackTitle.trim() || 'Report'}`;
  };

  const getFormattedBody = () => {
    const lines = [];
    lines.push(`Reporter: ${feedbackName.trim() || 'Anonymous'}`);
    lines.push(`Date: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('Issue Description:');
    lines.push(feedbackDesc.trim());

    if (includeDiagnostics) {
      lines.push('');
      lines.push('----------------------------------------');
      lines.push('Environment & Diagnostics:');
      lines.push(`- Workspace Mode: ${mode.toUpperCase()}`);
      lines.push(`- URL: ${window.location.href}`);
      lines.push(`- Browser: ${navigator.userAgent}`);
      lines.push(`- Viewport: ${window.innerWidth} x ${window.innerHeight}`);
      lines.push('----------------------------------------');
    }

    return lines.join('\n');
  };

  const handleOpenGmail = () => {
    const subject = encodeURIComponent(getSubject());
    const body = encodeURIComponent(getFormattedBody());
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${BUG_REPORT_EMAIL}&su=${subject}&body=${body}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleMailtoFallback = () => {
    const subject = encodeURIComponent(getSubject());
    const body = encodeURIComponent(getFormattedBody());
    window.open(`mailto:${BUG_REPORT_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleOpenGitHub = () => {
    const title = encodeURIComponent(getSubject());
    const body = encodeURIComponent(getFormattedBody());
    window.open(`${GITHUB_REPO_URL}/issues/new?title=${title}&body=${body}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyReport = async () => {
    const fullText = `To: ${BUG_REPORT_EMAIL}\nSubject: ${getSubject()}\n\n${getFormattedBody()}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2200);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2200);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(BUG_REPORT_EMAIL);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackTitle.trim() || !feedbackDesc.trim()) return;
    setFeedbackStatus('sending');
    setFeedbackErrorMsg('');

    // Strict 6-second timeout so button never hangs or gets stuck indefinitely
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 6000);

    const payload = {
      name: feedbackName.trim() || 'Anonymous',
      _subject: getSubject(),
      _captcha: 'false',
      _template: 'table',
      date: new Date().toLocaleString(),
      message: getFormattedBody()
    };

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${BUG_REPORT_EMAIL}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutTimer);

      let data = null;
      try {
        data = await res.json();
      } catch {
        /* non-json response */
      }

      if (res.ok && data && (data.success === 'true' || data.success === true)) {
        setFeedbackStatus('success');
        setFeedbackName('');
        setFeedbackTitle('');
        setFeedbackDesc('');
        setFeedbackErrorMsg('');
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackStatus('idle');
        }, 2200);
      } else {
        const serverMsg = data?.message || 'Online relay is unavailable (server issue).';
        setFeedbackErrorMsg(serverMsg);
        setFeedbackStatus('error');
      }
    } catch (err) {
      clearTimeout(timeoutTimer);
      const isTimeout = err?.name === 'AbortError';
      setFeedbackErrorMsg(
        isTimeout
          ? 'Submission timed out. Please send directly using Gmail or Mail App below.'
          : 'Network or server error. Please send directly using Gmail or Mail App below.'
      );
      setFeedbackStatus('error');
    }
  };

  return (
    <>
      {/* ─── Template Modal ─── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><Cpu size={20} /><h2>{mode === 'floorplan' ? 'New Floor Plan' : (mode === 'cmos' ? 'New CMOS Diagram' : 'New Stick Diagram')}</h2></div>
            <div className="modal-body">
              {hasAutosave && (
                <div className="template-option" onClick={resumeAutosave} style={{ borderColor: 'var(--accent)' }}>
                  <div className="tpl-icon" style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}><Layers size={20} /></div>
                  <div className="tpl-info"><h3>Resume Previous Session</h3><p>Your last session was auto-saved.</p></div>
                </div>
              )}
              <div className="template-option" onClick={startBlank}>
                <div className="tpl-icon"><Grid3X3 size={20} /></div>
                <div className="tpl-info"><h3>Blank Canvas</h3><p>Start with an empty canvas.</p></div>
              </div>
              <div className="template-option" onClick={startTemplate}>
                <div className="tpl-icon"><FileText size={20} /></div>
                <div className="tpl-info">
                  {mode === 'floorplan' && <><h3>Chip Boundary Starter</h3><p>Start with a chip boundary rectangle, ready for pins &amp; blocks.</p></>}
                  {mode === 'cmos' && <><h3>CMOS Inverter Template</h3><p>Pre-wired PMOS &amp; NMOS between VDD and VSS, with connection dots.</p></>}
                  {mode !== 'floorplan' && mode !== 'cmos' && <><h3>Basic Stick Diagram Template</h3><p>Pre-loaded VDD/VSS rails, PMOS &amp; NMOS diffusion.</p></>}
                </div>
              </div>
              <div className="template-option" onClick={() => { handleLoadProject(); }}>
                <div className="tpl-icon"><FolderOpen size={20} /></div>
                <div className="tpl-info"><h3>Open Project</h3><p>Load an existing .stk or .json project file.</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Export Modal ─── */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal export-modal" onClick={e => e.stopPropagation()} style={{ width: '600px', maxWidth: '95vw' }}>
            <div className="modal-header"><Cpu size={20} /><h2>Export PNG</h2></div>
            <div className="modal-body export-layout">
              <div className="export-preview-container">
                <div className="export-preview-title">Preview</div>
                <div className="export-preview-box"><canvas ref={previewCanvasRef} /></div>
              </div>
              <div className="export-options-container">
                <div className="export-option-group">
                  <span className="export-label">Background</span>
                  <div className="export-btn-group">
                    {['transparent', 'white', 'dark'].map(t => (
                      <button key={t} className={`export-btn ${exportBgType === t ? 'active' : ''}`} onClick={() => setExportBgType(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                    ))}
                  </div>
                </div>
                <div className="export-option-group">
                  <span className="export-label">Label Text Style</span>
                  <div className="export-btn-group vertical">
                    <button className={`export-btn ${exportTextColor === 'dark' ? 'active' : ''}`} onClick={() => setExportTextColor('dark')}>Dark Text</button>
                    <button className={`export-btn ${exportTextColor === 'light' ? 'active' : ''}`} onClick={() => setExportTextColor('light')}>Light Text</button>
                    <button className={`export-btn ${exportTextColor === 'pill' ? 'active' : ''}`} onClick={() => setExportTextColor('pill')}>Pill Background</button>
                  </div>
                </div>
                <div className="export-option-group">
                  <span className="export-label">Margin Size</span>
                  <div className="export-btn-group">
                    {[4, 3, 0].map(m => <button key={m} className={`export-btn ${exportMargin === m ? 'active' : ''}`} onClick={() => setExportMargin(m)}>{m === 0 ? 'None' : `${m} Grids`}</button>)}
                  </div>
                </div>
                <div className="export-actions">
                  <button className="export-action-btn primary" onClick={handleDownloadPNG}>Download PNG</button>
                  <button className="export-action-btn secondary" onClick={() => setShowExportModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Feedback Modal ─── */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => feedbackStatus !== 'sending' && setShowFeedbackModal(false)}>
          <div className="modal feedback-modal" onClick={e => e.stopPropagation()} style={{ width: '480px', maxWidth: '92vw' }}>
            <div className="modal-header">
              <Bug size={18} />
              <h2>Report Bug / Send Feedback</h2>
            </div>

            {feedbackStatus === 'success' ? (
              <div className="modal-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ color: 'var(--success)', fontSize: '40px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '15px', fontFamily: 'var(--font-sans)' }}>Thank You!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5 }}>
                  Your report has been sent to <strong>{BUG_REPORT_EMAIL}</strong>. We appreciate your feedback!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="modal-body feedback-form">
                {/* Target email address bar */}
                <div className="feedback-target-bar">
                  <div className="feedback-target-info">
                    <span className="feedback-target-label">Send to:</span>
                    <span className="feedback-target-address">{BUG_REPORT_EMAIL}</span>
                  </div>
                  <button
                    type="button"
                    className="feedback-copy-btn"
                    onClick={handleCopyEmail}
                    title="Copy email address"
                  >
                    {copiedEmail ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                    <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Error Banner with 1-click fallbacks if online relay is down */}
                {feedbackStatus === 'error' && (
                  <div className="feedback-error-banner">
                    <div className="feedback-error-title">Online Relay Unreachable</div>
                    <div className="feedback-error-desc">
                      {feedbackErrorMsg || 'The online submission server is temporarily unavailable.'} You can instantly send your report to <strong>{BUG_REPORT_EMAIL}</strong>:
                    </div>
                    <div className="feedback-error-actions">
                      <button
                        type="button"
                        onClick={handleOpenGmail}
                        className="feedback-relay-btn primary"
                        disabled={!feedbackTitle.trim() || !feedbackDesc.trim()}
                      >
                        <Mail size={13} /> Open Gmail Web
                      </button>
                      <button
                        type="button"
                        onClick={handleMailtoFallback}
                        className="feedback-relay-btn secondary"
                        disabled={!feedbackTitle.trim() || !feedbackDesc.trim()}
                      >
                        <ExternalLink size={13} /> Default Mail App
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyReport}
                        className="feedback-relay-btn secondary"
                        disabled={!feedbackTitle.trim() || !feedbackDesc.trim()}
                      >
                        {copiedReport ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                        <span>{copiedReport ? 'Report Copied!' : 'Copy Report'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Your Name / Contact (Optional)
                  </label>
                  <input
                    type="text"
                    value={feedbackName}
                    onChange={e => setFeedbackName(e.target.value)}
                    placeholder="e.g. your-name or email"
                    disabled={feedbackStatus === 'sending'}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '2px', border: '1px solid var(--ui-border)', background: '#0A0B0E', color: 'var(--text-primary)', fontSize: '12px' }}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Title / Bug Summary <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={feedbackTitle}
                    onChange={e => setFeedbackTitle(e.target.value)}
                    placeholder="Short summary of what went wrong"
                    required
                    disabled={feedbackStatus === 'sending'}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '2px', border: '1px solid var(--ui-border)', background: '#0A0B0E', color: 'var(--text-primary)', fontSize: '12px' }}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Description & Steps to Reproduce <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    value={feedbackDesc}
                    onChange={e => setFeedbackDesc(e.target.value)}
                    placeholder="Describe what happened, expected behavior, or suggestions..."
                    rows="4"
                    required
                    disabled={feedbackStatus === 'sending'}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '2px', border: '1px solid var(--ui-border)', background: '#0A0B0E', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '8px', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={e => setIncludeDiagnostics(e.target.checked)}
                    disabled={feedbackStatus === 'sending'}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>Attach environment diagnostics (Mode: {mode.toUpperCase()}, Browser, Screen)</span>
                </label>

                {/* Footer with direct 1-click mail and submit actions */}
                <div className="feedback-footer">
                  <div className="feedback-quick-actions">
                    <span className="feedback-quick-label">Direct:</span>
                    <button
                      type="button"
                      className="feedback-chip-btn"
                      onClick={handleOpenGmail}
                      disabled={feedbackStatus === 'sending' || !feedbackTitle.trim() || !feedbackDesc.trim()}
                      title="Open draft directly in Gmail Web"
                    >
                      <Mail size={12} /> Gmail
                    </button>
                    <button
                      type="button"
                      className="feedback-chip-btn"
                      onClick={handleMailtoFallback}
                      disabled={feedbackStatus === 'sending' || !feedbackTitle.trim() || !feedbackDesc.trim()}
                      title="Open in your default mail application"
                    >
                      <ExternalLink size={12} /> Mail App
                    </button>
                    <button
                      type="button"
                      className="feedback-chip-btn"
                      onClick={handleCopyReport}
                      disabled={feedbackStatus === 'sending' || !feedbackTitle.trim() || !feedbackDesc.trim()}
                      title="Copy pre-formatted report text to clipboard"
                    >
                      {copiedReport ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                      <span>{copiedReport ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="feedback-modal-actions">
                    <button
                      type="button"
                      className="export-action-btn secondary"
                      onClick={() => setShowFeedbackModal(false)}
                      disabled={feedbackStatus === 'sending'}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="export-action-btn primary"
                      disabled={feedbackStatus === 'sending' || !feedbackTitle.trim() || !feedbackDesc.trim()}
                    >
                      {feedbackStatus === 'sending' ? 'Sending...' : 'Send Online'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
