from pydantic import BaseModel, Field


class TicketRequest(BaseModel):
    customer_age: int = Field(..., ge=18, le=100)
    priority: str
    ticket_type: str
    channel: str
    description: str = Field(..., min_length=5, max_length=5000)
