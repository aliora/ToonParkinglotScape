import { useState } from 'react';
import { useTrafficStore } from '../../stores/useTrafficStore';
import { VehicleType } from '../../types/VehicleTypes';

// --- STYLES ---
const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '280px',
    maxHeight: 'calc(100vh - 40px)',
    backgroundColor: 'rgba(17, 24, 39, 0.75)', // Dark blue-gray with opacity
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
    color: '#e5e7eb', // gray-200
    fontFamily: '"Outfit", "Inter", sans-serif',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 2000,
    transition: 'all 0.3s ease',
};

const headerStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
};

const sectionHeaderStyle: React.CSSProperties = {
    padding: '12px 16px',
    background: 'rgba(0, 0, 0, 0.2)',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#9ca3af', // gray-400
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    userSelect: 'none',
};

const contentStyle: React.CSSProperties = {
    padding: '12px 16px',
    overflowY: 'auto',
};

const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
};

const buttonStyle = (color: string, disabled: boolean): React.CSSProperties => ({
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    background: disabled ? 'rgba(255,255,255,0.05)' : color,
    color: disabled ? 'rgba(255,255,255,0.2)' : 'white',
    fontSize: '12px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: disabled ? 'none' : '0 2px 4px rgba(0,0,0,0.2)',
});

const statBoxStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
};

const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 600,
};

const valueStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
};

const vehicleItemStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'background 0.2s',
};

const statusBadgeStyle = (status: string): React.CSSProperties => {
    let bg = 'rgba(107, 114, 128, 0.3)';
    let color = '#d1d5db';
    if (status === 'moving') { bg = 'rgba(59, 130, 246, 0.2)'; color = '#93c5fd'; }
    if (status === 'parked') { bg = 'rgba(16, 185, 129, 0.2)'; color = '#6ee7b7'; }
    if (status === 'exiting') { bg = 'rgba(245, 158, 11, 0.2)'; color = '#fcd34d'; }

    return {
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        background: bg,
        color: color,
        textTransform: 'capitalize',
    };
};

// --- COMPONENTS ---

