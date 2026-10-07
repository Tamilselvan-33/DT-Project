import React, { useState, useEffect } from 'react';
import {
  Gauge,
  ArrowRightLeft,
  Waves,
  Power,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Droplet
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

export default function LiveTelemetryView({
  telemetry,
  deviceStatus,
  scenarioId,
  onTogglePump
}) {
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
        <Activity size={40} color="#0284c7" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>
          Connecting to Sensor Stream
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Listening for telemetry packets from ESP32 Firebase RTDB...
        </p>
      </div>
    );
  }

  const isPumpActive = Boolean(deviceStatus?.pump ?? telemetry?.pump_status);
  const diffLpm = Math.abs(Number(telemetry.flow_difference_l_min || 0));
  const hasLeak = diffLpm > 2.0 && Number(telemetry.flow1_lpm || 0) > 1.0;
  const levelPercent = Math.min(100, Math.max(0, Math.round(((telemetry.water_level_raw || 0) / 4095) * 100)));
  const totalLiters = Number(telemetry.flow1_total_liters || 0);

  // Dynamic scenarios calculations
  const isDryRunRisk = levelPercent < 15 && isPumpActive;
  const isOverflowRisk = levelPercent >= 88;
  const estimatedPowerWatts = isPumpActive ? (750 + Math.random() * 20).toFixed(0) : 4;
  const dynamicHydraulicEfficiency = isPumpActive && Number(telemetry.flow1_lpm || 0) > 0
    ? Math.min(100, ((Number(telemetry.flow2_lpm || 0) / Number(telemetry.flow1_lpm || 1)) * 100)).toFixed(1)
    : '100.0';

  const handleTogglePump = async () => {
    if (onTogglePump) {
      onTogglePump();
      return;
    }
    const nextState = !isPumpActive;
    await sendPumpCommand(DEFAULT_DEVICE_ID, nextState ? 'ON' : 'OFF');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner / System State Summary in Light Executive Style */}
      <div className="card" style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: '#ffffff',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Monitoring Status
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span className={`status-dot ${hasLeak ? 'dot-red' : isDryRunRisk ? 'dot-amber' : 'dot-green'}`} />
              <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                {hasLeak ? 'Hydraulic Anomaly' : isDryRunRisk ? 'Dry-Run Warning' : 'Hydraulic Stream Active'}
              </span>
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '24px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Pump Actuator
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: isPumpActive ? '#059669' : '#64748b'
              }}>
                {isPumpActive ? 'RUNNING (ACTIVE)' : 'STANDBY (IDLE)'}
              </span>
              <span className="mono" style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                {estimatedPowerWatts}W
              </span>
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '24px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              System Throughput
            </span>
            <div className="mono" style={{ fontWeight: 800, fontSize: '1rem', marginTop: '3px', color: '#0284c7' }}>
              {totalLiters.toFixed(2)} L
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '24px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Line Efficiency
            </span>
            <div className="mono" style={{
              fontWeight: 800,
              fontSize: '1rem',
              marginTop: '3px',
              color: Number(dynamicHydraulicEfficiency) > 90 ? '#059669' : '#e11d48'
            }}>
              {dynamicHydraulicEfficiency}%
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
          borderLeft: '4px solid #0284c7'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Inlet Flow (Sensor 1)
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Gauge size={18} color="#0284c7" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span className="mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0284c7' }}>
              {Number(telemetry.flow1_lpm || 0).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>L/min</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: '#64748b',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px'
          }}>
            <span>Total: <strong className="mono" style={{ color: '#0f172a' }}>{Number(telemetry.flow1_total_liters || 0).toFixed(2)} L</strong></span>
            <span>Pulses: <strong className="mono" style={{ color: '#334155' }}>{telemetry.flow1_total_pulses || 0}</strong></span>
          </div>
        </div>

        {/* Sensor 2: Outlet */}
        <div className="card" style={{
          padding: '22px',
          borderLeft: '4px solid #0891b2'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Outlet Flow (Sensor 2)
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#cffafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Gauge size={18} color="#0891b2" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span className="mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0891b2' }}>
              {Number(telemetry.flow2_lpm || 0).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>L/min</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: '#64748b',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px'
          }}>
            <span>Total: <strong className="mono" style={{ color: '#0f172a' }}>{Number(telemetry.flow2_total_liters || 0).toFixed(2)} L</strong></span>
            <span>Pulses: <strong className="mono" style={{ color: '#334155' }}>{telemetry.flow2_total_pulses || 0}</strong></span>
          </div>
        </div>

        {/* Flow Difference */}
        <div className="card" style={{
          padding: '22px',
          borderLeft: `4px solid ${hasLeak ? '#e11d48' : '#059669'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Flow Delta (Δ)
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: hasLeak ? '#ffe4e6' : '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ArrowRightLeft size={18} color={hasLeak ? '#e11d48' : '#059669'} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span className="mono" style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: hasLeak ? '#e11d48' : '#059669'
            }}>
              {Number(telemetry.flow_difference_l_min || 0).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>L/min</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
            color: '#64748b',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px'
          }}>
            <span>Variance: <strong className="mono" style={{ color: '#0f172a' }}>{Number(telemetry.flow_difference_percent || 0).toFixed(1)}%</strong></span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '0.72rem',
              background: hasLeak ? '#ffe4e6' : '#dcfce7',
              color: hasLeak ? '#e11d48' : '#059669'
            }}>
              {hasLeak ? 'Leak Alert' : 'Balanced Flow'}
            </span>
          </div>
        </div>

        {/* Tank Water Level */}
        <div className="card" style={{
          padding: '22px',
          borderLeft: '4px solid #7c3aed'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tank Water Level
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#ede9fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Waves size={18} color="#7c3aed" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span className="mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#7c3aed' }}>
              {levelPercent}%
            </span>
            <span className="mono" style={{ fontSize: '0.88rem', color: '#64748b' }}>
              ({telemetry.water_level_raw || 0} / 4095)
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: '#f1f5f9',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${levelPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #7c3aed 0%, #0284c7 100%)',
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
              <Activity size={20} color="#0284c7" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Real-Time Flow Telemetry Stream
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284c7', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }} />
                Sensor 1 (Inlet)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0891b2', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0891b2' }} />
                Sensor 2 (Outlet)
              </span>
              <span className="mono" style={{
                padding: '2px 8px',
                borderRadius: '4px',
                background: '#e0f2fe',
                color: '#0369a1',
                fontWeight: 700,
                fontSize: '0.72rem'
              }}>
                5s TICK
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: 260, flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveStreamHistory.length > 0 ? liveStreamHistory : [{ time: 'Now', flow1: 0, flow2: 0 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="liveFlow1Light" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="liveFlow2Light" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val, name) => [`${Number(val).toFixed(2)} L/min`, name === 'flow1' ? 'Sensor 1 (Inlet)' : 'Sensor 2 (Outlet)']}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)',
                    color: '#0f172a'
                  }}
                />
                <Area type="monotone" dataKey="flow1" stroke="#0284c7" strokeWidth={2.5} fill="url(#liveFlow1Light)" isAnimationActive={false} />
                <Area type="monotone" dataKey="flow2" stroke="#0891b2" strokeWidth={2.5} fill="url(#liveFlow2Light)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Visual Liquid Water Storage Tank in Light Style */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Waves size={20} color="#0284c7" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Reservoir Tank</h3>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '12px',
              background: levelPercent > 85 ? '#cffafe' : levelPercent > 20 ? '#dcfce7' : '#fee2e2',
              color: levelPercent > 85 ? '#0891b2' : levelPercent > 20 ? '#059669' : '#e11d48'
            }}>
              {levelPercent > 85 ? 'High Volume' : levelPercent > 25 ? 'Optimal Reserve' : 'Critical Low'}
            </span>
          </div>

          {/* Visual Tank Graphic Container */}
          <div style={{
            position: 'relative',
            width: '160px',
            height: '220px',
            borderRadius: '24px',
            background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
            border: '2px solid #cbd5e1',
            boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(2, 132, 199, 0.1)',
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
            <div style={{ position: 'absolute', right: '10px', top: '25%', fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>75%</div>
            <div style={{ position: 'absolute', right: '10px', top: '50%', fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>50%</div>
            <div style={{ position: 'absolute', right: '10px', top: '75%', fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>25%</div>

            {/* Center Percentage Display */}
            <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: '2.2rem', fontWeight: 800, color: levelPercent > 40 ? '#ffffff' : '#0f172a', textShadow: levelPercent > 40 ? '0 2px 4px rgba(0,0,0,0.3)' : 'none' }}>
                {levelPercent}%
              </div>
              <div style={{ fontSize: '0.75rem', color: levelPercent > 40 ? 'rgba(255,255,255,0.9)' : '#475569', fontWeight: 700 }}>
                {telemetry.water_level_raw || 0} ADC
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Hydraulic Pipeline Diagram & Active Topology in Light Style */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} color="#0284c7" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Physical Hydraulic Flow Schematic
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
            Physical GPIO: S1 (GPIO 26) · S2 (GPIO 27) · Level (GPIO 34) · Relay (GPIO 25)
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
            background: '#f8fafc',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #e0f2fe',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 800, textTransform: 'uppercase' }}>
              Inlet Intake
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              Sensor 1 (GPIO 26)
            </div>
            <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
              {Number(telemetry.flow1_lpm || 0).toFixed(2)} L/min
            </div>
          </div>

          {/* Node 2: Centrifugal Pump */}
          <div style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: isPumpActive ? '1px solid #bbf7d0' : '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: isPumpActive ? '#059669' : '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
              Relay Actuator
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              Submersible Pump (GPIO 25)
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px',
              padding: '4px 12px',
              borderRadius: '6px',
              background: isPumpActive ? '#dcfce7' : '#f1f5f9',
              color: isPumpActive ? '#059669' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}>
              <Power size={13} />
              <span>{isPumpActive ? 'POWERED ON' : 'STOPPED'}</span>
            </div>
          </div>

          {/* Node 3: Storage Reservoir */}
          <div style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #ede9fe',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase' }}>
              Storage Tank
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              Level Sensor (GPIO 34)
            </div>
            <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
              {levelPercent}% Capacity
            </div>
          </div>

          {/* Node 4: Outlet Sensor */}
          <div style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #cffafe',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#0891b2', fontWeight: 800, textTransform: 'uppercase' }}>
              Discharge Outlet
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              Sensor 2 (GPIO 27)
            </div>
            <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0891b2', marginTop: '4px' }}>
              {Number(telemetry.flow2_lpm || 0).toFixed(2)} L/min
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
