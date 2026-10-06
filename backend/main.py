import os
import sys
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aquasense.backend")

# Constants & Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL_PATH = os.path.join(BASE_DIR, "models", "best_model.joblib")
if not os.path.exists(DEFAULT_MODEL_PATH):
    DEFAULT_MODEL_PATH = r"C:\Users\tamil\OneDrive\Documents\Aqua\ML\ml\models\best_model.joblib"

DEFAULT_META_PATH = os.path.join(BASE_DIR, "models", "model_metadata.json")
if not os.path.exists(DEFAULT_META_PATH):
    DEFAULT_META_PATH = r"C:\Users\tamil\OneDrive\Documents\Aqua\ML\ml\models\model_metadata.json"

DEFAULT_CFG_PATH = os.path.join(BASE_DIR, "models", "feature_config.json")
if not os.path.exists(DEFAULT_CFG_PATH):
    DEFAULT_CFG_PATH = r"C:\Users\tamil\OneDrive\Documents\Aqua\ML\ml\models\feature_config.json"

MODEL_PATH = os.environ.get("AQUASENSE_MODEL_PATH", DEFAULT_MODEL_PATH)
METADATA_PATH = os.environ.get("AQUASENSE_METADATA_PATH", DEFAULT_META_PATH)
FEATURE_CONFIG_PATH = os.environ.get("AQUASENSE_FEATURE_CONFIG_PATH", DEFAULT_CFG_PATH)

# ML Model Manager
class ModelManager:
    def __init__(self):
        self.model = None
        self.metadata = {}
        self.feature_names = ["student_population"]
        self.load_model()

    def load_model(self):
        logger.info(f"Loading ML model from: {MODEL_PATH}")
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                logger.info(f"Loaded ML model successfully: {type(self.model).__name__}")
            except Exception as e:
                logger.error(f"Failed to load model from {MODEL_PATH}: {e}")
                self.model = None
        else:
            logger.error(f"Model file does not exist at {MODEL_PATH}")
            self.model = None

        if os.path.exists(METADATA_PATH):
            try:
                import json
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load metadata: {e}")
                self.metadata = {}
        else:
            self.metadata = {
                "model_type": "xgboost.XGBRegressor",
                "model_version": "3.0.0-population-xgboost",
                "design_lpcd": 120
            }

        if hasattr(self.model, "feature_names_in_"):
            self.feature_names = list(self.model.feature_names_in_)
        else:
            self.feature_names = ["student_population"]

    def is_ready(self) -> bool:
        return self.model is not None

    def predict(self, student_population: int) -> Dict[str, Any]:
        if not self.is_ready():
            self.load_model()
            if not self.is_ready():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="ML model is not loaded. Ensure best_model.joblib is accessible."
                )

        if student_population <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Student population must be greater than zero."
            )

        warnings = []
        if student_population < 100 or student_population > 10000:
            warnings.append(
                f"Student population ({student_population}) is outside the validated operating range [100, 10000]."
            )

        # Build feature DataFrame matching model requirements exactly
        input_df = pd.DataFrame([{"student_population": int(student_population)}])[self.feature_names]
        
        try:
            pred_raw = self.model.predict(input_df)[0]
            pred_30d = float(pred_raw)
        except Exception as e:
            logger.error(f"Prediction inference error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Inference failure: {str(e)}"
            )

        predicted_30_day_usage_liters = round(pred_30d, 2)
        predicted_daily_usage_liters = round(predicted_30_day_usage_liters / 30.0, 2)
        implied_lpcd = round(predicted_30_day_usage_liters / (student_population * 30.0), 2)

        return {
            "status": "success",
            "student_population": student_population,
            "predicted_30_day_usage_liters": predicted_30_day_usage_liters,
            "predicted_daily_usage_liters": predicted_daily_usage_liters,
            "implied_lpcd": implied_lpcd,
            "predicted_usage_million_liters": round(predicted_30_day_usage_liters / 1_000_000, 3),
            "model_type": type(self.model).__name__,
            "model_version": self.metadata.get("model_version", "3.0.0-population-xgboost"),
            "features_used": {"student_population": student_population},
            "warnings": warnings,
            "r2_score": self.metadata.get("test_r2", 0.9915),
            "mape_percent": self.metadata.get("test_mape", 4.14)
        }

model_manager = ModelManager()

# FastAPI App
app = FastAPI(
    title="AquaSense ML Backend",
    description="Dedicated prediction service for AquaSense water demand analytics using XGBoost.",
    version="3.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class PredictionRequest(BaseModel):
    student_population: int = Field(..., ge=1, le=100000, description="Number of students on campus")

@app.get("/")
def read_root():
    return {
        "service": "AquaSense ML Prediction Backend",
        "status": "online",
        "model_loaded": model_manager.is_ready()
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_ready": model_manager.is_ready(),
        "model_path": MODEL_PATH,
        "model_class": type(model_manager.model).__name__ if model_manager.is_ready() else None
    }

@app.get("/api/prediction/status")
@app.get("/api/model/status")
def get_model_status():
    return {
        "loaded": model_manager.is_ready(),
        "model_type": type(model_manager.model).__name__ if model_manager.is_ready() else "Unavailable",
        "model_version": model_manager.metadata.get("model_version", "3.0.0-population-xgboost"),
        "target": model_manager.metadata.get("target_name", "future_30d_usage_liters"),
        "expected_features": model_manager.feature_names,
        "operating_range": {
            "min": model_manager.metadata.get("population_min", 100),
            "max": model_manager.metadata.get("population_max", 10000),
            "design_lpcd": model_manager.metadata.get("design_lpcd", 120)
        },
        "performance_metrics": {
            "test_r2": model_manager.metadata.get("test_r2", 0.9915),
            "test_mae": model_manager.metadata.get("test_mae", 664986.57),
            "test_mape": model_manager.metadata.get("test_mape", 4.14)
        }
    }

@app.post("/api/prediction")
def predict_water_demand(payload: PredictionRequest):
    """
    Receives student population, derives prediction using best_model.joblib,
    and returns 30-day and daily water demand metrics.
    """
    return model_manager.predict(payload.student_population)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
