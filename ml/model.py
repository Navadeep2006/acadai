"""
AcadAI — ML Prediction Engine
Trains Linear Regression + Random Forest models on student data.
Automatically retrains when new data arrives from Firebase.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
import joblib
import os
import json
import time
import threading
import logging

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_PATH, exist_ok=True)

# ─────────────────────────────────────────────────────────────
#  SYNTHETIC TRAINING DATA (bootstraps the model before real
#  Firebase data accumulates — replaced once MIN_SAMPLES reached)
# ─────────────────────────────────────────────────────────────
def generate_synthetic_data(n=400):
    np.random.seed(42)
    attendance      = np.random.normal(80, 12, n).clip(40, 100)
    study_hours     = np.random.normal(4,  1.5, n).clip(0.5, 12)
    assignment_score= np.random.normal(74, 14, n).clip(20, 100)
    participation   = np.random.normal(72, 15, n).clip(20, 100)
    prev_avg        = np.random.normal(72, 16, n).clip(20, 100)
    quiz_avg        = np.random.normal(70, 15, n).clip(20, 100)
    subject_avg     = np.random.normal(73, 14, n).clip(20, 100)

    # Realistic weighted formula
    score = (
        0.22 * attendance +
        0.18 * study_hours * 8 +   # normalise to 0-100 scale
        0.18 * assignment_score +
        0.10 * participation +
        0.20 * prev_avg +
        0.07 * quiz_avg +
        0.05 * subject_avg
    )
    noise = np.random.normal(0, 4, n)
    final_mark = (score + noise).clip(20, 100)

    return pd.DataFrame({
        "attendance":       attendance,
        "study_hours":      study_hours,
        "assignment_score": assignment_score,
        "participation":    participation,
        "prev_avg":         prev_avg,
        "quiz_avg":         quiz_avg,
        "subject_avg":      subject_avg,
        "final_mark":       final_mark
    })


# ─────────────────────────────────────────────────────────────
#  FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────
def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Adds interaction + polynomial features for better accuracy."""
    out = df.copy()
    out["study_x_attend"]    = out["study_hours"] * out["attendance"] / 100
    out["assign_x_quiz"]     = (out["assignment_score"] + out["quiz_avg"]) / 2
    out["consistency_score"] = out[["attendance","assignment_score","participation"]].std(axis=1).rsub(100).clip(0, 100)
    out["study_hours_sq"]    = out["study_hours"] ** 2
    return out

FEATURE_COLS = [
    "attendance", "study_hours", "assignment_score", "participation",
    "prev_avg", "quiz_avg", "subject_avg",
    "study_x_attend", "assign_x_quiz", "consistency_score", "study_hours_sq"
]


