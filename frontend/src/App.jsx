import React, { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker as LeafletMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MapPin, TrendingUp, Info, AlertTriangle, Link as LinkIcon, Search, Globe, FileText, Database, Heart, Download, Bell, Settings, User } from 'lucide-react';

// Leaflet markers fix
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

function LeafletClick({ setPosition }) {
    useMapEvents({
        click(e) {
            setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}

function App() {
    const [position, setPosition] = useState({ lat: 18.6212, lng: 73.9119 }); // DY Patil Univ
    const [depth, setDepth] = useState(12.4);
    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState(null);
    const [addressInput, setAddressInput] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [resolving, setResolving] = useState(false);
    const mapRef = useRef(null);

    const handleAddressSearch = async () => {
        setResolving(true);
        try {
            const response = await axios.get(`${API_BASE}/geocode`, { params: { address: addressInput } });
            if (response.data.lat) {
                const newPos = { lat: response.data.lat, lng: response.data.lng };
                setPosition(newPos);
                if (mapRef.current) mapRef.current.setView([newPos.lat, newPos.lng], 13);
                setAddressInput('');
            }
        } catch (e) { console.error(e) } finally { setResolving(false) }
    };

    const handlePredict = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE}/predict`, {
                latitude: position.lat,
                longitude: position.lng,
                depth: parseFloat(depth)
            });
            setPrediction(response.data);
        } catch (e) { console.error(e) } finally { setLoading(false) }
    };

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="brand">
                    <h1>QuakeRisk AI</h1>
                    <p>Global Hazard Intelligence</p>
                </div>

                <nav>
                    <div className="nav-item active"><Globe size={18} /> Global Map</div>
                    <div className="nav-item"><Activity size={18} /> Seismic Log</div>
                    <div className="nav-item"><FileText size={18} /> Risk Reports</div>
                    <div className="nav-item"><Database size={18} /> Station Health</div>
                </nav>

                <button className="export-btn">
                    <Download size={16} /> Export Data
                </button>
            </aside>

            {/* Main Content Area */}
            <main className="main-area">
                <header className="top-bar">
                    <div className="top-nav">
                        <span className="top-nav-item">QuakeRisk AI</span>
                        <span className="top-nav-item active">Search</span>
                        <span className="top-nav-item">Feed</span>
                        <span className="top-nav-item">History</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <Bell size={20} color="#6c757d" />
                        <Settings size={20} color="#6c757d" />
                        <User size={20} color="#6c757d" />
                    </div>
                </header>

                <div className="map-viewport">
                    <MapContainer
                        center={[position.lat, position.lng]}
                        zoom={4}
                        style={{ height: '100%', width: '100%' }}
                        ref={(m) => (mapRef.current = m)}
                    >
                        {/* High Quality Light/Topo Tiles */}
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                        <LeafletMarker position={[position.lat, position.lng]} />
                        <LeafletClick setPosition={setPosition} />
                    </MapContainer>

                    <div className="map-status">Live Monitoring Active</div>
                    <div className="map-focus">
                        <label style={{ fontSize: '0.6rem', fontWeight: 600, color: '#6c757d' }}>FOCUS COORDINATE</label>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>
                            {position.lat.toFixed(4)}° N, {position.lng.toFixed(4)}° W
                        </div>
                    </div>
                </div>
            </main>

            {/* Control Panel */}
            <aside className="controls">
                <div>
                    <span className="section-label">Location Analysis</span>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, marginBottom: '8px', display: 'block' }}>SEARCH BY FULL ADDRESS</label>
                    <input 
                        className="input-box" 
                        placeholder="Enter street, city, postal code..." 
                        value={addressInput} 
                        onChange={(e) => setAddressInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                    />
                    
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f8f9fa', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <LinkIcon size={16} /> Parse Geo-Link
                    </div>
                </div>

                <div>
                    <span className="section-label">Primary Coordinates</span>
                    <div className="coord-row">
                        <div className="coord-field">
                            <label>LATITUDE</label>
                            <input className="input-box" value={position.lat.toFixed(4)} readOnly />
                        </div>
                        <div className="coord-field">
                            <label>LONGITUDE</label>
                            <input className="input-box" value={position.lng.toFixed(4)} readOnly />
                        </div>
                    </div>
                    <div className="coord-field" style={{ marginTop: '16px' }}>
                        <label>EVENT DEPTH (KM)</label>
                        <input 
                            className="input-box" 
                            type="number" 
                            step="0.1" 
                            value={depth} 
                            onChange={(e) => setDepth(e.target.value)} 
                        />
                    </div>
                </div>

                <button className="eval-btn" onClick={handlePredict} disabled={loading}>
                    {loading ? "Calculating..." : "Evaluate Risk"}
                </button>

                <div className="results-panel">
                    <div className="risk-level-card">
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6c757d', uppercase: 'true' }}>ASSESSED RISK LEVEL</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px' }}>
                            {prediction ? `${prediction.risk_level} Risk` : "--"}
                        </div>
                        {prediction && (
                            <div style={{ height: '4px', width: '100%', background: '#f1f3f5', marginTop: '16px', borderRadius: '2px' }}>
                                <div style={{ height: '4px', width: `${prediction.risk_probability}%`, background: '#3b82f6', borderRadius: '2px' }}></div>
                            </div>
                        )}
                    </div>

                    <div className="stat-grid">
                        <div className="stat-card">
                            <span className="stat-label">PROBABILITY</span>
                            <div className="stat-val">{prediction ? prediction.risk_probability : "--"} <span style={{fontSize: '0.7rem'}}>%</span></div>
                            <div style={{ fontSize: '0.55rem', color: '#6c757d', marginTop: '4px' }}>Next 24 Hours</div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">MAGNITUDE</span>
                            <div className="stat-val">{prediction ? prediction.predicted_magnitude : "--"} <span style={{fontSize: '0.7rem'}}>Mw</span></div>
                            <div style={{ fontSize: '0.55rem', color: '#6c757d', marginTop: '4px' }}>Estimated Cap</div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}

export default App;
