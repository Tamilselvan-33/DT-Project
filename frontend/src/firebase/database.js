import {
  ref,
  onValue,
  get,
  set,
  update,
  query,
  limitToLast,
  orderByKey
} from 'firebase/database';
import { database, ensureAuthenticated } from './config';

export const DEFAULT_DEVICE_ID = 'aquasense_01';

/**
 * Subscribes to real-time Firebase connection status.
 */
export const subscribeToFirebaseConnection = (callback) => {
  const connectedRef = ref(database, '.info/connected');
  return onValue(connectedRef, (snap) => {
    callback(Boolean(snap.val()));
  }, (err) => {
    console.error('[Firebase] Connection monitor error:', err);
    callback(false);
  });
};

/**
 * Subscribes to live telemetry at `/devices/{deviceId}/live`.
 */
export const subscribeToLiveTelemetry = (
  deviceId = DEFAULT_DEVICE_ID,
  callback,
  onError
) => {
  ensureAuthenticated().catch(() => {});
  const liveRef = ref(database, `devices/${deviceId}/live`);
  
  return onValue(liveRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback(data);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error(`[Firebase] Error subscribing to live telemetry for ${deviceId}:`, error);
    if (onError) onError(error);
  });
};

/**
 * One-time fetch of live telemetry from `/devices/{deviceId}/live`.
 */
export const getLiveTelemetry = async (deviceId = DEFAULT_DEVICE_ID) => {
  await ensureAuthenticated();
  const liveRef = ref(database, `devices/${deviceId}/live`);
  const snapshot = await get(liveRef);
  return snapshot.exists() ? snapshot.val() : null;
};

/**
 * Normalizes a Firebase historical record into a clean reading object.
 */
const normalizeReading = (key, raw) => {
  if (!raw || typeof raw !== 'object') return null;

  let ts = raw.timestamp;
  if (!ts) {
    const parsedKey = Number(key);
    if (!isNaN(parsedKey) && parsedKey > 0) {
      ts = parsedKey;
    }
  }

  let dateObj = null;
  if (ts) {
    const numTs = Number(ts);
    dateObj = new Date(numTs > 1e11 ? numTs : numTs * 1000);
  }

  return {
    id: key,
    key: key,
    timestamp: ts || null,
    date: dateObj,
    flow1_lpm: Number(raw.flow1_lpm ?? 0),
    flow2_lpm: Number(raw.flow2_lpm ?? 0),
    flow1_total_liters: Number(raw.flow1_total_liters ?? 0),
    flow2_total_liters: Number(raw.flow2_total_liters ?? 0),
    flow1_total_pulses: Number(raw.flow1_total_pulses ?? 0),
    flow2_total_pulses: Number(raw.flow2_total_pulses ?? 0),
    flow_difference_l_min: Number(raw.flow_difference_l_min ?? 0),
    flow_difference_percent: Number(raw.flow_difference_percent ?? 0),
    water_level_raw: Number(raw.water_level_raw ?? 0),
    pump_status: Boolean(raw.pump_status),
    raw
  };
};

/**
 * Subscribes to historical readings at `/readings/{deviceId}`.
 * Firebase is the persistent source of truth.
 */
export const subscribeToHistoricalReadings = (
  deviceId = DEFAULT_DEVICE_ID,
  callback,
  onError,
  limitCount = 100
) => {
  ensureAuthenticated().catch(() => {});
  const readingsRef = ref(database, `readings/${deviceId}`);
  const q = limitCount ? query(readingsRef, limitToLast(limitCount)) : readingsRef;

  return onValue(q, (snapshot) => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      const readings = [];
      Object.entries(val).forEach(([key, record]) => {
        const item = normalizeReading(key, record);
        if (item) readings.push(item);
      });
      readings.sort((a, b) => {
        const tA = a.date ? a.date.getTime() : 0;
        const tB = b.date ? b.date.getTime() : 0;
        return tA - tB;
      });
      callback(readings);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error(`[Firebase] Error subscribing to historical readings for ${deviceId}:`, error);
    if (onError) onError(error);
  });
};

/**
 * One-time fetch of historical readings at `/readings/{deviceId}`.
 */
