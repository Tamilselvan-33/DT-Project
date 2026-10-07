import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Zap,
  Droplets,
  Waves,
  Activity,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';

export const SCENARIO_PRESETS = [
  {
    id: 'live',
    name: 'Hardware Live Stream',
    badge: 'ESP32 Real-Time',
    color: '#0284c7',
    icon: Activity,
    description: 'Direct telemetry from physical ESP32 sensors over Firebase RTDB.'
  },
  {
    id: 'nominal',
    name: 'Nominal Steady Transfer',
    badge: 'Optimal',
    color: '#059669',
    icon: CheckCircle2,
    description: 'Balanced inlet/outlet flow rate (14.2 L/min) with safe 68% reservoir capacity.',
    data: {
      flow1_lpm: 14.2,
      flow2_lpm: 13.9,
      flow_difference_l_min: 0.3,
      flow_difference_percent: 2.1,
      water_level_raw: 2785, // ~68%
      flow1_total_liters: 1420.5,
      flow2_total_liters: 1395.2,
      flow1_total_pulses: 6390,
      flow2_total_pulses: 6278,
      pump_status: true
    }
  },
  {
    id: 'leak',
    name: 'Pipeline Differential Leak',
    badge: 'Anomaly Alert',
    color: '#e11d48',
    icon: ShieldAlert,
    description: 'Significant pressure drop: Inlet 16.5 L/min vs Outlet 9.8 L/min (Loss: 6.7 L/min).',
    data: {
      flow1_lpm: 16.5,
      flow2_lpm: 9.8,
      flow_difference_l_min: 6.7,
      flow_difference_percent: 40.6,
      water_level_raw: 2130, // ~52%
      flow1_total_liters: 1850.0,
      flow2_total_liters: 1100.0,
      flow1_total_pulses: 8325,
      flow2_total_pulses: 4950,
      pump_status: true
    }
  },
  {
    id: 'dry_run',
    name: 'Low Reservoir / Dry-Run',
    badge: 'Safety Hazard',
    color: '#d97706',
    icon: AlertTriangle,
    description: 'Reservoir dropped to 8%. Stator overheating risk; dry-run auto cutoff recommended.',
    data: {
      flow1_lpm: 0.0,
      flow2_lpm: 0.0,
      flow_difference_l_min: 0.0,
      flow_difference_percent: 0.0,
      water_level_raw: 328, // ~8%
      flow1_total_liters: 850.0,
      flow2_total_liters: 850.0,
      flow1_total_pulses: 3825,
      flow2_total_pulses: 3825,
      pump_status: true // Pump is running without water!
    }
  },
  {
    id: 'overflow',
    name: 'Reservoir Near Overflow',
    badge: 'High Capacity',
    color: '#0891b2',
    icon: Waves,
    description: 'Reservoir reached 94% threshold. Intake throttling advised to avoid spill.',
    data: {
      flow1_lpm: 18.0,
      flow2_lpm: 4.5,
      flow_difference_l_min: 13.5,
      flow_difference_percent: 75.0,
      water_level_raw: 3850, // ~94%
      flow1_total_liters: 2980.0,
      flow2_total_liters: 1420.0,
      flow1_total_pulses: 13410,
      flow2_total_pulses: 6390,
      pump_status: true
    }
  },
  {
    id: 'standby',
    name: 'Night Standby Conservation',
    badge: 'Eco Mode',
    color: '#64748b',
    icon: Zap,
    description: 'Zero active flow, relay unpowered, reservoir holding steady at 72%.',
    data: {
      flow1_lpm: 0.0,
      flow2_lpm: 0.0,
      flow_difference_l_min: 0.0,
      flow_difference_percent: 0.0,
      water_level_raw: 2950, // ~72%
      flow1_total_liters: 1200.0,
      flow2_total_liters: 1200.0,
      flow1_total_pulses: 5400,
      flow2_total_pulses: 5400,
      pump_status: false
    }
  }
];

