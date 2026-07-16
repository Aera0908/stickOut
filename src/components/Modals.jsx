import { Cpu, Layers, Grid3X3, FileText, Bug, FolderOpen } from 'lucide-react';

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
  return (
    <>
      {/* ─── Template Modal ─── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><Cpu size={20} /><h2>{mode === 'floorplan' ? 'New Floor Plan' : 'New Stick Diagram'}</h2></div>
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
                  {mode === 'floorplan'
                    ? <><h3>Chip Boundary Starter</h3><p>Start with a chip boundary rectangle, ready for pins &amp; blocks.</p></>
                    : <><h3>Basic Stick Diagram Template</h3><p>Pre-loaded VDD/VSS rails, PMOS &amp; NMOS diffusion.</p></>}
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
          <div className="modal feedback-modal" onClick={e => e.stopPropagation()} style={{ width: '450px', maxWidth: '90vw' }}>
            <div className="modal-header"><Bug size={20} /><h2>Report Bug / Send Feedback</h2></div>
            {feedbackStatus === 'success' ? (
              <div className="modal-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ color: 'var(--success)', fontSize: '40px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '16px' }}>Thank You!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Your report has been sent successfully!</p>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!feedbackTitle.trim() || !feedbackDesc.trim()) return;
                setFeedbackStatus('sending');
                const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                fetch("https://formsubmit.co/ajax/c0c70ee7fc10829bb28cbc968004e253", {
                  method: "POST", headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                  body: JSON.stringify({ name: feedbackName.trim() || 'Anonymous', _subject: `[StickOut Bug/Feedback] ${feedbackTitle.trim()}`, date: today, message: feedbackDesc.trim() })
                }).then(res => { if (res.ok) { setFeedbackStatus('success'); setFeedbackName(''); setFeedbackTitle(''); setFeedbackDesc(''); setTimeout(() => { setShowFeedbackModal(false); setFeedbackStatus('idle'); }, 2500); } else setFeedbackStatus('error'); }).catch(() => setFeedbackStatus('error'));
              }} className="modal-body feedback-form">
                {feedbackStatus === 'error' && <div style={{ background: 'rgba(255, 69, 58, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', marginBottom: '12px', textAlign: 'center' }}>Failed to send report.</div>}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>Your Name (Optional)</label>
                  <input type="text" value={feedbackName} onChange={e => setFeedbackName(e.target.value)} placeholder="e.g. John Doe" disabled={feedbackStatus === 'sending'} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--ui-border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" value={feedbackTitle} onChange={e => setFeedbackTitle(e.target.value)} placeholder="Short summary" required disabled={feedbackStatus === 'sending'} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--ui-border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea value={feedbackDesc} onChange={e => setFeedbackDesc(e.target.value)} placeholder="Describe the issue..." rows="4" required disabled={feedbackStatus === 'sending'} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--ui-border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="export-action-btn secondary" onClick={() => setShowFeedbackModal(false)} disabled={feedbackStatus === 'sending'}>Cancel</button>
                  <button type="submit" className="export-action-btn primary" disabled={feedbackStatus === 'sending' || !feedbackTitle.trim() || !feedbackDesc.trim()}>{feedbackStatus === 'sending' ? 'Sending...' : 'Send Report'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
