'use client';

import { useState } from 'react';
import { Channel } from '@/lib/channels';
import { format } from 'date-fns';
import { useRecording } from '@/context/RecordingContext';
import Link from 'next/link';

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const RecordIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
  </svg>
);

const BackgroundIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

interface RecordingModalProps {
  channel: Channel;
  onClose: () => void;
}

export function RecordingModal({ channel, onClose }: RecordingModalProps) {
  const { startRecording, activeRecording } = useRecording();
  const [duration, setDuration] = useState(60);
  const [quality, setQuality] = useState<'720p' | '1080p'>('720p');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startRecording(channel, duration, quality);
      setStarted(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Failed to start recording:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (mins: number) => {
    if (mins === 0) return 'Until stopped';
    if (mins < 60) return `${mins} minutes`;
    return `${mins / 60} hour${mins > 60 ? 's' : ''}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            <RecordIcon />
            Record {channel.name}
          </h2>
          <button onClick={onClose} className="close-btn">
            <XIcon />
          </button>
        </div>

        {started ? (
          <div className="success-state">
            <div className="success-icon">
              <BackgroundIcon />
            </div>
            <h3>Recording Started!</h3>
            <p>You can close this and watch other channels.</p>
            <p className="hint">Recording will continue in the background.</p>
          </div>
        ) : (
          <div className="modal-body">
            <div className="channel-preview">
              <img src={channel.logo} alt={channel.name} />
              <div>
                <h3>{channel.name}</h3>
                <span className="channel-group">{channel.group}</span>
              </div>
            </div>

            <div className="settings">
              <div className="setting-row">
                <label>Quality</label>
                <select value={quality} onChange={(e) => setQuality(e.target.value as '720p' | '1080p')}>
                  <option value="720p">720p (Recommended)</option>
                  <option value="1080p">1080p (Higher quality)</option>
                </select>
              </div>

              <div className="setting-row">
                <label>Duration</label>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  <option value={10}>10 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={0}>Until I stop it</option>
                </select>
              </div>
            </div>

            <div className="info-box">
              <BackgroundIcon />
              <p>
                Recording happens in the background. You can close this modal and watch other channels.
                A status indicator will appear at the bottom right.
              </p>
            </div>

            {activeRecording && (
              <div className="warning-box">
                <p>
                  <strong>Note:</strong> You already have an active recording. 
                  Starting a new one may affect performance.
                </p>
              </div>
            )}

            <button 
              onClick={handleStart} 
              disabled={loading}
              className="start-btn"
            >
              {loading ? 'Starting...' : (
                <>
                  <RecordIcon />
                  Start Recording ({formatDuration(duration)})
                </>
              )}
            </button>
            <Link href="/downloads" className="downloads-link">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
  My Recordings
</Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 1rem;
        }

        .modal-content {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          width: 100%;
          max-width: 420px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 1.125rem;
          color: #fff;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          color: #fff;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .channel-preview {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .channel-preview img {
          width: 48px;
          height: 48px;
          object-fit: contain;
          border-radius: 8px;
          background: #000;
        }

        .channel-preview h3 {
          margin: 0 0 0.25rem 0;
          color: #fff;
          font-size: 1rem;
        }

        .channel-group {
          color: #888;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .settings {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .setting-row label {
          color: #888;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .setting-row select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          min-width: 140px;
        }

        .info-box {
          background: rgba(0, 217, 255, 0.1);
          border: 1px solid rgba(0, 217, 255, 0.2);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .info-box p {
          margin: 0;
          color: #00d9ff;
          font-size: 0.8125rem;
          line-height: 1.5;
        }

        .warning-box {
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.2);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
        }

        .warning-box p {
          margin: 0;
          color: #ffc107;
          font-size: 0.8125rem;
        }

        .start-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #ff2e63 0%, #e94560 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .start-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -5px rgba(233, 69, 96, 0.4);
        }

        .start-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .success-state {
          text-align: center;
          padding: 3rem 1.5rem;
        }

        .success-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          color: #fff;
        }

        .success-state h3 {
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .success-state p {
          color: #888;
          margin: 0;
        }

        .hint {
          color: #00d9ff !important;
          font-size: 0.875rem;
          margin-top: 0.5rem !important;
        }
      `}</style>
    </div>
  );
}