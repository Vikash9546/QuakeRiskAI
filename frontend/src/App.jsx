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
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem('quake_history');
        return saved ? JSON.parse(saved) : [];
    });
    const mapRef = useRef(null);

    // Persist history to localStorage
    useEffect(() => {
        localStorage.setItem('quake_history', JSON.stringify(history));
    }, [history]);

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
            
            // Add to history
            const newEntry = {
                ...response.data,
                lat: position.lat,
                lng: position.lng,
                time: new Date().toLocaleTimeString()
            };
            setHistory(prev => [newEntry, ...prev]);
            
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
                    <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="section-label">Session Assessment History</span>
                            {history.length > 0 && (
                                <button 
                                    onClick={() => setHistory([])}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <AlertTriangle size={12} /> CLEAR ALL
                                </button>
                            )}
                        </div>
                        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {history.length > 0 ? (
                                history.map((h, i) => (
                                    <motion.div key={i} className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ borderLeft: `4px solid ${h.risk_level === 'High' ? '#ef4444' : '#10b981'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            <div style={{ background: '#f1f3f5', padding: '10px', borderRadius: '8px' }}>
                                                <ShieldCheck color={h.risk_level === 'High' ? '#ef4444' : '#10b981'} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Assessment at {h.lat.toFixed(4)}°, {h.lng.toFixed(4)}°</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '4px' }}>Analyzed at {h.time} • Risk Level: <span style={{fontWeight: 700, color: h.risk_level === 'High' ? '#ef4444' : '#10b981'}}>{h.risk_level}</span></div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <div style={{ textAlign: 'right', borderRight: '1px solid #e9ecef', paddingRight: '12px' }}>
                                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{h.predicted_magnitude}</div>
                                                <div style={{ fontSize: '0.6rem', color: '#6c757d' }}>MAGNITUDE</div>
                                            </div>
                                            <a 
                                                href={`${API_BASE}/generate-report?lat=${h.lat}&lng=${h.lng}&risk=${h.risk_level}&prob=${h.risk_probability}&mag=${h.predicted_magnitude}`}
                                                style={{ color: '#10b981', background: '#ecfdf5', padding: '8px', borderRadius: '4px', display: 'flex' }}
                                                target="_blank"
                                                title="Download PDF"
                                            >
                                                <Download size={18} />
                                            </a>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="card" style={{ opacity: 0.6, textAlign: 'center', padding: '60px' }}>
                                    <Search size={48} color="#6c757d" style={{ marginBottom: '16px' }} />
                                    <p>No assessments recorded in this session.</p>
                                    <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>Perform an analysis in the 'Global Map' tab to populate this report.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'Station Health':
                const stations = [
                    { name: 'Western Ghats Node', loc: 'Pune, IN', status: 'Stable', lat: '12ms', uptime: '99.98%', model: 'Guralp CMG-5T' },
                    { name: 'Himalayan Array', loc: 'Uttarkashi, IN', status: 'Stable', lat: '45ms', uptime: '98.50%', model: 'Nanometrics Trillium' },
                    { name: 'Coastal Monitor', loc: 'Chennai, IN', status: 'Stable', lat: '18ms', uptime: '99.99%', model: 'Kinemetrics Etna' },
                    { name: 'Indo-Gangetic Sensor', loc: 'New Delhi, IN', status: 'Maintenance', lat: '--', uptime: '92.10%', model: 'Quanterra Q330' },
                ];
                return (
                    <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                        <span className="section-label">Subcontinent Sensor Network</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                            {stations.map(st => (
                                <div key={st.name} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{ background: st.status === 'Stable' ? '#d1fae5' : '#fef3c7', padding: '10px', borderRadius: '8px' }}>
                                                <ShieldCheck color={st.status === 'Stable' ? '#059669' : '#d97706'} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{st.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>{st.loc}</div>
                                            </div>
                                        </div>
                                        <span style={{ 
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800,
                                            background: st.status === 'Stable' ? '#d1fae5' : '#fef3c7',
                                            color: st.status === 'Stable' ? '#059669' : '#d97706'
                                        }}>{st.status}</span>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '4px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.55rem', color: '#6c757d' }}>LATENCY</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{st.lat}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.55rem', color: '#6c757d' }}>UPTIME</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{st.uptime}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.55rem', color: '#6c757d' }}>MODEL</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{st.model.split(' ')[1]}</div>
                                        </div>
                                    </div>
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
                </nav>

                <button className="export-btn" onClick={() => window.open(`${API_BASE}/export-data`, '_blank')}>
                    <Download size={16} /> Export India Dataset
                </button>
            </aside>

            <main className="main-area">
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
