FROM python:3.10-slim

# Install system dependencies as root
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU — pinned to match PyG wheels
RUN pip install --no-cache-dir torch==2.1.0 --index-url https://download.pytorch.org/whl/cpu

# Install PyG sparse dependencies (must match torch version exactly)
RUN pip install --no-cache-dir \
    torch-scatter torch-sparse torch-cluster torch-spline-conv \
    -f https://data.pyg.org/whl/torch-2.1.0+cpu.html

# Install PyG itself
RUN pip install --no-cache-dir torch-geometric

# Install remaining app dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── HF Spaces requirement: run as non-root user UID 1000 ──────────────────────
# Without this the Space sandbox will refuse to start the container.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy all app files with correct ownership
COPY --chown=user . $HOME/app

EXPOSE 7860

CMD ["python", "app.py"]
