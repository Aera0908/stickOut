import { useState, useMemo } from 'react';
import { FunctionSquare } from 'lucide-react';
import { analyzeExpression } from '../boolean/generate.js';

export default function BooleanModal({ show, onClose, onInsert }) {
  const [exprText, setExprText] = useState('');

  const analysis = useMemo(() => {
    const trimmed = exprText.trim();
    if (!trimmed) return null;
    return analyzeExpression(trimmed);
  }, [exprText]);

  if (!show) return null;

  const canGenerate = analysis && analysis.ok;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '460px', maxWidth: '90vw' }}>
        <div className="modal-header"><FunctionSquare size={20} /><h2>Generate from Boolean Expression</h2></div>
        <form
          className="modal-body"
          onSubmit={(e) => { e.preventDefault(); if (canGenerate) onInsert(analysis); }}
        >
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Boolean Expression
            </label>
            <input
              type="text"
              value={exprText}
              onChange={e => setExprText(e.target.value)}
              placeholder="e.g.  Y = (A.B + C)'"
              autoFocus
              spellCheck={false}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--ui-border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: '"Roboto Mono", monospace', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
            Single-letter inputs (A, B, S0…). AND: <code>.</code> <code>&amp;</code> or adjacency (<code>AB</code>) · OR: <code>+</code> <code>|</code> · NOT: <code>A'</code> or <code>!A</code> · optional <code>Y = …</code> names the output.
          </div>

          <div style={{ minHeight: '72px', padding: '10px 12px', borderRadius: '4px', border: '1px solid var(--ui-border)', background: 'var(--surface)', fontSize: '12px', lineHeight: 1.7 }}>
            {!analysis && <span style={{ color: 'var(--text-secondary)' }}>The expression is minimized, then synthesized as a single static CMOS complex gate (editable after insertion).</span>}
            {analysis && !analysis.ok && <span style={{ color: 'var(--danger)' }}>{analysis.error}</span>}
            {analysis && analysis.ok && (
              <>
                <div style={{ color: 'var(--text-primary)', fontFamily: '"Roboto Mono", monospace' }}>
                  Minimized: <strong>{analysis.minimizedString}</strong>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {analysis.transistorCount} transistors ({analysis.transistorCount / 2} PMOS + {analysis.transistorCount / 2} NMOS) · pull-down: {analysis.pdnString}
                </div>
                {analysis.negatedInputs.length > 0 && (
                  <div style={{ color: 'var(--warning, #F9A825)' }}>
                    Uses complemented input{analysis.negatedInputs.length > 1 ? 's' : ''} {analysis.negatedInputs.map(v => `${v}'`).join(', ')} — assumed available externally.
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="export-action-btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="export-action-btn primary" disabled={!canGenerate}>Generate &amp; Insert</button>
          </div>
        </form>
      </div>
    </div>
  );
}
