'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface PopupAdProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

type AdStatus = 'idle' | 'loading' | 'loaded' | 'failed' | 'blocked';

export default function PopupAd({ isOpen, onComplete, onClose }: PopupAdProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [canSkip, setCanSkip] = useState(false);
  const [adStatus, setAdStatus] = useState<AdStatus>('idle');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasCompletedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  const loadTimeoutRef = useRef<number | null>(null);

  // Reset state when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        setTimeLeft(30);
        setCanSkip(false);
        setAdStatus('loading');
        hasCompletedRef.current = false;
      }
    } else {
      hasInitializedRef.current = false;
      setAdStatus('idle');
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (loadTimeoutRef.current) {
        window.clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  // Handle timer
  useEffect(() => {
    if (!isOpen || timerRef.current || hasCompletedRef.current) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setCanSkip(true);
          
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            setTimeout(() => onComplete(), 100);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, onComplete]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our ad iframe
      if (event.source !== iframeRef.current?.contentWindow) return;
      
      if (event.data === 'ad-loaded') {
        if (loadTimeoutRef.current) {
          window.clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
        setAdStatus('loaded');
      } else if (event.data === 'ad-failed') {
        setAdStatus('failed');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle iframe load events with timeout fallback
  const handleIframeLoad = useCallback(() => {
    // Give the iframe a moment to render and send message
    loadTimeoutRef.current = window.setTimeout(() => {
      // If we haven't received 'ad-loaded' message, check if iframe has content
      const iframe = iframeRef.current;
      if (iframe && adStatus === 'loading') {
        try {
          // Try to access iframe content (may fail due to cross-origin)
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc && iframeDoc.body.innerHTML.length > 100) {
            setAdStatus('loaded');
          } else {
            // Keep waiting or mark as failed
            setAdStatus('failed');
          }
        } catch (e) {
          // Cross-origin restriction, assume loaded if no error message received
          console.log('Cross-origin iframe, waiting for message...');
        }
      }
    }, 3000) as unknown as number;
  }, [adStatus]);

  const handleIframeError = useCallback(() => {
    setAdStatus('failed');
  }, []);

  // Handle manual close
  const handleClose = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (loadTimeoutRef.current) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="popup-ad-overlay" onClick={(e) => {
      if (canSkip && e.target === e.currentTarget) {
        handleClose();
      }
    }}>
      <div className="popup-ad-container">
        <div className="popup-ad-header">
          <h2>Advertisement</h2>
          <div className="timer-container">
            <span className="timer-text">{timeLeft}s</span>
            <div className="timer-bar">
              <div
                className="timer-progress"
                style={{ width: `${((30 - timeLeft) / 30) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="popup-ad-content">
          <p className="ad-message">
            {adStatus === 'blocked' 
              ? 'Please disable your ad blocker to support our service'
              : adStatus === 'failed'
              ? 'Ad failed to load'
              : 'Please watch this ad to continue'}
          </p>

          <div className="ad-container">
            <iframe
              ref={iframeRef}
              src="/ad.html"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{
                width: '100%',
                height: '250px',
                border: 'none',
                background: 'transparent',
                display: adStatus === 'loaded' ? 'block' : 'none'
              }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              title="Advertisement"
            />
            
            {adStatus !== 'loaded' && (
              <div className="ad-placeholder">
                {adStatus === 'loading' && (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <span>Loading advertisement...</span>
                  </div>
                )}
                {adStatus === 'failed' && (
                  <div className="error-state">
                    <span>⚠️ Ad failed to load</span>
                    <small>You can still continue when timer ends</small>
                  </div>
                )}
                {adStatus === 'blocked' && (
                  <div className="blocked-state">
                    <span>🚫 Ad Blocker Detected</span>
                    <small>Please disable ad blocker to support us</small>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="popup-ad-footer">
          {!canSkip ? (
            <p className="wait-message">
              {adStatus === 'blocked' 
                ? 'Disable ad blocker to continue...' 
                : `Please wait ${timeLeft} seconds...`}
            </p>
          ) : (
            <button 
              className="continue-btn" 
              onClick={handleClose}
              autoFocus
            >
              {adStatus === 'loaded' ? 'Continue to Channel →' : 'Skip Ad & Continue →'}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .popup-ad-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(5px);
          padding: 1rem;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .popup-ad-container {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(233, 69, 96, 0.3);
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .popup-ad-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .popup-ad-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #fff;
        }

        .timer-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .timer-text {
          font-size: 1.125rem;
          font-weight: 700;
          color: #e94560;
          min-width: 40px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .timer-bar {
          width: 100px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .timer-progress {
          height: 100%;
          background: linear-gradient(90deg, #e94560, #ff6b6b);
          border-radius: 3px;
          transition: width 0.1s linear;
        }

        .popup-ad-content {
          padding: 1.5rem;
          text-align: center;
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ad-message {
          color: #888;
          font-size: 0.9375rem;
          margin: 0;
        }

        .ad-container {
          min-height: 250px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
        }

        .ad-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.2);
        }

        .loading-state, .error-state, .blocked-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
        }

        .loading-state {
          color: #888;
        }

        .error-state {
          color: #f59e0b;
        }

        .blocked-state {
          color: #e94560;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #e94560;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        small {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .popup-ad-footer {
          padding: 1.25rem 1.5rem;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
          flex-shrink: 0;
        }

        .wait-message {
          color: #666;
          font-size: 0.875rem;
          margin: 0;
        }

        .continue-btn {
          width: 100%;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #e94560 0%, #c73e54 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          animation: pulse 2s ease-in-out infinite;
        }

        .continue-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(233, 69, 96, 0.4);
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.4); }
          50% { box-shadow: 0 0 0 15px rgba(233, 69, 96, 0); }
        }

        @media (max-width: 480px) {
          .popup-ad-container {
            max-height: 95vh;
          }

          .ad-container {
            min-height: 200px;
          }
        }
      `}</style>
    </div>
  );
}