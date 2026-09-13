# SupportIQ

## Customer Support Intelligence Platform

SupportIQ is a customer support analytics and machine learning platform built using the Customer Support Ticket Dataset.

The project analyzes customer support tickets to identify customer segments, understand satisfaction risk, and compare ticket resolution patterns.

## Live Demo

https://reddyankitha.github.io/SupportIQ/

## Kaggle Notebook

The complete data analysis, machine learning workflow, model evaluation, and customer segmentation are available in the Kaggle notebook:

https://www.kaggle.com/code/hanumathureddygari/notebook5c2068c982

## Project Objectives

SupportIQ focuses on three customer support business problems:

1. Customer Segmentation
2. Customer Satisfaction Risk Analysis
3. Ticket Resolution Analytics

## Dataset

The project uses the Customer Support Ticket Dataset from Kaggle.

### Dataset Size

* 8,469 support tickets
* 17 features
* Customer information
* Ticket information
* Support channel
* Priority
* Satisfaction rating
* Response and resolution timestamps

## Machine Learning

### 1. Customer Segmentation

K-Means clustering was used to identify groups of customers with similar support experiences.

Features used:

* Customer Age
* Average Satisfaction
* Average Resolution Time

Six customer segments were identified:

* Middle Age - Highly Satisfied and Fast
* Older - At Risk and Fast
* Older - At Risk and Slow
* Older - Satisfied but Slow
* Young - At Risk and Fast
* Young - Satisfied but Slow

Silhouette Score:

**0.295**

### 2. Customer Satisfaction Risk

A Random Forest classifier was used to classify support tickets into:

* Low Satisfaction
* Satisfied

Ratings of 1 or 2 were classified as Low Satisfaction.

Results:

* Low Satisfaction Tickets: 1,102
* Satisfied Tickets: 1,667
* Low Satisfaction Rate: 39.8%
* Model Accuracy: 59.75%

The model showed limited predictive power for low-satisfaction tickets, so the result is presented as a risk-analysis baseline rather than a production prediction system.

### 3. Resolution Analytics

Resolution time was analyzed across:

* Ticket Priority
* Ticket Type
* Support Channel

Average resolution time:

**11.77 hours**

Resolution differences across these categories were relatively small, so this component is presented primarily as operational analytics.

## Dashboard Metrics

| Metric                  |       Value |
| ----------------------- | ----------: |
| Total Tickets           |       8,469 |
| Closed Tickets          |       2,769 |
| Open Tickets            |       2,819 |
| Pending Tickets         |       2,881 |
| Average Satisfaction    |    2.99 / 5 |
| Average Resolution Time | 11.77 hours |
| Customer Segments       |           6 |

## Technology Stack

### Machine Learning

* Python
* Pandas
* NumPy
* Scikit-learn
* K-Means Clustering
* Random Forest
* Joblib

### Frontend

* HTML
* CSS
* JavaScript
* Chart.js

### Deployment

* GitHub
* GitHub Pages

## How to Run SupportIQ

### Option 1: View the Live Dashboard

No installation is required.

Open the deployed application:

https://reddyankitha.github.io/SupportIQ/

### Option 2: Run Locally

Clone the repository:

```bash
git clone https://github.com/reddyAnkitha/SupportIQ.git
```

Navigate to the project:

```bash
cd SupportIQ
```

Because SupportIQ is a static GitHub Pages dashboard, it can be opened using a local web server.

If Python is installed, run:

```bash
python -m http.server 8000
```

Then open:

http://localhost:8000

The dashboard loads the exported analytics data from the `data/` folder.

### ML Development

The machine learning models were developed and evaluated in the Kaggle notebook.

Kaggle Notebook:

https://www.kaggle.com/code/hanumathureddygari/notebook5c2068c982

The repository contains the exported analytics used by the frontend, while the machine learning development, model training, evaluation, and analysis are documented in the Kaggle notebook.

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
```

## Key Business Insights

### Customer Segmentation

The analysis identified clear differences in customer support experiences.

The highest-performing segment had:

* Average satisfaction: **4.44 / 5**
* Average resolution time: **5.04 hours**

The highest-risk slow segment had:

* Average satisfaction: **1.52 / 5**
* Average resolution time: **18.81 hours**

This suggests that customers experiencing both low satisfaction and slower resolution should receive greater attention.

### Satisfaction

39.8% of closed tickets were classified as low satisfaction.

This highlights an opportunity to identify and address customer support experiences that may lead to dissatisfaction.

### Resolution

Average resolution time was approximately **11.77 hours**.

Differences between priority, ticket type, and channel were relatively small in this dataset.

## Limitations

The satisfaction model achieved **59.75% accuracy** and showed limited ability to identify low-satisfaction tickets.

The resolution-time features also showed limited predictive power.

Therefore, the project focuses on transparent analytics and customer segmentation rather than claiming production-level prediction accuracy.

The deployed GitHub Pages application uses exported analytics data for the frontend. The Python machine-learning models are developed and evaluated separately in the Kaggle notebook.

## Future Improvements

* Real-time ticket prediction
* Better NLP features from ticket descriptions
* Advanced customer-level historical features
* Explainable AI for satisfaction risk
* Real-time backend API
* Automated support recommendations
* Production database integration
* Live model monitoring

## Author

**Ankitha Reddy**

Software Development Engineer | Java Full Stack | Cloud & Machine Learning
