import React, { useState, useEffect } from 'react';
import {
  Power,
  Check,
  AlertTriangle,
  ArrowUpRight,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Clock,
  Zap,
  RotateCw
} from 'lucide-react';
import { sendPumpCommand, DEFAULT_DEVICE_ID } from '../firebase/database';

export default function PumpControlView({
  deviceStatus,
  telemetry,
  onTogglePump
}) {
  const [isSending, setIsSending] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [runtimeSeconds, setRuntimeSeconds] = useState(0);

  const isPumpActive = Boolean(deviceStatus?.pump ?? telemetry?.pump_status);
  const levelPercent = Math.min(100, Math.max(0, Math.round(((telemetry?.water_level_raw || 0) / 4095) * 100)));
  const flowRate = Number(telemetry?.flow1_lpm || 0);

  // Dynamic scenario conditions
  const isDryRunHazard = levelPercent < 15;
  const isOverflowHazard = levelPercent >= 88;

  // Runtime timer effect when pump is active
  useEffect(() => {
    let timer;
    if (isPumpActive) {
      timer = setInterval(() => {
        setRuntimeSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRuntimeSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isPumpActive]);

  const handleCommand = async (action) => {
    // If in auto-pilot and dry-run hazard, warn user
    if (action === 'ON' && isDryRunHazard) {
      const confirmOverride = window.confirm(
        'Warning: Reservoir level is below 15% (Dry-Run Hazard). Starting pump without water can damage the stator. Proceed anyway?'
      );
      if (!confirmOverride) return;
    }

    if (onTogglePump) {
      onTogglePump();
      setLastAction({
        command: action,
        time: new Date().toLocaleTimeString(),
        success: true
      });
      return;
    }

    setIsSending(true);
    const sentTime = new Date().toLocaleTimeString();

    try {
      await sendPumpCommand(DEFAULT_DEVICE_ID, action);
      setLastAction({
        command: action,
        time: sentTime,
        success: true
      });
    } catch (err) {
      console.error('Failed to dispatch pump command:', err);
      setLastAction({
        command: action,
        time: sentTime,
        success: false,
        error: err.message
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatRuntime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}m ${remainder < 10 ? '0' : ''}${remainder}s`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '860px', margin: '0 auto' }}>
      {/* Primary Control Card */}
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                Hardware Relay Actuator
              </h2>
              <span className="mono" style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                GPIO 25
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
              Industrial AC Submersible Pump Controller & Safety Interlock
            </span>
          </div>

          {/* Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: 'var(--radius-sm)',
            background: isPumpActive ? '#dcfce7' : '#f1f5f9',
            border: `1px solid ${isPumpActive ? '#86efac' : '#cbd5e1'}`
          }}>
            <span className={`status-dot ${isPumpActive ? 'dot-green' : 'dot-amber'}`} />
            <span style={{
              fontWeight: 800,
              fontSize: '0.9rem',
              color: isPumpActive ? '#15803d' : '#475569'
            }}>
              {isPumpActive ? 'POWERED ON' : 'RELAY STANDBY'}
            </span>
          </div>
        </div>

        {/* Dynamic Scenario Alert for Pump State */}
        {isDryRunHazard && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertTriangle size={20} color="#d97706" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#92400e' }}>
                Dry-Run Protection Warning (Water Level: {levelPercent}%)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '2px' }}>
                Water level is critically low. Prevent unattended pump activation to protect mechanical seals.
              </div>
            </div>
          </div>
        )}

        {isOverflowHazard && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <ShieldCheck size={20} color="#0891b2" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#115e59' }}>
                Reservoir Full Threshold ({levelPercent}%)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#0f766e', marginTop: '2px' }}>
                Storage capacity near maximum. Pump shutoff recommended to conserve electrical energy.
              </div>
            </div>
          </div>
        )}

        {/* Live Feedback Stats in Light Mode */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
          background: '#f8fafc',
          padding: '18px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Discharge Flow
            </span>
            <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
              {flowRate.toFixed(2)} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>L/min</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Reservoir Reserve
            </span>
            <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
              {levelPercent}%
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Active Runtime
            </span>
            <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: isPumpActive ? '#059669' : '#64748b', marginTop: '4px' }}>
              {isPumpActive ? formatRuntime(runtimeSeconds) : '0m 00s'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Last Command
            </span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              {lastAction ? `${lastAction.command} (${lastAction.time})` : 'System Boot'}
            </div>
          </div>
        </div>

        {/* Mode Selector Toggle: Manual Relay vs Smart Auto-Pilot */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={20} color="#0284c7" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                Smart Auto-Pilot Level Guard
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Automatically prevents pump dry-run (&lt;15%) and overflow shutoff (&gt;88%)
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsAutoPilot(!isAutoPilot)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              background: isAutoPilot ? '#0284c7' : '#e2e8f0',
              color: isAutoPilot ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isAutoPilot ? 'ENABLED (AUTO)' : 'MANUAL MODE'}
          </button>
        </div>

        {/* Large Ergonomic Control Buttons in Light Style */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <button
            onClick={() => handleCommand('ON')}
            disabled={isSending || (isAutoPilot && isDryRunHazard)}
            className="btn btn-success"
            style={{
              padding: '18px',
              fontSize: '1.05rem',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
            }}
          >
            <Power size={20} />
            <span>{isSending ? 'Sending...' : 'Start Pump Relay'}</span>
          </button>

          <button
            onClick={() => handleCommand('OFF')}
            disabled={isSending}
            className="btn btn-danger"
            style={{
              padding: '18px',
              fontSize: '1.05rem',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.25)'
            }}
          >
            <Power size={20} />
            <span>{isSending ? 'Sending...' : 'Stop Pump Relay'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
