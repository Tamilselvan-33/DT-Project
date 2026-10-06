import React, { useState, useEffect } from 'react';
import {
  Gauge,
  ArrowRightLeft,
  Waves,
  Power,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Droplet,
  Zap,
  Radio,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { sendPumpCommand, DEFAULT_DEVICE_ID } from '../firebase/database';

export default function LiveTelemetryView({ telemetry, deviceStatus }) {
  // Rolling live buffer for the real-time oscilloscope waveform
  const [liveStreamHistory, setLiveStreamHistory] = useState([]);

  useEffect(() => {
    if (!telemetry) return;
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newPoint = {
      time: nowLabel,
      flow1: Number(telemetry.flow1_lpm || 0),
      flow2: Number(telemetry.flow2_lpm || 0),
      delta: Number(telemetry.flow_difference_l_min || 0)
    };

    setLiveStreamHistory((prev) => {
      const updated = [...prev, newPoint];
      // Keep last 15 points for smooth live wave
      return updated.length > 15 ? updated.slice(updated.length - 15) : updated;
    });
  }, [telemetry]);

  if (!telemetry) {
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center', maxWidth: '520px', margin: '40px auto' }}>
        <Activity size={36} color="#00f2fe" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>Connecting to Sensor Stream</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Waiting for initial telemetry packet from ESP32...</p>
      </div>
    );
  }

  const isPumpActive = Boolean(deviceStatus?.pump ?? telemetry?.pump_status);
  const diffLpm = Math.abs(Number(telemetry.flow_difference_l_min || 0));
  const hasLeak = diffLpm > 2.0;

  const handleTogglePump = async () => {
    const nextState = !isPumpActive;
    await sendPumpCommand(DEFAULT_DEVICE_ID, nextState ? 'ON' : 'OFF');
  };

  const levelPercent = Math.min(100, Math.max(0, Math.round(((telemetry.water_level_raw || 0) / 4095) * 100)));
  const totalLiters = Number(telemetry.flow1_total_liters || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner / System State Summary */}
      <div className="card" style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'linear-gradient(135deg, rgba(14, 22, 41, 0.9) 0%, rgba(15, 28, 56, 0.7) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Monitoring Status
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span className="status-dot dot-green" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Hydraulic Stream Active</span>
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '28px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Pump Actuator
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: isPumpActive ? '#10b981' : '#94a3b8'
              }}>
                {isPumpActive ? 'RUNNING (ACTIVE)' : 'STANDBY (IDLE)'}
              </span>
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '28px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Accumulated Throughput
            </span>
            <div className="mono" style={{ fontWeight: 700, fontSize: '1rem', marginTop: '3px', color: '#38bdf8' }}>
              {totalLiters.toFixed(2)} L
            </div>
          </div>
        </div>

        {/* Quick Direct Pump Action Toggle */}
        <button
          onClick={handleTogglePump}
          className={`btn ${isPumpActive ? 'btn-danger' : 'btn-success'}`}
          style={{
            padding: '10px 22px',
            fontSize: '0.92rem',
            letterSpacing: '0.02em',
            fontWeight: 700
          }}
        >
          <Power size={16} />
          <span>{isPumpActive ? 'Stop Pump' : 'Start Pump'}</span>
        </button>
      </div>

      {/* 4 Core Stat KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px'
      }}>
        {/* Sensor 1: Inlet */}
        <div className="card" style={{
          padding: '22px',
          borderLeft: '4px solid #00f2fe'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Inlet Flow (Sensor 1)
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(0, 242, 254, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Gauge size={16} color="#00f2fe" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span className="mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00f2fe' }}>
              {Number(telemetry.flow1_lpm || 0).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.92rem', color: 'var(--text-muted)', fontWeight: 600 }}>L/min</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: 'var(--text-dim)',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px'
          }}>
            <span>Total: <strong className="mono" style={{ color: '#fff' }}>{Number(telemetry.flow1_total_liters || 0).toFixed(2)} L</strong></span>
            <span>Pulses: <strong className="mono" style={{ color: 'var(--text-muted)' }}>{telemetry.flow1_total_pulses || 0}</strong></span>
          </div>
        </div>

        {/* Sensor 2: Outlet */}
        <div className="card" style={{
          padding: '22px',
          borderLeft: '4px solid #0ea5e9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Outlet Flow (Sensor 2)
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(14, 165, 233, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Gauge size={16} color="#0ea5e9" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span className="mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#38bdf8' }}>
              {Number(telemetry.flow2_lpm || 0).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.92rem', color: 'var(--text-muted)', fontWeight: 600 }}>L/min</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: 'var(--text-dim)',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px'
          }}>
            <span>Total: <strong className="mono" style={{ color: '#fff' }}>{Number(telemetry.flow2_total_liters || 0).toFixed(2)} L</strong></span>
            <span>Pulses: <strong className="mono" style={{ color: 'var(--text-muted)' }}>{telemetry.flow2_total_pulses || 0}</strong></span>
          </div>
        </div>

        {/* Flow Difference */}
        <div className="card" style={{
          padding: '22px',
          borderLeft: `4px solid ${hasLeak ? '#f43f5e' : '#10b981'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Flow Delta (Δ)
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: hasLeak ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ArrowRightLeft size={16} color={hasLeak ? '#f43f5e' : '#10b981'} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span className="mono" style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: hasLeak ? '#f43f5e' : '#10b981'
            }}>
              {Number(telemetry.flow_difference_l_min || 0).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.92rem', color: 'var(--text-muted)', fontWeight: 600 }}>L/min</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
            color: 'var(--text-dim)',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px'
          }}>
            <span>Variance: <strong className="mono" style={{ color: '#fff' }}>{Number(telemetry.flow_difference_percent || 0).toFixed(1)}%</strong></span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '0.72rem',
              background: hasLeak ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: hasLeak ? '#f43f5e' : '#10b981'
            }}>
              {hasLeak ? 'Deviation Alert' : 'Balanced Flow'}
            </span>
          </div>
        </div>

        {/* Tank Water Level */}
        <div className="card" style={{
          padding: '22px',
          borderLeft: '4px solid #8b5cf6'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tank Water Level
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Waves size={16} color="#a78bfa" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span className="mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c4b5fd' }}>
              {levelPercent}%
            </span>
            <span className="mono" style={{ fontSize: '0.88rem', color: 'var(--text-dim)' }}>
              ({telemetry.water_level_raw || 0} / 4095)
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: 'var(--bg-element)',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${levelPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #8b5cf6 0%, #00f2fe 100%)',
              borderRadius: '4px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Middle Section: Live Real-Time Flow Chart + Animated Tank Visualizer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)',
        gap: '20px',
        alignItems: 'stretch'
      }}>
        {/* Left: Live Real-time Flow Waveform Chart */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color="#00f2fe" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                Real-Time Flow Telemetry Stream
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00f2fe' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f2fe' }} />
                Sensor 1 (Inlet)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                Sensor 2 (Outlet)
              </span>
              <span className="mono" style={{
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(0, 242, 254, 0.1)',
                color: '#00f2fe',
                fontWeight: 600,
                fontSize: '0.72rem'
              }}>
                LIVE 5s TICK
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: 260, flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveStreamHistory.length > 0 ? liveStreamHistory : [{ time: 'Now', flow1: 0, flow2: 0 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="liveFlow1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="liveFlow2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val, name) => [`${Number(val).toFixed(2)} L/min`, name === 'flow1' ? 'Sensor 1 (Inlet)' : 'Sensor 2 (Outlet)']}
                  contentStyle={{
                    background: '#0a0f1d',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.8rem'
                  }}
                />
                <Area type="monotone" dataKey="flow1" stroke="#00f2fe" strokeWidth={2.5} fill="url(#liveFlow1)" isAnimationActive={false} />
                <Area type="monotone" dataKey="flow2" stroke="#38bdf8" strokeWidth={2.5} fill="url(#liveFlow2)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Visual Liquid Water Storage Tank */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Waves size={18} color="#06b6d4" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Reservoir Tank</h3>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              background: levelPercent > 20 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: levelPercent > 20 ? '#10b981' : '#f43f5e'
            }}>
              {levelPercent > 75 ? 'Optimal Level' : levelPercent > 25 ? 'Normal Level' : 'Low Reserve'}
            </span>
          </div>

          {/* Visual Tank Graphic Container */}
          <div style={{
            position: 'relative',
            width: '160px',
            height: '210px',
            borderRadius: '24px',
            background: 'linear-gradient(180deg, #090e1a 0%, #0d172a 100%)',
            border: '2px solid rgba(56, 189, 248, 0.3)',
            boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.8), 0 0 15px rgba(6, 182, 212, 0.15)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 'auto 0'
          }}>
            {/* Water Fill with Wave Animation */}
            <div
              className="tank-water"
              style={{ height: `${Math.max(8, levelPercent)}%` }}
            >
              <div className="tank-wave" />
            </div>

            {/* Level Graduation Lines */}
            <div style={{ position: 'absolute', right: '10px', top: '25%', fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>75%</div>
            <div style={{ position: 'absolute', right: '10px', top: '50%', fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>50%</div>
            <div style={{ position: 'absolute', right: '10px', top: '75%', fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>25%</div>

            {/* Center Percentage Display */}
            <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                {levelPercent}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {telemetry.water_level_raw || 0} ADC
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Hydraulic Pipeline Diagram & Active Topology */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
              Physical Hydraulic Flow Schematic
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Physical GPIO Pinout: S1 (GPIO 26) · S2 (GPIO 27) · Level (GPIO 34) · Relay (GPIO 25)
          </span>
        </div>

        {/* Pipeline Nodes Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'center'
        }}>
          {/* Node 1: Inlet Sensor */}
          <div style={{
            background: 'var(--bg-subtle)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#00f2fe', fontWeight: 700, textTransform: 'uppercase' }}>
              Inlet Intake
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
              Sensor 1 (GPIO 26)
            </div>
            <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00f2fe', marginTop: '4px' }}>
              {Number(telemetry.flow1_lpm || 0).toFixed(2)} L/min
            </div>
          </div>

          {/* Node 2: Centrifugal Pump */}
          <div style={{
            background: 'var(--bg-subtle)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: isPumpActive ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: isPumpActive ? '#10b981' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Relay Actuator
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
              Submersible Pump (GPIO 25)
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px',
              padding: '3px 10px',
              borderRadius: '6px',
              background: isPumpActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: isPumpActive ? '#10b981' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}>
              <Power size={13} />
              <span>{isPumpActive ? 'POWERED ON' : 'STOPPED'}</span>
            </div>
          </div>

          {/* Node 3: Storage Reservoir */}
          <div style={{
            background: 'var(--bg-subtle)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase' }}>
              Storage Tank
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
              Level Sensor (GPIO 34)
            </div>
            <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#c4b5fd', marginTop: '4px' }}>
              {levelPercent}% Capacity
            </div>
          </div>

          {/* Node 4: Outlet Sensor */}
          <div style={{
            background: 'var(--bg-subtle)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(14, 165, 233, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
              Discharge Outlet
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
              Sensor 2 (GPIO 27)
            </div>
            <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
              {Number(telemetry.flow2_lpm || 0).toFixed(2)} L/min
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
