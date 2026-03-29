import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, mean_absolute_error
from sklearn.cluster import KMeans
import joblib
import os

# Set style
plt.style.use('ggplot')

# 1. Data Loading
print("Loading data...")
df = pd.read_csv('earthquake_data.csv')

# Exploration
print("\n--- Data Info ---")
print(df.info())
print("\n--- First 5 rows ---")
print(df.head())
print("\n--- Missing Values ---")
print(df.isnull().sum())

# Plot magnitude distribution
plt.figure(figsize=(10, 6))
sns.histplot(df['mag'], bins=50, kde=True)
plt.title('Earthquake Magnitude Distribution')
plt.xlabel('Magnitude')
plt.ylabel('Frequency')
plt.savefig('magnitude_distribution.png')
print("\nSaved magnitude_distribution.png")

# 2. Preprocessing
print("\nPreprocessing data...")
df['time'] = pd.to_datetime(df['time'])
df = df.sort_values('time')

# Extract features
df['year'] = df['time'].dt.year
df['month'] = df['time'].dt.month
df['day'] = df['time'].dt.day

# Rolling features (approximate by sorting and using windows)
# frequency (last 30 days - simplified as last 30 events for feature calc)
df['freq_30'] = df.rolling(window='30D', on='time')['mag'].count()
df['time_diff'] = df['time'].diff().dt.total_seconds().fillna(0) / 3600 # hours

# Handle large depth values or outliers if any (keeping it simple for now)
df = df.dropna(subset=['latitude', 'longitude', 'depth', 'mag'])

# 3. Model 1: Risk Classification (mag >= 5)
print("\nTraining Model 1: Risk Classification...")
df['risk_label'] = (df['mag'] >= 5).astype(int)

features = ['latitude', 'longitude', 'depth', 'freq_30', 'time_diff']
X = df[features]
y_risk = df['risk_label']

X_train, X_test, y_train, y_test = train_test_split(X, y_risk, test_size=0.2, random_state=42)

# Random Forest Classifier
rf_clf = RandomForestClassifier(n_estimators=100, random_state=42)
rf_clf.fit(X_train, y_train)
y_pred = rf_clf.predict(X_test)

print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision: {precision_score(y_test, y_pred):.4f}")
print(f"Recall: {recall_score(y_test, y_pred):.4f}")
print(f"F1 Score: {f1_score(y_test, y_pred):.4f}")

# 4. Model 2: Magnitude Prediction
print("\nTraining Model 2: Magnitude Prediction...")
y_mag = df['mag']
X_train_m, X_test_m, y_train_m, y_test_m = train_test_split(X, y_mag, test_size=0.2, random_state=42)

rf_reg = RandomForestRegressor(n_estimators=100, random_state=42)
rf_reg.fit(X_train_m, y_train_m)
y_pred_m = rf_reg.predict(X_test_m)

print(f"RMSE: {np.sqrt(mean_squared_error(y_test_m, y_pred_m)):.4f}")
print(f"MAE: {mean_absolute_error(y_test_m, y_pred_m):.4f}")

# 5. Model 3: Hotspot Detection
print("\nTraining Model 3: Hotspot Detection...")
coords = df[['latitude', 'longitude']]
kmeans = KMeans(n_clusters=8, random_state=42, n_init=10)
df['cluster'] = kmeans.fit_predict(coords)

plt.figure(figsize=(12, 8))
plt.scatter(df['longitude'], df['latitude'], c=df['cluster'], cmap='viridis', alpha=0.5, s=1)
plt.title('Earthquake Hotspots (K-Means Clustering)')
plt.xlabel('Longitude')
plt.ylabel('Latitude')
plt.colorbar(label='Cluster ID')
plt.savefig('hotspots.png')
print("Saved hotspots.png")

# 6. Save Models
print("\nSaving models...")
os.makedirs('../backend/models', exist_ok=True)
joblib.dump(rf_clf, '../backend/models/risk_model.pkl')
joblib.dump(rf_reg, '../backend/models/magnitude_model.pkl')
joblib.dump(kmeans, '../backend/models/hotspot_model.pkl')
print("Models saved to backend/models/")
