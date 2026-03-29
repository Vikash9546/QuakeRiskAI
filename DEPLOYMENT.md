# Deployment Guide: Earthquake Risk Analysis System

This document outlines the steps to deploy the full-stack system.

## 📍 Deployment Strategy

### 1. Backend (FastAPI) - Deploy on **Render** or **Railway**
- **Configuration**:
  - **Runtime**: Python 3.8+
  - **Build Command**: `pip install -r requirements.txt`
  - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Steps**:
  1. Connect your GitHub repository.
  2. Set the "Root Directory" to `backend/`.
  3. Ensure all three `.pkl` model files are inside the `models/` folder.
  4. Add environment variables if you want to store your Google API Key securely.

### 2. Frontend (React) - Deploy on **Vercel** or **Netlify**
- **Configuration**:
  - **Framework Preset**: Vite
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
- **Steps**:
  1. Connect your GitHub repository.
  2. Set the "Root Directory" to `frontend/`.
  3. **Important**: Change the `API_BASE` in `frontend/src/App.jsx` from `http://localhost:8000` to your deployed backend URL (e.g., `https://quakerisk-api.onrender.com`).
  4. Your Vercel URL will be your public application link.

## 🛠️ Environment Setup

### Requirements.txt (Backend)
I have generated a `requirements.txt` in the root and backend folders to assist with the server installation. It includes:
- `fastapi`
- `uvicorn`
- `scikit-learn`
- `pandas`
- `numpy`
- `joblib`
- `requests`

## ⚠️ Key Considerations
- **CORS**: The backend is already configured with `CORSMiddleware` to allow requests from any origin (`*`), which is perfect for deployment.
- **Model Files**: Ensure the `.pkl` files are committed. GitHub sometimes blocks large files, so use **Git LFS** if they exceed 100MB (unlikely for these models).
- **Google Maps Key**: Ensure your API key is enabled for the specific domain where you deploy your frontend.
