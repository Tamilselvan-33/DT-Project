import React from 'react';
import { Droplets, Gauge, History, Power, BrainCircuit, RefreshCw } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  firebaseConnected,
  espOnline,
  backendStatus
}) {
  const tabs = [
    { id: 'live', label: 'Live Dashboard', icon: Gauge },
    { id: 'history', label: 'History', icon: History },
    { id: 'pump', label: 'Pump Control', icon: Power },
    { id: 'ml', label: 'Water Demand AI', icon: BrainCircuit }
  ];

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(9, 13, 22, 0.95)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50
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
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Droplets size={18} />
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
            AquaSense
          </span>
          <span className="mono" style={{
            fontSize: '0.72rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--text-muted)'
          }}>
            01
          </span>
        </div>

        {/* Center Tabs Navigation */}
        <nav style={{
          display: 'flex',
          background: 'var(--bg-subtle)',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${isActive ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)'
          }}>
            <span className="status-dot dot-green" />
            <span>ESP32</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)'
          }}>
            <span className={`status-dot ${firebaseConnected ? 'dot-green' : 'dot-amber'}`} />
            <span>Firebase</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)'
          }}>
            <span className={`status-dot ${backendStatus?.model_ready ? 'dot-green' : 'dot-amber'}`} />
            <span>ML Engine</span>
          </div>
        </div>
      </div>
    </header>
  );
}
