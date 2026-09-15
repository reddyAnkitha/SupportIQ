from pathlib import Path

import joblib


BASE_DIR = Path(__file__).resolve().parent.parent.parent
VECTORIZER_FILE = (
    BASE_DIR
    / "backend"
    / "models"
    / "tfidf_vectorizer.pkl"
)


def load_vectorizer():
    if not VECTORIZER_FILE.exists():
        raise FileNotFoundError(
            "TF-IDF vectorizer not found."
        )

    return joblib.load(VECTORIZER_FILE)


def analyze_text(text: str):
    vectorizer = load_vectorizer()

    cleaned_text = text.strip()

    if not cleaned_text:
        raise ValueError(
            "Ticket description cannot be empty."
        )

    matrix = vectorizer.transform([cleaned_text])

    feature_names = vectorizer.get_feature_names_out()
    scores = matrix.toarray()[0]

    ranked_features = sorted(
        zip(feature_names, scores),
        key=lambda item: item[1],
        reverse=True,
    )

    important_terms = [
        {
            "term": term,
            "score": round(float(score), 4),
        }
        for term, score in ranked_features[:10]
        if score > 0
    ]

    return {
        "text_length": len(cleaned_text),
        "important_terms": important_terms,
    }
