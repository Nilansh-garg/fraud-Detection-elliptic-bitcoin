---
title: GNN Fraud Detection API
emoji: 🛡️
colorFrom: indigo
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# GNN-Based Fraud Detection API
This is a Graph Neural Network (GNN) application deployed as a Flask API on Hugging Face Spaces. It uses deep learning on graph structures to identify fraudulent transactions.

## 🚀 How to use this API
Since this is a Flask-based Docker deployment, you can interact with it via `POST` requests.

### Endpoint: `/predict`
**Method:** `POST`  
**Payload Example:**
```json
{
  "transaction_id": 12345,
  "features": [0.12, 0.45, 0.89, ...]
}
