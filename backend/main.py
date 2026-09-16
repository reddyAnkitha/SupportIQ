from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas.ticket import TicketRequest
from backend.services.nlp import extract_keywords
from backend.services.analytics import get_segments, get_satisfaction
from backend.services.prediction import predict_satisfaction_risk
from backend.services.errors import handle_service_error
from backend.services.nlp_prediction import analyze_text

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
except Exception as error:
raise handle_service_error(error)

@app.get("/satisfaction")
def satisfaction():
try:
return get_satisfaction()
except Exception as error:
raise handle_service_error(error)

@app.post("/analyze")
def analyze_ticket(ticket: TicketRequest):
try:
keywords = extract_keywords(ticket.description)

    text_analysis = analyze_text(ticket.description)

    prediction = predict_satisfaction_risk(
        customer_age=ticket.customer_age,
        priority=ticket.priority,
        ticket_type=ticket.ticket_type,
        channel=ticket.channel,
    )

    return {
        "ticket_type": ticket.ticket_type,
        "priority": ticket.priority,
        "channel": ticket.channel,
        "keywords": keywords,
        "text_analysis": text_analysis,
        "prediction": prediction,
    }

except Exception as error:
    raise handle_service_error(error)

