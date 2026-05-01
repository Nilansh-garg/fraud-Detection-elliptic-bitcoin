# 🛡️ GNN-Based Bitcoin Fraud Detection

A production-ready **Graph Neural Network (GNN)** system for detecting illicit activity in Bitcoin transaction networks. Built on the **Elliptic Bitcoin Dataset**, the model leverages **GraphSAGE** to classify transactions as *licit* or *illicit* by learning from both transaction features and the graph structure of the network.

Designed for organizations that need to identify suspicious actors within financial transaction systems.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pipeline Stages](#pipeline-stages)
- [Model Architecture](#model-architecture)
- [Setup & Installation](#setup--installation)
- [Running the Application](#running-the-application)
- [Docker Deployment](#docker-deployment)
- [MLflow & DagsHub Tracking](#mlflow--dagshub-tracking)
- [Configuration](#configuration)
- [License](#license)

---

## Overview

This project frames fraud detection as a **node classification problem** on a graph. Each Bitcoin transaction is a node, and edges represent the flow of funds between transactions. The GraphSAGE model aggregates neighborhood information to classify each node as either **illicit (fraud)** or **licit (legitimate)**.

Key design decisions:
- **Temporal splitting** — train/test split respects time steps to prevent data leakage
- **Class imbalance handling** — weighted `CrossEntropyLoss` compensates for the skewed illicit/licit ratio
- **Binary labeling** — the dataset's 3-class labels (illicit, licit, unknown) are mapped to binary (1 / 0)

---

## Tech Stack

| Category | Tools |
|---|---|
| Language | Python 3.10+ |
| Deep Learning | PyTorch, PyTorch Geometric (GraphSAGE) |
| Data | Elliptic Bitcoin Dataset (via `torch_geometric`) |
| ML Ops | MLflow, DagsHub, DVC |
| Evaluation | scikit-learn (F1-score, Precision) |
| Web Framework | Flask |
| Deployment | Docker, Hugging Face Spaces |
| Config | YAML (`config.yaml`, `params.yaml`) |
| Project Structure | Cookiecutter Data Science (custom) |

---

## Project Structure

```
fraud-detection/
├── src/
│   └── frauddetection/
│       ├── components/         # Data ingestion, transformation, training, evaluation
│       ├── pipeline/           # Stage pipelines + prediction pipeline
│       ├── config/             # ConfigurationManager
│       ├── entity/             # Dataclass configs
│       ├── utils/              # common.py (read_yaml, save_json, etc.)
│       └── constants/          # File path constants
├── artifacts/                  # Auto-generated during pipeline runs
│   ├── data_ingestion/
│   ├── data_transformation/
│   ├── prepare_base_model/
│   ├── model_training/
│   └── model_evaluation/
├── templates/                  # Flask HTML templates
├── config/
│   └── config.yaml             # Artifact paths & directory config
├── params.yaml                 # Model hyperparameters
├── app.py                      # Flask web application
├── Dockerfile                  # Docker image for HF Spaces deployment
├── requirements.txt            # Python dependencies
├── setup.py                    # Package install + PyG dependency handler
├── dvc.yaml                    # DVC pipeline stages
└── research/                   # Jupyter notebooks (experimentation)
    ├── data_ingestion.ipynb
    ├── data_transformation.ipynb
    ├── prepare_base_model.ipynb
    ├── training_model.ipynb
    └── model_evaluation.ipynb
```

---

## Pipeline Stages

The end-to-end ML pipeline has 5 stages, each managed via DVC:

```
Data Ingestion → Data Transformation → Prepare Base Model → Training → Evaluation
```

1. **Data Ingestion** — Downloads the `EllipticBitcoinDataset` from PyG into `artifacts/data_ingestion/`
2. **Data Transformation** — Applies temporal train/test splitting, binary label mapping, and saves `transformed_data.pt`
3. **Prepare Base Model** — Initializes the `FraudSAGE` architecture and saves initial weights
4. **Model Training** — Loads the base model, trains with weighted cross-entropy loss, saves `model.pt`
5. **Model Evaluation** — Computes F1-score and Precision on the test set, logs metrics to MLflow/DagsHub

---

## Model Architecture

**FraudSAGE** — a 2-layer GraphSAGE network:

```
Input (165 features)
    → SAGEConv → BatchNorm1d → ReLU → Dropout(0.5)
    → SAGEConv
    → Output (2 classes: licit / illicit)
```

| Hyperparameter | Value |
|---|---|
| `IN_CHANNELS` | 165 |
| `HIDDEN_CHANNELS` | 64 |
| `OUT_CHANNELS` | 2 |
| `EPOCHS` | 100 |
| `LEARNING_RATE` | 0.001 |
| `BATCH_SIZE` | 1 (full-graph) |
| Evaluation Metric | F1-score |

---

## Setup & Installation

### Prerequisites

- Python 3.10+
- `conda` or `venv` (recommended)
- `git`

### 1. Clone the Repository

```bash
git clone https://github.com/Nilansh-garg/fraud-Detection-elliptic-bitcoin.git
cd fraud-Detection-elliptic-bitcoin
```

### 2. Create a Virtual Environment

**Using conda:**
```bash
conda create -n fraud-detection python=3.10 -y
conda activate fraud-detection
```

**Using venv:**
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

> ⚠️ **Note on PyTorch Geometric:** `requirements.txt` triggers `setup.py`, which automatically detects your installed PyTorch version and CUDA setup and installs the correct `torch-scatter`, `torch-sparse`, `torch-cluster`, and `torch-geometric` wheels. This may take several minutes on the first run.

If you prefer to install PyG manually (e.g., for a specific CUDA version):

```bash
# CPU only
pip install torch-scatter torch-sparse torch-cluster torch-geometric \
    -f https://data.pyg.org/whl/torch-2.1.0+cpu.html

# CUDA 11.8 example
pip install torch-scatter torch-sparse torch-cluster torch-geometric \
    -f https://data.pyg.org/whl/torch-2.1.0+cu118.html
```

---

## Running the Application

### Run the Full ML Pipeline

```bash
# Using DVC (recommended — runs only changed stages)
dvc repro

# Or run each stage manually
python src/frauddetection/pipeline/stage_01_data_ingestion.py
python src/frauddetection/pipeline/stage_02_data_transformation.py
python src/frauddetection/pipeline/stage_03_prepare_base_model.py
python src/frauddetection/pipeline/stage_04_model_training.py
python src/frauddetection/pipeline/stage_05_model_evaluation.py
```

> The first run will download the Elliptic Bitcoin Dataset (~50MB) from PyG servers automatically.

### Launch the Flask Web App

```bash
python app.py
```

The app will be available at `http://localhost:7860`.

**Predicting via the UI:**
- Navigate to the `/predict` route
- Enter one or more Transaction IDs (comma-separated)
- The app returns classification results (Licit / Illicit) for each transaction

**Predicting via the API:**
```bash
curl -X POST http://localhost:7860/predict \
  -d "tx_id=12345,67890"
```

---

## Docker Deployment

The app is containerized for deployment on **Hugging Face Spaces**.

```bash
# Build the image
docker build -t fraud-detection .

# Run locally
docker run -p 7860:7860 fraud-detection
```

The Dockerfile uses `python:3.10-slim` and installs CPU-only PyTorch and PyG for compatibility with Hugging Face free-tier hardware.

---

## MLflow & DagsHub Tracking

Model metrics and parameters are tracked via **MLflow** logged to **DagsHub**.

To initialize tracking:

```python
import dagshub
dagshub.init(repo_owner='Nilansh-garg', repo_name='fraud-Detection-elliptic-bitcoin', mlflow=True)
```

Metrics logged per run:
- `f1_score`
- `precision`

Params logged: all values from `params.yaml`.

The trained model is registered in the MLflow Model Registry as **`FraudSAGEModel`**.

---

## Configuration

### `config/config.yaml` — Artifact Paths

```yaml
artifacts_root: artifacts

data_ingestion:
  root_dir: artifacts/data_ingestion
  local_data_path: artifacts/data_ingestion/elliptic
  dataset_name: EllipticBitcoinDataset

data_transformation:
  root_dir: artifacts/data_transformation
  data_path: artifacts/data_ingestion/elliptic
  trained_data_path: artifacts/data_transformation/transformed_data.pt

prepare_base_model:
  root_dir: artifacts/prepare_base_model
  base_model_path: artifacts/prepare_base_model/base_model.pt

model_training:
  root_dir: artifacts/model_training
  trained_model_path: artifacts/model_training/model.pt

model_evaluation:
  root_dir: artifacts/model_evaluation
  data_path: artifacts/data_transformation/transformed_data.pt
  model_path: artifacts/model_training/model.pt
  metric_file_name: artifacts/model_evaluation/metrics.json
```

### `params.yaml` — Model Hyperparameters

```yaml
IN_CHANNELS: 165
HIDDEN_CHANNELS: 64
OUT_CHANNELS: 2
EPOCHS: 100
LEARNING_RATE: 0.001
BATCH_SIZE: 1
METRIC_NAME: "f1_score"
```

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

*Built by [Nilansh Garg](mailto:nilanshgarg13@gmail.com)*
