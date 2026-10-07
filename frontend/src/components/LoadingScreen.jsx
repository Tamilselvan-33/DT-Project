import React from 'react';
import { Droplets } from 'lucide-react';

export default function LoadingScreen({ isVisible, destinationLabel }) {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      /* Exact vibrant blue shade from the AquaSense logo */
      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      userSelect: 'none',
      pointerEvents: 'all'
    }}>
      {/* Outer Pulse Glow */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Soft Animated Wave Rings */}
        <div style={{
          position: 'absolute',
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.2)',
          animation: 'ringPulse 1.4s ease-out infinite'
        }} />

        {/* Center White Circle */}
        <div style={{
          width: '92px',
          height: '92px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(2, 132, 199, 0.4)',
          position: 'relative',
          zIndex: 10,
          animation: 'popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}>
          {/* AquaSense Logo Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7'
          }}>
            <Droplets size={46} strokeWidth={2.3} />
          </div>
        </div>
      </div>

      {/* Brand & Transition Label */}
      <div style={{
        marginTop: '24px',
        textAlign: 'center',
        color: '#ffffff'
      }}>
        <div style={{
          fontSize: '1.4rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
        }}>
          AquaSense
        </div>
        {destinationLabel && (
          <div style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.85)',
            marginTop: '4px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            Loading {destinationLabel}...
          </div>
        )}
      </div>

      {/* Subtle Bottom Progress Dots */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginTop: '16px'
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', opacity: 0.9, animation: 'dotBlink 1s infinite 0s' }} />
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', opacity: 0.9, animation: 'dotBlink 1s infinite 0.2s' }} />
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', opacity: 0.9, animation: 'dotBlink 1s infinite 0.4s' }} />
      </div>
    </div>
  );
}
