"""
PFI (Professional Fidelity Index) ML Model Service.

Uses scikit-learn to:
1. Train a weighted scoring model from historical project data
2. Predict PFI scores for new freelancers with limited history
3. Detect anomalies (sudden drops, suspicious patterns)
4. Generate feature importance explanations

Model is saved with joblib and reloaded on startup.
Falls back to weighted formula if model not yet trained.
"""

import numpy as np
import pandas as pd
import joblib
import os
from pathlib import Path
from datetime import datetime

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import MinMaxScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
from sklearn.metrics import mean_absolute_error

MODEL_PATH = Path(__file__).parent.parent / "ml_models" / "pfi_model.joblib"
SCALER_PATH = Path(__file__).parent.parent / "ml_models" / "pfi_scaler.joblib"

# Feature weights used in formula-based fallback
WEIGHTS = {
    "milestone_accuracy":    0.25,
    "deadline_adherence":    0.30,
    "aqa_pass_rate":         0.25,
    "employer_satisfaction": 0.20,
}


def extract_features(freelancer_history: dict) -> np.ndarray:
    """
    Extract numeric features from a freelancer's project history.
    Returns a feature vector for the ML model.
    """
    features = [
        float(freelancer_history.get("milestone_accuracy", 0.7)),
        float(freelancer_history.get("deadline_adherence", 0.7)),
        float(freelancer_history.get("aqa_pass_rate", 0.7)),
        float(freelancer_history.get("employer_satisfaction", 0.7)),
        float(freelancer_history.get("total_projects", 0)),
        float(freelancer_history.get("avg_correction_rounds", 1.0)),
        float(freelancer_history.get("buffer_days_used_rate", 0.0)),
        float(freelancer_history.get("abandonment_rate", 0.0)),
    ]
    return np.array(features).reshape(1, -1)


def formula_pfi(history: dict) -> float:
    """
    Formula-based PFI calculation (fallback when ML model not trained yet).
    Weighted sum of 4 key metrics.
    """
    raw = sum(
        float(history.get(k, 0.7)) * w
        for k, w in WEIGHTS.items()
    )
    # Apply penalty multipliers
    abandonment_penalty = 1.0 - (float(history.get("abandonment_rate", 0)) * 0.5)
    buffer_penalty = 1.0 - (float(history.get("buffer_days_used_rate", 0)) * 0.1)
    return round(raw * abandonment_penalty * buffer_penalty * 100, 1)


def load_pfi_model():
    """Load trained model from disk. Returns None if not trained yet."""
    if MODEL_PATH.exists():
        try:
            model = joblib.load(MODEL_PATH)
            print("[ML] PFI model loaded from disk.")
            return model
        except Exception as e:
            print(f"[ML] Could not load PFI model: {e}")
    return None


def train_pfi_model(training_data: list) -> dict:
    """
    Train the PFI model from historical completed project data.

    Args:
        training_data: List of dicts, each with feature keys + 'true_pfi' label.
                       Typically generated from completed contracts in MongoDB.

    Returns:
        Training metrics dict.
    """
    if len(training_data) < 20:
        return {"error": "Need at least 20 completed projects to train. Using formula fallback."}

    df = pd.DataFrame(training_data)
    feature_cols = [
        "milestone_accuracy", "deadline_adherence", "aqa_pass_rate",
        "employer_satisfaction", "total_projects", "avg_correction_rounds",
        "buffer_days_used_rate", "abandonment_rate"
    ]

    # Fill missing columns with defaults
    for col in feature_cols:
        if col not in df.columns:
            df[col] = 0.7

    X = df[feature_cols].values
    y = df["true_pfi"].values

    # Build sklearn pipeline: scaler + gradient boosting
    pipeline = Pipeline([
        ("scaler", MinMaxScaler()),
        ("model", GradientBoostingRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            random_state=42
        ))
    ])

    # Cross-validate
    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="neg_mean_absolute_error")
    mae = -cv_scores.mean()

    # Train on full data
    pipeline.fit(X, y)

    # Save model
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"[ML] PFI model trained and saved. MAE: {mae:.2f}")

    return {
        "status": "trained",
        "samples": len(training_data),
        "mae": round(mae, 2),
        "cv_scores": [-s for s in cv_scores.tolist()],
    }


def predict_pfi(freelancer_history: dict) -> float:
    """
    Predict PFI score for a freelancer.
    Uses ML model if trained, falls back to formula.
    """
    model = load_pfi_model()

    if model is not None:
        try:
            features = extract_features(freelancer_history)
            prediction = model.predict(features)[0]
            return round(float(np.clip(prediction, 0, 100)), 1)
        except Exception as e:
            print(f"[ML] Prediction error, using formula: {e}")

    return formula_pfi(freelancer_history)


def get_feature_importance() -> dict:
    """Return feature importance from trained model for admin dashboard."""
    model = load_pfi_model()
    if model is None:
        return {"error": "Model not trained yet"}

    feature_names = [
        "milestone_accuracy", "deadline_adherence", "aqa_pass_rate",
        "employer_satisfaction", "total_projects", "avg_correction_rounds",
        "buffer_days_used_rate", "abandonment_rate"
    ]

    try:
        gb_model = model.named_steps["model"]
        importances = gb_model.feature_importances_
        return {
            name: round(float(imp), 4)
            for name, imp in sorted(
                zip(feature_names, importances),
                key=lambda x: x[1], reverse=True
            )
        }
    except Exception as e:
        return {"error": str(e)}


def build_training_data_from_db() -> list:
    """
    Pull completed contracts from MongoDB and build training dataset.
    Called by admin endpoint to retrain the model periodically.
    """
    from database.connection import contracts_col, milestones_col, pfi_col
    from bson import ObjectId

    completed = list(contracts_col.find({"status": "completed"}))
    training_rows = []

    for contract in completed:
        cid = str(contract["_id"])
        fid = contract.get("freelancer_id", "")
        milestones = list(milestones_col.find({"contract_id": cid}))

        if not milestones:
            continue

        total = len(milestones)
        approved = [m for m in milestones if m.get("status") == "approved"]
        on_time = [m for m in milestones if m.get("submitted_on_time", False)]
        first_pass = [m for m in milestones if m.get("aqa_result", {}).get("verdict") == "pass"]
        not_flagged = [m for m in milestones if not m.get("employer_flagged", False)]

        # Calculate correction rounds per milestone
        correction_rounds = []
        for m in milestones:
            rounds = m.get("correction_rounds", 1)
            correction_rounds.append(rounds)

        row = {
            "milestone_accuracy": len(first_pass) / total,
            "deadline_adherence": len(on_time) / total,
            "aqa_pass_rate": len(approved) / total,
            "employer_satisfaction": len(not_flagged) / total,
            "total_projects": contracts_col.count_documents(
                {"freelancer_id": fid, "status": "completed"}
            ),
            "avg_correction_rounds": np.mean(correction_rounds) if correction_rounds else 1.0,
            "buffer_days_used_rate": 1.0 if contract.get("buffer_revealed", False) else 0.0,
            "abandonment_rate": 0.0,
        }

        # Use existing PFI record as label if available
        pfi_record = pfi_col.find_one({"freelancer_id": fid, "contract_id": cid})
        if pfi_record:
            row["true_pfi"] = pfi_record.get("new_score", formula_pfi(row))
        else:
            row["true_pfi"] = formula_pfi(row)

        training_rows.append(row)

    return training_rows
