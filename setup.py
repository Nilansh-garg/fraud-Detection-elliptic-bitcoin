import setuptools
import subprocess
import sys
import os

# --- 1. Specialized PyTorch Geometric Installation Logic ---
def install_pyg_dependencies():
    try:
        import torch
        torch_ver = torch.__version__.split('+')[0]
        
        if torch.version.cuda is not None:
            cuda_ver = torch.version.cuda.replace('.', '')
            target_url = f"https://data.pyg.org/whl/torch-{torch_ver}+cu{cuda_ver}.html"
        else:
            target_url = f"https://data.pyg.org/whl/torch-{torch_ver}+cpu.html"

        libs = ["torch-scatter", "torch-sparse", "torch-cluster", "torch-geometric"]
        for lib in libs:
            print(f"Installing {lib} from {target_url}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", lib, "-f", target_url])
    except ImportError:
        print("Torch not found. Please install torch first.")

# Run the installation logic
if "install" in sys.argv or "develop" in sys.argv:
    install_pyg_dependencies()

# --- 2. Standard Setup Metadata ---
with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

__version__ = "0.0.1"

# Updated for the HIV project
REPO_NAME = "Fraud Dtection"
AUTHOR_USER_NAME = "Nilansh Garg"
SRC_REPO = "fraud_detection"  # Renamed from cnn_classifier
AUTHOR_EMAIL = "nilanshgarg13@gmail.com"

setuptools.setup(
    name=SRC_REPO,
    version=__version__,
    author=AUTHOR_USER_NAME,
    author_email=AUTHOR_EMAIL,
    description="A GNN-based project for predicting fraud in electronic commerce, MLFlow, and DVC.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url=f"https://github.com/{AUTHOR_USER_NAME}/{REPO_NAME}",
    project_urls={
        "Bug Tracker": f"https://github.com/{AUTHOR_USER_NAME}/{REPO_NAME}/issues"
    },
    package_dir={"": "src"},
    packages=setuptools.find_packages(where="src"),
    install_requires=[
        "pandas",
        "numpy",
        "rdkit",
        "scikit-learn",
        "python-box",
        "pyYAML",
        "ensure",
        "dvc",
        "mlflow",
        "dagshub"
    ]
)