# ─────────────────────────────────────────────────────────────
#  MODEL REGISTRY
# ─────────────────────────────────────────────────────────────
class ModelRegistry:
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.last_trained = None
        self.metrics = {}
        self.training_samples = 0
        self._lock = threading.Lock()
        self._load_or_train()

    # ── train ──────────────────────────────────────────────
    def train(self, df: pd.DataFrame):
        logger.info(f"Training on {len(df)} samples …")
        df_feat = build_features(df)
        X = df_feat[FEATURE_COLS].values
        y = df_feat["final_mark"].values

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        self.scaler.fit(X_train)
        Xs_train = self.scaler.transform(X_train)
        Xs_test  = self.scaler.transform(X_test)

        candidates = {
            "random_forest": RandomForestRegressor(
                n_estimators=200, max_depth=8,
                min_samples_leaf=3, random_state=42, n_jobs=-1
            ),
            "gradient_boost": GradientBoostingRegressor(
                n_estimators=150, learning_rate=0.08,
                max_depth=4, random_state=42
            ),
            "ridge": Ridge(alpha=1.0)
        }

        best_name, best_model, best_mae = None, None, float("inf")
        for name, mdl in candidates.items():
            Xtr = Xs_train if name == "ridge" else X_train
            Xte = Xs_test  if name == "ridge" else X_test
            mdl.fit(Xtr, y_train)
            preds = mdl.predict(Xte)
            mae   = mean_absolute_error(y_test, preds)
            r2    = r2_score(y_test, preds)
            self.metrics[name] = {"mae": round(mae, 2), "r2": round(r2, 4)}
            logger.info(f"  {name}: MAE={mae:.2f}  R²={r2:.4f}")
            if mae < best_mae:
                best_mae, best_name, best_model = mae, name, mdl

        with self._lock:
            self.models       = candidates
            self.best_name    = best_name
            self.last_trained = time.time()
            self.training_samples = len(df)

        self._save()
        logger.info(f"Best model: {best_name}  MAE={best_mae:.2f}")

    # ── predict ────────────────────────────────────────────
    def predict(self, features: dict) -> dict:
        row = pd.DataFrame([{
            "attendance":       features.get("attendance", 80),
            "study_hours":      features.get("studyHours", 3),
            "assignment_score": features.get("assignmentScore", 70),
            "participation":    features.get("participation", 70),
            "prev_avg":         np.mean(features.get("prevMarks", [70])),
            "quiz_avg":         np.mean(features.get("quizScores", [70])),
            "subject_avg":      np.mean(list(features.get("subjects", {"x": 70}).values())),
            "final_mark":       0   # placeholder
        }])
        row_feat = build_features(row)
        X = row_feat[FEATURE_COLS].values

        preds = {}
        for name, mdl in self.models.items():
            Xin = self.scaler.transform(X) if name == "ridge" else X
            preds[name] = float(mdl.predict(Xin)[0])

        # Weighted ensemble
        weights = {"random_forest": 0.45, "gradient_boost": 0.40, "ridge": 0.15}
        ensemble = sum(preds[n] * w for n, w in weights.items() if n in preds)
        ensemble = float(np.clip(ensemble, 0, 100))

        # Pass probability (sigmoid-style based on distance from 40)
        pass_prob = round(min(99, max(1,
            100 / (1 + np.exp(-0.18 * (ensemble - 40)))
        )))

        # Feature importance (Random Forest)
        rf = self.models.get("random_forest")
        importance = {}
        if rf and hasattr(rf, "feature_importances_"):
            for col, imp in zip(FEATURE_COLS, rf.feature_importances_):
                importance[col] = round(float(imp), 4)

        # Grade
        if   ensemble >= 90: grade = "A+"
        elif ensemble >= 80: grade = "A"
        elif ensemble >= 70: grade = "B+"
        elif ensemble >= 60: grade = "B"
        elif ensemble >= 50: grade = "C"
        elif ensemble >= 40: grade = "D"
        else:                grade = "F"

        # Risk level
        if   ensemble >= 70 and features.get("attendance", 80) >= 80: risk = "low"
        elif ensemble >= 55 and features.get("attendance", 80) >= 65: risk = "medium"
        else:                                                          risk = "high"

        # Trend from prevMarks
        marks = features.get("prevMarks", [ensemble])
        if len(marks) >= 2:
            slope = np.polyfit(range(len(marks)), marks, 1)[0]
            trend = "improving" if slope > 1 else "declining" if slope < -1 else "stable"
        else:
            trend = "stable"

        return {
            "predictedMark":   round(ensemble, 1),
            "passProbability": pass_prob,
            "grade":           grade,
            "riskLevel":       risk,
            "trend":           trend,
            "modelBreakdown":  {k: round(v, 1) for k, v in preds.items()},
            "featureImportance": importance,
            "modelUsed":       "weighted_ensemble",
            "bestModel":       self.best_name,
            "metrics":         self.metrics,
            "trainedOn":       self.training_samples
        }

    # ── persist ────────────────────────────────────────────
    def _save(self):
        try:
            joblib.dump(self.models,  os.path.join(MODEL_PATH, "models.pkl"))
            joblib.dump(self.scaler,  os.path.join(MODEL_PATH, "scaler.pkl"))
            meta = {"last_trained": self.last_trained,
                    "metrics": self.metrics,
                    "training_samples": self.training_samples,
                    "best_name": getattr(self, "best_name", "random_forest")}
            with open(os.path.join(MODEL_PATH, "meta.json"), "w") as f:
                json.dump(meta, f, indent=2)
            logger.info("Models saved.")
        except Exception as e:
            logger.warning(f"Save failed: {e}")

    def _load_or_train(self):
        models_path = os.path.join(MODEL_PATH, "models.pkl")
        scaler_path = os.path.join(MODEL_PATH, "scaler.pkl")
        if os.path.exists(models_path) and os.path.exists(scaler_path):
            try:
                self.models = joblib.load(models_path)
                self.scaler = joblib.load(scaler_path)
                with open(os.path.join(MODEL_PATH, "meta.json")) as f:
                    meta = json.load(f)
                self.last_trained     = meta.get("last_trained")
                self.metrics          = meta.get("metrics", {})
                self.training_samples = meta.get("training_samples", 0)
                self.best_name        = meta.get("best_name", "random_forest")
                logger.info(f"Models loaded from disk ({self.training_samples} samples).")
                return
            except Exception as e:
                logger.warning(f"Could not load saved models: {e}. Retraining …")

        df = generate_synthetic_data(400)
        self.train(df)


# Singleton
_registry = None

def get_registry() -> ModelRegistry:
    global _registry
    if _registry is None:
        _registry = ModelRegistry()
    return _registry


def retrain_from_firebase(db):
    """Called in background when Firebase has enough real records."""
    try:
        ref   = db.reference("student_records")
        snap  = ref.get()
        if not snap:
            return
        rows = list(snap.values()) if isinstance(snap, dict) else snap
        if len(rows) < 10:
            logger.info(f"Only {len(rows)} Firebase records — keeping synthetic model.")
            return
        df = pd.DataFrame(rows)
        required = ["attendance","study_hours","assignment_score",
                    "participation","prev_avg","quiz_avg","subject_avg","final_mark"]
        if not all(c in df.columns for c in required):
            logger.warning("Firebase records missing columns — skipping retrain.")
            return
        df = df[required].dropna()
        # Blend synthetic + real for robustness
        synthetic = generate_synthetic_data(max(0, 200 - len(df)))
        combined  = pd.concat([synthetic, df], ignore_index=True)
        get_registry().train(combined)
        logger.info(f"Retrained with {len(df)} real + {len(synthetic)} synthetic samples.")
    except Exception as e:
        logger.error(f"Firebase retrain error: {e}")
