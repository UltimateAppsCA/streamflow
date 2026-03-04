'use client';

import { useRecording } from '@/context/RecordingContext';
import { format } from 'date-fns';

export function RecordingStatus() {
  const { recordings, activeRecording, stopRecording, downloadRecording, deleteRecording } = useRecording();

  const activeRecordings = recordings.filter(r => r.isRecording);

  if (activeRecordings.length === 0 && recordings.filter(r => r.blob).length === 0) return null;

  return (
    <div className="recording-status-container">
      {activeRecordings.map(rec => {
        const elapsed = Math.floor((Date.now() - rec.startTime.getTime()) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        
        return (
          <div key={rec.id} className="recording-status-bar active">
            <div className="recording-info">
              <span className="recording-pulse"></span>
              <img src={rec.channel.logo} alt={rec.channel.name} className="channel-thumb" />
              <div className="recording-details">
                <span className="channel-name">{rec.channel.name}</span>
                <span className="recording-time">
                  {rec.isPaused ? 'PAUSED' : `REC ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`}
                </span>
              </div>
            </div>
            <div className="recording-actions">
              <button onClick={() => stopRecording(rec.id)} className="stop-btn">
                Stop
              </button>
            </div>
          </div>
        );
      })}

      {recordings.filter(r => r.blob && !r.isRecording).map(rec => (
        <div key={rec.id} className="recording-status-bar completed">
          <div className="recording-info">
            <img src={rec.channel.logo} alt={rec.channel.name} className="channel-thumb" />
            <div className="recording-details">
              <span className="channel-name">{rec.channel.name}</span>
              <span className="recording-size">
                {(rec.blob!.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          </div>
          <div className="recording-actions">
            <button onClick={() => downloadRecording(rec.id)} className="download-btn">
              Download
            </button>
            <button onClick={() => deleteRecording(rec.id)} className="delete-btn">
              ×
            </button>
          </div>
        </div>
      ))}

      <style jsx>{`
        .recording-status-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 400px;
        }

        .recording-status-bar {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .recording-status-bar.active {
          border-left: 3px solid #ff2e63;
        }

        .recording-status-bar.completed {
          border-left: 3px solid #00d9ff;
        }

        .recording-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .recording-pulse {
          width: 8px;
          height: 8px;
          background: #ff2e63;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
          flex-shrink: 0;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        .channel-thumb {
          width: 32px;
          height: 32px;
          object-fit: contain;
          border-radius: 4px;
          background: #000;
          flex-shrink: 0;
        }

        .recording-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .channel-name {
          color: #fff;
          font-weight: 500;
          font-size: 0.875rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .recording-time {
          color: #ff2e63;
          font-size: 0.75rem;
          font-family: monospace;
          font-weight: 600;
        }

        .recording-size {
          color: #00d9ff;
          font-size: 0.75rem;
        }

        .recording-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .stop-btn {
          background: #ff2e63;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .stop-btn:hover {
          background: #ff1a4f;
        }

        .download-btn {
          background: #00d9ff;
          color: #000;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .download-btn:hover {
          background: #00a8cc;
        }

        .delete-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .delete-btn:hover {
          background: rgba(255, 46, 99, 0.3);
          color: #ff2e63;
        }
      `}</style>
    </div>
  );
}