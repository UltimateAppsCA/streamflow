'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, getChannels } from '@/lib/channels';
import { VideoPlayer } from '../VideoPlayer';
import PopupAd from '../PopupAd';

interface User {
  userId: number;
  email: string;
  subscribed?: boolean | number | string | null;
}

interface UserChannel {
  id: number;
  channel_id: string;
  channel_name: string;
  channel_logo: string | null;
  channel_group: string | null;
  created_at: string;
}

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const normalizeSubscribed = (value: User['subscribed']) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'y';
  }
  return false;
};

function GroupAdBanner({ groupName }: { groupName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || scriptLoadedRef.current) return;

    const container = containerRef.current;
    const uniqueId = `ad-${groupName.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2, 11)}`;

    const adDiv = document.createElement('div');
    adDiv.id = uniqueId;
    container.appendChild(adDiv);

    (window as any).atOptions = {
      key: '8a390682e243bdf6c0e07bf94db6b1c4',
      format: 'iframe',
      height: 50,
      width: 320,
      params: {}
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.highperformanceformat.com/8a390682e243bdf6c0e07bf94db6b1c4/invoke.js';

    script.onload = () => {
      scriptLoadedRef.current = true;
    };

    container.appendChild(script);

    return () => {
      if (container.contains(adDiv)) container.removeChild(adDiv);
      if (container.contains(script)) container.removeChild(script);
    };
  }, [groupName]);

  return (
    <div
      ref={containerRef}
      className="ad-banner-wrapper"
      style={{
        width: '320px',
        height: '50px',
        margin: '1rem auto',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    />
  );
}

export default function ChannelGuide() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['All']));

  const [myChannels, setMyChannels] = useState<UserChannel[]>([]);
  const [addingChannel, setAddingChannel] = useState<string | null>(null);

  const [showPopupAd, setShowPopupAd] = useState(false);
  const [pendingChannel, setPendingChannel] = useState<Channel | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const userIsSubscribed = useMemo(() => normalizeSubscribed(user?.subscribed), [user?.subscribed]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user ?? null);
        } else {
          router.push('/login');
          return;
        }
      } catch {
        router.push('/login');
        return;
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      const allChannels = getChannels();
      setChannels(allChannels);

      const groups = new Set(allChannels.map(c => c.group || 'Uncategorized'));
      groups.add('All');
      setExpandedGroups(groups);

      fetchMyChannels();
    }
  }, [authLoading, user]);

  const fetchMyChannels = async () => {
    try {
      const res = await fetch('/api/user-channels');
      if (res.ok) {
        const data = await res.json();
        setMyChannels(data.channels);
      }
    } catch (error) {
      console.error('Failed to fetch my channels:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  const addToMyChannels = async (channel: Channel) => {
    if (!user) return;

    setAddingChannel(channel.id);
    try {
      const res = await fetch('/api/user-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channel.id,
          channelName: channel.name,
          channelLogo: channel.logo,
          channelGroup: channel.group,
          m3u8Url: channel.m3u8Url
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMyChannels(prev => [data.channel, ...prev]);
      } else if (res.status === 409) {
        alert('Channel is already in your list!');
      } else {
        alert('Failed to add channel');
      }
    } catch (error) {
      console.error('Error adding channel:', error);
      alert('Failed to add channel');
    } finally {
      setAddingChannel(null);
    }
  };

  const isInMyChannels = (channelId: string) => myChannels.some(mc => mc.channel_id === channelId);

  const groupedChannels = useMemo(() => {
    const groups: Record<string, Channel[]> = {};

    channels.forEach(channel => {
      const group = channel.group || 'Uncategorized';
      if (!groups[group]) groups[group] = [];
      groups[group].push(channel);
    });

    const sortedGroups: Record<string, Channel[]> = {};
    if (groups['All']) {
      sortedGroups['All'] = groups['All'];
      delete groups['All'];
    }

    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [channels]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedChannels;

    const filtered: Record<string, Channel[]> = {};
    Object.entries(groupedChannels).forEach(([group, groupChannels]) => {
      const matching = groupChannels.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.group && c.group.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      if (matching.length > 0) filtered[group] = matching;
    });
    return filtered;
  }, [groupedChannels, searchQuery]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(Object.keys(groupedChannels)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleChannelSelect = (channel: Channel) => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (userIsSubscribed) {
      setSelectedChannel(channel);
      return;
    }

    setPendingChannel(channel);
    setShowPopupAd(true);
  };

  const handleAdComplete = () => {
    if (pendingChannel) {
      setSelectedChannel(pendingChannel);
    }
  };

  const handlePopupClose = () => {
    setShowPopupAd(false);
    setPendingChannel(null);
  };

  if (authLoading) {
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

  if (!user) return null;

  return (
    <div className="channels-page">
      <PopupAd
        isOpen={showPopupAd}
        onComplete={handleAdComplete}
        onClose={handlePopupClose}
      />

      <header className="page-header">
        <div className="header-content">
          <h1>Channels</h1>
          <div className="header-actions">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <div className="view-controls">
              <button onClick={expandAll} className="control-btn">Expand All</button>
              <button onClick={collapseAll} className="control-btn">Collapse All</button>
            </div>
            <button onClick={() => router.push('/my-channels')} className="control-btn my-channels-btn">
              My Channels ({myChannels.length})
            </button>
            <div className="user-controls">
              <span className="user-email">{user.email}</span>
              {!userIsSubscribed && <span className="free-badge">Free</span>}
              <button onClick={handleLogout} className="control-btn logout-btn">Logout</button>
            </div>
          </div>
        </div>
        <p className="channel-count">{channels.length} channels available</p>
      </header>

      {selectedChannel && (
        <div className="video-section">
          <VideoPlayer channel={selectedChannel} onClose={() => setSelectedChannel(null)} />
        </div>
      )}

      <div className="channels-container" ref={containerRef}>
        {Object.entries(filteredGroups).length === 0 ? (
          <div className="no-results">
            <p>No channels found matching "{searchQuery}"</p>
          </div>
        ) : (
          Object.entries(filteredGroups).map(([group, groupChannels]) => (
            <div key={group} className="channel-group">
              <button className="group-header" onClick={() => toggleGroup(group)}>
                <div className="group-title">
                  <svg className={`chevron ${expandedGroups.has(group) ? 'expanded' : ''}`} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  <h2>{group}</h2>
                  <span className="group-count">{groupChannels.length}</span>
                </div>
              </button>

              {expandedGroups.has(group) && (
                <>
                  <div className="channels-grid">
                    {groupChannels.map((channel) => (
                      <div key={channel.id} className="channel-card">
                        <div className="channel-clickable" onClick={() => handleChannelSelect(channel)}>
                          <div className="channel-logo">
                            <img
                              src={channel.logo}
                              alt={channel.name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60?text=TV';
                              }}
                            />
                          </div>
                          <div className="channel-info">
                            <h3>{channel.name}</h3>
                            {channel.group && channel.group !== 'Uncategorized' && (
                              <span className="channel-group-tag">{channel.group}</span>
                            )}
                          </div>
                          <div className="play-indicator">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          </div>
                        </div>

                        <button
                          className={`add-channel-btn ${isInMyChannels(channel.id) ? 'added' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isInMyChannels(channel.id)) addToMyChannels(channel);
                          }}
                          disabled={addingChannel === channel.id || isInMyChannels(channel.id)}
                        >
                          {addingChannel === channel.id ? (
                            <span className="spinner"></span>
                          ) : isInMyChannels(channel.id) ? (
                            <>
                              <CheckIcon />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <PlusIcon />
                              <span>Add to My Channels</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="ad-banner-container">
                    <GroupAdBanner groupName={group} />
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .channels-page {
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
        }

        .page-header h1 {
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
          gap: 1rem;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
        }

        .search-box input {
          width: 280px;
          padding: 0.625rem 2.5rem 0.625rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-box input:focus {
          outline: none;
          border-color: #e94560;
          background: rgba(255, 255, 255, 0.08);
        }

        .search-box input::placeholder {
          color: #666;
        }

        .search-icon {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          pointer-events: none;
        }

        .view-controls {
          display: flex;
          gap: 0.5rem;
        }

        .control-btn {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #888;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .my-channels-btn {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.3);
          color: #3b82f6;
          font-weight: 600;
        }

        .my-channels-btn:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.5);
          color: #60a5fa;
        }

        .logout-btn {
          color: #e94560;
          border-color: rgba(233, 69, 96, 0.3);
        }

        .logout-btn:hover {
          background: rgba(233, 69, 96, 0.1);
          color: #ff6b6b;
        }

        .user-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-left: 1rem;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .user-email {
          color: #888;
          font-size: 0.875rem;
        }

        .free-badge {
          background: rgba(233, 69, 96, 0.2);
          color: #e94560;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .channel-count {
          margin: 0.5rem 0 0 0;
          color: #666;
          font-size: 0.875rem;
        }

        .video-section {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .channels-container {
          padding: 1.5rem 2rem;
          max-width: 1600px;
          margin: 0 auto;
        }

        .no-results {
          text-align: center;
          padding: 4rem;
          color: #666;
        }

        .channel-group {
          margin-bottom: 1rem;
        }

        .group-header {
          width: 100%;
          padding: 1rem 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .group-header:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .group-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .chevron {
          color: #666;
          transition: transform 0.2s;
        }

        .chevron.expanded {
          transform: rotate(90deg);
        }

        .group-title h2 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #fff;
        }

        .group-count {
          margin-left: auto;
          background: rgba(233, 69, 96, 0.2);
          color: #e94560;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .channels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
          padding: 1rem 0 1rem 2.5rem;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .channel-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
        }

        .channel-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(233, 69, 96, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .channel-clickable {
          padding: 1.25rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          flex: 1;
        }

        .channel-logo {
          width: 80px;
          height: 80px;
          margin-bottom: 0.75rem;
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

        .channel-info {
          width: 100%;
          margin-bottom: 0.5rem;
        }

        .channel-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 0.9375rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .channel-group-tag {
          font-size: 0.6875rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .play-indicator {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.9);
          transition: all 0.2s;
          border-radius: 12px 12px 0 0;
        }

        .channel-card:hover .play-indicator {
          opacity: 1;
          transform: scale(1);
        }

        .play-indicator svg {
          color: #e94560;
          width: 48px;
          height: 48px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }

        .add-channel-btn {
          width: 100%;
          padding: 0.75rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          color: #3b82f6;
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

        .add-channel-btn:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .add-channel-btn.added {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.3);
          color: #22c55e;
          cursor: default;
        }

        .add-channel-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .ad-banner-container {
          padding: 1rem 0 1rem 2.5rem;
          display: flex;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box input {
            width: 100%;
          }

          .channels-container {
            padding: 1rem;
          }

          .channels-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            padding-left: 1.5rem;
          }

          .channel-logo {
            width: 60px;
            height: 60px;
          }

          .user-controls {
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-left: 0;
            padding-top: 0.75rem;
            width: 100%;
            justify-content: space-between;
          }

          .ad-banner-container {
            padding-left: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}