from fastapi import FastAPI


app = FastAPI(
    title="SupportIQ API",
    description="Customer Support Intelligence API",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "name": "SupportIQ API",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
