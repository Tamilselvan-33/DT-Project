import React, { useState } from 'react';
import { Power, Check, AlertTriangle, ArrowUpRight, Gauge } from 'lucide-react';
import { sendPumpCommand, DEFAULT_DEVICE_ID } from '../firebase/database';

export default function PumpControlView({
  deviceStatus,
  telemetry
}) {
  const [isSending, setIsSending] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const isPumpActive = Boolean(deviceStatus?.pump ?? telemetry?.pump_status);

  const handleCommand = async (action) => {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Primary Control Card */}
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Pump Actuator</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Hardware Relay Controller (GPIO 25)
            </span>
          </div>

          {/* Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            background: isPumpActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${isPumpActive ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`
          }}>
            <span className={`status-dot ${isPumpActive ? 'dot-green' : 'dot-amber'}`} />
            <span style={{
              fontWeight: 700,
              fontSize: '0.88rem',
              color: isPumpActive ? '#10b981' : 'var(--text-muted)'
            }}>
              {isPumpActive ? 'RUNNING' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Live Feedback Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '28px',
          background: 'var(--bg-subtle)',
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              Live Inlet Flow
            </span>
            <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
              {Number(telemetry?.flow1_lpm || 0).toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>L/min</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              Tank Water Level
            </span>
            <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
              {Math.min(100, Math.max(0, Math.round(((telemetry?.water_level_raw || 0) / 4095) * 100)))}%
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              Last Command
            </span>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
              {lastAction ? `${lastAction.command} at ${lastAction.time}` : 'None'}
            </div>
          </div>
        </div>

        {/* Large Ergonomic Control Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <button
            onClick={() => handleCommand('ON')}
            disabled={isSending}
            className="btn btn-success"
            style={{
              padding: '16px',
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)'
            }}
          >
            <Power size={18} />
            <span>{isSending ? 'Sending...' : 'Start Pump'}</span>
          </button>

          <button
            onClick={() => handleCommand('OFF')}
            disabled={isSending}
            className="btn btn-danger"
            style={{
              padding: '16px',
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)'
            }}
          >
            <Power size={18} />
            <span>{isSending ? 'Sending...' : 'Stop Pump'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
