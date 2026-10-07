import React, { useEffect } from 'react';
import {
  Gauge,
  History,
  Power,
  BrainCircuit,
  Sliders,
  X,
  Droplets,
  Activity,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Waves
} from 'lucide-react';

export const MENU_ITEMS = [
  {
    id: 'live',
    label: 'Live Dashboard',
    tagline: 'Real-time ESP32 sensors, reservoir level & hydraulic stream',
    icon: Gauge,
    badge: 'Live Stream',
    badgeColor: '#0284c7'
  },
  {
    id: 'history',
    label: 'Historical Logs',
    tagline: 'Continuous 5-second archived telemetry & anomaly audit',
    icon: History,
    badge: 'Audit Trail',
    badgeColor: '#64748b'
  },
  {
    id: 'pump',
    label: 'Pump Control',
    tagline: 'Relay actuator switch, smart auto-pilot & dry-run interlock',
    icon: Power,
    badge: 'Relay Actuator',
    badgeColor: '#059669'
  },
  {
    id: 'ml',
    label: 'Water Demand AI',
    tagline: 'XGBoost regression forecasting for campus demand modeling',
    icon: BrainCircuit,
    badge: 'XGBoost ML',
    badgeColor: '#7c3aed'
  },
  {
    id: 'demo',
    label: 'Demo',
    tagline: 'Simulate operational scenarios: leaks, dry-run, overflow & eco modes',
    icon: Sliders,
    badge: 'Scenarios',
    badgeColor: '#d97706'
  }
];

export default function IntelligentMenu({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  telemetry,
  deviceStatus,
  firebaseConnected
}) {
  // Listen for ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPumpActive = Boolean(deviceStatus?.pump ?? telemetry?.pump_status);
  const levelPercent = Math.min(
    100,
    Math.max(0, Math.round(((telemetry?.water_level_raw || 0) / 4095) * 100))
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 900,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        animation: 'fadeIn 0.2s ease-out forwards'
      }}
    >
      {/* Drawer Container (stops event propagation so clicks inside don't close) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          boxShadow: '4px 0 24px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          borderRight: '1px solid #e2e8f0',
          animation: 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '24px 24px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
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
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                AquaSense Menu
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Intelligent Navigation Control
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Live System Glance Card inside the Intelligent Menu */}
        <div style={{
          margin: '18px 20px 8px',
          padding: '14px 16px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: '#64748b', letterSpacing: '0.04em' }}>
              Live Telemetry Glance
            </span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              background: isPumpActive ? '#dcfce7' : '#f1f5f9',
              color: isPumpActive ? '#15803d' : '#64748b'
            }}>
              {isPumpActive ? 'Pump Running' : 'Pump Standby'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Waves size={15} color="#0284c7" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Reservoir Level:
              </span>
            </div>
            <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7' }}>
              {levelPercent}%
            </span>
          </div>

          <div style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#e2e8f0',
            overflow: 'hidden',
            marginTop: '8px'
          }}>
            <div style={{
              width: `${levelPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0284c7 0%, #06b6d4 100%)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* Navigation List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id, item.label);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: isActive ? '#f0f9ff' : '#ffffff',
                  border: `1px solid ${isActive ? '#bae6fd' : '#f1f5f9'}`,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#f1f5f9';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isActive ? '#0284c7' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isActive ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
                  }}>
                    <Icon size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        color: isActive ? '#0284c7' : '#0f172a'
                      }}>
                        {item.label}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: isActive ? '#e0f2fe' : '#f1f5f9',
                        color: isActive ? '#0369a1' : '#64748b'
                      }}>
                        {item.badge}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '0.78rem',
                      color: '#64748b',
                      marginTop: '2px',
                      fontWeight: 500
                    }}>
                      {item.tagline}
                    </p>
                  </div>
                </div>

                <ChevronRight size={18} color={isActive ? '#0284c7' : '#cbd5e1'} />
              </div>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          <span>Unit: aquasense_01</span>
          <span style={{ color: firebaseConnected ? '#059669' : '#d97706', fontWeight: 700 }}>
            ● {firebaseConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}
