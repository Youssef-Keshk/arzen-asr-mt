import React from 'react';
import './TranslationPanel.css';

/**
 * TranslationPanel
 *
 * Displays the MT (Machine Translation) output in English.
 * Shows a loading skeleton while ASR is still streaming,
 * then renders the final translation once available.
 *
 * Props:
 *   translation — string
 *   isLoading   — boolean
 */
export default function TranslationPanel({ translation, isLoading }) {
  return (
    <div className="panel translation-panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-dot panel-dot--mt" />
          MT Translation
        </span>
        <span className="panel-lang">English</span>
      </div>

      <div className="panel-body" dir="ltr" lang="en">
        {isLoading && !translation && (
          <div className="panel-placeholder">
            <span className="skeleton-line" style={{ width: '90%' }} />
            <span className="skeleton-line" style={{ width: '75%' }} />
            <span className="skeleton-line" style={{ width: '55%' }} />
          </div>
        )}

        {translation && (
          <p className="translation-text">{translation}</p>
        )}

        {!isLoading && !translation && (
          <p className="panel-empty">Translation will appear here.</p>
        )}
      </div>
    </div>
  );
}
