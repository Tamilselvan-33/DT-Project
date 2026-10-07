import React from 'react';
import { Droplets, Gauge, History, Power, BrainCircuit } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  firebaseConnected,
  espOnline,
  backendStatus
}) {
  const tabs = [
    { id: 'live', label: 'Live Dashboard', icon: Gauge },
    { id: 'history', label: 'Historical Logs', icon: History },
    { id: 'pump', label: 'Pump Control', icon: Power },
    { id: 'ml', label: 'Water Demand AI', icon: BrainCircuit }
  ];

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(255, 255, 255, 0.92)',
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
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                AquaSense
              </span>
              <span className="mono" style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: '#e0f2fe',
                color: '#0369a1',
                fontWeight: 700
              }}>
                v2.4 Pro
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block', marginTop: '-2px' }}>
              Precision Hydro-Telemetry & AI
            </span>
          </div>
        </div>

        {/* Center Tabs Navigation */}
        <nav style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.04)'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${isActive ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

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
            <span>ESP32 Node</span>
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
            <span>Firebase RTDB</span>
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
            <span>XGBoost ML</span>
          </div>
        </div>
      </div>
    </header>
  );
}
