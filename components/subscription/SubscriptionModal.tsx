'use client';

import { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export function SubscriptionModal({ isOpen, onClose, onSubscribe }: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const renderPayPalButtons = useCallback(() => {
    if (!window.paypal) return;
    
    const container = document.getElementById('paypal-button-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    try {
      window.paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe',
          height: 40,
        },
        // CRITICAL FIX: Add fundingSource to prefer PayPal balance
        fundingSource: window.paypal.FUNDING.PAYPAL,
        
        createSubscription: (data: any, actions: any) => {
          console.log('Creating subscription...');
          
          return actions.subscription.create({
            plan_id: 'P-34Y646409X565313YNGTDBOY',
            // CRITICAL FIX: Simplify application context
            application_context: {
              brand_name: 'StreamFlow',
              locale: 'en-US',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'SUBSCRIBE_NOW',
              payment_method: {
                payer_selected: 'PAYPAL',
                payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
              },
            },
            subscriber: {
              // This helps avoid some validation issues
              name: {
                given_name: 'Test',
                surname: 'User',
              },
              email_address: 'test@example.com',
            },
          }).catch((err: any) => {
            console.error('Create subscription error:', err);
            // Log full error details
            if (err.details) {
              console.error('Error details:', err.details);
            }
            throw err;
          });
        },
        
        onApprove: (data: any, actions: any) => {
          console.log('Payment approved:', data);
          setLoading(true);
          setError(null);
          
          const subscriptionID = data.subscriptionID;
          
          if (!subscriptionID) {
            setError('No subscription ID received. Please try again.');
            setLoading(false);
            return;
          }
          
          // CRITICAL FIX: First get subscription details to verify
          return fetch(`https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionID}`, {
            method: 'GET',
            headers: {
              'Authorization': 'Basic ' + Buffer.from('AWQZUxmqvaa7ybmR5pydy9uFGhIhZBfajWwWQgDZWEVAtlldic6VvROiphTZFLlP4JUTIGjepp8hw8R6:EH48FKtfGK8FAb1zRxCqcdtjTlXfrcgPpe6wZcb_lwdNd_NtdDzpohSFyHVp0-20rPjjGRgLhqGLG1Jg').toString('base64'),
            },
          })
          .then(() => {
            // If we can fetch it, it's valid - now activate in our system
            return fetch('/api/subscription/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscriptionID }),
            });
          })
          .then(async (res) => {
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || 'Server error');
            }
            return res.json();
          })
          .then((result) => {
            if (result.success) {
              onSubscribe();
              onClose();
            } else {
              throw new Error(result.error || 'Activation failed');
            }
          })
          .catch((err) => {
            console.error('Activation error:', err);
            setError(err.message || 'Failed to complete subscription. Please try again.');
          })
          .finally(() => setLoading(false));
        },
        
        onError: (err: any) => {
          console.error('PayPal error:', err);
          
          // Check for specific error types
          const errorStr = JSON.stringify(err);
          
          if (errorStr.includes('INSTRUMENT_DECLINED') || errorStr.includes('card')) {
            setError('Payment method declined. Please use PayPal balance instead of a card, or try a different card (Visa: 4032035170395748).');
          } else if (errorStr.includes('PAYER_ACCOUNT_RESTRICTED')) {
            setError('PayPal account restricted. Please use a different Sandbox test account.');
          } else if (errorStr.includes('INVALID_PLAN')) {
            setError('Subscription plan error. Please contact support.');
          } else if (errorStr.includes('TRANSACTION_LIMIT_EXCEEDED')) {
            setError('Transaction limit exceeded. Please try again later.');
          } else {
            setError('Payment could not be set up. Please try PayPal balance or a different card.');
          }
        },
        
        onCancel: () => {
          console.log('Payment cancelled');
        },
        
        onInit: () => {
          console.log('PayPal initialized');
        },
        
      }).render('#paypal-button-container');
      
    } catch (err) {
      console.error('Setup error:', err);
      setError('Payment system error. Please refresh and try again.');
    }
  }, [onSubscribe, onClose]);

  useEffect(() => {
    if (isOpen && scriptLoaded) {
      const timer = setTimeout(renderPayPalButtons, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scriptLoaded, renderPayPalButtons]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=AWQZUxmqvaa7ybmR5pydy9uFGhIhZBfajWwWQgDZWEVAtlldic6VvROiphTZFLlP4JUTIGjepp8hw8R6&vault=true&intent=subscription&commit=true&currency=USD`}
        data-sdk-integration-source="button-factory"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setError('Failed to load PayPal SDK')}
      />
      
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <div className="icon">👑</div>
          <h2>Upgrade to Premium</h2>
          <p>Unlock the full experience</p>
        </div>

        <div className="features">
          <div className="feature"><span className="check">✓</span><span>Ad-free streaming</span></div>
          <div className="feature"><span className="check">✓</span><span>HD & 4K quality</span></div>
          <div className="feature"><span className="check">✓</span><span>Download for offline viewing</span></div>
          <div className="feature"><span className="check">✓</span><span>Cancel anytime</span></div>
        </div>

        <div className="pricing">
          <div className="price">$2.99<span>/month</span></div>
          <div className="trial">First 7 days free</div>
        </div>

        {error && <div className="error">{error}</div>}
        
        {!scriptLoaded ? (
          <div className="loading">Loading...</div>
        ) : loading ? (
          <div className="loading">Processing...</div>
        ) : (
          <div id="paypal-button-container"></div>
        )}

        <p className="secure">🔒 Secure payment by PayPal</p>
        
        {/* Help text for Sandbox testing */}
        <p className="help-text">
          <small>Testing? Use PayPal balance or card: 4032035170395748</small>
        </p>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 0.5rem;
        }

        .modal-content {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          width: 100%;
          max-width: 340px;
          padding: 1.25rem;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .close-btn {
          position: absolute;
          top: 0.5rem; right: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fff;
          width: 28px; height: 28px;
          border-radius: 50%;
          font-size: 1.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .modal-header {
          text-align: center;
          margin-bottom: 0.75rem;
        }

        .icon { font-size: 2rem; margin-bottom: 0.25rem; }

        .modal-header h2 {
          color: #fff;
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.125rem 0;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .modal-header p { color: #888; margin: 0; font-size: 0.75rem; }

        .features { margin-bottom: 0.75rem; }

        .feature {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0;
          color: #fff;
          font-size: 0.8125rem;
        }

        .check {
          width: 18px; height: 18px;
          background: linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.625rem;
          flex-shrink: 0;
        }

        .pricing {
          text-align: center;
          margin-bottom: 0.75rem;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }

        .price {
          font-size: 1.75rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.125rem;
        }

        .price span { font-size: 0.75rem; font-weight: 400; color: #888; }

        .trial { color: #00d9ff; font-size: 0.6875rem; font-weight: 600; }

        .error {
          background: rgba(255, 46, 99, 0.1);
          border: 1px solid rgba(255, 46, 99, 0.3);
          color: #ff2e63;
          padding: 0.5rem;
          border-radius: 6px;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
          text-align: center;
        }

        .loading { text-align: center; color: #fff; padding: 0.75rem; font-size: 0.8125rem; }

        .secure { text-align: center; color: #666; font-size: 0.625rem; margin-top: 0.75rem; margin-bottom: 0; }

        .help-text { 
          text-align: center; 
          color: #444; 
          font-size: 0.625rem; 
          margin-top: 0.5rem;
          margin-bottom: 0;
        }

        :global(#paypal-button-container) {
          margin-top: 0.5rem;
          min-height: 40px;
          width: 100%;
        }

        :global(#paypal-button-container iframe) {
          max-width: 100% !important;
          width: 100% !important;
        }

        @media (max-height: 700px) {
          .modal-content { padding: 1rem; max-width: 320px; }
          .icon { font-size: 1.75rem; }
          .modal-header h2 { font-size: 1.125rem; }
          .feature { font-size: 0.75rem; padding: 0.2rem 0; }
          .price { font-size: 1.5rem; }
        }

        @media (min-width: 480px) {
          .modal-content { max-width: 380px; padding: 1.5rem; }
          .icon { font-size: 2.25rem; }
          .modal-header h2 { font-size: 1.5rem; }
          .modal-header p { font-size: 0.875rem; }
          .feature { font-size: 0.875rem; padding: 0.375rem 0; }
          .check { width: 20px; height: 20px; font-size: 0.75rem; }
          .price { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
}