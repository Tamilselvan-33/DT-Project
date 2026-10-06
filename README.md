# AquaSense — Precision Water Telemetry & AI Forecasting

AquaSense is an integrated IoT water telemetry and machine-learning forecasting system. It connects physical sensors via ESP32, streams real-time data to Firebase Realtime Database, provides an industrial web control dashboard, and forecasts 30-day institutional water demand using a trained XGBoost Regressor.

---

## Architecture Overview

```text
ESP32 Hardware (GPIO 25, 26, 27, 34)
   │
   │ Live Telemetry & Relay Status
   ▼
Firebase Realtime Database (dt-project-522f4)
   │
   ├──────────────► Web Frontend (Vite + React)
   │                 ├── Live Telemetry Oscilloscope
   │                 ├── Reservoir Fluid Visualizer
   │                 ├── Hardware Actuator Gateway
   │                 └── Persistent Historical Records
   │
   └──────────────► ML Backend (FastAPI + XGBoost)
                     └── 30-Day Campus Demand Inference
```

---

## Directory Structure

```text
AquaSense/
├── backend/
│   ├── main.py              # FastAPI service & prediction API
│   ├── requirements.txt     # Backend dependencies
│   └── models/              # Trained XGBoost artifacts
│       ├── best_model.joblib
│       ├── model_metadata.json
│       └── feature_config.json
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── api/
│   │   │   └── mlService.js
│   │   ├── firebase/
│   │   │   ├── config.js
│   │   │   └── database.js
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── LiveTelemetryView.jsx
│   │       ├── HistoricalView.jsx
│   │       ├── PumpControlView.jsx
│   │       └── PredictionView.jsx
└── README.md
```

---

## Getting Started

### 1. Backend ML Service
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend Web Application
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Firebase Configuration
* **Database URL:** `https://dt-project-522f4-default-rtdb.firebaseio.com/`
* **Device ID:** `aquasense_01`
* **Telemetry Path:** `/devices/aquasense_01/live`
* **Command Path:** `/devices/aquasense_01/command`
* **Status Path:** `/devices/aquasense_01/status`
* **Historical Records:** `/readings/aquasense_01/{timestamp}`
