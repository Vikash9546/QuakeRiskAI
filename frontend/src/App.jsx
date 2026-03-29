import React, { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker as LeafletMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MapPin, TrendingUp, Info, AlertTriangle, Link as LinkIcon, AlertCircle, Search } from 'lucide-react';

// Fix for Leaflet default icon markers
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const API_BASE = 'http://localhost:8000';
const GOOGLE_API_KEY = "c70832f56b52847a97294f44712e1511";

const defaultCenter = {
  lat: 18.6212526,
  lng: 73.9119216
};

const ResultCard = ({ title, value, unit, icon: Icon, color, delay }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
    className="card"
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <label style={{ fontSize: '0.65rem' }}>{title}</label>
        <div className="result-val" style={{ color: color, fontSize: '1.2rem' }}>
          {value}{unit}
        </div>
      </div>
      <Icon size={16} color="#94a3b8" />
    </div>
  </motion.div>
);

function LeafletClick({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function App() {
  const [position, setPosition] = useState(defaultCenter);
  const [depth, setDepth] = useState(10);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [resolving, setResolving] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [addressError, setAddressError] = useState('');
  const mapRef = useRef(null);

  const handleUrlAnalysis = async () => {
    setUrlError('');
    setResolving(true);
    try {
      const directRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const match = urlInput.match(directRegex);
      if (match && match.length >= 3) {
        updateMapPosition(parseFloat(match[1]), parseFloat(match[2]));
        return;
      }
      const response = await axios.get(`${API_BASE}/resolve-map`, {
        params: { url: urlInput }
      });
      if (response.data.lat && response.data.lng) {
        updateMapPosition(response.data.lat, response.data.lng);
      } else {
        setUrlError(response.data.error || 'Could not find coordinates.');
      }
    } catch (e) {
      setUrlError('Error resolving link.');
    } finally {
      setResolving(false);
    }
  };

  const handleAddressSearch = async () => {
    setAddressError('');
    setResolving(true);
    try {
      const response = await axios.get(`${API_BASE}/geocode`, {
        params: { address: addressInput }
      });

      if (response.data.lat && response.data.lng) {
        updateMapPosition(response.data.lat, response.data.lng);
        setAddressInput('');
      } else {
        setAddressError(response.data.error || 'Location not found.');
      }
    } catch (err) {
      setAddressError('Service connection error.');
    } finally {
      setResolving(false);
    }
  };

  const updateMapPosition = (lat, lng) => {
    const newPos = { lat, lng };
    setPosition(newPos);
    setUrlInput('');
    if (mapRef.current) {
        mapRef.current.setView([lat, lng], 13);
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/predict`, {
        latitude: parseFloat(position.lat),
        longitude: parseFloat(position.lng),
        depth: parseFloat(depth)
      });
      setPrediction(response.data);
    } catch (err) {
      setError("Model server connectivity issue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="map-container">
        <MapContainer 
          center={[position.lat, position.lng]} 
          zoom={4} 
          style={{ height: '100%', width: '100%' }}
          ref={(m) => (mapRef.current = m)}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <LeafletMarker position={[position.lat, position.lng]} />
          <LeafletClick setPosition={setPosition} />
        </MapContainer>
        
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '10px', borderRadius: '12px', border: '1px solid #334155', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="#3b82f6" />
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500, color: '#f8fafc' }}>
                Seismic analysis active
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar">
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#3b82f6', padding: '6px', borderRadius: '8px' }}>
                <Activity size={20} color="white" />
            </div>
            <h1 style={{ fontSize: '1.2rem' }}>QuakeRisk AI</h1>
          </div>
          <p style={{ fontSize: '0.75rem' }}>Global Hazard Intelligence</p>
        </div>

        {/* Address Search Section */}
        <div className="card" style={{ marginBottom: '-8px', border: '1px solid #10b981' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.75rem', color: '#10b981' }}>
            <Search size={14} />
            Search by Full Address
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              style={{ flex: 1, fontSize: '0.8rem' }}
              placeholder="Enter street, city, country..." 
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
            />
            <button 
              className="btn" 
              style={{ width: 'auto', padding: '8px 12px', background: '#10b981' }} 
              onClick={handleAddressSearch}
              disabled={resolving || !addressInput}
            >
              {resolving ? "..." : "Find"}
            </button>
          </div>
          {addressError && <p style={{ color: '#f87171', fontSize: '0.7rem', marginTop: '8px', margin: 0 }}>{addressError}</p>}
        </div>

        {/* Link Parse Section */}
        <div className="card" style={{ marginBottom: '-8px', border: '1px dashed #3b82f6' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.75rem', color: '#3b82f6' }}>
            <LinkIcon size={14} />
            Parse Geo-Link
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              style={{ flex: 1, fontSize: '0.8rem' }}
              placeholder="Paste Google Maps URL..." 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button className="btn" style={{ width: 'auto', padding: '8px' }} onClick={handleUrlAnalysis} disabled={resolving || !urlInput}>
              {resolving ? "..." : "Go"}
            </button>
          </div>
          {urlError && <p style={{ color: '#f87171', fontSize: '0.7rem', marginTop: '8px', margin: 0 }}>{urlError}</p>}
        </div>

        <div className="card">
          <label style={{ color: '#3b82f6', textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 800 }}>Primary Coordinates</label>
          <div className="coord-grid" style={{ marginTop: '8px' }}>
            <div className="input-group">
                <label style={{ fontSize: '0.6rem' }}>Lat</label>
                <input style={{ padding: '6px', fontSize: '0.8rem' }} value={position.lat.toFixed(4)} readOnly />
            </div>
            <div className="input-group">
                <label style={{ fontSize: '0.6rem' }}>Lng</label>
                <input style={{ padding: '6px', fontSize: '0.8rem' }} value={position.lng.toFixed(4)} readOnly />
            </div>
          </div>
          <div className="input-group" style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '0.6rem' }}>Event Depth (KM)</label>
            <input type="number" value={depth} onChange={(e) => setDepth(e.target.value)} style={{ padding: '6px', fontSize: '0.8rem' }} />
          </div>
          <button className="btn" style={{ marginTop: '12px' }} onClick={handlePredict} disabled={loading}>
            {loading ? "Analyzing Models..." : "Evaluate Risk"}
          </button>
        </div>

        <AnimatePresence>
          {prediction && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
                <span className={`risk-badge ${prediction.risk_level === 'Low' ? 'risk-low' : prediction.risk_level === 'Medium' ? 'risk-medium' : 'risk-high'}`}>
                  {prediction.risk_level} RISK
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <ResultCard title="Probability" value={prediction.risk_probability} unit="%" icon={TrendingUp} color={prediction.risk_probability > 50 ? '#f87171' : '#34d399'} delay={0.1} />
                <ResultCard title="Magnitude" value={prediction.predicted_magnitude} unit=" M" icon={Activity} color="#fef08a" delay={0.2} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!prediction && !error && (
            <div className="card" style={{ border: '1px solid #334155', opacity: 0.6 }}>
                 <p style={{ margin: 0, fontSize: '0.7rem' }}>Select a point on the map or search an address to begin.</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
