import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import IntelligentMenu, { MENU_ITEMS } from './components/IntelligentMenu';
import LoadingScreen from './components/LoadingScreen';
import LiveTelemetryView from './components/LiveTelemetryView';
import HistoricalView from './components/HistoricalView';
import PumpControlView from './components/PumpControlView';
import PredictionView from './components/PredictionView';
import DemoView from './components/DemoView';
import { SCENARIO_PRESETS } from './components/ScenarioDiagnosticBanner';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);

  // Transition Loading Screen state
  const [isLoadingTransition, setIsLoadingTransition] = useState(false);
  const [destinationLabel, setDestinationLabel] = useState('');

  // Active Scenario Mode ('live' by default, or set via Demo tab)
  const [activeScenarioId, setActiveScenarioId] = useState('live');
  const [scenarioPumpOverride, setScenarioPumpOverride] = useState(null);

  // Telemetry & Device State directly backed by Firebase
  const [telemetry, setTelemetry] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [readings, setReadings] = useState([]);
  const [historyLimit, setHistoryLimit] = useState(50);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  // Navigation Handler with Blue Brand Loading Screen
  const handleNavigate = (targetTabId, label) => {
    if (targetTabId === activeTab) {
      setIsMenuOpen(false);
      return;
    }

    setIsMenuOpen(false);
    setDestinationLabel(label || targetTabId);
    setIsLoadingTransition(true);

    // Smooth transition delay to display the blue loading screen
    setTimeout(() => {
      setActiveTab(targetTabId);
    }, 450);

    setTimeout(() => {
      setIsLoadingTransition(false);
    }, 750);
  };

  // Derive Effective Telemetry based on active scenario mode (from Demo tab)
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

  // Explicit pump command handler ('ON' or 'OFF')
  const handleSendPumpCommand = async (command) => {
    const isTargetOn = String(command).toUpperCase() === 'ON';
    if (isSimulatedScenario) {
      setScenarioPumpOverride(isTargetOn);
    } else {
      await sendPumpCommand(DEFAULT_DEVICE_ID, isTargetOn ? 'ON' : 'OFF');
    }
  };

  // Toggle pump handler (used by single-button toggle in Live Dashboard)
  const handleTogglePump = async () => {
    const nextCommand = effectivePumpStatus ? 'OFF' : 'ON';
    await handleSendPumpCommand(nextCommand);
  };

  // Apply scenario handler (from DemoView)
  const handleApplyScenario = (scenarioId) => {
    setActiveScenarioId(scenarioId);
    setScenarioPumpOverride(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      {/* 1. Fullscreen Blue Transition Loading Screen */}
      <LoadingScreen
        isVisible={isLoadingTransition}
        destinationLabel={destinationLabel}
      />

      {/* 2. Intelligent Sliding Menu Drawer */}
      <IntelligentMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        telemetry={effectiveTelemetry}
        deviceStatus={{ pump: effectivePumpStatus }}
        firebaseConnected={firebaseConnected}
      />

      {/* 3. Header with Intelligent Menu Launcher Button */}
      <Header
        activeTab={activeTab}
        onOpenMenu={() => setIsMenuOpen(true)}
        firebaseConnected={firebaseConnected}
        espOnline={true}
        backendStatus={backendStatus}
      />

      {/* 4. Active Destination View */}
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
        {activeTab === 'live' && (
          <LiveTelemetryView
            telemetry={effectiveTelemetry}
            deviceStatus={{ pump: effectivePumpStatus }}
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
            onSendCommand={handleSendPumpCommand}
          />
        )}

        {activeTab === 'ml' && (
          <PredictionView
            backendStatus={backendStatus}
          />
        )}

        {activeTab === 'demo' && (
          <DemoView
            selectedScenarioId={activeScenarioId}
            onApplyScenario={handleApplyScenario}
            isAppliedToWorkspace={activeScenarioId !== 'live'}
          />
        )}
      </main>

      {/* 5. Minimalist Clean Footer */}
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
            <span>Precision Telemetry & Capacity AI</span>
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
