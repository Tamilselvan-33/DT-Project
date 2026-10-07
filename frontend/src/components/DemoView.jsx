import React, { useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Waves,
  Zap,
  Gauge,
  ArrowRightLeft,
  Power,
  RotateCcw,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { SCENARIO_PRESETS } from './ScenarioDiagnosticBanner';

export default function DemoView({
  selectedScenarioId,
  onApplyScenario,
  isAppliedToWorkspace
}) {
  const [activePresetId, setActivePresetId] = useState(
    selectedScenarioId === 'live' ? 'nominal' : selectedScenarioId
  );
  const [simulatedPump, setSimulatedPump] = useState(null);

  const activePreset = SCENARIO_PRESETS.find((s) => s.id === activePresetId) || SCENARIO_PRESETS[1];
  const isPumpOn = simulatedPump !== null ? simulatedPump : (activePreset.data?.pump_status ?? false);
  const data = activePreset.data || {};
  const diffLpm = Math.abs(Number(data.flow_difference_l_min || 0));
  const levelPercent = Math.min(100, Math.max(0, Math.round(((data.water_level_raw || 0) / 4095) * 100)));

  const handleSelect = (id) => {
    setActivePresetId(id);
    setSimulatedPump(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Demo Header Card */}
      <div className="card" style={{ padding: '28px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sliders size={20} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                Operational Scenario Sandbox (Demo)
              </h2>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
              Simulate and inspect anomalous hydraulic conditions without modifying physical ESP32 hardware or piping.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => onApplyScenario(activePresetId)}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontWeight: 700 }}
            >
              <Check size={16} />
              <span>{isAppliedToWorkspace && selectedScenarioId === activePresetId ? 'Active in Workspace' : 'Broadcast to Dashboard'}</span>
            </button>
            <button
              onClick={() => onApplyScenario('live')}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontSize: '0.82rem' }}
            >
              <RotateCcw size={14} />
              <span>Reset to Live Sensors</span>
            </button>
          </div>
        </div>

        {/* Scenario Selectors */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginTop: '20px'
        }}>
          {SCENARIO_PRESETS.filter((s) => s.id !== 'live').map((sc) => {
            const Icon = sc.icon;
            const isSelected = activePresetId === sc.id;

            return (
              <div
                key={sc.id}
                onClick={() => handleSelect(sc.id)}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  border: `2px solid ${isSelected ? sc.color : '#e2e8f0'}`,
                  background: isSelected ? `${sc.color}0c` : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 4px 12px ${sc.color}22` : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${sc.color}18`,
                    color: sc.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={18} />
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: `${sc.color}20`,
                    color: sc.color
                  }}>
                    {sc.badge}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                  {sc.name}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', lineHeight: 1.4 }}>
                  {sc.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated Diagnostic Output */}
      <div className="card" style={{ padding: '28px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>
              Scenario Telemetry Output
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {activePreset.name}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Simulated Pump Relay:</span>
            <button
              onClick={() => setSimulatedPump(!isPumpOn)}
              className={`btn ${isPumpOn ? 'btn-success' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              <Power size={14} />
              <span>{isPumpOn ? 'RUNNING' : 'STOPPED'}</span>
            </button>
          </div>
        </div>

        {/* 4 Simulated Metrics in a Fluid Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          background: '#f8fafc',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Inlet Flow (Sensor 1)
            </span>
            <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
              {Number(data.flow1_lpm || 0).toFixed(2)} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>L/min</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Outlet Flow (Sensor 2)
            </span>
            <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0891b2', marginTop: '4px' }}>
              {Number(data.flow2_lpm || 0).toFixed(2)} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>L/min</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Differential (Δ)
            </span>
            <div className="mono" style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: diffLpm > 2 ? '#e11d48' : '#059669',
              marginTop: '4px'
            }}>
              {diffLpm.toFixed(2)} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>L/min</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Reservoir Level
            </span>
            <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
              {levelPercent}% <span style={{ fontSize: '0.85rem', color: '#64748b' }}>({data.water_level_raw} ADC)</span>
            </div>
          </div>
        </div>

        {/* Diagnostic Behavior Explanation */}
        <div style={{
          padding: '18px 22px',
          borderRadius: '12px',
          background: diffLpm > 3 ? '#fff1f2' : levelPercent < 15 ? '#fffbeb' : '#f0fdf4',
          border: `1px solid ${diffLpm > 3 ? '#fecdd3' : levelPercent < 15 ? '#fde68a' : '#bbf7d0'}`
        }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: diffLpm > 3 ? '#9f1239' : levelPercent < 15 ? '#92400e' : '#14532d' }}>
            System Response & Logic Engine:
          </div>
          <p style={{ fontSize: '0.85rem', color: diffLpm > 3 ? '#be123c' : levelPercent < 15 ? '#b45309' : '#15803d', marginTop: '4px', lineHeight: 1.5 }}>
            {diffLpm > 3
              ? `When Δ exceeds 2.0 L/min, the differential loss detector triggers a pipeline breach alarm. Estimated loss rate: ${(diffLpm * 60).toFixed(0)} L/hour. In automatic mode, the relay receives an emergency cutoff command.`
              : levelPercent < 15
              ? `When ADC drops below 600 (~15%), dry-run safety interlocks engage to prevent cavitation and stator coil burnout. Pump activation buttons display cautionary prompts.`
              : levelPercent > 88
              ? `When reservoir approaches 90%, high-water cutoff signals prevent sump overflow. The inlet relay is paused until draw-down occurs.`
              : `Hydraulic pressure balance nominal. Steady flow rate ensures energy-efficient water transfer with zero pipeline leakage.`}
          </p>
        </div>
      </div>
    </div>
  );
}
