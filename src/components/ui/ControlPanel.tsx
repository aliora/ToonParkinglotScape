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
    minWidth: '200px',
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
    const queueSpawn = useTrafficStore((state) => state.queueSpawn);
    const removeVehicle = useTrafficStore((state) => state.removeVehicle);

    const availableSpots = parkingSpots.filter((s) => !s.occupied).length;

    const handleSpawn = (type: VehicleType) => {
        queueSpawn(type);
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
                                {vehicle.plate} • {vehicle.state}
                            </div>
                        </div>
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