export const getHistoricalReadings = async (
  deviceId = DEFAULT_DEVICE_ID,
  limitCount = 100
) => {
  await ensureAuthenticated();
  const readingsRef = ref(database, `readings/${deviceId}`);
  const q = limitCount ? query(readingsRef, limitToLast(limitCount)) : readingsRef;
  const snapshot = await get(q);

  if (!snapshot.exists()) return [];

  const val = snapshot.val();
  const readings = [];
  Object.entries(val).forEach(([key, record]) => {
    const item = normalizeReading(key, record);
    if (item) readings.push(item);
  });
  readings.sort((a, b) => {
    const tA = a.date ? a.date.getTime() : 0;
    const tB = b.date ? b.date.getTime() : 0;
    return tA - tB;
  });
  return readings;
};

/**
 * Saves a reading to `/readings/{deviceId}/{timestamp}` in Firebase.
 * Ensures data is persisted every 5 seconds.
 */
export const recordTelemetryReading = async (
  deviceId = DEFAULT_DEVICE_ID,
  readingData
) => {
  if (!readingData) return false;
  await ensureAuthenticated();

  const nowSec = Math.floor(Date.now() / 1000);
  const readingTs = readingData.timestamp ? Number(readingData.timestamp) : nowSec;
  const normalizedTs = readingTs > 1e11 ? Math.floor(readingTs / 1000) : readingTs;
  
  // Use current seconds timestamp as key to ensure monotonic progression
  const recordKey = String(nowSec);

  const payload = {
    flow1_lpm: Number(readingData.flow1_lpm ?? 0),
    flow2_lpm: Number(readingData.flow2_lpm ?? 0),
    flow1_total_liters: Number(readingData.flow1_total_liters ?? 0),
    flow2_total_liters: Number(readingData.flow2_total_liters ?? 0),
    flow1_total_pulses: Number(readingData.flow1_total_pulses ?? 0),
    flow2_total_pulses: Number(readingData.flow2_total_pulses ?? 0),
    flow_difference_l_min: Number(readingData.flow_difference_l_min ?? 0),
    flow_difference_percent: Number(readingData.flow_difference_percent ?? 0),
    water_level_raw: Number(readingData.water_level_raw ?? 0),
    pump_status: Boolean(readingData.pump_status),
    timestamp: normalizedTs
  };

  const recordRef = ref(database, `readings/${deviceId}/${recordKey}`);
  await set(recordRef, payload);
  return true;
};

/**
 * Subscribes to device status at `/devices/{deviceId}/status`.
 */
export const subscribeToPumpStatus = (
  deviceId = DEFAULT_DEVICE_ID,
  callback,
  onError
) => {
  ensureAuthenticated().catch(() => {});
  const statusRef = ref(database, `devices/${deviceId}/status`);
  
  return onValue(statusRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  }, (error) => {
    console.error(`[Firebase] Error subscribing to pump status for ${deviceId}:`, error);
    if (onError) onError(error);
  });
};

/**
 * Dispatches pump control command to Firebase.
 * The ESP32 streamCallback specifically checks:
 *   if (dataType == "string") {
 *     String command = data.stringData();
 *     if (command == "ON") setPump(true);
 *     else if (command == "OFF") setPump(false);
 *   }
 * Writing a plain string "ON" or "OFF" triggers the relay.
 */
export const sendPumpCommand = async (
  deviceId = DEFAULT_DEVICE_ID,
  commandState
) => {
  await ensureAuthenticated();
  const validCmd = String(commandState).trim().toUpperCase();
  if (validCmd !== 'ON' && validCmd !== 'OFF') {
    throw new Error(`Invalid pump command: "${commandState}". Must be "ON" or "OFF".`);
  }

  // 1. Write plain string "ON" or "OFF" to /devices/{deviceId}/command
  const commandRef = ref(database, `devices/${deviceId}/command`);
  await set(commandRef, validCmd);

  // 2. Also write to alias /devices/aquasense/command if deviceId is aquasense_01
  if (deviceId === 'aquasense_01') {
    try {
      const aliasRef = ref(database, `devices/aquasense/command`);
      await set(aliasRef, validCmd);
    } catch (_) {}
  }

  return {
    success: true,
    command: validCmd,
    dispatchedAt: new Date().toISOString()
  };
};
