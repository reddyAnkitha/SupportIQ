import re


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def extract_keywords(text: str, limit: int = 10):
    cleaned = clean_text(text)

    words = cleaned.split()

    stop_words = {
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
    }

    words = [
        word
        for word in words
        if len(word) > 3 and word not in stop_words
    ]

    frequency = {}

    for word in words:
        frequency[word] = frequency.get(word, 0) + 1

    sorted_words = sorted(
        frequency.items(),
        key=lambda item: item[1],
        reverse=True
    )

    return sorted_words[:limit]
