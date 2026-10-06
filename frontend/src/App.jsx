import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
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
  recordTelemetryReading
} from './firebase/database';
import { checkBackendHealth } from './api/mlService';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);

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
  // Automatically saves incoming ESP telemetry to /readings/aquasense_01/{timestamp}
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

  // User requested: Always pretend ESP is online and allow free access
  const espOnline = true;
  const lastSeenSeconds = 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        firebaseConnected={firebaseConnected}
        espOnline={espOnline}
        backendStatus={backendStatus}
        lastSeenSeconds={lastSeenSeconds}
      />

      <main style={{
        flex: 1,
        maxWidth: '1360px',
        width: '100%',
        margin: '0 auto',
        padding: '24px'
      }}>
        {activeTab === 'live' && (
          <LiveTelemetryView
            telemetry={telemetry}
            deviceStatus={deviceStatus}
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
            deviceStatus={deviceStatus}
            telemetry={telemetry}
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
        color: 'var(--text-dim)',
        fontSize: '0.75rem',
        background: 'var(--bg-app)'
      }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>AquaSense Telemetry & Demand Forecasting</span>
          <span className="mono">Unit aquasense_01</span>
        </div>
      </footer>
    </div>
  );
}
