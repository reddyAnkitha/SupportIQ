from pathlib import Path
import json


BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"


def load_json(filename):
    file_path = DATA_DIR / filename

    if not file_path.exists():
        raise FileNotFoundError(
            f"Analytics file not found: {filename}"
        )

    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def get_segments():
    return load_json("segment_dashboard.json")


def get_satisfaction():
    return load_json("satisfaction_dashboard.json")
