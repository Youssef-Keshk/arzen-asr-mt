import React, { useState, useCallback } from 'react';
import './App.css';
import InputPanel from './components/InputPanel';
import ResultsPanel from './components/ResultsPanel';
import Header from './components/Header';

/*
  State shape:
  {
    mode:        'idle' | 'uploading' | 'recording' | 'processing' | 'done',
    audioUrl:    string | null,    — object URL for the <audio> player
    words:       Array<{word, confidence}>,
    translation: string,
    error:       string | null,
  }
*/

export default function App() {
  const [state, setState] = useState({
    mode: 'idle',
    audioUrl: null,
    words: [],
    translation: '',
    error: null,
  });

  // ── helpers ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    // Revoke any blob URL to free memory
    if (state.audioUrl?.startsWith('blob:')) URL.revokeObjectURL(state.audioUrl);
    setState({ mode: 'idle', audioUrl: null, words: [], translation: '', error: null });
  }, [state.audioUrl]);

  const patchState = useCallback((patch) => setState(prev => ({ ...prev, ...patch })), []);

  // ── file-upload flow ─────────────────────────────────────────────────

  const handleFileUpload = useCallback(async (file) => {
    const audioUrl = URL.createObjectURL(file);
    patchState({ mode: 'processing', audioUrl, words: [], translation: '', error: null });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/transcribe', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      patchState({ mode: 'done', words: data.words, translation: data.translation });
    } catch (err) {
      patchState({ mode: 'idle', error: err.message });
    }
  }, [patchState]);

  // ── microphone / streaming flow ──────────────────────────────────────

  /**
   * Called by RecordButton with the accumulated word list and translation
   * after the WebSocket session ends. See RecordButton.jsx for the full
   * WebSocket + MediaRecorder implementation.
   */
  const handleStreamDone = useCallback(({ audioUrl, words, translation }) => {
    patchState({ mode: 'done', audioUrl, words, translation });
  }, [patchState]);

  const handleStreamWord = useCallback((newWords) => {
    setState(prev => ({ ...prev, mode: 'recording', words: [...prev.words, ...newWords] }));
  }, []);

  const handleRecordStart = useCallback((audioUrl) => {
    patchState({ mode: 'recording', audioUrl, words: [], translation: '', error: null });
  }, [patchState]);

  // ── render ───────────────────────────────────────────────────────────

  return (
    <div className="app">
      <Header />

      <main className="main">
        <InputPanel
          mode={state.mode}
          onFileUpload={handleFileUpload}
          onRecordStart={handleRecordStart}
          onStreamWord={handleStreamWord}
          onStreamDone={handleStreamDone}
          onReset={reset}
        />

        {(state.words.length > 0 || state.mode === 'processing') && (
          <ResultsPanel
            mode={state.mode}
            audioUrl={state.audioUrl}
            words={state.words}
            translation={state.translation}
          />
        )}

        {state.error && (
          <div className="error-banner" role="alert">
            ⚠ {state.error}
          </div>
        )}
      </main>
    </div>
  );
}
