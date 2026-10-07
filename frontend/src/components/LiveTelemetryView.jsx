import React, { useState, useEffect } from 'react';
import {
  Gauge,
  ArrowRightLeft,
  Waves,
  Power,
  Activity,
  Zap,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
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
      <div className="card" style={{ padding: '60px', textAlign: 'center', maxWidth: '480px', margin: '40px auto' }}>
        <Activity size={36} color="#0284c7" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', color: '#0f172a' }}>
          Connecting to Sensor Stream
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
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
      {/* 1. Unified Fluid Horizon Metrics Panel (Eliminating blocky multi-card clutter) */}
      <div className="horizon-panel" style={{
        padding: '24px 28px',
        background: '#ffffff'
      }}>
        {/* Top Horizon Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          paddingBottom: '20px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-dot ${hasLeak ? 'dot-red' : 'dot-green'}`} />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                {hasLeak ? 'Differential Anomaly' : 'Real-Time Hydrology Active'}
              </span>
            </div>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              Node: <strong style={{ color: '#0f172a' }}>aquasense_01</strong>
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              Throughput: <strong className="mono" style={{ color: '#0284c7' }}>{totalLiters.toFixed(2)} L</strong>
            </span>
          </div>

          {/* Quick Pump Toggle Button */}
          <button
            onClick={handleTogglePump}
            className={`btn ${isPumpActive ? 'btn-danger' : 'btn-success'}`}
            style={{
              padding: '8px 20px',
              fontSize: '0.88rem',
              fontWeight: 700,
              borderRadius: '24px'
            }}
          >
            <Power size={15} />
            <span>{isPumpActive ? 'Stop Pump' : 'Start Pump'}</span>
          </button>
        </div>

        {/* Continuous Flow Metric Strip (No boxy borders) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          paddingTop: '20px'
        }}>
          {/* Inlet Flow */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Gauge size={14} color="#0284c7" />
              <span>Inlet Sensor 1</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
              <span className="mono" style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>
                {Number(telemetry.flow1_lpm || 0).toFixed(2)}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>L/min</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
              GPIO 26 · Total: {Number(telemetry.flow1_total_liters || 0).toFixed(1)} L
            </div>
          </div>

          {/* Outlet Flow */}
          <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Gauge size={14} color="#0891b2" />
              <span>Outlet Sensor 2</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
              <span className="mono" style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0891b2', lineHeight: 1 }}>
                {Number(telemetry.flow2_lpm || 0).toFixed(2)}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>L/min</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
              GPIO 27 · Total: {Number(telemetry.flow2_total_liters || 0).toFixed(1)} L
            </div>
          </div>

          {/* Flow Delta */}
          <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <ArrowRightLeft size={14} color={hasLeak ? '#e11d48' : '#059669'} />
              <span>Flow Delta (Δ)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
              <span className="mono" style={{ fontSize: '2.4rem', fontWeight: 800, color: hasLeak ? '#e11d48' : '#059669', lineHeight: 1 }}>
                {diffLpm.toFixed(2)}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>L/min</span>
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '6px' }}>
              <span style={{
                color: hasLeak ? '#e11d48' : '#059669',
                fontWeight: 700,
                background: hasLeak ? '#fff1f2' : '#f0fdf4',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {hasLeak ? 'Leakage Detected' : 'Balanced Flow'}
              </span>
            </div>
          </div>

          {/* Reservoir Level */}
          <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Waves size={14} color="#7c3aed" />
              <span>Reservoir Tank</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
              <span className="mono" style={{ fontSize: '2.4rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>
                {levelPercent}%
              </span>
              <span className="mono" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                ({telemetry.water_level_raw || 0})
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: '#f1f5f9',
              overflow: 'hidden',
              marginTop: '10px'
            }}>
              <div style={{
                width: `${levelPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #7c3aed 0%, #0284c7 100%)',
                borderRadius: '3px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Seamless Visualization Stage: Chart & Reservoir Visualizer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(300px, 1fr)',
        gap: '20px',
        alignItems: 'stretch'
      }}>
        {/* Real-time Oscilloscope Stream */}
        <div className="horizon-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color="#0284c7" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Flow Oscilloscope Waveform
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
            </div>
          </div>

          <div style={{ width: '100%', height: 260, flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveStreamHistory.length > 0 ? liveStreamHistory : [{ time: 'Now', flow1: 0, flow2: 0 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="liveFlow1Clean" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="liveFlow2Clean" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val, name) => [`${Number(val).toFixed(2)} L/min`, name === 'flow1' ? 'Sensor 1 (Inlet)' : 'Sensor 2 (Outlet)']}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    color: '#0f172a'
                  }}
                />
                <Area type="monotone" dataKey="flow1" stroke="#0284c7" strokeWidth={2.5} fill="url(#liveFlow1Clean)" isAnimationActive={false} />
                <Area type="monotone" dataKey="flow2" stroke="#0891b2" strokeWidth={2.5} fill="url(#liveFlow2Clean)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fluid Glass Tank Visualizer */}
        <div className="horizon-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Waves size={18} color="#7c3aed" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Water Storage</h3>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '12px',
              background: levelPercent > 80 ? '#cffafe' : levelPercent > 20 ? '#dcfce7' : '#fee2e2',
              color: levelPercent > 80 ? '#0891b2' : levelPercent > 20 ? '#059669' : '#e11d48'
            }}>
              {levelPercent > 80 ? 'Near Capacity' : levelPercent > 20 ? 'Optimal' : 'Low Reserve'}
            </span>
          </div>

          {/* Visual Tank Glass Chamber */}
          <div style={{
            position: 'relative',
            width: '160px',
            height: '220px',
            borderRadius: '24px',
            background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
            border: '2px solid #cbd5e1',
            boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(2, 132, 199, 0.08)',
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

            {/* Graduation lines */}
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

      {/* 3. Fluid Physical Pipeline Flow Schematic (Connected line, no clunky boxes) */}
      <div className="horizon-panel" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#0284c7" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Hydraulic Physical Topology
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
            Physical GPIO Pinout: S1 (GPIO 26) · S2 (GPIO 27) · Level (GPIO 34) · Relay (GPIO 25)
          </span>
        </div>

        {/* Fluid Connected Flow Schematic */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          alignItems: 'center'
        }}>
          {/* Node 1: S1 */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%)',
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid #e0f2fe'
          }}>
            <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 800, textTransform: 'uppercase' }}>
              Inlet Intake (GPIO 26)
            </span>
            <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
              {Number(telemetry.flow1_lpm || 0).toFixed(2)} L/min
            </div>
          </div>

          {/* Node 2: Pump */}
          <div style={{
            background: isPumpActive ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#f8fafc',
            padding: '16px 20px',
            borderRadius: '14px',
            border: `1px solid ${isPumpActive ? '#86efac' : '#e2e8f0'}`
          }}>
            <span style={{ fontSize: '0.7rem', color: isPumpActive ? '#15803d' : '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
              Pump Relay (GPIO 25)
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px',
              fontWeight: 800,
              fontSize: '0.95rem',
              color: isPumpActive ? '#15803d' : '#64748b'
            }}>
              <Power size={14} />
              <span>{isPumpActive ? 'POWERED ON' : 'STOPPED'}</span>
            </div>
          </div>

          {/* Node 3: Tank */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #faf5ff 100%)',
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid #f3e8ff'
          }}>
            <span style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase' }}>
              Reservoir (GPIO 34)
            </span>
            <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
              {levelPercent}% Reserve
            </div>
          </div>

          {/* Node 4: S2 */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #ecfeff 100%)',
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid #cffafe'
          }}>
            <span style={{ fontSize: '0.7rem', color: '#0891b2', fontWeight: 800, textTransform: 'uppercase' }}>
              Discharge (GPIO 27)
            </span>
            <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0891b2', marginTop: '4px' }}>
              {Number(telemetry.flow2_lpm || 0).toFixed(2)} L/min
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
