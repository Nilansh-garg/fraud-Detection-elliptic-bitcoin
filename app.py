from flask import Flask, render_template, request, jsonify
import os
from src.frauddetection.pipeline.prediction_pipeline import SinglePredictionPipeline
from src.frauddetection import logger

app = Flask(__name__)

# Configuration for paths
FEAT_PATH = os.path.join("artifacts", "data_ingestion", "elliptic", "raw", "elliptic_txs_features.csv")
EDGE_PATH = os.path.join("artifacts", "data_ingestion", "elliptic", "raw", "elliptic_txs_edgelist.csv")

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/about', methods=['GET'])
def about():
    return render_template('about.html')

@app.route('/contact', methods=['GET'])
def contact():
    return render_template('contact.html')

@app.route('/predict', methods=['GET', 'POST'])
def predict():
    try:
        tx_id_input = request.form.get('tx_id')
        if not tx_id_input:
            return render_template('predict.html', error="Please enter a Transaction ID")

        tx_ids = [int(x.strip()) for x in tx_id_input.split(',')]
        
        pipeline = SinglePredictionPipeline()
        results = pipeline.predict(tx_ids, FEAT_PATH, EDGE_PATH)

        if isinstance(results, str): 
            return render_template('predict.html', error=results)

        return render_template('predict.html', results=results)

    except ValueError:
        return render_template('predict.html', error="Invalid ID format. Please use numbers.")
    except Exception as e:
        logger.error(f"Web App Error: {e}")
        return render_template('predict.html', error="An internal error occurred.")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860, debug=True)