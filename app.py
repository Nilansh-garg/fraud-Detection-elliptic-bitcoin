from flask import Flask, render_template, request, jsonify
import os
from huggingface_hub import login, hf_hub_download
from src.frauddetection.pipeline.prediction_pipeline import SinglePredictionPipeline
from src.frauddetection import logger

app = Flask(__name__)

# ── HF Hub config ─────────────────────────────────────────────────────────────
DATASET_REPO = "Nilansh-garg/elliptic-bitcoin-dataset"
FEAT_PATH = os.path.join("artifacts", "data_ingestion", "elliptic", "raw", "elliptic_txs_features.csv")
EDGE_PATH = os.path.join("artifacts", "data_ingestion", "elliptic", "raw", "elliptic_txs_edgelist.csv")

def download_data_if_needed():
    os.makedirs(os.path.dirname(FEAT_PATH), exist_ok=True)
    if not os.path.exists(FEAT_PATH):
        logger.info("Downloading features CSV from HF Hub...")
        hf_hub_download(
            repo_id=DATASET_REPO,
            filename="elliptic_txs_features.csv",
            local_dir=os.path.dirname(FEAT_PATH),
            repo_type="dataset"
        )
    if not os.path.exists(EDGE_PATH):
        logger.info("Downloading edges CSV from HF Hub...")
        hf_hub_download(
            repo_id=DATASET_REPO,
            filename="elliptic_txs_edgelist.csv",
            local_dir=os.path.dirname(EDGE_PATH),
            repo_type="dataset"
        )
    logger.info("Dataset files ready.")

hf_token = os.environ.get("HF_TOKEN")
if hf_token:
    login(token=hf_token)

download_data_if_needed()

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/about", methods=["GET"])
def about():
    return render_template("about.html")

@app.route("/contact", methods=["GET"])
def contact():
    return render_template("contact.html")

@app.route("/predict", methods=["GET", "POST"])
def predict():
    try:
        tx_id_input = request.form.get("tx_id")
        if not tx_id_input:
            return render_template("predict.html", error="Please enter a Transaction ID")
        tx_ids = [int(x.strip()) for x in tx_id_input.split(",")]
        pipeline = SinglePredictionPipeline()
        results = pipeline.predict(tx_ids, FEAT_PATH, EDGE_PATH)
        if isinstance(results, str):
            return render_template("predict.html", error=results)
        return render_template("predict.html", results=results)
    except ValueError:
        return render_template("predict.html", error="Invalid ID format. Please use numbers.")
    except Exception as e:
        logger.error(f"Web App Error: {e}")
        return render_template("predict.html", error="An internal error occurred.")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860, debug=False)