export function ControlPanel() {
    const [sections, setSections] = useState({
        controls: true,
        monitor: true,
        vehicles: true,
        world: false
    });

    const toggle = (key: keyof typeof sections) => setSections(p => ({ ...p, [key]: !p[key] }));

    const store = useTrafficStore();
    const { vehicles, parkingSpots, spawnVehicle, removeVehicle, startExitingVehicle, worldConfig, setWorldConfig, setNatureConfig } = store;

    const availableSpots = parkingSpots.filter(s => !s.occupied).length;

    // Stats
    const entryQueue = store.virtualEntryBacklog.length;
    const exitQueue = vehicles.filter(v => v.isPendingExit).length;
    const activeVehicles = vehicles.filter(v => !v.isExiting && v.state !== 'parked').length;

    // Handlers
    const handleSpawn = (type: VehicleType) => {
        spawnVehicle(type);
    };
    const setTimeOfDay = (val: 'Day' | 'Night') => setWorldConfig({ timeOfDay: val });
    const setCapacity = (e: React.ChangeEvent<HTMLInputElement>) => setWorldConfig({ capacity: parseInt(e.target.value) });
    const setGreenery = (e: React.ChangeEvent<HTMLInputElement>) => setNatureConfig({ greeneryChance: parseFloat(e.target.value) });
    const setScatter = (e: React.ChangeEvent<HTMLInputElement>) => setNatureConfig({ scatterCount: parseInt(e.target.value) });

    return (
        <div style={containerStyle}>
            {/* HEADER */}
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>🎛️</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>Traffic Control</div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>Debug Console v2.0</div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: availableSpots > 0 ? '#4ade80' : '#ef4444' }}>
                        {availableSpots}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.5 }}>FREE SPOTS</div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>

                {/* WORLD SETTINGS */}
                <div style={sectionHeaderStyle} onClick={() => toggle('world')}>
                    <span>World Settings</span>
                    <span>{sections.world ? '−' : '+'}</span>
                </div>
                {sections.world && (
                    <div style={contentStyle}>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', opacity: 0.7 }}>Time of Day</label>
                                <span style={{ fontSize: '11px', fontWeight: 700 }}>{worldConfig.timeOfDay}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                    style={{ ...buttonStyle(worldConfig.timeOfDay === 'Day' ? '#eab308' : 'transparent', false), flex: 1, border: '1px solid rgba(255,255,255,0.1)' }}
                                    onClick={() => setTimeOfDay('Day')}
                                >Day ☀️</button>
                                <button
                                    style={{ ...buttonStyle(worldConfig.timeOfDay === 'Night' ? '#6366f1' : 'transparent', false), flex: 1, border: '1px solid rgba(255,255,255,0.1)' }}
                                    onClick={() => setTimeOfDay('Night')}
                                >Night 🌙</button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', opacity: 0.7 }}>Capacity</label>
                                <span style={{ fontSize: '11px' }}>{worldConfig.capacity}</span>
                            </div>
                            <input
                                type="range"
                                min="1" max="200"
                                value={worldConfig.capacity}
                                onChange={setCapacity}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', opacity: 0.7 }}>Nature Density</label>
                                <span style={{ fontSize: '11px' }}>{worldConfig.nature.scatterCount}</span>
                            </div>
                            <input
                                type="range"
                                min="50" max="1000" step="50"
                                value={worldConfig.nature.scatterCount}
                                onChange={setScatter}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', opacity: 0.7 }}>Greenery Ratio</label>
                                <span style={{ fontSize: '11px' }}>{Math.round(worldConfig.nature.greeneryChance * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.1"
                                value={worldConfig.nature.greeneryChance}
                                onChange={setGreenery}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                )}

                {/* CONTROLS */}
                <div style={sectionHeaderStyle} onClick={() => toggle('controls')}>
                    <span>Spawn Controls</span>
                    <span>{sections.controls ? '−' : '+'}</span>
                </div>
                {sections.controls && (
                    <div style={contentStyle}>
                        <div style={gridStyle}>
                            <button
                                style={buttonStyle('linear-gradient(135deg, #3b82f6, #2563eb)', availableSpots === 0)}
                                onClick={() => handleSpawn(VehicleType.CAR)}
                                disabled={availableSpots === 0}
                            >
                                🚗 Car
                            </button>
                            <button
                                style={buttonStyle('linear-gradient(135deg, #8b5cf6, #7c3aed)', availableSpots === 0)}
                                onClick={() => handleSpawn(VehicleType.BUS)}
                                disabled={availableSpots === 0}
                            >
                                🚌 Bus
                            </button>
                            <button
                                style={buttonStyle('linear-gradient(135deg, #10b981, #059669)', availableSpots === 0)}
                                onClick={() => handleSpawn(VehicleType.MINIBUS)}
                                disabled={availableSpots === 0}
                            >
                                🚐 Minibus
                            </button>
                            <button
                                style={buttonStyle('linear-gradient(135deg, #f59e0b, #d97706)', availableSpots === 0)}
                                onClick={() => handleSpawn(VehicleType.TRUCK)}
                                disabled={availableSpots === 0}
                            >
                                🚚 Truck
                            </button>
                        </div>
                    </div>
                )}

                {/* MONITOR */}
                <div style={sectionHeaderStyle} onClick={() => toggle('monitor')}>
                    <span>System Monitor</span>
                    <span>{sections.monitor ? '−' : '+'}</span>
                </div>
                {sections.monitor && (
                    <div style={contentStyle}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                            <div style={statBoxStyle}>
                                <span style={labelStyle}>Entry Gate</span>
                                <span style={{ ...valueStyle, color: store.entryGateState === 'OPEN' ? '#4ade80' : '#e5e7eb' }}>
                                    {store.entryGateState}
                                </span>
                            </div>
                            <div style={statBoxStyle}>
                                <span style={labelStyle}>Exit Gate</span>
                                <span style={{ ...valueStyle, color: store.exitGateState === 'OPEN' ? '#4ade80' : '#e5e7eb' }}>
                                    {store.exitGateState}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <div style={statBoxStyle}>
                                <span style={labelStyle}>Active</span>
                                <span style={valueStyle}>{activeVehicles}</span>
                            </div>
                            <div style={statBoxStyle}>
                                <span style={labelStyle}>Wait Q</span>
                                <span style={valueStyle}>{entryQueue}</span>
                            </div>
                            <div style={statBoxStyle}>
                                <span style={labelStyle}>Exit Q</span>
                                <span style={valueStyle}>{exitQueue}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* VEHICLE LIST */}
                <div style={sectionHeaderStyle} onClick={() => toggle('vehicles')}>
                    <span>Vehicles ({vehicles.length})</span>
                    <span>{sections.vehicles ? '−' : '+'}</span>
                </div>
                {sections.vehicles && (
                    <div style={contentStyle}>
                        {vehicles.length === 0 ? (
                            <div style={{ textAlign: 'center', opacity: 0.3, padding: '20px', fontSize: '13px' }}>
                                No vehicles in simulation
                            </div>
                        ) : (
                            vehicles.map(v => (
                                <div key={v.id} style={vehicleItemStyle}>
                                    <div style={{ width: '8px', height: '32px', borderRadius: '2px', background: v.color }}></div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{v.plate}</span>
                                            <span style={statusBadgeStyle(v.isExiting ? 'exiting' : v.state)}>
                                                {v.isExiting ? 'Exiting' : v.state}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '10px', opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            ID: {v.id.slice(0, 8)}...
                                        </div>
                                    </div>

                                    {v.state === 'parked' && !v.isExiting && (
                                        <button
                                            title="Force Exit"
                                            onClick={() => startExitingVehicle(v.id)}
                                            style={{
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                color: '#34d399',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ➜
                                        </button>
                                    )}
                                    <button
                                        title="Delete"
                                        onClick={() => removeVehicle(v.id)}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            color: '#f87171',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ControlPanel;
