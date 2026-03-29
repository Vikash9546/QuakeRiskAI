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

# Define base path relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Model Loading with error handling
try:
    risk_model = joblib.load(os.path.join(MODELS_DIR, "risk_model.pkl"))
    magnitude_model = joblib.load(os.path.join(MODELS_DIR, "magnitude_model.pkl"))
    hotspot_model = joblib.load(os.path.join(MODELS_DIR, "hotspot_model.pkl"))
    print("All models loaded successfully!")
except Exception as e:
    print(f"Error loading models from {MODELS_DIR}: {e}")
    risk_model = None
    magnitude_model = None
    hotspot_model = None

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
        # 1. Try Google Geocoding first
        if GOOGLE_MAPS_API_KEY:
            params = {
                "address": address,
                "key": GOOGLE_MAPS_API_KEY
            }
            response = requests.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params=params,
                timeout=10
            )
            data = response.json()
            if data.get("status") == "OK":
                res = data["results"][0]["geometry"]["location"]
                return {"lat": res["lat"], "lng": res["lng"]}
            else:
                print(f"Google Geocoding failed: {data.get('status')} - {data.get('error_message')}")
        
        # 2. Fallback to Nominatim (OpenStreetMap) if Google fails or key is missing
        print("Falling back to OpenStreetMap geocoding...")
        
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

@app.get("/seismic-log")
def seismic_log():
    import requests
    try:
        # USGS Feed (Past 30 days to ensure we have enough India data)
        # Bounding box for India roughly: minlat=8, minlon=68, maxlat=38, maxlon=98
        usgs_url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=8&maxlatitude=38&minlongitude=68&maxlongitude=98&limit=50"
        response = requests.get(usgs_url, timeout=10)
        data = response.json()
        
        events = []
        for feature in data.get("features", []):
            prop = feature["properties"]
            geom = feature["geometry"]["coordinates"]
            
            # Additional text check for "India", "Nepal", "Bangladesh", "Pakistan" or just India
            place = prop.get("place", "")
            
            events.append({
                "time": pd.to_datetime(prop["time"], unit="ms").strftime("%Y-%m-%d %H:%M:%S"),
                "latitude": geom[1],
                "longitude": geom[0],
                "mag": prop["mag"],
                "place": place
            })
        
        if not events:
            return [{"time": "Monitoring Region: India", "latitude": 20.5, "longitude": 78.9, "mag": 0.0, "place": "No recent seismic activity detected in India."}]
            
        return events
    except Exception as e:
        return {"error": str(e)}

@app.get("/generate-report")
def generate_report(lat: float, lng: float, risk: str, prob: float, mag: float):
    from fpdf import FPDF
    import tempfile
    from fastapi.responses import FileResponse
    
    try:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(200, 10, txt="QuakeRisk AI - Seismic Assessment", ln=True, align='C')
        
        pdf.set_font("Arial", size=12)
        pdf.ln(10)
        pdf.cell(200, 10, txt=f"Date: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True)
        pdf.cell(200, 10, txt=f"Location: {lat} N, {lng} E", ln=True)
        pdf.ln(10)
        
        pdf.set_font("Arial", 'B', 14)
        pdf.cell(200, 10, txt="Risk Assessment Results:", ln=True)
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, txt=f"Risk Level: {risk.upper()}", ln=True)
        pdf.cell(200, 10, txt=f"Risk Probability: {prob}%", ln=True)
        pdf.cell(200, 10, txt=f"Predicted Magnitude: {mag} Mw", ln=True)
        
        pdf.ln(10)
        pdf.set_font("Arial", 'I', 10)
        pdf.multi_cell(0, 5, txt="Disclaimer: This report is based on machine learning predictions and historical USGS data. It is intended for informational and planning purposes only and should not be used as a deterministic prediction of future events.")

        # Save to temp file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        pdf.output(temp_file.name)
        
        return FileResponse(temp_file.name, media_type='application/pdf', filename=f"QuakeRisk_Report_{lat}_{lng}.pdf")
    except Exception as e:
        return {"error": str(e)}

@app.get("/export-data")
def export_data():
    from fastapi.responses import Response
    import io
    try:
        # Fetch fresh data for export (India scope)
        import requests
        usgs_url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=8&maxlatitude=38&minlongitude=68&maxlongitude=98&limit=100"
        response = requests.get(usgs_url, timeout=10)
        data = response.json()
        
        events = []
        for feature in data.get("features", []):
            prop = feature["properties"]
            geom = feature["geometry"]["coordinates"]
            events.append({
                "time": pd.to_datetime(prop["time"], unit="ms").strftime("%Y-%m-%d %H:%M:%S"),
                "lat": geom[1],
                "lng": geom[0],
                "magnitude": prop["mag"],
                "location": prop.get("place", "N/A"),
                "status": prop.get("status", ""),
                "tsunami_alert": prop.get("tsunami", 0)
            })
            
        df = pd.DataFrame(events)
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        
        return Response(
            content=stream.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=seismic_export_india.csv"}
        )
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
