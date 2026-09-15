from pathlib import Path
import json

import joblib
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer


BASE_DIR = Path(__file__).resolve().parent.parent

DATA_FILE = BASE_DIR / "ticket_data.json"
MODEL_DIR = BASE_DIR / "backend" / "models"
VECTORIZER_FILE = MODEL_DIR / "tfidf_vectorizer.pkl"


def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    return pd.DataFrame(data)


def prepare_text(df):
    if "Description" not in df.columns:
        raise ValueError(
            "Required column 'Description' was not found in ticket_data.json."
        )

    text = df["Description"].fillna("").astype(str)

    text = text[text.str.strip().str.len() > 0]

    if len(text) == 0:
        raise ValueError(
            "No valid ticket descriptions were found."
        )

    return text


def train_vectorizer(text):
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        max_features=1000,
        ngram_range=(1, 2),
        min_df=2,
    )

    vectorizer.fit(text)

    return vectorizer


def save_vectorizer(vectorizer):
    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        vectorizer,
        VECTORIZER_FILE,
    )

    print(f"TF-IDF vectorizer saved to: {VECTORIZER_FILE}")


def main():
    print("SupportIQ NLP Training")
    print("----------------------")

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_FILE}"
        )

    df = load_data()

    print(f"Total records: {len(df)}")

    text = prepare_text(df)

    print(f"Valid descriptions: {len(text)}")

    vectorizer = train_vectorizer(text)

    print(f"Vocabulary size: {len(vectorizer.vocabulary_)}")

    save_vectorizer(vectorizer)


if __name__ == "__main__":
    main()
