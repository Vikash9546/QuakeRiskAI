import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker as LeafletMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MapPin, TrendingUp, Info, AlertTriangle, Link as LinkIcon, Search, Globe, FileText, Database, Heart, Download, Bell, Settings, User, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState('Global Map');
    const [position, setPosition] = useState({ lat: 18.6212, lng: 73.9119 });
    const [depth, setDepth] = useState(12.4);
    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState(null);
    const [addressInput, setAddressInput] = useState('');
    const [resolving, setResolving] = useState(false);
    const [seismicLog, setSeismicLog] = useState([]);
    const mapRef = useRef(null);

    // Fetch Seismic Log with Auto-refresh every 30s
    useEffect(() => {
        const fetchLog = async () => {
            try {
                const res = await axios.get(`${API_BASE}/seismic-log`);
                setSeismicLog(res.data);
            } catch (e) {
                console.error("Failed to fetch log");
            }
        };
        fetchLog();
        const interval = setInterval(fetchLog, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAddressSearch = async () => {
        setResolving(true);
        try {
            const response = await axios.get(`${API_BASE}/geocode`, { params: { address: addressInput } });
            if (response.data.lat) {
                const newPos = { lat: response.data.lat, lng: response.data.lng };
                setPosition(newPos);
                if (mapRef.current) mapRef.current.setView([newPos.lat, newPos.lng], 13);
                setAddressInput('');
                setActiveTab('Global Map');
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

    const renderMainContent = () => {
        switch (activeTab) {
            case 'Seismic Log':
                return (
                    <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                        <span className="section-label">Historical Seismic Events</span>
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {seismicLog.map((ev, i) => (
                                <motion.div key={i} className="card" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ background: ev.mag > 4 ? '#fee2e2' : '#f1f3f5', padding: '10px', borderRadius: '8px' }}>
                                            <Activity size={20} color={ev.mag > 4 ? '#ef4444' : '#6c757d'} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ev.place || `Lat: ${ev.latitude}, Lng: ${ev.longitude}`}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '4px' }}><Clock size={10} style={{marginRight: '4px'}}/>{ev.time}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: ev.mag > 4 ? '#ef4444' : '#1a1a1b' }}>{ev.mag} <span style={{fontSize: '0.7rem'}}>Mw</span></div>
                                        <div style={{ fontSize: '0.6rem', color: '#6c757d' }}>Magnitude</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                );
            case 'Risk Reports':
                return (
                    <div style={{ padding: '32px', flex: 1 }}>
                        <span className="section-label">Generated Reports Portal</span>
                        <div style={{ marginTop: '20px' }}>
                            {prediction ? (
                                <div className="card" style={{ borderLeft: '4px solid #10b981', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <FileText color="#10b981" />
                                            <div>
                                                <div style={{ fontWeight: 700 }}>Custom Risk Assessment: {position.lat.toFixed(2)}, {position.lng.toFixed(2)}</div>
                                                <p style={{ fontSize: '0.75rem', color: '#6c757d' }}>Ready for download. Includes magnitude estimation and risk probability.</p>
                                            </div>
                                        </div>
                                        <a 
                                            href={`${API_BASE}/generate-report?lat=${position.lat}&lng=${position.lng}&risk=${prediction.risk_level}&prob=${prediction.risk_probability}&mag=${prediction.predicted_magnitude}`}
                                            className="eval-btn" 
                                            style={{ width: 'auto', padding: '8px 16px', background: '#10b981', textDecoration: 'none', textAlign: 'center' }}
                                            target="_blank"
                                        >
                                            Download PDF
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="card" style={{ opacity: 0.6, textAlign: 'center', padding: '40px' }}>
                                    <FileText size={48} color="#6c757d" style={{ marginBottom: '16px' }} />
                                    <p>Please perform an analysis in the 'Global Map' tab to generate a custom report.</p>
                                </div>
                            )}
                            
                            <div className="card" style={{ marginTop: '20px', borderLeft: '4px solid #3b82f6' }}>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <FileText color="#3b82f6" />
                                    <div>
                                        <div style={{ fontWeight: 700 }}>Quarterly Regional Overview - India (March 2024)</div>
                                        <p style={{ fontSize: '0.75rem', color: '#6c757d' }}>Tectonic shift analysis for the Himalayan and Coastal regions.</p>
                                        <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.7rem' }}>View Archive</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Station Health':
                return (
                    <div style={{ padding: '32px', flex: 1 }}>
                        <span className="section-label">Global Sensor Network</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                            {['North America', 'Pacific Rim', 'South Asia', 'Europe Central'].map(loc => (
                                <div key={loc} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <ShieldCheck color="#10b981" />
                                        <span style={{ fontWeight: 600 }}>{loc}</span>
                                    </div>
                                    <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 700 }}>ONLINE</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="map-viewport">
                        <MapContainer
                            center={[position.lat, position.lng]}
                            zoom={4}
                            style={{ height: '100%', width: '100%' }}
                            ref={(m) => (mapRef.current = m)}
                        >
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
                );
        }
    };

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="brand">
                    <h1>QuakeRisk AI</h1>
                    <p>Global Hazard Intelligence</p>
                </div>

                <nav>
                    <div className={`nav-item ${activeTab === 'Global Map' ? 'active' : ''}`} onClick={() => setActiveTab('Global Map')}><Globe size={18} /> Global Map</div>
                    <div className={`nav-item ${activeTab === 'Seismic Log' ? 'active' : ''}`} onClick={() => setActiveTab('Seismic Log')}><Activity size={18} /> Seismic Log</div>
                    <div className={`nav-item ${activeTab === 'Risk Reports' ? 'active' : ''}`} onClick={() => setActiveTab('Risk Reports')}><FileText size={18} /> Risk Reports</div>
                    <div className={`nav-item ${activeTab === 'Station Health' ? 'active' : ''}`} onClick={() => setActiveTab('Station Health')}><Database size={18} /> Station Health</div>
                </nav>

                <button className="export-btn" onClick={() => window.print()}>
                    <Download size={16} /> Export Data
                </button>
            </aside>

            <main className="main-area">
                <header className="top-bar">
                    <div className="top-nav">
                        <span className="top-nav-item">QuakeRisk AI</span>
                        <span className={`top-nav-item ${activeTab === 'Global Map' ? 'active' : ''}`} onClick={() => setActiveTab('Global Map')}>Search</span>
                        <span className="top-nav-item">Feed</span>
                        <span className="top-nav-item">History</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <Bell size={20} color="#6c757d" />
                        <Settings size={20} color="#6c757d" />
                        <User size={20} color="#6c757d" />
                    </div>
                </header>

                {renderMainContent()}
            </main>

            <aside className="controls" style={{ opacity: activeTab === 'Global Map' ? 1 : 0.5, pointerEvents: activeTab === 'Global Map' ? 'all' : 'none' }}>
                <div>
                    <span className="section-label">Location Analysis</span>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, marginBottom: '8px', display: 'block' }}>SEARCH BY FULL ADDRESS</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            className="input-box" 
                            style={{ flex: 1 }}
                            placeholder="Street, city, country..." 
                            value={addressInput} 
                            onChange={(e) => setAddressInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                        />
                        <button 
                            className="eval-btn" 
                            style={{ width: 'auto', padding: '0 16px', background: '#10b981' }} 
                            onClick={handleAddressSearch}
                            disabled={resolving || !addressInput}
                        >
                            {resolving ? "..." : "Find"}
                        </button>
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
                </div>

                <button className="eval-btn" onClick={handlePredict} disabled={loading}>
                    {loading ? "Calculating..." : "Evaluate Risk"}
                </button>

                <div className="results-panel">
                    <div className="risk-level-card">
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6c757d' }}>ASSESSED RISK LEVEL</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px' }}>
                            {prediction ? `${prediction.risk_level} Risk` : "--"}
                        </div>
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
