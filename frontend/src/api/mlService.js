const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

/**
 * Checks backend API health and model readiness.
 */
export const checkBackendHealth = async () => {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      model_ready: false,
      error: err.message
    };
  }
};

/**
 * Fetches model status, features, and metadata.
 */
export const getModelStatus = async () => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/prediction/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    return {
      loaded: false,
      model_type: 'Unavailable',
      error: err.message
    };
  }
};

/**
 * Calls backend prediction endpoint for a given student population.
 * @param {number} studentPopulation
 */
export const predictWaterDemand = async (studentPopulation) => {
  const popNumber = Number(studentPopulation);
  if (!popNumber || isNaN(popNumber) || popNumber <= 0) {
    throw new Error('Student population must be a positive integer.');
  }

  const res = await fetch(`${BACKEND_URL}/api/prediction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      student_population: Math.round(popNumber)
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!res.ok) {
    let errMsg = `Server returned ${res.status}`;
    try {
      const errData = await res.json();
      if (errData && errData.detail) errMsg = errData.detail;
    } catch (_) {}
    throw new Error(errMsg);
  }

  return await res.json();
};
