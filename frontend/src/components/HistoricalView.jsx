import React, { useState } from 'react';
import { RefreshCw, TrendingUp, Table as TableIcon, Filter, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function HistoricalView({
  readings,
  loading,
  onRefresh,
  limitCount,
  setLimitCount
}) {
  const [filterAnomaliesOnly, setFilterAnomaliesOnly] = useState(false);

  const filteredReadings = (readings || []).filter((r) => {
    if (!filterAnomaliesOnly) return true;
    return Math.abs(r.flow_difference_l_min || 0) > 2.0;
  });

  const chartData = (readings || []).map((r, idx) => {
    let label = `#${idx + 1}`;
    if (r.date) {
      label = r.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return {
      name: label,
      flow1: r.flow1_lpm,
      flow2: r.flow2_lpm,
      diff: r.flow_difference_l_min,
      level: r.water_level_raw
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Controls in Light Style */}
      <div className="card" style={{
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              Historical Telemetry Database
            </h2>
            <span className="mono" style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
              Firebase RTDB
            </span>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            {readings?.length || 0} time-series telemetry records indexed (5s archiver)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Filter Anomalies Toggle */}
          <button
            onClick={() => setFilterAnomaliesOnly(!filterAnomaliesOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-xs)',
              border: `1px solid ${filterAnomaliesOnly ? '#fecdd3' : 'var(--border-subtle)'}`,
              background: filterAnomaliesOnly ? '#fff1f2' : '#ffffff',
              color: filterAnomaliesOnly ? '#e11d48' : '#475569',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <AlertTriangle size={14} />
            <span>{filterAnomaliesOnly ? 'Showing Anomalies (Δ > 2L)' : 'Filter Anomalies'}</span>
          </button>

          {/* Record Limit Selector */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '2px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-subtle)'
          }}>
            {[25, 50, 100].map((num) => (
              <button
                key={num}
                onClick={() => setLimitCount(num)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  background: limitCount === num ? '#ffffff' : 'transparent',
                  color: limitCount === num ? '#0284c7' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: limitCount === num ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {(!readings || readings.length === 0) ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          No historical records found yet. Snapshots save automatically to Firebase every 5 seconds.
        </div>
      ) : (
        <>
          {/* Trend Chart */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#0284c7" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Dual Flow Telemetry Trend (L/min)
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                <span style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }} />
                  Sensor 1 (Inlet)
                </span>
                <span style={{ color: '#0891b2', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0891b2' }} />
                  Sensor 2 (Outlet)
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)',
                      color: '#0f172a'
                    }}
                  />
                  <Line type="monotone" dataKey="flow1" stroke="#0284c7" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="flow2" stroke="#0891b2" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Logs Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.82rem',
                textAlign: 'left'
              }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: '#f8fafc',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontSize: '0.72rem',
                    letterSpacing: '0.04em',
                    fontWeight: 700
                  }}>
                    <th style={{ padding: '12px 18px' }}>Timestamp</th>
                    <th style={{ padding: '12px 18px' }}>Inlet Flow</th>
                    <th style={{ padding: '12px 18px' }}>Outlet Flow</th>
                    <th style={{ padding: '12px 18px' }}>Delta (Δ)</th>
                    <th style={{ padding: '12px 18px' }}>Water Level</th>
                    <th style={{ padding: '12px 18px' }}>Pump Relay</th>
                    <th style={{ padding: '12px 18px' }}>Total Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredReadings].reverse().map((record) => {
                    const tsFormatted = record.date ? record.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
                    const isDiffAlert = Math.abs(record.flow_difference_l_min || 0) > 2.0;

                    return (
                      <tr
                        key={record.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isDiffAlert ? '#fff1f233' : 'transparent',
                          transition: 'background 0.1s ease'
                        }}
                      >
                        <td className="mono" style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>
                          {tsFormatted}
                        </td>
                        <td className="mono" style={{ padding: '12px 18px', fontWeight: 700, color: '#0284c7' }}>
                          {record.flow1_lpm.toFixed(2)} L/min
                        </td>
                        <td className="mono" style={{ padding: '12px 18px', fontWeight: 700, color: '#0891b2' }}>
                          {record.flow2_lpm.toFixed(2)} L/min
                        </td>
                        <td className="mono" style={{
                          padding: '12px 18px',
                          fontWeight: 700,
                          color: isDiffAlert ? '#e11d48' : '#059669'
                        }}>
                          {record.flow_difference_l_min.toFixed(2)} L/min
                        </td>
                        <td className="mono" style={{ padding: '12px 18px', color: '#7c3aed', fontWeight: 700 }}>
                          {Math.min(100, Math.max(0, Math.round(((record.water_level_raw || 0) / 4095) * 100)))}% ({record.water_level_raw})
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: record.pump_status ? '#dcfce7' : '#f1f5f9',
                            color: record.pump_status ? '#15803d' : '#64748b'
                          }}>
                            {record.pump_status ? 'ON' : 'OFF'}
                          </span>
                        </td>
                        <td className="mono" style={{ padding: '12px 18px', color: '#0f172a', fontWeight: 700 }}>
                          {record.flow1_total_liters.toFixed(2)} L
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
