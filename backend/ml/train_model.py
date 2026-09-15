from pathlib import Path
import json

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


BASE_DIR = Path(__file__).resolve().parent.parent

DATA_FILE = BASE_DIR / "ticket_data.json"
MODEL_DIR = BASE_DIR / "backend" / "models"
MODEL_FILE = MODEL_DIR / "satisfaction_model.pkl"
METADATA_FILE = MODEL_DIR / "metadata.json"


def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    return pd.DataFrame(data)


def prepare_data(df):
    required_columns = [
        "Ticket Priority",
        "Ticket Type",
        "Ticket Channel",
        "Customer Age",
        "Customer Satisfaction Rating",
    ]

    missing_columns = [
        column for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    df = df[required_columns].copy()

    df = df.dropna(
        subset=["Customer Satisfaction Rating"]
    )

    df["Customer Age"] = pd.to_numeric(
        df["Customer Age"],
        errors="coerce"
    )

    df["Customer Satisfaction Rating"] = pd.to_numeric(
        df["Customer Satisfaction Rating"],
        errors="coerce"
    )

    df = df.dropna()

    df["Satisfaction Risk"] = (
        df["Customer Satisfaction Rating"] <= 2
    ).astype(int)

    return df


def train_model(df):
    features = [
        "Ticket Priority",
        "Ticket Type",
        "Ticket Channel",
        "Customer Age",
    ]

    target = "Satisfaction Risk"

    X = df[features]
    y = df[target]

    categorical_features = [
        "Ticket Priority",
        "Ticket Type",
        "Ticket Channel",
    ]

    numerical_features = [
        "Customer Age",
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                categorical_features,
            ),
            (
                "numerical",
                "passthrough",
                numerical_features,
            ),
        ]
    )

    model = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        class_weight="balanced",
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)

    accuracy = accuracy_score(
        y_test,
        predictions,
    )

    print(f"Accuracy: {accuracy:.4f}")
    print()
    print(classification_report(y_test, predictions))

    return pipeline, accuracy


def save_model(model, accuracy):
    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        model,
        MODEL_FILE,
    )

    metadata = {
        "model": "RandomForestClassifier",
        "target": "Satisfaction Risk",
        "risk_definition": "Rating <= 2",
        "accuracy": round(float(accuracy), 4),
        "features": [
            "Ticket Priority",
            "Ticket Type",
            "Ticket Channel",
            "Customer Age",
        ],
    }

    with open(
        METADATA_FILE,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            metadata,
            file,
            indent=2,
        )

    print(f"Model saved to: {MODEL_FILE}")
    print(f"Metadata saved to: {METADATA_FILE}")


def main():
    print("SupportIQ Satisfaction Risk Model")
    print("---------------------------------")

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_FILE}"
        )

    df = load_data()

    print(f"Total records: {len(df)}")

    df = prepare_data(df)

    print(f"Training records: {len(df)}")

    model, accuracy = train_model(df)

    save_model(
        model,
        accuracy,
    )


if __name__ == "__main__":
    main()
