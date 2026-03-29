"""
Download USGS Earthquake Dataset
Downloads earthquake data from USGS API for the past 5 years.
"""
import requests
import pandas as pd
import os

def download_usgs_data():
    """Download earthquake data from USGS API."""
    print("Downloading USGS earthquake data...")
    
    # USGS API - get significant earthquakes (magnitude 2.5+) for multiple years
    all_data = []
    
    # Download year by year for larger dataset
    years = [
        ("2020-01-01", "2020-12-31"),
        ("2021-01-01", "2021-12-31"),
        ("2022-01-01", "2022-12-31"),
        ("2023-01-01", "2023-12-31"),
        ("2024-01-01", "2024-12-31"),
    ]
    
    for start, end in years:
        url = (
            f"https://earthquake.usgs.gov/fdsnws/event/1/query?"
            f"format=csv&starttime={start}&endtime={end}"
            f"&minmagnitude=2.5&orderby=time&limit=20000"
        )
        print(f"  Fetching {start[:4]} data...")
        try:
            df = pd.read_csv(url)
            all_data.append(df)
            print(f"    Got {len(df)} records")
        except Exception as e:
            print(f"    Error: {e}")
    
    if all_data:
        combined = pd.concat(all_data, ignore_index=True)
        output_path = os.path.join(os.path.dirname(__file__), "earthquake_data.csv")
        combined.to_csv(output_path, index=False)
        print(f"\nSaved {len(combined)} total records to {output_path}")
        return output_path
    else:
        print("No data downloaded. Creating synthetic dataset...")
        return create_synthetic_data()

def create_synthetic_data():
    """Create synthetic earthquake data as fallback."""
    import numpy as np
    
    np.random.seed(42)
    n = 10000
    
    # Generate realistic earthquake data
    times = pd.date_range("2020-01-01", periods=n, freq="53min")
    
    # Earthquake hotspot regions (lat, lon centers)
    hotspots = [
        (35.6, 139.7),   # Japan
        (37.5, -122.0),  # California
        (-33.4, -70.6),  # Chile
        (28.2, 84.7),    # Nepal
        (38.3, 46.3),    # Turkey/Iran
        (-6.2, 106.8),   # Indonesia
        (19.4, -155.3),  # Hawaii
        (64.0, -21.0),   # Iceland
    ]
    
    # Assign each earthquake to a hotspot with noise
    hotspot_idx = np.random.choice(len(hotspots), n)
    lats = np.array([hotspots[i][0] for i in hotspot_idx]) + np.random.normal(0, 3, n)
    lons = np.array([hotspots[i][1] for i in hotspot_idx]) + np.random.normal(0, 3, n)
    
    # Generate magnitudes (Gutenberg-Richter distribution)
    magnitudes = 2.5 + np.random.exponential(0.8, n)
    magnitudes = np.clip(magnitudes, 2.5, 9.0)
    
    # Depth varies with location
    depths = np.random.exponential(30, n) + 5
    depths = np.clip(depths, 0, 700)
    
    df = pd.DataFrame({
        "time": times,
        "latitude": lats,
        "longitude": lons,
        "depth": depths,
        "mag": np.round(magnitudes, 1),
        "magType": "ml",
        "place": [f"Region {hotspot_idx[i]}" for i in range(n)],
    })
    
    output_path = os.path.join(os.path.dirname(__file__), "earthquake_data.csv")
    df.to_csv(output_path, index=False)
    print(f"Created synthetic dataset with {n} records at {output_path}")
    return output_path

if __name__ == "__main__":
    download_usgs_data()
