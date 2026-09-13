# SupportIQ

## Customer Support Intelligence Platform

SupportIQ is a customer support analytics and machine learning platform built using the **Customer Support Ticket Dataset**.

The platform analyzes customer support tickets to identify customer segments, understand satisfaction risk, and compare ticket resolution patterns through an interactive web dashboard.

## 🚀 Live Demo

**Dashboard:**
https://reddyankitha.github.io/SupportIQ/

## 📊 Kaggle Notebook

The complete data analysis, preprocessing, machine learning workflow, model evaluation, and customer segmentation are documented in the Kaggle notebook:

https://www.kaggle.com/code/hanumathureddygari/notebook5c2068c982

---

## 🎯 Project Objectives

SupportIQ focuses on three customer support business problems:

1. **Customer Segmentation**
2. **Customer Satisfaction Risk Analysis**
3. **Ticket Resolution Analytics**

The goal is to transform raw support-ticket data into practical insights that can help support teams understand customer behavior, identify dissatisfaction patterns, and monitor operational performance.

---

## 📦 Dataset

The project uses the **Customer Support Ticket Dataset** from Kaggle.

### Dataset Size

* **8,469 support tickets**
* **17 features**
* Customer information
* Ticket information
* Support channel
* Ticket priority
* Satisfaction rating
* Response and resolution information

The dataset contains information about customer demographics, products, ticket types, ticket status, resolution, priority, support channels, response times, resolution times, and satisfaction ratings.

---

# 🤖 Machine Learning

## 1. Customer Segmentation

K-Means clustering was used to identify groups of customers with similar support experiences.

### Features Used

* Customer Age
* Average Satisfaction
* Average Resolution Time

Six customer segments were identified:

* **Middle Age - Highly Satisfied and Fast**
* **Older - At Risk and Fast**
* **Older - At Risk and Slow**
* **Older - Satisfied but Slow**
* **Young - At Risk and Fast**
* **Young - Satisfied but Slow**

### Clustering Result

**Silhouette Score: 0.295**

The segmentation provides a simple way to compare customer groups based on satisfaction and support-resolution characteristics.

---

## 2. Customer Satisfaction Risk

A **Random Forest classifier** was used as a baseline model to classify support tickets into:

* Low Satisfaction
* Satisfied

Ratings of **1 or 2** were classified as Low Satisfaction.

### Results

| Metric                   | Result |
| ------------------------ | -----: |
| Low Satisfaction Tickets |  1,102 |
| Satisfied Tickets        |  1,667 |
| Low Satisfaction Rate    |  39.8% |
| Model Accuracy           | 59.75% |

The model showed limited predictive power. Therefore, SupportIQ presents this component as a **satisfaction-risk analysis baseline**, rather than a production-ready prediction system.

---

## 3. Resolution Analytics

Resolution time is analyzed across:

* Ticket Priority
* Ticket Type
* Support Channel
* Customer Segments

### Average Resolution Time

**11.77 hours**

The dashboard allows users to compare resolution patterns across different operational categories.

Differences between priority, ticket type, and support channel were relatively small in this dataset, so this component is presented primarily as **operational analytics**.

---

# 📈 Dashboard

SupportIQ provides an interactive dashboard for exploring customer support data.

### Dashboard Features

* Overall ticket statistics
* Average customer satisfaction
* Average resolution time
* Customer segmentation
* Satisfaction-risk metrics
* Customer segment comparison
* Interactive ticket filtering
* Priority analysis
* Ticket-type analysis
* Support-channel analysis
* Resolution analytics
* Visual charts using Chart.js

### Dashboard Metrics

| Metric                  |           Value |
| ----------------------- | --------------: |
| Total Tickets           |       **8,469** |
| Closed Tickets          |       **2,769** |
| Open Tickets            |       **2,819** |
| Pending Tickets         |       **2,881** |
| Average Satisfaction    |    **2.99 / 5** |
| Average Resolution Time | **11.77 hours** |
| Customer Segments       |           **6** |

---

# 🔍 Interactive Analysis

The dashboard includes filters that allow users to explore the ticket dataset by:

* **Priority**
* **Ticket Type**
* **Support Channel**
* **Customer Segment**

The filtered dashboard displays:

* Number of matching tickets
* Average satisfaction for the selected tickets
* Corresponding analytics information

