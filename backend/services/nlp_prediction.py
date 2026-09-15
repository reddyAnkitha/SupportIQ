from collections import Counter
import re


STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "have",
    "has",
    "was",
    "are",
    "not",
    "but",
    "you",
    "your",
    "unable",
    "issue",
    "problem",
    "please",
}


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def analyze_text(text: str):
    cleaned_text = clean_text(text)

    if not cleaned_text:
        raise ValueError(
            "Ticket description cannot be empty."
        )

    words = [
        word
        for word in cleaned_text.split()
        if len(word) > 3 and word not in STOP_WORDS
    ]

    frequency = Counter(words)

    important_terms = [
        {
            "term": word,
            "frequency": count,
        }
        for word, count in frequency.most_common(10)
    ]

    return {
        "status": "success",
        "text_length": len(cleaned_text),
        "word_count": len(cleaned_text.split()),
        "important_terms": important_terms,
    }
