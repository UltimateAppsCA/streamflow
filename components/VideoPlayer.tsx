'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Channel } from '@/lib/channels';
import Hls from 'hls.js';
import { RecordingModal } from './RecordingModal';

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const MaximizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
  </svg>
);

const MinimizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"></path>
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const RadioIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'pulse 2s infinite' }}>
    <circle cx="12" cy="12" r="2"></circle>
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
  </svg>
);

const RecordIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
  </svg>
);

const PipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <rect x="12" y="11" width="10" height="6" rx="2" ry="2"></rect>
  </svg>
);

interface VideoPlayerProps {
  channel: Channel;
  onClose: () => void;
}

function needsProxy(url: string): boolean {
  const problematicDomains = [
    'pluto.tv', 'tubi.video', 'tubi.io', 'samsung.wurl.tv',
    'amagi.tv', 'cbcrclinear', 'rcavlive.akamaized.net',
    'akamaized.net', 'cloudfront.net', 'bozztv.com',
    'streamhoster.com', 'telvue.com', 'cablecast.tv',
    'reflect-', 'cdn3.wowza.com', 'fastly.live',
    'brightcove.com', 'uplynk.com', 'anvato.net',
    'jmp2.uk', 'api.toonamiaftermath.com', 'dazn.com',
  ];
  
  return problematicDomains.some(domain => url.includes(domain)) || url.includes('tvpass.org');
}

// Detect iOS
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Detect Android
function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

// Detect mobile
function isMobile(): boolean {
  return isIOS() || isAndroid();
}

