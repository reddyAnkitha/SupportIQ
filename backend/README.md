# SupportIQ Backend

The SupportIQ backend provides API endpoints for customer support analytics, ticket analysis, NLP processing, and satisfaction-risk prediction.

## API Endpoints

### Health Check

`GET /health`

Returns the current API health status.

### Customer Segments

`GET /segments`

Returns customer segmentation analytics.

### Satisfaction Analytics

`GET /satisfaction`

Returns customer satisfaction analytics.

### Ticket Analysis

`POST /analyze`

Analyzes a support ticket using:

- Ticket metadata
- Keyword extraction
- TF-IDF text analysis
- Satisfaction-risk prediction

## Ticket Request

The `/analyze` endpoint accepts:

```json
{
  "customer_age": 30,
  "priority": "High",
  "ticket_type": "Technical issue",
  "channel": "Email",
  "description": "The customer is unable to access the application."
}

##Technologies
Python
FastAPI
Pydantic
Pandas
NumPy
Scikit-learn
Joblib

##Project Structure
backend/
├── main.py
├── requirements.txt
├── models/
├── schemas/
│   └── ticket.py
└── services/
    ├── analytics.py
    ├── errors.py
    ├── nlp.py
    ├── nlp_prediction.py
    └── prediction.py

 ##
5. Commit with:

```text id="7n3vpa"
Document SupportIQ backend API   
