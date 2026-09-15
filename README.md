# SupportIQ

## Customer Support Intelligence Platform

SupportIQ is a machine learning and analytics platform that analyzes customer support tickets to identify customer segments, satisfaction risks, and resolution-time patterns through an interactive dashboard.

## 🚀 Live Demo

https://reddyankitha.github.io/SupportIQ/

## 📊 Kaggle Notebook

https://www.kaggle.com/code/hanumathureddygari/supportiq-customer-support-intelligence-platform

---

## 🎯 Key Features

* Customer segmentation using K-Means clustering
* Customer satisfaction risk analysis using Random Forest
* Ticket resolution-time analytics
* Interactive dashboard filters
* Customer segment analysis
* Priority, ticket type, and channel analysis
* Data visualization using Chart.js
* GitHub Pages deployment

---

## 📦 Dataset

**Customer Support Ticket Dataset**

* 8,469 support tickets
* 17 features
* Customer demographics
* Ticket information
* Priority and support channel
* Satisfaction ratings
* Response and resolution information

**Source:** Kaggle

---

## 🤖 Machine Learning

### Customer Segmentation

K-Means clustering is used to group customers based on:

* Customer Age
* Average Satisfaction
* Average Resolution Time

### Customer Segments

1. Middle Age - Highly Satisfied and Fast
2. Older - At Risk and Fast
3. Older - At Risk and Slow
4. Older - Satisfied but Slow
5. Young - At Risk and Fast
6. Young - Satisfied but Slow

**Silhouette Score:** 0.295

### Satisfaction Risk Analysis

A Random Forest classifier is used to classify tickets into:

* Low Satisfaction
* Satisfied

Ratings of 1 or 2 are treated as low satisfaction.

**Model Accuracy:** 59.75%

---

## 📈 Dashboard

The SupportIQ dashboard provides:

* Total ticket count
* Average satisfaction
* Average resolution time
* Customer segment distribution
* Satisfaction-risk analysis
* Resolution analytics
* Interactive filtering

### Filters

Users can filter support tickets by:

* Priority
* Ticket Type
* Support Channel
* Customer Segment

---

## 🔌 Backend API

SupportIQ includes a FastAPI backend for ticket analysis and customer satisfaction risk prediction.

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | API status |
| GET | `/health` | Health check |
| GET | `/segments` | Customer segment analytics |
| GET | `/satisfaction` | Satisfaction analytics |
| POST | `/analyze` | Analyze a support ticket |

The `/analyze` endpoint accepts:

* Customer age
* Ticket priority
* Ticket type
* Support channel
* Ticket description

It returns:

* Ticket information
* Extracted keywords
* TF-IDF text analysis
* Satisfaction risk prediction
* Risk probability

### Backend Technology

* FastAPI
* Pydantic
* Pandas
* Scikit-learn
* Joblib
* TF-IDF
* Pytest
* GitHub Actions

### Testing

Backend tests are automatically executed using GitHub Actions on pushes and pull requests to the `main` branch.



## 📊 Dashboard Metrics

| Metric                  |       Value |
| ----------------------- | ----------: |
| Total Tickets           |       8,469 |
| Closed Tickets          |       2,769 |
| Open Tickets            |       2,819 |
| Pending Tickets         |       2,881 |
| Average Satisfaction    |    2.99 / 5 |
| Average Resolution Time | 11.77 hours |
| Customer Segments       |           6 |

---

## 💡 Key Insights

* Average customer satisfaction is **2.99 / 5**.
* **39.8%** of rated closed tickets are classified as low satisfaction.
* The highest-satisfaction segment has an average satisfaction of **4.44 / 5**.
* The highest-risk slow segment has an average satisfaction of **1.52 / 5**.
* Average resolution time is **11.77 hours**.

---

## 🔄 ML to Dashboard Workflow

```text
Customer Support Dataset
          ↓
Data Preprocessing
          ↓
Feature Engineering
          ↓
Machine Learning
          ↓
Customer Segmentation
          ↓
Exported Analytics
          ↓
Interactive Dashboard
          ↓
GitHub Pages
```

Customer segment results are connected to ticket records using:

`ticket_segment_mapping.json`

---

## 🛠️ Technology Stack

### Machine Learning

* Python
* Pandas
* NumPy
* Scikit-learn
* K-Means
* Random Forest

### Frontend

* HTML
* CSS
* JavaScript
* Chart.js

### Tools & Deployment

* Kaggle
* Git
* GitHub
* GitHub Pages

---

## 📁 Project Structure

SupportIQ/
│
├── .github/
│   └── workflows/
│       └── backend-tests.yml
│
├── backend/
│   ├── models/
│   │   └── metadata.json
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── ticket.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── analytics.py
│   │   ├── errors.py
│   │   ├── nlp.py
│   │   ├── nlp_prediction.py
│   │   └── prediction.py
│   │
│   ├── __init__.py
│   ├── main.py
│   ├── requirements.txt
│   └── README.md
│
├── data/
│   ├── dashboard_metrics.csv
│   ├── segment_dashboard.json
│   ├── satisfaction_dashboard.json
│   ├── resolution_by_priority.json
│   ├── resolution_by_type.json
│   └── resolution_by_channel.json
│
├── ml/
│   ├── __init__.py
│   ├── train_model.py
│   └── train_nlp.py
│
├── tests/
│   ├── test_api.py
│   └── test_prediction.py
│
├── index.html
├── style.css
├── script.js
├── ticket_data.json
├── ticket_segment_mapping.json
├── .gitignore
└── README.md

---

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/reddyAnkitha/SupportIQ.git
```

### 2. Open the project

```bash
cd SupportIQ
```

### 3. Start a local server

```bash
python -m http.server 8000
```

### 4. Open the dashboard

```text
http://localhost:8000
```

---

## 👩‍💻 Author

**Ankitha Reddy**

Software Development Engineer | Java Full Stack | Cloud & Machine Learning

**GitHub:**
https://github.com/reddyAnkitha

**Kaggle:**
https://www.kaggle.com/code/hanumathureddygari/supportiq-customer-support-intelligence-platform

````

The **critical fix** is this part:

```markdown
## 🔄 ML to Dashboard Workflow

```text
Customer Support Dataset
          ↓
Data Preprocessing
          ↓
Feature Engineering
          ↓
Machine Learning
          ↓
Customer Segmentation
          ↓
Exported Analytics
          ↓
Interactive Dashboard
          ↓
GitHub Pages
````

Customer segment results are connected to ticket records using:

````

You had the opening ` ```text ` but were missing the closing ` ``` `. I also added the missing closing fence around **Project Structure**, so the rest of the README will render normally.
````
