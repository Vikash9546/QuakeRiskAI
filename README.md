# Earthquake Risk Analysis System - Instructions

## Project Overview
This project is a full-stack earthquake risk estimation system involving specialized machine learning models, a FastAPI backend, and a modern React dashboard.

## Prerequisites
- Python 3.8+
- Node.js & npm

## Running the Application

### 1. Backend (FastAPI)
- Navigate to the `backend` directory.
- Start the server:
  ```bash
  python3 main.py
  ```
- The API will run at `http://localhost:8000`.

### 2. Frontend (React)
- Navigate to the `frontend` directory.
- Start the development server:
  ```bash
  npm run dev
  ```
- Open `http://localhost:3000` in your browser.

## Project Structure
- `notebook/`: Contains data download and training scripts (`train_models.py` which generates the models).
- `backend/`: FastAPI application and pre-trained models.
- `frontend/`: React application with Leaflet map integration.

## Important Note
This system provides **risk estimation** and **statistical probability** based on historical USGS data. It is **NOT** a real-time prediction tool for the exact occurrence of earthquakes. Always follow local seismic safety protocols.
