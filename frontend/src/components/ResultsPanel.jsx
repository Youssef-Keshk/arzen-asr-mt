import React, { useCallback } from 'react';
import './ResultsPanel.css';
import TranscriptPanel from './TranscriptPanel';
import TranslationPanel from './TranslationPanel';

/**
 * ResultsPanel
 *
 * Renders:
 *  • HTML5 <audio> player for the captured/uploaded audio
 *  • Side-by-side ASR transcript (with confidence highlighting) and MT output
 *  • Export button that downloads transcript.txt and translation.txt simultaneously
 */
export default function ResultsPanel({ mode, audioUrl, words, translation }) {
  const isLoading = mode === 'processing';

  // ── Export ──────────────────────────────────────────────────────────

  /**
   * Trigger two simultaneous browser downloads:
   *   transcript.txt  — plain Arabic text (all words joined)
   *   translation.txt — English MT output
   */
  const handleExport = useCallback(() => {
    const transcriptText = words.map(w => w.word).join(' ');

    const downloads = [
      { filename: 'transcript.txt',  content: transcriptText },
      { filename: 'translation.txt', content: translation    },
    ];

    downloads.forEach(({ filename, content }) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      // Append, click, remove — required for Firefox
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }, [words, translation]);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <section className="results-panel">

      {/* ── Audio player ── */}
      <div className="audio-row">
        <span className="section-label">▶ Playback</span>
        {audioUrl ? (
          <audio
            className="audio-player"
            src={audioUrl}
            controls
            aria-label="Recorded or uploaded audio"
          />
        ) : (
          <div className="audio-placeholder">Audio will appear here</div>
        )}
      </div>

      {/* ── Results grid ── */}
      <div className="panels-grid">
        <TranscriptPanel  words={words}       isLoading={isLoading} />
        <TranslationPanel translation={translation} isLoading={isLoading} />
      </div>

      {/* ── Export button ── */}
      {mode === 'done' && words.length > 0 && (
        <div className="export-row">
          <button className="export-btn" onClick={handleExport}>
            <span>⬇</span> Export Results
            <span className="export-hint">transcript.txt + translation.txt</span>
          </button>
        </div>
      )}
    </section>
  );
}
