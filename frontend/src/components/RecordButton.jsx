import React, { useRef, useState, useCallback } from 'react';
import './RecordButton.css';

// WebSocket server address — adjust if backend runs on a different host/port
const WS_URL = 'ws://localhost:8000/ws/stream';

// How often (ms) MediaRecorder fires a 'dataavailable' event with a chunk.
const CHUNK_INTERVAL_MS = 500;

/**
 * RecordButton
 *
 * Stop-recording fix:
 *   The old approach called socket.close() immediately on stop, which put the
 *   socket into CLOSING state before the backend's translation+done messages
 *   could arrive — so they were silently dropped.
 *
 *   New approach:
 *     1. Stop the MediaRecorder (flushes the final audio chunk).
 *     2. Send a text message { type: "stop" } to the backend instead of
 *        closing the socket.
 *     3. The backend sends translation then done, THEN closes from its side.
 *     4. The client only calls socket.close() after receiving "done", when
 *        all data has already been delivered.
 */
export default function RecordButton({ mode, onRecordStart, onStreamWord, onStreamDone }) {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const socketRef        = useRef(null);
  const chunksRef        = useRef([]);
  const wordsRef         = useRef([]);
  const translationRef   = useRef('');

  // ── Start recording ─────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      alert(`Microphone access denied: ${err.message}`);
      return;
    }

    // Open WebSocket BEFORE starting MediaRecorder so we don't lose early chunks
    const socket = new WebSocket(WS_URL);
    socket.binaryType = 'arraybuffer';

    socketRef.current   = socket;
    chunksRef.current   = [];
    wordsRef.current    = [];
    translationRef.current = '';

    // ── Handle messages from the backend ──────────────────────────────
    socket.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        console.warn('Non-JSON WS message:', event.data);
        return;
      }

      if (msg.type === 'words') {
        // Incremental transcript words — append and notify parent immediately
        wordsRef.current = [...wordsRef.current, ...msg.data];
        onStreamWord(msg.data);

      } else if (msg.type === 'translation') {
        // MT result — store it; we'll surface it together with 'done'
        translationRef.current = msg.data;

      } else if (msg.type === 'done') {
        // All data received — now safe to close the socket and update UI
        socket.close();

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioUrl  = URL.createObjectURL(audioBlob);

        onStreamDone({
          audioUrl,
          words:       wordsRef.current,
          translation: translationRef.current,
        });
      }
    };

    socket.onerror = (err) => console.error('WebSocket error:', err);

    // ── MediaRecorder setup ───────────────────────────────────────────
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    // Each chunk: save locally for playback + stream to backend
    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      chunksRef.current.push(event.data);

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(event.data);
      }
    };

    // After MediaRecorder fully stops and the final chunk is flushed,
    // send the "stop" signal so the backend knows to run MT and reply.
    recorder.onstop = () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'stop' }));
      }
    };

    recorder.start(CHUNK_INTERVAL_MS);
    setIsRecording(true);
    onRecordStart(null);
  }, [onRecordStart, onStreamWord, onStreamDone]);

  // ── Stop recording ───────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    // Stop mic tracks (turns off browser mic indicator)
    recorder.stream?.getTracks().forEach(track => track.stop());

    // Stop the recorder — fires ondataavailable one last time, then onstop.
    // onstop sends { type: "stop" } to the backend (see above).
    // We do NOT close the socket here — we wait for the "done" message first.
    recorder.stop();

    setIsRecording(false);
  }, []);

  const isDisabled = mode === 'processing' || mode === 'uploading';

  return (
    <div className="record-wrapper">
      <button
        className={`record-btn ${isRecording ? 'record-btn--active' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isDisabled}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        title={isDisabled ? 'Finish current task first' : undefined}
      >
        <span className="record-ring" aria-hidden="true" />
        <span className="record-icon" aria-hidden="true">
          {isRecording ? '◼' : '🎙'}
        </span>
      </button>
      <span className="record-label">
        {isRecording
          ? 'Recording… click to stop'
          : 'Record with microphone'}
      </span>
    </div>
  );
}