export function VideoPlayer({ channel, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const adLoadedRef = useRef(false);
  const playTimeRef = useRef<number>(0);
  const videoSrcRef = useRef<string>('');
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orientationRef = useRef<number>(window.screen.orientation?.angle || 0);

  // Load ad script when component mounts
  useEffect(() => {
    if (adLoadedRef.current) return;
    
    const loadAdScript = () => {
      try {
        const d = document;
        const s = d.createElement('script');
        const l = d.scripts[d.scripts.length - 1];
        
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        s.src = "//warm-candidate.com/bpXWVRsad.Gjlq0kY_Wyca/nelmy9FuVZQUMlmkyPDT/Ym4jMIzzQZwKO/D_kQtZNOjSgZz/N/DgAo5/MqwQ";
        
        if (l && l.parentNode) {
          l.parentNode.insertBefore(s, l);
          adLoadedRef.current = true;
        }
      } catch (err) {
        console.error('Failed to load ad script:', err);
      }
    };

    loadAdScript();
  }, []);

  // Handle controls visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Picture-in-Picture toggle
  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else {
        // For Android Chrome, we need to ensure video is playing
        if (video.paused) {
          await video.play();
        }
        await video.requestPictureInPicture();
        setIsPip(true);
      }
    } catch (err) {
      console.error('PiP error:', err);
      // Android may not support PiP or it might be disabled
      if (isAndroid()) {
        console.log('PiP not supported or disabled on this Android device');
      }
    }
  }, []);

  // Handle orientation change - keep HLS player active
  useEffect(() => {
    const handleOrientationChange = () => {
      const video = videoRef.current;
      if (!video) return;

      // Store current state
      const wasPlaying = !video.paused;
      const currentTime = video.currentTime;
      
      // Small delay to let orientation complete
      setTimeout(() => {
        if (videoRef.current && wasPlaying) {
          // Ensure video continues playing after orientation change
          videoRef.current.currentTime = currentTime;
          videoRef.current.play().catch(err => {
            console.error('Resume after orientation change failed:', err);
          });
        }
      }, 300);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen for resize as fallback
    const handleResize = () => {
      const newAngle = window.screen.orientation?.angle || 0;
      if (newAngle !== orientationRef.current) {
        orientationRef.current = newAngle;
        handleOrientationChange();
      }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = !!(document.fullscreenElement || 
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement);
      
      setIsFullscreen(isFullscreenNow);

      // Prevent default browser controls on Android
      if (isAndroid() && videoRef.current) {
        videoRef.current.controls = false;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Handle PiP events
    const handleEnterPip = () => setIsPip(true);
    const handleLeavePip = () => setIsPip(false);
    
    videoRef.current?.addEventListener('enterpictureinpicture', handleEnterPip);
    videoRef.current?.addEventListener('leavepictureinpicture', handleLeavePip);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      videoRef.current?.removeEventListener('enterpictureinpicture', handleEnterPip);
      videoRef.current?.removeEventListener('leavepictureinpicture', handleLeavePip);
    };
  }, []);

  // Initialize video player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);

    // Force disable native controls on Android
    if (isAndroid()) {
      video.controls = false;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const originalUrl = channel.m3u8Url;
    const useProxy = needsProxy(originalUrl);
    const streamUrl = useProxy 
      ? `/api/stream?url=${encodeURIComponent(originalUrl)}`
      : originalUrl;
    
    videoSrcRef.current = streamUrl;

    console.log('Playing stream:', useProxy ? 'proxied' : 'direct', streamUrl.substring(0, 100));

    const setupPlayer = () => {
      try {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            maxBufferSize: 20 * 1000 * 1000,
            maxBufferHole: 0.5,
            renderTextTracksNatively: true,
            // Android-specific settings
            maxFragLookUpTolerance: 0.25,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            fragLoadPolicy: {
              default: {
                maxTimeToFirstByteMs: 10000,
                maxLoadTimeMs: 120000,
                timeoutRetry: {
                  maxNumRetry: 3,
                  retryDelayMs: 1000,
                  maxRetryDelayMs: 8000,
                },
                errorRetry: {
                  maxNumRetry: 3,
                  retryDelayMs: 1000,
                  maxRetryDelayMs: 8000,
                },
              },
            },
            xhrSetup: useProxy ? undefined : (xhr, url) => {
              if (channel.headers) {
                Object.entries(channel.headers).forEach(([key, value]) => {
                  xhr.setRequestHeader(key, value);
                });
              }
            },
          });

          hlsRef.current = hls;

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            
            if (playTimeRef.current > 0) {
              video.currentTime = playTimeRef.current;
            }
            
            video.play().then(() => {
              setIsPlaying(true);
            }).catch((err) => {
              console.error('Auto-play failed:', err);
              setIsPlaying(false);
            });
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS Error:', data.type, data.details);
            
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('Network error, attempting recovery...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('Media error, attempting recovery...');
                  hls.recoverMediaError();
                  break;
                default:
                  setError('This stream cannot be played. It may require authentication or be geographically restricted.');
                  setIsLoading(false);
                  hls.destroy();
                  break;
              }
            }
          });

          hls.loadSource(streamUrl);
          hls.attachMedia(video);

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (iOS)
          video.src = streamUrl;
          
          video.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            
            if (playTimeRef.current > 0) {
              video.currentTime = playTimeRef.current;
            }
            
            video.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {
              setIsPlaying(false);
            });
          });
          
          video.addEventListener('error', () => {
            setError('Cannot play this stream in your browser.');
            setIsLoading(false);
          });
        } else {
          setError('HLS playback is not supported in your browser.');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Player setup error:', err);
        setError('Failed to initialize player.');
        setIsLoading(false);
      }
    };

    setupPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      if (video && !video.paused) {
        playTimeRef.current = video.currentTime;
      }
      
      video.pause();
      video.src = '';
      video.load();
    };
  }, [channel]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error('Play failed:', err);
        });
      }
    }
    showControlsTemporarily();
  };

  const handleVideoClick = () => {
    togglePlay();
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (videoRef.current && !videoRef.current.paused) {
      playTimeRef.current = videoRef.current.currentTime;
    }

    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if ((container as any).webkitRequestFullscreen) {
      (container as any).webkitRequestFullscreen();
    } else if ((container as any).mozRequestFullScreen) {
      (container as any).mozRequestFullScreen();
    } else if ((container as any).msRequestFullscreen) {
      (container as any).msRequestFullscreen();
    }

    // Force hide native controls on Android
    if (isAndroid() && videoRef.current) {
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.controls = false;
        }
      }, 100);
    }
  };

  const handleExitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  };

  const retry = () => {
    setError(null);
    setIsLoading(true);
    playTimeRef.current = 0;
    
    if (videoRef.current) {
      videoRef.current.src = videoSrcRef.current;
      videoRef.current.load();
    }
  };

  return (
    <div className="video-player" ref={containerRef}>
      {!isFullscreen && (
        <div className="player-header">
          <div className="channel-info">
            <img src={channel.logo} alt={channel.name} onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=TV';
            }} />
            <div>
              <h3>{channel.name}</h3>
              <div className="live-badge">
                <RadioIcon />
                LIVE
              </div>
            </div>
          </div>
          
          <div className="player-controls">
            <button onClick={() => setShowRecordingModal(true)} className="record-btn">
              <RecordIcon />
              Record
            </button>
            
            {/* PiP button - show on supported devices */}
            {document.pictureInPictureEnabled && !isAndroid() && (
              <button 
                onClick={togglePip} 
                className={`icon-btn ${isPip ? 'active' : ''}`} 
                title="Picture in Picture"
              >
                <PipIcon />
              </button>
            )}
            
            {isFullscreen ? (
              <button onClick={handleExitFullscreen} className="icon-btn" title="Exit Fullscreen">
                <MinimizeIcon />
              </button>
            ) : (
              <button onClick={handleFullscreen} className="icon-btn" title="Fullscreen">
                <MaximizeIcon />
              </button>
            )}
            <button onClick={onClose} className="icon-btn" title="Close">
              <XIcon />
            </button>
          </div>
        </div>
      )}

      <div 
        className="video-container" 
        onClick={handleVideoClick} 
        onMouseMove={showControlsTemporarily}
        onTouchStart={showControlsTemporarily}
      >
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading stream...</p>
          </div>
        )}
        
        {error && (
          <div className="error-overlay">
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={retry} className="retry-btn">Retry</button>
              <button onClick={onClose} className="close-error">Close</button>
            </div>
          </div>
        )}

        <video 
          ref={videoRef} 
          controls={false} 
          playsInline 
          muted={false}
          webkit-playsinline="true"
          x5-playsinline="true"
          x-webkit-airplay="allow"
          disablePictureInPicture={false}
          disableRemotePlayback={false}
          preload="auto"
        />
        
        {!isLoading && !error && (
          <>
            <div className={`video-overlay ${showControls || !isPlaying ? 'visible' : ''}`}>
              <button className="play-btn" onClick={(e) => togglePlay(e)}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
            </div>
            
            {isFullscreen && (
              <div className="fullscreen-header">
                <div className="fullscreen-channel-info">
                  <img src={channel.logo} alt={channel.name} />
                  <span>{channel.name}</span>
                </div>
                <div className="fullscreen-controls">
                  {document.pictureInPictureEnabled && (
                    <button onClick={togglePip} className={`fullscreen-btn ${isPip ? 'active' : ''}`}>
                      <PipIcon />
                    </button>
                  )}
                  <button onClick={handleExitFullscreen} className="fullscreen-exit-btn">
                    <MinimizeIcon />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showRecordingModal && (
        <RecordingModal channel={channel} onClose={() => setShowRecordingModal(false)} />
      )}

      <style jsx>{`
        .video-player {
          background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .player-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .channel-info {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .channel-info img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 8px;
          background: #000;
        }

        .channel-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: #ef4444;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .player-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .record-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #ff2e63 0%, #e94560 100%);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .record-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .icon-btn.active {
          background: #e94560;
        }

        .video-container {
          position: relative;
          flex: 1;
          min-height: 0;
          background: #000;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }

        .video-container video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
        }

        /* Hide default controls on Android */
        video::-webkit-media-controls {
          display: none !important;
        }
        
        video::-webkit-media-controls-enclosure {
          display: none !important;
        }
        
        video::-webkit-media-controls-panel {
          display: none !important;
        }

        .loading-overlay, .error-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.9);
          z-index: 10;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #e94560;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-overlay p {
          margin-top: 1rem;
          color: #888;
          font-size: 0.875rem;
        }

        .error-overlay p {
          color: #ef4444;
          text-align: center;
          padding: 0 2rem;
          margin-bottom: 1rem;
          max-width: 400px;
        }

        .error-actions {
          display: flex;
          gap: 0.75rem;
        }

        .retry-btn, .close-error {
          padding: 0.5rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .retry-btn {
          background: #e94560;
          color: #fff;
        }

        .retry-btn:hover {
          background: #ff2e63;
        }

        .close-error {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .close-error:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .video-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }

        .video-overlay.visible {
          opacity: 1;
        }

        .video-container:hover .video-overlay {
          opacity: 1;
        }

        .play-btn {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(233, 69, 96, 0.9);
          border: none;
          border-radius: 50%;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
          pointer-events: auto;
        }

        .play-btn:hover {
          transform: scale(1.1);
          background: rgba(233, 69, 96, 1);
        }

        /* Fullscreen styles */
        .video-player:fullscreen {
          border-radius: 0;
          background: #000;
        }

        .video-player:fullscreen .video-container {
          height: 100vh;
        }

        .fullscreen-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
          z-index: 20;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }

        .video-container:hover .fullscreen-header,
        .fullscreen-header:hover {
          opacity: 1;
          pointer-events: auto;
        }

        .fullscreen-channel-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #fff;
        }

        .fullscreen-channel-info img {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          object-fit: contain;
          background: #000;
        }

        .fullscreen-channel-info span {
          font-size: 1rem;
          font-weight: 600;
        }

        .fullscreen-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .fullscreen-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          border: none;
          border-radius: 50%;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }

        .fullscreen-btn:hover {
          background: rgba(0, 0, 0, 0.7);
          transform: scale(1.1);
        }

        .fullscreen-btn.active {
          background: #e94560;
        }

        .fullscreen-exit-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          border: none;
          border-radius: 50%;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }

        .fullscreen-exit-btn:hover {
          background: rgba(0, 0, 0, 0.7);
          transform: scale(1.1);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Mobile specific styles */
        @media screen and (max-width: 768px) {
          .video-container {
            aspect-ratio: 16/9;
          }
          
          .video-player:fullscreen .video-container {
            aspect-ratio: auto;
          }
          
          /* Android specific fixes */
          .video-container video {
            /* Prevent Android from showing native controls */
            pointer-events: none;
          }
          
          /* But allow clicks on the container */
          .video-container {
            pointer-events: auto;
          }
        }
      `}</style>

      <style jsx global>{`
        /* Global styles to hide Android native controls */
        video::-webkit-media-controls {
          display: none !important;
        }
        
        video::-webkit-media-controls-enclosure {
          display: none !important;
        }
        
        video::-webkit-media-controls-panel {
          display: none !important;
        }
        
        video:fullscreen {
          width: 100%;
          height: 100%;
        }
        
        video::-webkit-media-controls-start-playback-button {
          display: none !important;
        }
        
        /* Android Chrome specific */
        video::-webkit-media-controls-current-time-display,
        video::-webkit-media-controls-time-remaining-display {
          display: none !important;
        }
        
        /* Prevent Android from taking over video in fullscreen */
        video::-webkit-media-controls-overlay-play-button {
          display: none !important;
        }
      `}</style>
    </div>
  );
}