export default function ScenarioDiagnosticBanner({
  activeScenarioId,
  onSelectScenario,
  effectiveTelemetry,
  isPumpActive
}) {
  const levelPercent = Math.min(
    100,
    Math.max(0, Math.round(((effectiveTelemetry?.water_level_raw || 0) / 4095) * 100))
  );
  const diffLpm = Math.abs(Number(effectiveTelemetry?.flow_difference_l_min || 0));
  const flow1 = Number(effectiveTelemetry?.flow1_lpm || 0);

  // Dynamic Scenario Diagnostics
  const isLeak = diffLpm > 2.0 && flow1 > 1.0;
  const isSevereLeak = diffLpm > 4.5 && flow1 > 1.0;
  const isDryRunRisk = levelPercent < 15 && isPumpActive;
  const isOverflowRisk = levelPercent >= 88;
  const isStandby = !isPumpActive && flow1 === 0;

  // Compute dynamic health index (0 to 100)
  let healthScore = 100;
  if (isSevereLeak) healthScore -= 50;
  else if (isLeak) healthScore -= 25;
  if (isDryRunRisk) healthScore -= 35;
  if (isOverflowRisk) healthScore -= 20;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Interactive Scenario Selector Pill Bar */}
      <div className="card" style={{
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#ffffff',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={16} color="#0284c7" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
            Operational Scenario Mode:
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {SCENARIO_PRESETS.map((sc) => {
            const Icon = sc.icon;
            const isSelected = activeScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(sc.id)}
                className="scenario-pill"
                style={{
                  background: isSelected ? sc.color : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#334155',
                  borderColor: isSelected ? sc.color : '#e2e8f0',
                  boxShadow: isSelected ? `0 2px 8px ${sc.color}33` : 'none'
                }}
              >
                <Icon size={13} />
                <span>{sc.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Dynamic Scenario Diagnostic Alert Banner */}
      <div className="card" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: isSevereLeak
          ? 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)'
          : isDryRunRisk
          ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
          : isOverflowRisk
          ? 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)'
          : isStandby
          ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
          : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: `1px solid ${
          isSevereLeak
            ? '#fecdd3'
            : isDryRunRisk
            ? '#fde68a'
            : isOverflowRisk
            ? '#99f6e4'
            : isStandby
            ? '#e2e8f0'
            : '#bbf7d0'
        }`
      }}>
        {/* Left Status Message */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isSevereLeak
              ? '#e11d48'
              : isDryRunRisk
              ? '#d97706'
              : isOverflowRisk
              ? '#0891b2'
              : isStandby
              ? '#64748b'
              : '#059669',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {isSevereLeak ? (
              <ShieldAlert size={22} />
            ) : isDryRunRisk ? (
              <AlertTriangle size={22} />
            ) : isOverflowRisk ? (
              <Waves size={22} />
            ) : isStandby ? (
              <Zap size={22} />
            ) : (
              <CheckCircle2 size={22} />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.98rem',
                fontWeight: 800,
                color: isSevereLeak
                  ? '#9f1239'
                  : isDryRunRisk
                  ? '#92400e'
                  : isOverflowRisk
                  ? '#115e59'
                  : isStandby
                  ? '#1e293b'
                  : '#14532d'
              }}>
                {isSevereLeak
                  ? `CRITICAL ANOMALY: Pipeline Differential Loss of ${diffLpm.toFixed(2)} L/min Detected`
                  : isDryRunRisk
                  ? `HAZARD WARNING: Low Reservoir Level (${levelPercent}%) with Active Pump Relay`
                  : isOverflowRisk
                  ? `CAPACITY ADVISORY: Reservoir High Fill Threshold Reached (${levelPercent}%)`
                  : isStandby
                  ? 'STANDBY MODE: Pipeline Pressure Static, System Energy Preserved'
                  : 'HEALTHY STREAM: Full Hydraulic Balance & Nominal Reservoir Levels'}
              </span>
            </div>

            <p style={{
              fontSize: '0.82rem',
              color: isSevereLeak
                ? '#be123c'
                : isDryRunRisk
                ? '#b45309'
                : isOverflowRisk
                ? '#0f766e'
                : isStandby
                ? '#475569'
                : '#15803d',
              marginTop: '2px',
              fontWeight: 500
            }}>
              {isSevereLeak
                ? `Discrepancy between S1 (Inflow) and S2 (Outflow) indicates pipeline rupture or open bypass valve. Estimated loss rate: ${(diffLpm * 60).toFixed(0)} L/hour.`
                : isDryRunRisk
                ? 'Running the submersible pump with empty intake leads to cavitational friction and stator overheating. Dry-run safety interlock recommended.'
                : isOverflowRisk
                ? 'Current inlet throughput exceeds outflow rate. Auto cutoff recommended to prevent sump basin overflow.'
                : isStandby
                ? 'Relay unpowered. Zero pulse count across flow turbines. Standing ready for next automated pumping cycle.'
                : `Both flow sensors report uniform throughput (${effectiveTelemetry?.flow1_lpm || 0} L/min). Zero structural leakage detected.`}
            </p>
          </div>
        </div>

        {/* Right Dynamic Health Score Metric */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
              Hydraulic Health
            </span>
            <div className="mono" style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: healthScore >= 80 ? '#059669' : healthScore >= 50 ? '#d97706' : '#e11d48'
            }}>
              {healthScore}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
