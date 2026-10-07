import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import ScenarioDiagnosticBanner, { SCENARIO_PRESETS } from './components/ScenarioDiagnosticBanner';
import LiveTelemetryView from './components/LiveTelemetryView';
import HistoricalView from './components/HistoricalView';
import PumpControlView from './components/PumpControlView';
import PredictionView from './components/PredictionView';

import {
  DEFAULT_DEVICE_ID,
  subscribeToFirebaseConnection,
  subscribeToLiveTelemetry,
  subscribeToHistoricalReadings,
  subscribeToPumpStatus,
  getHistoricalReadings,
  recordTelemetryReading,
  sendPumpCommand
} from './firebase/database';
import { checkBackendHealth } from './api/mlService';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);

  // Active Scenario Mode ('live' or scenario preset id)
  const [activeScenarioId, setActiveScenarioId] = useState('live');

  // Telemetry & Device State directly backed by Firebase
  const [telemetry, setTelemetry] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [readings, setReadings] = useState([]);
  const [historyLimit, setHistoryLimit] = useState(50);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Local scenario state override for pump toggle in simulation mode
  const [scenarioPumpOverride, setScenarioPumpOverride] = useState(null);

  // Keep a ref to the latest telemetry for the 5-second interval archiver
  const latestTelemetryRef = useRef(null);
  useEffect(() => {
    latestTelemetryRef.current = telemetry;
  }, [telemetry]);

  // 1. Monitor Firebase RTDB Connection
  useEffect(() => {
    const unsubscribeConn = subscribeToFirebaseConnection((connected) => {
      setFirebaseConnected(connected);
    });
    return () => unsubscribeConn();
  }, []);

  // 2. Subscribe to Live Telemetry (/devices/aquasense_01/live)
  useEffect(() => {
    const unsubscribeLive = subscribeToLiveTelemetry(
      DEFAULT_DEVICE_ID,
      (data) => {
        setTelemetry(data);
      },
      (err) => {
        console.error('[App] Live telemetry error:', err);
      }
    );
    return () => unsubscribeLive();
  }, []);

  // 3. Periodic 5-Second Telemetry Archiver to Firebase
  useEffect(() => {
    const archiveTimer = setInterval(() => {
      const current = latestTelemetryRef.current;
      if (current) {
        recordTelemetryReading(DEFAULT_DEVICE_ID, current)
          .then(() => {
            console.debug('[Firebase] 5s Telemetry snapshot saved to /readings/aquasense_01');
          })
          .catch((err) => {
            console.error('[Firebase] Failed to save 5s reading snapshot:', err);
          });
      }
    }, 5000);

    return () => clearInterval(archiveTimer);
  }, []);

  // 4. Subscribe to Device Status (/devices/aquasense_01/status)
  useEffect(() => {
    const unsubscribeStatus = subscribeToPumpStatus(
      DEFAULT_DEVICE_ID,
      (status) => {
        setDeviceStatus(status);
      },
      (err) => {
        console.error('[App] Status listener error:', err);
      }
    );
    return () => unsubscribeStatus();
  }, []);

  // 5. Subscribe to Historical Telemetry (/readings/aquasense_01)
  useEffect(() => {
    setHistoryLoading(true);
    const unsubscribeHist = subscribeToHistoricalReadings(
      DEFAULT_DEVICE_ID,
      (records) => {
        setReadings(records);
        setHistoryLoading(false);
      },
      (err) => {
        console.error('[App] Historical listener error:', err);
        setHistoryLoading(false);
      },
      historyLimit
    );
    return () => unsubscribeHist();
  }, [historyLimit]);

  // Refresh historical readings manually
  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const records = await getHistoricalReadings(DEFAULT_DEVICE_ID, historyLimit);
      setReadings(records);
    } catch (err) {
      console.error('[App] Manual refresh history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyLimit]);

  // 6. Backend Health Polling
  const pollBackend = useCallback(() => {
    checkBackendHealth().then((status) => {
      setBackendStatus(status);
    });
  }, []);

  useEffect(() => {
    pollBackend();
    const interval = setInterval(pollBackend, 12000);
    return () => clearInterval(interval);
  }, [pollBackend]);

  // Derive Effective Telemetry based on active scenario mode
  const selectedPreset = SCENARIO_PRESETS.find((s) => s.id === activeScenarioId);
  const isSimulatedScenario = activeScenarioId !== 'live' && selectedPreset?.data;

  const effectiveTelemetry = isSimulatedScenario
    ? {
        ...selectedPreset.data,
        pump_status: scenarioPumpOverride !== null ? scenarioPumpOverride : selectedPreset.data.pump_status
      }
    : telemetry;

  const effectivePumpStatus = isSimulatedScenario
    ? (scenarioPumpOverride !== null ? scenarioPumpOverride : selectedPreset.data.pump_status)
    : Boolean(deviceStatus?.pump ?? telemetry?.pump_status);

  // Toggle pump handler
  const handleTogglePump = async () => {
    if (isSimulatedScenario) {
      setScenarioPumpOverride(!effectivePumpStatus);
    } else {
      const nextState = !effectivePumpStatus;
      await sendPumpCommand(DEFAULT_DEVICE_ID, nextState ? 'ON' : 'OFF');
    }
  };

  // When switching scenario presets, reset local pump override
  const handleSelectScenario = (id) => {
    setActiveScenarioId(id);
    setScenarioPumpOverride(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        firebaseConnected={firebaseConnected}
        espOnline={true}
        backendStatus={backendStatus}
      />

      <main style={{
        flex: 1,
        maxWidth: '1360px',
        width: '100%',
        margin: '0 auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Dynamic Scenario Diagnostic Banner & Selector (Always present on top of the workspace) */}
        <ScenarioDiagnosticBanner
          activeScenarioId={activeScenarioId}
          onSelectScenario={handleSelectScenario}
          effectiveTelemetry={effectiveTelemetry}
          isPumpActive={effectivePumpStatus}
        />

        {activeTab === 'live' && (
          <LiveTelemetryView
            telemetry={effectiveTelemetry}
            deviceStatus={{ pump: effectivePumpStatus }}
            scenarioId={activeScenarioId}
            onTogglePump={handleTogglePump}
          />
        )}

        {activeTab === 'history' && (
          <HistoricalView
            readings={readings}
            loading={historyLoading}
            onRefresh={refreshHistory}
            limitCount={historyLimit}
            setLimitCount={setHistoryLimit}
          />
        )}

        {activeTab === 'pump' && (
          <PumpControlView
            deviceStatus={{ pump: effectivePumpStatus }}
            telemetry={effectiveTelemetry}
            onTogglePump={handleTogglePump}
          />
        )}

        {activeTab === 'ml' && (
          <PredictionView
            backendStatus={backendStatus}
          />
        )}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 24px',
        color: '#64748b',
        fontSize: '0.8rem',
        background: '#ffffff',
        marginTop: 'auto'
      }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>AquaSense Industrial Core</span>
            <span>·</span>
            <span>Real-time Telemetry & AI Capacity System</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="mono" style={{ color: '#0284c7', fontWeight: 600 }}>Node aquasense_01</span>
            <span>·</span>
            <span style={{ color: '#059669', fontWeight: 600 }}>Firebase RTDB Sync</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
