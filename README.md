# SupportIQ

## Customer Support Intelligence Platform

SupportIQ is a customer support analytics and machine learning platform built using the Customer Support Ticket Dataset.

The project analyzes customer support tickets to identify customer segments, understand satisfaction risk, and compare ticket resolution patterns.

## Live Demo

https://reddyankitha.github.io/SupportIQ/

## Project Objectives

SupportIQ focuses on three customer support business problems:

1. Customer Segmentation
2. Customer Satisfaction Risk Analysis
3. Ticket Resolution Analytics

## Dataset

The project uses the Customer Support Ticket Dataset from Kaggle.

Dataset size:

- 8,469 support tickets
- 17 features
- Customer information
- Ticket information
- Support channel
- Priority
- Satisfaction rating
- Response and resolution timestamps

## Machine Learning

### 1. Customer Segmentation

K-Means clustering was used to identify groups of customers with similar support experiences.

Features used:

- Customer Age
- Average Satisfaction
- Average Resolution Time

Six customer segments were identified.

The segments include:

- Middle Age - Highly Satisfied and Fast
- Older - At Risk and Fast
- Older - At Risk and Slow
- Older - Satisfied but Slow
- Young - At Risk and Fast
- Young - Satisfied but Slow

Silhouette Score:

**0.295**

### 2. Customer Satisfaction Risk

A Random Forest classifier was used to classify support tickets into:

- Low Satisfaction
- Satisfied

Ratings of 1 or 2 were classified as Low Satisfaction.

Results:

- Low Satisfaction Tickets: 1,102
- Satisfied Tickets: 1,667
- Low Satisfaction Rate: 39.8%
- Model Accuracy: 59.75%

The model showed limited predictive power for low-satisfaction tickets, so the result is presented as a risk-analysis baseline rather than a production prediction system.

### 3. Resolution Analytics

Resolution time was analyzed across:

- Ticket Priority
- Ticket Type
- Support Channel

Average resolution time:

**11.77 hours**

Resolution differences across these categories were relatively small, so the project presents this component primarily as operational analytics.

## Dashboard Metrics

| Metric | Value |
|---|---:|
| Total Tickets | 8,469 |
| Closed Tickets | 2,769 |
| Open Tickets | 2,819 |
| Pending Tickets | 2,881 |
| Average Satisfaction | 2.99 / 5 |
| Average Resolution Time | 11.77 hours |
| Customer Segments | 6 |

## Technology Stack

### Machine Learning

- Python
- Pandas
- NumPy
- Scikit-learn
- K-Means Clustering
- Random Forest
- Joblib

### Frontend

- HTML
- CSS
- JavaScript
- Chart.js

### Deployment

- GitHub
- GitHub Pages

## Project Structure

```text
SupportIQ/
│
├── index.html
├── style.css
├── script.js
├── README.md
│
└── data/
    ├── dashboard_metrics.csv
    ├── segment_dashboard.json
    ├── satisfaction_dashboard.json
    ├── resolution_by_priority.json
    ├── resolution_by_type.json
    └── resolution_by_channel.json
