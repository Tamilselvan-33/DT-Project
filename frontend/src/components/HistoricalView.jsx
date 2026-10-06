import React, { useState } from 'react';
import { RefreshCw, TrendingUp, Table as TableIcon } from 'lucide-react';
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
      {/* Header Controls */}
      <div className="card" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Historical Logs</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {readings?.length || 0} records stored in Firebase
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            background: 'var(--bg-subtle)',
            padding: '2px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-subtle)'
          }}>
            {[25, 50, 100].map((num) => (
              <button
                key={num}
                onClick={() => setLimitCount(num)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: limitCount === num ? 'var(--bg-element)' : 'transparent',
                  color: limitCount === num ? '#fff' : 'var(--text-dim)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
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
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {(!readings || readings.length === 0) ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No historical records found yet. Records accumulate automatically every 5 seconds.
        </div>
      ) : (
        <>
          {/* Trend Chart */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Dual Flow Trend (L/min)
              </span>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                <span style={{ color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }} />
                  Sensor 1 (Inlet)
                </span>
                <span style={{ color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4' }} />
                  Sensor 2 (Outlet)
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                  <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f1523',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  />
                  <Line type="monotone" dataKey="flow1" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="flow2" stroke="#06b6d4" strokeWidth={2} dot={false} />
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
                    background: 'rgba(255, 255, 255, 0.02)',
                    color: 'var(--text-dim)',
                    textTransform: 'uppercase',
                    fontSize: '0.72rem',
                    letterSpacing: '0.04em'
                  }}>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px' }}>Inlet (L/min)</th>
                    <th style={{ padding: '12px 16px' }}>Outlet (L/min)</th>
                    <th style={{ padding: '12px 16px' }}>Delta</th>
                    <th style={{ padding: '12px 16px' }}>Level</th>
                    <th style={{ padding: '12px 16px' }}>Pump</th>
                    <th style={{ padding: '12px 16px' }}>Total Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {[...readings].reverse().map((record) => {
                    const tsFormatted = record.date ? record.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
                    return (
                      <tr
                        key={record.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td className="mono" style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                          {tsFormatted}
                        </td>
                        <td className="mono" style={{ padding: '10px 16px', fontWeight: 600, color: '#0ea5e9' }}>
                          {record.flow1_lpm.toFixed(2)}
                        </td>
                        <td className="mono" style={{ padding: '10px 16px', fontWeight: 600, color: '#06b6d4' }}>
                          {record.flow2_lpm.toFixed(2)}
                        </td>
                        <td className="mono" style={{
                          padding: '10px 16px',
                          color: Math.abs(record.flow_difference_l_min) > 2 ? '#f43f5e' : 'var(--text-muted)'
                        }}>
                          {record.flow_difference_l_min.toFixed(2)}
                        </td>
                        <td className="mono" style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                          {record.water_level_raw}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: record.pump_status ? '#10b981' : '#64748b'
                          }}>
                            {record.pump_status ? 'ON' : 'OFF'}
                          </span>
                        </td>
                        <td className="mono" style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                          {record.flow1_total_liters.toFixed(1)} L
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
