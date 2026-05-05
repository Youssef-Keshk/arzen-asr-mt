import React from 'react';
import './TranscriptPanel.css';

const CONFIDENCE_THRESHOLD = 0.6;

export default function TranscriptPanel({ words, isLoading }) {
  return (
    <div className="panel transcript-panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-dot panel-dot--asr" />
          ASR Transcript
        </span>
        <span className="panel-lang">Egyptian Arabic</span>
      </div>

      <div className="panel-body" dir="rtl" lang="ar">
        {isLoading && words.length === 0 && (
          <div className="panel-placeholder">
            <span className="skeleton-line" style={{ width: '80%' }} />
            <span className="skeleton-line" style={{ width: '60%' }} />
            <span className="skeleton-line" style={{ width: '70%' }} />
          </div>
        )}

        {words.length > 0 && (
          <p className="word-stream">
            {words.map((item, i) => {
              const isLowConf = item.confidence < CONFIDENCE_THRESHOLD;
              const isLast    = i === words.length - 1;
              return (
                /*
                  Arabic shaping fix:
                  The browser's text shaping engine determines letter forms
                  (initial / medial / final / isolated) based on what surrounds
                  a character WITHIN the same text node. A <span> boundary
                  creates a new inline formatting context, which breaks the
                  shaping context — the engine sees the last letter of a word
                  as "isolated" instead of "final" because the trailing space
                  sits outside the span.

                  Fix: include the trailing space INSIDE the span so the
                  shaping engine sees: [word chars + space] as one text run.
                  The space after the last word is omitted so we don't add
                  an extra gap at the end.
                */
                <span
                  key={i}
                  className={`word ${isLowConf ? 'word--low' : ''}`}
                  title={`Confidence: ${(item.confidence * 100).toFixed(0)}%`}
                  aria-label={`${item.word} (confidence ${(item.confidence * 100).toFixed(0)}%)`}
                >
                  {item.word}{isLast ? '' : ' '}
                </span>
              );
            })}
          </p>
        )}

        {!isLoading && words.length === 0 && (
          <p className="panel-empty">Transcript will appear here.</p>
        )}
      </div>

      {words.length > 0 && (
        <div className="confidence-legend">
          <span className="legend-swatch legend-swatch--low" />
          <span>Below {CONFIDENCE_THRESHOLD * 100}% confidence</span>
        </div>
      )}
    </div>
  );
}
