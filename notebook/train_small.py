import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.cluster import KMeans
import joblib
import os

# Data Loading
df = pd.read_csv('earthquake_data.csv')
df['time'] = pd.to_datetime(df['time'])
df = df.sort_values('time')

# Preprocessing
df['freq_30'] = df.rolling(window='30D', on='time')['mag'].count()
df['time_diff'] = df['time'].diff().dt.total_seconds().fillna(0) / 3600 
df = df.dropna(subset=['latitude', 'longitude', 'depth', 'mag'])

features = ['latitude', 'longitude', 'depth', 'freq_30', 'time_diff']
X = df[features]

# Model 1: Risk (Small)
df['risk_label'] = (df['mag'] >= 5).astype(int)
y_risk = df['risk_label']
rf_clf = RandomForestClassifier(n_estimators=10, max_depth=5, random_state=42)
rf_clf.fit(X, y_risk)

# Model 2: Magnitude (Small)
y_mag = df['mag']
rf_reg = RandomForestRegressor(n_estimators=10, max_depth=5, random_state=42)
rf_reg.fit(X, y_mag)

# Model 3: Hotspot
coords = df[['latitude', 'longitude']]
kmeans = KMeans(n_clusters=8, random_state=42, n_init=10)
kmeans.fit(coords)

# Save
os.makedirs('../backend/models', exist_ok=True)
joblib.dump(rf_clf, '../backend/models/risk_model.pkl', compress=3)
joblib.dump(rf_reg, '../backend/models/magnitude_model.pkl', compress=3)
joblib.dump(kmeans, '../backend/models/hotspot_model.pkl', compress=3)

print("Small models saved successfully!")
