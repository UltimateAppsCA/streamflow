'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VideoPlayer } from '@/components/VideoPlayer';

interface User {
  userId: number;
  email: string;
}

interface UserChannel {
  id: number;
  channel_id: string;
  channel_name: string;
  channel_logo: string | null;
  channel_group: string | null;
  m3u8_url: string;
  created_at: string;
}

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export default function MyChannelsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<{
    id: string;
    name: string;
    logo: string;
    group: string;
    m3u8Url: string;
  } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const adScriptLoaded = useRef(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    // Load ad script after channels are loaded
    if (!loading && channels.length > 0 && !adScriptLoaded.current && adContainerRef.current) {
      const loadAd = () => {
        try {
          const container = adContainerRef.current;
          if (!container) return;

          // Create the ad container div
          const adDiv = document.createElement('div');
          adDiv.id = 'container-01a0abf1551bae001e9b8ffeb0c70190';
          container.appendChild(adDiv);

          // Create and load the script
          const script = document.createElement('script');
          script.async = true;
          script.setAttribute('data-cfasync', 'false');
          script.src = 'https://pl28823198.effectivegatecpm.com/01a0abf1551bae001e9b8ffeb0c70190/invoke.js';
          
          script.onload = () => {
            adScriptLoaded.current = true;
          };

          container.appendChild(script);
        } catch (err) {
          console.error('Failed to load ad:', err);
        }
      };

      loadAd();
    }
  }, [loading, channels.length]);

  const checkAuthAndLoad = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) {
        router.push('/login');
        return;
      }
      const authData = await authRes.json();
      setUser(authData.user);

      await loadChannels();
    } catch (error) {
      console.error('Error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    const res = await fetch('/api/user-channels');
    if (res.ok) {
      const data = await res.json();
      setChannels(data.channels);
    }
  };

  const removeChannel = async (channelId: string) => {
    setRemovingId(channelId);
    try {
      const res = await fetch(`/api/user-channels/${channelId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setChannels(prev => prev.filter(c => c.channel_id !== channelId));
        if (selectedChannel?.id === channelId) {
          setSelectedChannel(null);
        }
      } else {
        alert('Failed to remove channel');
      }
    } catch (error) {
      console.error('Error removing channel:', error);
      alert('Failed to remove channel');
    } finally {
      setRemovingId(null);
    }
  };

  const playChannel = (userChannel: UserChannel) => {
    if (!userChannel.m3u8_url) {
      alert('Stream URL not available for this channel');
      return;
    }

    setSelectedChannel({
      id: userChannel.channel_id,
      name: userChannel.channel_name,
      logo: userChannel.channel_logo || '',
      group: userChannel.channel_group || '',
      m3u8Url: userChannel.m3u8_url
    });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #151520 100%)',
        color: '#fff'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="my-channels-page">
      <header className="page-header">
        <div className="header-content">
          <div className="header-left">
            <button onClick={() => router.push('/watch')} className="back-btn">
              <BackIcon />
              Back to Channels
            </button>
            <h1>My Channels</h1>
          </div>
          <div className="header-actions">
            <span className="channel-count">{channels.length} saved</span>
            <div className="user-controls">
              <span className="user-email">{user?.email}</span>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {selectedChannel && (
        <div className="video-section">
          <VideoPlayer 
            channel={selectedChannel}
            onClose={() => setSelectedChannel(null)} 
          />
        </div>
      )}

      <main className="main-content">
        {channels.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📺</div>
            <h2>No channels yet</h2>
            <p>You haven't added any channels to your list.</p>
            <button onClick={() => router.push('/watch')} className="browse-btn">
              Browse Channels
            </button>
          </div>
        ) : (
          <>
            <div className="channels-grid">
              {channels.map((channel) => (
                <div key={channel.id} className="channel-card">
                  <div 
                    className="channel-clickable"
                    onClick={() => playChannel(channel)}
                  >
                    <div className="channel-logo">
                      <img 
                        src={channel.channel_logo || `https://via.placeholder.com/80?text=${encodeURIComponent(channel.channel_name)}`} 
                        alt={channel.channel_name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://via.placeholder.com/80?text=${encodeURIComponent(channel.channel_name)}`;
                        }}
                      />
                    </div>
                    <div className="channel-info">
                      <h3>{channel.channel_name}</h3>
                      {channel.channel_group && (
                        <span className="channel-group">{channel.channel_group}</span>
                      )}
                    </div>
                    <div className="play-overlay">
                      <PlayIcon />
                    </div>
                  </div>
                  
                  <button
                    className="remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChannel(channel.channel_id);
                    }}
                    disabled={removingId === channel.channel_id}
                  >
                    {removingId === channel.channel_id ? (
                      <span className="spinner" />
                    ) : (
                      <>
                        <TrashIcon />
                        <span>Remove</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Ad Banner at bottom of page */}
            <div ref={adContainerRef} className="ad-container">
              <div id="container-01a0abf1551bae001e9b8ffeb0c70190" className="ad-banner"></div>
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        .my-channels-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0f 0%, #151520 100%);
          color: #fff;
        }

        .page-header {
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1.5rem 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          max-width: 1600px;
          margin: 0 auto;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #888;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, #a0a0a0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .channel-count {
          color: #666;
          font-size: 0.875rem;
        }

        .user-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-email {
          color: #888;
          font-size: 0.875rem;
        }

        .logout-btn {
          padding: 0.5rem 1rem;
          background: rgba(233, 69, 96, 0.1);
          border: 1px solid rgba(233, 69, 96, 0.3);
          border-radius: 6px;
          color: #e94560;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .logout-btn:hover {
          background: rgba(233, 69, 96, 0.2);
          color: #ff6b6b;
        }

        .video-section {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .main-content {
          padding: 2rem;
          max-width: 1600px;
          margin: 0 auto;
        }

        .empty-state {
          text-align: center;
          padding: 6rem 2rem;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #fff;
        }

        .empty-state p {
          color: #666;
          margin-bottom: 2rem;
        }

        .browse-btn {
          display: inline-flex;
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          box-shadow: 0 4px 15px rgba(233, 69, 96, 0.3);
        }

        .browse-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(233, 69, 96, 0.4);
        }

        .channels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .channel-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .channel-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(233, 69, 96, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .channel-clickable {
          padding: 1.5rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
        }

        .channel-logo {
          width: 80px;
          height: 80px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .channel-logo img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
        }

        .channel-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .channel-group {
          font-size: 0.75rem;
          color: #666;
          text-transform: uppercase;
        }

        .play-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.2s;
          border-radius: 12px 12px 0 0;
        }

        .channel-card:hover .play-overlay {
          opacity: 1;
        }

        .play-overlay svg {
          color: #e94560;
          width: 40px;
          height: 40px;
        }

        .remove-btn {
          width: 100%;
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          color: #ef4444;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .remove-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
        }

        .remove-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(239, 68, 68, 0.3);
          border-top-color: #ef4444;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Ad Container Styles */
        .ad-container {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 2rem 0;
          margin-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .ad-banner {
          min-height: 90px;
          width: 100%;
          max-width: 728px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: stretch;
          }

          .header-left {
            justify-content: space-between;
          }

          .channels-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 1rem;
          }

          .main-content {
            padding: 1rem;
          }

          .ad-banner {
            min-height: 50px;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}