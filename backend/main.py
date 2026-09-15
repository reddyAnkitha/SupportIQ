from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas.ticket import TicketRequest
from services.nlp import extract_keywords
from services.analytics import get_segments, get_satisfaction
from services.prediction import predict_satisfaction_risk


app = FastAPI(
    title="SupportIQ API",
    description="Customer Support Intelligence API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
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


@app.get("/segments")
def segments():
    try:
        return get_segments()
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@app.get("/satisfaction")
def satisfaction():
    try:
        return get_satisfaction()
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@app.post("/analyze")
def analyze_ticket(ticket: TicketRequest):
    keywords = extract_keywords(ticket.description)

    try:
        prediction = predict_satisfaction_risk(
            customer_age=ticket.customer_age,
            priority=ticket.priority,
            ticket_type=ticket.ticket_type,
            channel=ticket.channel,
        )
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    return {
        "ticket_type": ticket.ticket_type,
        "priority": ticket.priority,
        "channel": ticket.channel,
        "keywords": keywords,
        "prediction": prediction,
    }