This allows users to move from high-level dashboard metrics to more focused customer-support analysis.

---

# 💡 Key Business Insights

## Customer Segmentation

The analysis identified meaningful differences between customer groups.

The highest-performing segment had:

* **Average satisfaction: 4.44 / 5**
* **Average resolution time: 5.04 hours**

The highest-risk slow segment had:

* **Average satisfaction: 1.52 / 5**
* **Average resolution time: 18.81 hours**

This suggests that customers experiencing both **low satisfaction and slower resolution** may require greater attention from support teams.

---

## Satisfaction

**39.8% of closed tickets** were classified as low satisfaction.

This highlights an opportunity to identify support experiences associated with customer dissatisfaction and investigate the factors contributing to lower ratings.

---

## Resolution

Average resolution time was approximately:

**11.77 hours**

Resolution-time differences across priority, ticket type, and support channel were relatively small in this dataset.

This makes resolution analytics more useful for **monitoring and comparison** than for claiming strong predictive performance.

---

# 🛠️ Technology Stack

## Machine Learning

* Python
* Pandas
* NumPy
* Scikit-learn
* K-Means Clustering
* Random Forest
* Joblib

## Frontend

* HTML
* CSS
* JavaScript
* Chart.js

## Development & Deployment

* Git
* GitHub
* GitHub Pages
* Kaggle

---

# 🚀 How to Run SupportIQ

## Option 1: View the Live Dashboard

No installation is required.

Open the deployed application:

https://reddyankitha.github.io/SupportIQ/

---

## Option 2: Run Locally

Clone the repository:

```bash
git clone https://github.com/reddyAnkitha/SupportIQ.git
```

Navigate to the project:

```bash
cd SupportIQ
```

Because SupportIQ is a static GitHub Pages application, it can be run using a local web server.

If Python is installed, run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

The dashboard loads the exported analytics data from the repository.

---

# 🧠 ML Development

The machine learning models were developed and evaluated in the Kaggle notebook.

**Kaggle Notebook:**

https://www.kaggle.com/code/hanumathureddygari/notebook5c2068c982

The repository contains the exported analytics used by the frontend, while the Kaggle notebook documents:

* Data preprocessing
* Exploratory data analysis
* Feature engineering
* Customer segmentation
* Model training
* Model evaluation
* Analytical results

This separation keeps the deployed GitHub Pages application lightweight while preserving the complete ML workflow in the notebook.

---

# 📁 Project Structure

```text
SupportIQ/
│
├── index.html
├── style.css
├── script.js
├── ticket_data.json
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

---

# ⚠️ Limitations

SupportIQ is a hackathon-oriented analytics and machine learning prototype.

### Satisfaction Model

The Random Forest model achieved:

**59.75% accuracy**

and showed limited ability to identify low-satisfaction tickets.

Therefore, the model should be considered a **baseline analysis**, not a production prediction service.

### Resolution Analysis

Resolution-time analysis provides useful operational comparisons, but the available results do not demonstrate strong predictive power.

### Deployment Architecture

The deployed GitHub Pages application uses **exported analytics data** for the frontend.

The Python machine-learning workflow is developed and evaluated separately in the Kaggle notebook.

As a result, the current deployment does not provide real-time model inference or a live backend API.

---

# 🔮 Future Improvements

Potential improvements include:

* Real-time ticket prediction
* Advanced NLP features from ticket descriptions
* Customer-level historical features
* Explainable AI for satisfaction risk
* Real-time backend API
* Automated support recommendations
* Production database integration
* Live model monitoring
* Real-time ticket ingestion
* Model retraining pipelines

---

# 👩‍💻 Author

**Ankitha Reddy**

Software Development Engineer | Java Full Stack | Cloud & Machine Learning

GitHub:
https://github.com/reddyAnkitha

Kaggle:
https://www.kaggle.com/code/hanumathureddygari/notebook5c2068c982

---

## ⭐ Project Summary

**SupportIQ combines machine learning, customer-support analytics, and an interactive web dashboard to turn support-ticket data into actionable customer and operational insights.**

The project demonstrates an end-to-end workflow covering:

**Data → Analysis → Machine Learning → Exported Analytics → Interactive Dashboard → GitHub Pages Deployment**
