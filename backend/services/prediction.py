from pathlib import Path

import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_FILE = BASE_DIR / "backend" / "models" / "satisfaction_model.pkl"


def load_model():
    if not MODEL_FILE.exists():
        raise FileNotFoundError(
            "Satisfaction model not found."
        )

    return joblib.load(MODEL_FILE)


def predict_satisfaction_risk(
    customer_age,
    priority,
    ticket_type,
    channel,
):
    model = load_model()

    input_data = pd.DataFrame(
        [
            {
                "Ticket Priority": priority,
                "Ticket Type": ticket_type,
                "Ticket Channel": channel,
                "Customer Age": customer_age,
            }
        ]
    )

    prediction = model.predict(input_data)[0]

    probability = model.predict_proba(input_data)[0][1]

    return {
        "risk": int(prediction),
        "risk_label": (
            "High Risk"
            if prediction == 1
            else "Low Risk"
        ),
        "risk_probability": round(
            float(probability),
            4,
        ),
    }
