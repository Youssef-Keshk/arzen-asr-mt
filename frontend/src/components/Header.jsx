import React from 'react';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <span className="logo-mark">◈</span>
          <span className="logo-text">VoiceBridge</span>
        </div>
        <div className="header-meta">
          <span className="tag">ASR</span>
          <span className="tag">MT</span>
          <span className="tag">Streaming</span>
        </div>
      </div>
    </header>
  );
}
