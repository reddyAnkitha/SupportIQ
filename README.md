# SupportIQ

## Customer Support Intelligence Platform

SupportIQ is a machine learning and analytics platform that analyzes customer support tickets to identify customer segments, satisfaction risks, and resolution-time patterns through an interactive dashboard.

## 🚀 Live Demo

https://reddyankitha.github.io/SupportIQ/

## 📊 Kaggle Notebook

https://www.kaggle.com/code/hanumathureddygari/supportiq-customer-support-intelligence-platform

---

## 🎯 Key Features

- Customer segmentation using K-Means clustering
- Customer satisfaction risk analysis using Random Forest
- Ticket resolution-time analytics
- Interactive dashboard filters
- Customer segment analysis
- Priority, ticket type, and channel analysis
- Data visualization using Chart.js
- FastAPI backend for ticket analysis
- NLP-based ticket analysis using TF-IDF
- GitHub Pages deployment

---

## 📦 Dataset

**Customer Support Ticket Dataset**

- 8,469 support tickets
- 17 features
- Customer demographics
- Ticket information
- Priority and support channel
- Satisfaction ratings
- Response and resolution information

**Source:** Kaggle

---

## 🤖 Machine Learning

### Customer Segmentation

K-Means clustering is used to group customers based on:

- Customer Age
- Average Satisfaction
- Average Resolution Time

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

- Low Satisfaction
- Satisfied

Ratings of 1 or 2 are treated as low satisfaction.

**Model Accuracy:** 59.75%

---

## 📈 Dashboard

The SupportIQ dashboard provides:

- Total ticket count
- Average satisfaction
- Average resolution time
- Customer segment distribution
- Satisfaction-risk analysis
- Resolution analytics
- Interactive filtering
- Individual ticket analysis

### Filters

Users can filter support tickets by:

- Priority
- Ticket Type
- Support Channel
- Customer Segment

---

## 🔌 Backend API

SupportIQ includes a FastAPI backend for ticket analysis and customer satisfaction risk prediction.

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API status |
| GET | `/health` | Health check |
| GET | `/segments` | Customer segment analytics |
| GET | `/satisfaction` | Satisfaction analytics |
| POST | `/analyze` | Analyze a support ticket |

The `/analyze` endpoint accepts:

- Customer age
- Ticket priority
- Ticket type
- Support channel
- Ticket description

It returns:

- Ticket information
- Extracted keywords
- TF-IDF text analysis
- Satisfaction risk prediction
- Risk probability

### Backend Technology

- FastAPI
- Pydantic
- Pandas
- Scikit-learn
- Joblib
- TF-IDF
- Pytest
- GitHub Actions

### Testing

Backend tests are automatically executed using GitHub Actions on pushes and pull requests to the `main` branch.

---

## 📊 Dashboard Metrics

| Metric | Value |
|---|---:|
| Total Tickets | 8,469 |
| Closed Tickets | 2,769 |
| Open Tickets | 2,819 |
| Pending Tickets | 2,881 |
| Average Satisfaction | 2.99 / 5 |
| Average Resolution Time | 11.77 hours |
| Customer Segments | 6 |

---

## 💡 Key Insights

- Average customer satisfaction is **2.99 / 5**.
- **39.8%** of rated closed tickets are classified as low satisfaction.
- The highest-satisfaction segment has an average satisfaction of **4.44 / 5**.
- The highest-risk slow segment has an average satisfaction of **1.52 / 5**.
- Average resolution time is **11.77 hours**.

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
```\text
