import React, { useRef } from 'react';
import './InputPanel.css';
import RecordButton from './RecordButton';

/**
 * InputPanel
 * Renders two input paths:
 *   1. Drag-and-drop / click file upload  →  calls onFileUpload(File)
 *   2. Mic record button                  →  delegates to <RecordButton>
 */
export default function InputPanel({
  mode,
  onFileUpload,
  onRecordStart,
  onStreamWord,
  onStreamDone,
  onReset,
}) {
  const fileInputRef = useRef(null);
  const isActive = mode === 'processing' || mode === 'recording';

  // ── file drop / select ──────────────────────────────────────────────

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
    // Reset input value so the same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFileUpload(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  // ── render ───────────────────────────────────────────────────────────

  return (
    <section className="input-panel">
      <div className="input-panel-title">
        <span>Input Source</span>
        {mode !== 'idle' && (
          <button className="reset-btn" onClick={onReset} aria-label="Reset">
            ↺ Reset
          </button>
        )}
      </div>

      <div className="input-row">
        {/* ── Upload zone ── */}
        <div
          className={`upload-zone ${isActive ? 'upload-zone--disabled' : ''}`}
          onClick={() => !isActive && fileInputRef.current?.click()}
          onDrop={!isActive ? handleDrop : undefined}
          onDragOver={handleDragOver}
          role="button"
          tabIndex={isActive ? -1 : 0}
          aria-disabled={isActive}
          onKeyDown={(e) => e.key === 'Enter' && !isActive && fileInputRef.current?.click()}
        >
          <span className="upload-icon">⬆</span>
          <span className="upload-label">Upload audio file</span>
          <span className="upload-hint">MP3, WAV, M4A, OGG · drag &amp; drop or click</span>
          {mode === 'processing' && (
            <span className="upload-status">Processing…</span>
          )}
        </div>

        <div className="input-divider">
          <span>or</span>
        </div>

        {/* ── Microphone record ── */}
        <div className="record-zone">
          <RecordButton
            mode={mode}
            onRecordStart={onRecordStart}
            onStreamWord={onStreamWord}
            onStreamDone={onStreamDone}
          />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="sr-only"
        onChange={pickFile}
        aria-label="Upload audio file"
      />
    </section>
  );
}
