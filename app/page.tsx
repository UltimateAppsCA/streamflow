'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Simple icon components
const TvIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
    <polyline points="17 2 12 7 7 2"></polyline>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#a855f7' }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#22c55e' }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

// Featured channels data - update these with your actual channel images
const featuredChannels = [
  {
    id: 1,
    name: 'A&E',
    image: '/channels/a&e.jpg',
    link: '/watch'
  },
  {
    id: 2,
    name: 'Disney Channel',
    image: '/channels/disneychannel.png',
    link: '/watch'
  },
  {
    id: 3,
    name: 'Nickelodeon',
    image: '/channels/nick.png',
    link: '/watch'
  },
  {
    id: 4,
    name: 'Crime360',
    image: '/channels/Crime360.png',
    link: '/watch'
  },
  {
    id: 5,
    name: 'CourtTV',
    image: '/channels/Courttv.png',
    link: '/watch'
  },
  {
    id: 6,
    name: 'Lego',
    image: '/channels/lego.png',
    link: '/watch'
  },
  {
    id: 7,
    name: 'TMZ',
    image: '/channels/tmz.png',
    link: '/watch'
  }
];

export default function LandingPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) router.push('/watch');
      });
    
    // Trigger animation after mount
    setLoaded(true);
  }, [router]);

  const navigateTo = (path: string) => {
    router.push(path);
  };

  return (
    <div className="landing-page">
      
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <TvIcon />
          <span>StreamFlow</span>
        </div>
        <div className="nav-links">
          <button onClick={() => navigateTo('/login')} className="nav-btn nav-btn-outline">
            Login
          </button>
          <button onClick={() => navigateTo('/register')} className="nav-btn nav-btn-primary">
            Register
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <div className={`hero-section ${loaded ? 'loaded' : ''}`}>
          <h1 className="hero-title">
            Your Personal Streaming Universe
          </h1>
          <p className="hero-subtitle">
            Access live TV channels with full EPG guide, record your favorite shows, 
            and watch offline. All in one beautiful interface.
          </p>
          
          <div className="cta-container">
            <button onClick={() => navigateTo('/register')} className="cta-btn">
              <PlayIcon />
              <span>Start Watching Now</span>
            </button>
          </div>

          {/* Features */}
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <TvIcon />
              </div>
              <h3>Live EPG Guide</h3>
              <p>Beautiful TV guide interface showing current and upcoming programs across all channels.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <DownloadIcon />
              </div>
              <h3>Offline Recording</h3>
              <p>Record any show or movie to your device and watch later without internet.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <ShieldIcon />
              </div>
              <h3>Secure & Private</h3>
              <p>Your streams, your data. Fully encrypted and private viewing experience.</p>
            </div>
          </div>
        </div>

        {/* Featured Channels Section */}
        <div className={`featured-section ${loaded ? 'loaded' : ''}`}>
          <h2 className="featured-title">Featured Channels</h2>
          <p className="featured-subtitle">Click to preview our most popular channels</p>
          
          <div className="channels-grid">
            {featuredChannels.map((channel, index) => (
              <button 
                key={channel.id} 
                onClick={() => navigateTo(channel.link)}
                className="channel-btn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="channel-preview">
                  <img 
                    src={channel.image} 
                    alt={channel.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://via.placeholder.com/120x120/1a1a2e/ffffff?text=${encodeURIComponent(channel.name)}`;
                    }}
                  />
                  <div className="channel-overlay">
                    <PlayIcon />
                  </div>
                </div>
                <span className="channel-name">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
        }
      `}</style>

      <style jsx>{`
        .landing-page {
          min-height: 100vh;
          position: relative;
          color: #fff;
          overflow-x: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .background-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -2;
          overflow: hidden;
        }

        .background-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .background-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            135deg,
            rgba(10, 10, 15, 0.9) 0%,
            rgba(10, 10, 15, 0.75) 50%,
            rgba(10, 10, 15, 0.9) 100%
          );
          z-index: -1;
        }

        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 3rem;
          position: relative;
          z-index: 10;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .nav-links {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        /* Navigation Buttons */
        .nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.75rem;
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border: 2px solid transparent;
          min-width: 100px;
          text-align: center;
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }

        .nav-btn-outline {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
        }

        .nav-btn-outline:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .nav-btn-primary {
          background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4), 
                      inset 0 1px 0 rgba(255,255,255,0.2);
        }

        .nav-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(233, 69, 96, 0.5),
                      inset 0 1px 0 rgba(255,255,255,0.2);
          filter: brightness(1.1);
        }

        .nav-btn:active {
          transform: translateY(0);
        }

        /* CTA Button */
        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem 2.5rem;
          background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
          color: #fff;
          font-size: 1.125rem;
          font-weight: 700;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(233, 69, 96, 0.4),
                      inset 0 1px 0 rgba(255,255,255,0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }

        .cta-btn:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 40px rgba(233, 69, 96, 0.5),
                      inset 0 1px 0 rgba(255,255,255,0.2);
          filter: brightness(1.1);
        }

        .cta-btn:active {
          transform: translateY(-1px) scale(0.98);
        }

        .cta-btn svg {
          width: 24px;
          height: 24px;
          fill: currentColor;
        }

        .main-content {
          position: relative;
          z-index: 1;
          padding: 2rem 3rem 4rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .hero-section {
          text-align: center;
          padding: 4rem 0;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease;
        }

        .hero-section.loaded {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #fff 0%, #e94560 50%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine 3s linear infinite;
          line-height: 1.1;
        }

        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.8);
          max-width: 600px;
          margin: 0 auto 2.5rem;
          line-height: 1.6;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .cta-container {
          margin-bottom: 4rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2.5rem 2rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(233, 69, 96, 0.3);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .feature-icon {
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: center;
        }

        .feature-card h3 {
          font-size: 1.35rem;
          margin-bottom: 1rem;
          color: #fff;
          font-weight: 600;
        }

        .feature-card p {
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          font-size: 1rem;
        }

        /* Featured Channels Section */
        .featured-section {
          margin-top: 6rem;
          padding: 3rem 0;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease 0.3s;
        }

        .featured-section.loaded {
          opacity: 1;
          transform: translateY(0);
        }

        .featured-title {
          text-align: center;
          font-size: 2.75rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
          background: linear-gradient(135deg, #fff 0%, #e0e0e0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .featured-subtitle {
          text-align: center;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 3rem;
          font-size: 1.15rem;
        }

        .channels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 2.5rem;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .channel-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s ease;
          opacity: 0;
          animation: fadeInUp 0.6s ease forwards;
          font-family: inherit;
          padding: 0;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .channel-btn:hover {
          transform: translateY(-8px);
        }

        .channel-preview {
          position: relative;
          width: 130px;
          height: 130px;
          border-radius: 24px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          border: 3px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
          margin-bottom: 1rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .channel-btn:hover .channel-preview {
          border-color: rgba(233, 69, 96, 0.6);
          box-shadow: 0 15px 40px rgba(233, 69, 96, 0.4);
          transform: scale(1.05);
        }

        .channel-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: all 0.3s ease;
        }

        .channel-btn:hover .channel-preview img {
          transform: scale(1.1);
        }

        .channel-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.3s ease;
        }

        .channel-btn:hover .channel-overlay {
          opacity: 1;
        }

        .channel-overlay svg {
          color: #e94560;
          width: 40px;
          height: 40px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .channel-name {
          font-weight: 600;
          font-size: 1.05rem;
          color: rgba(255, 255, 255, 0.95);
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 1rem 1.5rem;
          }

          .nav-btn {
            padding: 0.625rem 1.25rem;
            font-size: 0.875rem;
            min-width: 80px;
          }

          .main-content {
            padding: 1rem 1.5rem 3rem;
          }

          .hero-title {
            font-size: 2.5rem;
          }

          .hero-subtitle {
            font-size: 1rem;
          }

          .cta-btn {
            padding: 1rem 2rem;
            font-size: 1rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .channels-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
          }

          .channel-preview {
            width: 100px;
            height: 100px;
          }

          .featured-title {
            font-size: 2rem;
          }
        }

        @media (max-width: 480px) {
          .navbar {
            flex-direction: column;
            gap: 1rem;
          }

          .nav-links {
            width: 100%;
            justify-content: center;
          }

          .channels-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}