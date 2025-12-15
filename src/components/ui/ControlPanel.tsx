import { useTrafficStore } from '../../stores/useTrafficStore';
import { VehicleType } from '../../types/VehicleTypes';

const panelStyles: React.CSSProperties = {
    position: 'absolute',
    top: 20,
    right: 20,
    background: 'rgba(0, 0, 0, 0.8)',
    padding: '16px',
    borderRadius: '12px',
    color: 'white',
    fontFamily: 'Inter, system-ui, sans-serif',
    minWidth: '240px',
    maxHeight: '80vh',
    overflowY: 'auto',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
};

const buttonStyles: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    marginBottom: '8px',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
};

const vehicleItemStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    marginBottom: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
};

const colorSwatchStyles = (color: string): React.CSSProperties => ({
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: color,
    border: '2px solid rgba(255, 255, 255, 0.3)',
    flexShrink: 0,
});

export function ControlPanel() {
    const vehicles = useTrafficStore((state) => state.vehicles);
    const parkingSpots = useTrafficStore((state) => state.parkingSpots);
    const spawnVehicle = useTrafficStore((state) => state.spawnVehicle);
    const removeVehicle = useTrafficStore((state) => state.removeVehicle);
    const startExitingVehicle = useTrafficStore((state) => state.startExitingVehicle);

    const availableSpots = parkingSpots.filter((s) => !s.occupied).length;

    const handleSpawn = (type: VehicleType) => {
        spawnVehicle(type);
    };

    const handleExit = (id: string) => {
        startExitingVehicle(id);
    };

    const getVehicleTypeName = (type: VehicleType): string => {
        const names: Record<VehicleType, string> = {
            [VehicleType.CAR]: 'Car',
            [VehicleType.MINIBUS]: 'Minibus',
            [VehicleType.BUS]: 'Bus',
            [VehicleType.PICKUP]: 'Pickup',
            [VehicleType.TRUCK]: 'Truck',
            [VehicleType.HEAVYTRUCK]: 'Heavy Truck',
            [VehicleType.MOTORCYCLE]: 'Motorcycle',
        };
        return names[type] || 'Vehicle';
    };

    const getVehicleStatus = (vehicle: typeof vehicles[0]): string => {
        if (vehicle.isExiting) return 'exiting';
        if (vehicle.state === 'parked') return 'parked';
        return 'moving';
    };

    const store = useTrafficStore.getState();

    return (
        <div style={panelStyles}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700 }}>
                🚗 Traffic Control
            </h3>

            <div style={{ marginBottom: '16px', opacity: 0.7, fontSize: '13px' }}>
                Spots: {availableSpots} / {parkingSpots.length} available
            </div>

            <div style={{ marginBottom: '16px' }}>
                <button
                    style={{ ...buttonStyles, background: '#3b82f6', color: 'white' }}
                    onClick={() => handleSpawn(VehicleType.CAR)}
                    disabled={availableSpots === 0}
                >
                    🚙 Spawn Car
                </button>
                <button
                    style={{ ...buttonStyles, background: '#8b5cf6', color: 'white' }}
                    onClick={() => handleSpawn(VehicleType.BUS)}
                    disabled={availableSpots === 0}
                >
                    🚌 Spawn Bus
                </button>
                <button
                    style={{ ...buttonStyles, background: '#10b981', color: 'white' }}
                    onClick={() => handleSpawn(VehicleType.MOTORCYCLE)}
                    disabled={availableSpots === 0}
                >
                    🏍️ Spawn Motorcycle
                </button>
                <button
                    style={{ ...buttonStyles, background: '#f59e0b', color: 'white' }}
                    onClick={() => handleSpawn(VehicleType.TRUCK)}
                    disabled={availableSpots === 0}
                >
                    🚚 Spawn Truck
                </button>
            </div>

            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🚦 System Monitor
                </h4>

                {/* Entry Gate Status */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px', color: '#60a5fa' }}>ENTRY GATE</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '4px' }}>
                            <div style={{ opacity: 0.5, fontSize: '10px' }}>STATE</div>
                            <div style={{ fontWeight: 700, color: store.entryGateState === 'OPEN' ? '#4ade80' : '#fcd34d' }}>
                                {store.entryGateState}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '4px' }}>
                            <div style={{ opacity: 0.5, fontSize: '10px' }}>ACCESS</div>
                            <div style={{ fontWeight: 700 }}>
                                {store.currentEntryGateVehicleId ? '🔒 BUSY' : '🔓 FREE'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exit Gate Status */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px', color: '#f87171' }}>EXIT GATE</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '4px' }}>
                            <div style={{ opacity: 0.5, fontSize: '10px' }}>STATE</div>
                            <div style={{ fontWeight: 700, color: store.exitGateState === 'OPEN' ? '#4ade80' : '#fcd34d' }}>
                                {store.exitGateState}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '4px' }}>
                            <div style={{ opacity: 0.5, fontSize: '10px' }}>ACCESS</div>
                            <div style={{ fontWeight: 700 }}>
                                {store.currentExitGateVehicleId ? '🔒 BUSY' : '🔓 FREE'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Queue Stats */}
                <div>
                    <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>TRAFFIC FLOW</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        {/* Entry Stats */}
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <div style={{ opacity: 0.8, fontSize: '10px', color: '#60a5fa' }}>ENTRY Q</div>
                            <div>Vis: <b>{vehicles.filter(v => !v.isExiting && v.state !== 'parked').length}</b> / 3</div>
                            <div style={{ fontSize: '10px' }}>Log: {useTrafficStore.getState().virtualEntryBacklog.length}</div>
                        </div>

                        {/* Exit Stats */}
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <div style={{ opacity: 0.8, fontSize: '10px', color: '#f87171' }}>EXIT Q</div>
                            <div>Vis: <b>{vehicles.filter(v => v.isExiting && v.state === 'moving').length}</b> / 3</div>
                            <div style={{ fontSize: '10px' }}>Pend: {vehicles.filter(v => v.isPendingExit).length}</div>
                        </div>
                    </div>
                </div>
            </div>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                Active Vehicles ({vehicles.length})
            </h4>

            <div>
                {vehicles.length === 0 && (
                    <div style={{ opacity: 0.5, fontSize: '13px' }}>No vehicles yet</div>
                )}
                {vehicles.map((vehicle) => (
                    <div key={vehicle.id} style={vehicleItemStyles}>
                        <div style={colorSwatchStyles(vehicle.color)} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                {getVehicleTypeName(vehicle.type)}
                            </div>
                            <div style={{ fontSize: '11px', opacity: 0.7 }}>
                                {vehicle.plate} • {getVehicleStatus(vehicle)}
                            </div>
                        </div>
                        {vehicle.state === 'parked' && !vehicle.isExiting && (
                            <button
                                onClick={() => handleExit(vehicle.id)}
                                style={{
                                    background: 'rgba(34, 197, 94, 0.8)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                }}
                            >
                                Exit
                            </button>
                        )}
                        <button
                            onClick={() => removeVehicle(vehicle.id)}
                            style={{
                                background: 'rgba(239, 68, 68, 0.8)',
                                border: 'none',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                            }}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ControlPanel;
