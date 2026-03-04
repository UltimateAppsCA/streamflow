'use client'

import { useState, useEffect } from 'react';
import EPGGuide from '@/components/epg/EPGGuide';
import Script from 'next/script';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { useUser } from '@/context/UserContext';

export default function WatchPage() {
  const { user, loading } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only run this logic once after loading completes
    if (!loading && !hasChecked) {
      setHasChecked(true);
      
      // Check if user exists and is NOT subscribed
      const isSubscribed = user?.subscribed === true;
      
      console.log('Subscription check:', {
        user: user?.email,
        subscribed: user?.subscribed,
        isSubscribed,
        shouldShowModal: user ? !isSubscribed : false
      });
      
      // Only show modal if we have a user and they're not subscribed
      if (user && !isSubscribed) {
        setShowModal(true);
      }
    }
  }, [loading, user, hasChecked]);

  const handleSubscribe = () => {
    setShowModal(false);
    window.location.reload();
  };

  const handleClose = () => {
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="watch-page loading">
        <div className="spinner">Loading...</div>
        <style jsx>{`
          .watch-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0a0a0f 0%, #151520 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="watch-page">
        <EPGGuide />
        <div className="login-prompt">
          Please log in to watch
          <style jsx>{`
            .watch-page {
              min-height: 100vh;
              background: linear-gradient(135deg, #0a0a0f 0%, #151520 100%);
            }
            .login-prompt {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 50vh;
              color: #fff;
              font-size: 1.25rem;
            }
          `}</style>
        </div>
      </div>
    );
  }

  const isSubscribed = user?.subscribed === true;

  return (
    <div className="watch-page">
      <EPGGuide />
      
      {!isSubscribed && (
        <SubscriptionModal 
          isOpen={showModal} 
          onClose={handleClose}
          onSubscribe={handleSubscribe}
        />
      )}
      
      {!isSubscribed && (
        <div className="ad-container">
          <div id="container-01a0abf1551bae001e9b8ffeb0c70190" className="banner-ad"></div>
        </div>
      )}
      
      {!isSubscribed && (
        <Script
          id="banner-ad-script"
          src="https://pl28823198.effectivegatecpm.com/01a0abf1551bae001e9b8ffeb0c70190/invoke.js"
          strategy="afterInteractive"
          data-cfasync="false"
        />
      )}
      
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          top: 10, 
          left: 10, 
          background: 'rgba(0,0,0,0.8)', 
          color: '#0f0',
          padding: '10px',
          fontSize: '12px',
          zIndex: 10000,
          borderRadius: '4px'
        }}>
        </div>
      )}
      
      <style jsx>{`
        .watch-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0f 0%, #151520 100%);
        }
        
        .ad-container {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .banner-ad {
          min-height: 90px;
          width: 100%;
          max-width: 728px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        @media (max-width: 768px) {
          .banner-ad {
            min-height: 50px;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}