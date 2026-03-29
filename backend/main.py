from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI(title="Earthquake Risk Analysis API")

# Add CORS middleware to allow requests from React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
try:
    risk_model = joblib.load(os.path.join(MODEL_DIR, "risk_model.pkl"))
    magnitude_model = joblib.load(os.path.join(MODEL_DIR, "magnitude_model.pkl"))
    hotspot_model = joblib.load(os.path.join(MODEL_DIR, "hotspot_model.pkl"))
    print("Models loaded successfully.")
except Exception as e:
    print(f"Error loading models: {e}")

class PredictionInput(BaseModel):
    latitude: float
    longitude: float
    depth: float

class PredictionOutput(BaseModel):
    risk_probability: float
    risk_level: str
    predicted_magnitude: float
    hotspot_cluster: int

@app.get("/")
def read_root():
    return {"message": "Welcome to the Earthquake Risk Analysis API"}

@app.post("/predict", response_model=PredictionOutput)
def predict(input_data: PredictionInput):
    try:
        # Preprocess input
        features = pd.DataFrame([{
            'latitude': input_data.latitude,
            'longitude': input_data.longitude,
            'depth': input_data.depth,
            'freq_30': 15.0,
            'time_diff': 1.0
        }])
        
        # Risk Prediction
        risk_prob = risk_model.predict_proba(features)[0][1]
        
        if risk_prob < 0.3:
            risk_level = "Low"
        elif risk_prob < 0.7:
            risk_level = "Medium"
        else:
            risk_level = "High"
            
        # Magnitude Prediction
        predicted_mag = float(magnitude_model.predict(features)[0])
        
        # Hotspot Detection
        coords = pd.DataFrame([[input_data.latitude, input_data.longitude]], columns=['latitude', 'longitude'])
        cluster = int(hotspot_model.predict(coords)[0])
        
        return {
            "risk_probability": round(risk_prob * 100, 2),
            "risk_level": risk_level,
            "predicted_magnitude": round(predicted_mag, 2),
            "hotspot_cluster": cluster
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/resolve-map")
def resolve_map(url: str):
    import requests
    import re
    try:
        # Follow redirects to get the final long URL
        response = requests.get(url, allow_redirects=True, timeout=10)
        final_url = response.url
        
        # Look for coordinates @lat,lng
        match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
        if match:
            return {"lat": float(match.group(1)), "lng": float(match.group(2))}
            
        # Look for search query coordinates
        query_match = re.search(r'query=(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
        if query_match:
            return {"lat": float(query_match.group(1)), "lng": float(query_match.group(2))}

        return {"error": "Could not find coordinates in resolved URL"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/geocode")
def geocode(address: str):
    import requests
    try:
        # Try Google Geocoding First
        google_key = "c70832f56b52847a97294f44712e1511"
        response = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": google_key},
            timeout=10
        )
        data = response.json()
        
        if data["status"] == "OK":
            location = data["results"][0]["geometry"]["location"]
            return {"lat": location["lat"], "lng": location["lng"]}
        
        # If Google is Denied or Fails, use OpenCage (No Key required for small sets)
        print(f"Google Geocode Failed: {data.get('status')}. Trying Fallback...")
        
        # Using a public geocoding fallback for demonstration
        fallback_url = f"https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1"
        headers = {'User-Agent': 'QuakeRiskAI/1.0'}
        f_res = requests.get(fallback_url, headers=headers, timeout=10)
        f_data = f_res.json()
        
        if f_data and len(f_data) > 0:
            return {"lat": float(f_data[0]["lat"]), "lng": float(f_data[0]["lon"])}
            
        return {"error": f"Address not found. (Google: {data.get('status')})"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
