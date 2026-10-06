import React, { useState } from 'react';
import { Users, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { predictWaterDemand } from '../api/mlService';

export default function PredictionView({ backendStatus }) {
  const [populationInput, setPopulationInput] = useState('5000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);

  const presets = [500, 1000, 2500, 5000, 7500, 10000];

  const handlePredict = async (popValue) => {
    const targetPop = popValue !== undefined ? popValue : populationInput;
    const num = Number(targetPop);

    if (!num || isNaN(num) || num <= 0) {
      setError('Enter a valid student population count.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await predictWaterDemand(num);
      setPredictionResult(data);
    } catch (err) {
      setError(err.message || 'Prediction service unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const cumulativeData = predictionResult ? Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const dailyAvg = predictionResult.predicted_daily_usage_liters;
    return {
      day: `Day ${day}`,
      cumulative: Math.round(dailyAvg * day),
      daily: Math.round(dailyAvg)
    };
  }) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Parameter Input Card */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Water Demand Forecast</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              30-Day Campus Projection based on Student Population
            </span>
          </div>
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            XGBoost ML Model
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="number"
              min="100"
              max="10000"
              value={populationInput}
              onChange={(e) => setPopulationInput(e.target.value)}
              placeholder="e.g. 5000"
              className="input-clean"
              style={{ flex: '1 1 200px' }}
            />
            <button
              onClick={() => handlePredict()}
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '10px 20px' }}
            >
              <Sparkles size={16} />
              <span>{loading ? 'Calculating...' : 'Forecast Demand'}</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Presets:</span>
            {presets.map((pop) => (
              <button
                key={pop}
                onClick={() => {
                  setPopulationInput(String(pop));
                  handlePredict(pop);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  background: populationInput === String(pop) ? 'var(--bg-element)' : 'transparent',
                  color: populationInput === String(pop) ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {pop.toLocaleString()} students
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            fontSize: '0.82rem'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {predictionResult && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px'
          }}>
            {/* 30-Day Demand */}
            <div className="card" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                30-Day Total Demand
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                <span className="mono" style={{ fontSize: '2rem', fontWeight: 700, color: '#0ea5e9' }}>
                  {predictionResult.predicted_30_day_usage_liters.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>L</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                ≈ {predictionResult.predicted_usage_million_liters} Million Liters
              </div>
            </div>

            {/* Daily Average */}
            <div className="card" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Projected Daily Rate
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                <span className="mono" style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
                  {predictionResult.predicted_daily_usage_liters.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>L/day</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Average daily consumption
              </div>
            </div>

            {/* Per Person LPCD */}
            <div className="card" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Per Capita Rate
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                <span className="mono" style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>
                  {predictionResult.implied_lpcd}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>LPCD</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Liters per person per day
              </div>
            </div>
          </div>

          {/* Cumulative Projection Chart */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                30-Day Cumulative Consumption Curve
              </span>
            </div>

            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCumul" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                  <XAxis dataKey="day" stroke="#475569" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toLocaleString()} L`, 'Cumulative Volume']}
                    contentStyle={{
                      background: '#0f1523',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  />
                  <Area type="monotone" dataKey="cumulative" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorCumul)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
