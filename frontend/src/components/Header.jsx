import React from 'react';
import { Droplets, Menu, ChevronDown, Activity, Sparkles } from 'lucide-react';

export default function Header({
  activeTab,
  onOpenMenu,
  firebaseConnected,
  espOnline,
  backendStatus
}) {
  const getTabLabel = (id) => {
    switch (id) {
      case 'live': return 'Live Dashboard';
      case 'history': return 'Historical Logs';
      case 'pump': return 'Pump Control';
      case 'ml': return 'Water Demand AI';
      case 'demo': return 'Demo (Scenarios)';
      default: return 'Live Dashboard';
    }
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)'
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Left: Brand Logo & Intelligent Menu Launcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
            }}>
              <Droplets size={20} />
            </div>
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                AquaSense
              </span>
            </div>
          </div>

          {/* Intelligent Menu Launch Button */}
          <button
            onClick={onOpenMenu}
            className="btn btn-secondary"
            style={{
              padding: '7px 16px',
              borderRadius: '24px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Menu size={16} color="#0284c7" />
            <span>Menu</span>
            <span style={{
              color: '#64748b',
              fontWeight: 600,
              fontSize: '0.8rem',
              paddingLeft: '4px',
              borderLeft: '1px solid #cbd5e1'
            }}>
              {getTabLabel(activeTab)}
            </span>
            <ChevronDown size={14} color="#94a3b8" />
          </button>
        </div>

        {/* Right Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-xs)',
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: '#334155',
            fontWeight: 600
          }}>
            <span className="status-dot dot-green" />
            <span>ESP32</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-xs)',
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: '#334155',
            fontWeight: 600
          }}>
            <span className={`status-dot ${firebaseConnected ? 'dot-green' : 'dot-amber'}`} />
            <span>Firebase</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-xs)',
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: '#334155',
            fontWeight: 600
          }}>
            <span className={`status-dot ${backendStatus?.model_ready ? 'dot-green' : 'dot-amber'}`} />
            <span>ML Engine</span>
          </div>
        </div>
      </div>
    </header>
  );
}
