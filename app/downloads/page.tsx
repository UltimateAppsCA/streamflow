'use client';

import { useRecording } from '@/context/RecordingContext';
import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
    <line x1="7" y1="2" x2="7" y2="22"></line>
    <line x1="17" y1="2" x2="17" y2="22"></line>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <line x1="2" y1="7" x2="7" y2="7"></line>
    <line x1="2" y1="17" x2="7" y2="17"></line>
    <line x1="17" y1="17" x2="22" y2="17"></line>
    <line x1="17" y1="7" x2="22" y2="7"></line>
  </svg>
);

export default function DownloadsPage() {
  const { getCompletedRecordings, getRecordingUrl, downloadRecording, deleteRecording } = useRecording();
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const recordings = getCompletedRecordings();
  
  const filteredRecordings = recordings.filter(rec => 
    rec.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlay = (recordingId: string) => {
    if (selectedRecording === recordingId) {
      if (isPlaying) {
        videoRef.current?.pause();
      } else {
        videoRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      setSelectedRecording(recordingId);
      setIsPlaying(true);
    }
  };

  const handleDelete = (recordingId: string) => {
    if (confirm('Are you sure you want to delete this recording?')) {
      if (selectedRecording === recordingId) {
        setSelectedRecording(null);
        setIsPlaying(false);
      }
      deleteRecording(recordingId);
    }
  };

  const selectedRec = recordings.find(r => r.id === selectedRecording);
  const videoUrl = selectedRecording ? getRecordingUrl(selectedRecording) : null;

  return (
    <div className="downloads-page">
      <header className="page-header">
        <div className="header-content">
          <Link href="/" className="back-link">
            <BackIcon />
            Back to Channels
          </Link>
          <h1>My Recordings</h1>
          <p>{recordings.length} {recordings.length === 1 ? 'recording' : 'recordings'} available</p>
        </div>
      </header>

      <main className="main-content">
        {recordings.length === 0 ? (
          <div className="empty-state">
            <VideoIcon />
            <h2>No Recordings Yet</h2>
            <p>Start recording channels to watch them here later.</p>
            <Link href="/" className="browse-btn">Browse Channels</Link>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search recordings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="content-grid">
              <div className="recordings-list">
                {filteredRecordings.map((rec) => (
                  <div 
                    key={rec.id} 
                    className={`recording-card ${selectedRecording === rec.id ? 'active' : ''}`}
                    onClick={() => handlePlay(rec.id)}
                  >
                    <div className="thumbnail">
                      {rec.thumbnailUrl ? (
                        <img src={rec.thumbnailUrl} alt={rec.title || rec.channel.name} />
                      ) : (
                        <div className="placeholder-thumb">
                          <VideoIcon />
                        </div>
                      )}
                      <div className="play-overlay">
                        {selectedRecording === rec.id && isPlaying ? <PauseIcon /> : <PlayIcon />}
                      </div>
                      <span className="quality-badge">{rec.quality}</span>
                    </div>
                    
                    <div className="recording-info">
                      <h3>{rec.title || rec.channel.name}</h3>
                      <p className="channel-name">{rec.channel.name}</p>
                      <p className="meta">
                        {format(rec.startTime, 'MMM d, yyyy')} • {rec.quality}
                      </p>
                      {rec.blob && (
                        <p className="file-size">{(rec.blob.size / 1024 / 1024).toFixed(1)} MB</p>
                      )}
                    </div>

                    <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => downloadRecording(rec.id)}
                        className="icon-btn download"
                        title="Download"
                      >
                        <DownloadIcon />
                      </button>
                      <button 
                        onClick={() => handleDelete(rec.id)}
                        className="icon-btn delete"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="player-section">
                {selectedRec && videoUrl ? (
                  <div className="video-player">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      autoPlay
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      poster={selectedRec.thumbnailUrl}
                    />
                    <div className="player-info">
                      <h2>{selectedRec.title || selectedRec.channel.name}</h2>
                      <p>Recorded on {format(selectedRec.startTime, 'MMMM d, yyyy • h:mm a')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="no-selection">
                    <VideoIcon />
                    <p>Select a recording to play</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        .downloads-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);
          color: #fff;
        }

        .page-header {
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1.5rem 2rem;
        }

        .header-content {
          max-width: 1600px;
          margin: 0 auto;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #888;
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: #fff;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 700;
        }

        .page-header p {
          margin: 0;
          color: #888;
          font-size: 0.875rem;
        }

        .main-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 2rem;
        }

        .empty-state {
          text-align: center;
          padding: 6rem 2rem;
          color: #888;
        }

        .empty-state svg {
          color: #444;
          margin-bottom: 1.5rem;
        }

        .empty-state h2 {
          color: #fff;
          margin: 0 0 0.5rem 0;
        }

        .empty-state p {
          margin: 0 0 2rem 0;
        }

        .browse-btn {
          display: inline-flex;
          align-items: center;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #e94560 0%, #c23a51 100%);
          color: #fff;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .browse-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -5px rgba(233, 69, 96, 0.4);
        }

        .toolbar {
          margin-bottom: 1.5rem;
        }

        .search-box input {
          width: 100%;
          max-width: 400px;
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 0.875rem;
        }

        .search-box input:focus {
          outline: none;
          border-color: #e94560;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        .recordings-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: calc(100vh - 300px);
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .recordings-list::-webkit-scrollbar {
          width: 6px;
        }

        .recordings-list::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .recordings-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .recording-card {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .recording-card:hover {
          background: rgba(0, 0, 0, 0.4);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .recording-card.active {
          background: rgba(233, 69, 96, 0.1);
          border-color: #e94560;
        }

        .thumbnail {
          position: relative;
          width: 120px;
          height: 68px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: #000;
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-thumb {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
        }

        .placeholder-thumb svg {
          width: 24px;
          height: 24px;
          color: #666;
        }

        .play-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .recording-card:hover .play-overlay,
        .recording-card.active .play-overlay {
          opacity: 1;
        }

        .quality-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          font-size: 0.625rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .recording-info {
          flex: 1;
          min-width: 0;
        }

        .recording-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 0.9375rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .channel-name {
          margin: 0 0 0.25rem 0;
          color: #888;
          font-size: 0.8125rem;
        }

        .meta {
          margin: 0 0 0.25rem 0;
          color: #666;
          font-size: 0.75rem;
        }

        .file-size {
          margin: 0;
          color: #00d9ff;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .card-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .recording-card:hover .card-actions {
          opacity: 1;
        }

        .icon-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .icon-btn.delete:hover {
          background: rgba(255, 46, 99, 0.3);
          color: #ff2e63;
        }

        .player-section {
          position: sticky;
          top: 2rem;
        }

        .video-player {
          background: #000;
          border-radius: 16px;
          overflow: hidden;
        }

        .video-player video {
          width: 100%;
          aspect-ratio: 16/9;
          display: block;
        }

        .player-info {
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.3);
        }

        .player-info h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
        }

        .player-info p {
          margin: 0;
          color: #888;
          font-size: 0.875rem;
        }

        .no-selection {
          aspect-ratio: 16/9;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #666;
          gap: 1rem;
        }

        .no-selection svg {
          width: 64px;
          height: 64px;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}