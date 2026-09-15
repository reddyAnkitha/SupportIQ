from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

DATA_FILE = BASE_DIR / "ticket_data.json"
MODEL_DIR = BASE_DIR / "backend" / "models"


def main():
    print("SupportIQ model training")
    print("------------------------")

    print(f"Data file: {DATA_FILE}")
    print(f"Model directory: {MODEL_DIR}")

    if not DATA_FILE.exists():
        print("ERROR: ticket_data.json was not found.")
        return

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    print("Dataset found successfully.")
    print("Model training will be added in the next step.")


if __name__ == "__main__":
    main()
