import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import type { VehicleInstance } from '../../stores/useTrafficStore';

// --- CONTEXT ---
interface VehicleHoverContextType {
    hoveredVehicle: VehicleInstance | null;
    hoverPosition: { x: number; y: number } | null;
    setHoveredVehicle: (vehicle: VehicleInstance | null, screenPos?: { x: number; y: number }) => void;
}

const VehicleHoverContext = createContext<VehicleHoverContextType>({
    hoveredVehicle: null,
    hoverPosition: null,
    setHoveredVehicle: () => { },
});

export const useVehicleHover = () => useContext(VehicleHoverContext);

// --- PROVIDER ---
interface VehicleHoverProviderProps {
    children: React.ReactNode;
}

export function VehicleHoverProvider({ children }: VehicleHoverProviderProps) {
    const [hoveredVehicle, setHoveredVehicleState] = useState<VehicleInstance | null>(null);
    const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

    const setHoveredVehicle = useCallback((vehicle: VehicleInstance | null, screenPos?: { x: number; y: number }) => {
        setHoveredVehicleState(vehicle);
        setHoverPosition(screenPos || null);
    }, []);

    return (
        <VehicleHoverContext.Provider value={{ hoveredVehicle, hoverPosition, setHoveredVehicle }}>
            {children}
        </VehicleHoverContext.Provider>
    );
}

// =============================================================================
// FILAMENT 4 STYLE POPUP - Image + Plate + Entry Time + Duration
// =============================================================================

// Format elapsed time: "3 gün 1 saat" or "5 dakika" etc.
function formatElapsedTime(entryTime: number): string {
    const now = Date.now();
    const diffMs = now - entryTime;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        const remainingHours = hours % 24;
        if (remainingHours > 0) {
            return `${days} gün ${remainingHours} saat`;
        }
        return `${days} gün`;
    }

    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        if (remainingMinutes > 0) {
            return `${hours} saat ${remainingMinutes} dk`;
        }
        return `${hours} saat`;
    }

    if (minutes > 0) {
        return `${minutes} dakika`;
    }

    return `${seconds} saniye`;
}

// Format entry time: "20.12.2024 23:45"
function formatEntryTime(entryTime: number): string {
    const date = new Date(entryTime);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

const popupContainerStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 3000,
    pointerEvents: 'none',
    transform: 'translate(-50%, -100%)',
    marginTop: '-12px',
};

// Filament Card Style
const popupStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e4e4e7', // zinc-200
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    minWidth: '180px',
};

// Image container
const imageContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '80px',
    backgroundColor: '#f4f4f5', // zinc-100
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid #e4e4e7', // zinc-200
};

const emojiStyle: React.CSSProperties = {
    fontSize: '42px',
};

// Body container
const bodyStyle: React.CSSProperties = {
    padding: '12px',
    backgroundColor: '#ffffff',
};

// Plate style
const plateStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 700,
    color: '#18181b', // zinc-900
    fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
    letterSpacing: '0.1em',
    backgroundColor: '#fafafa', // zinc-50
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #e4e4e7', // zinc-200
    display: 'block',
    textAlign: 'center',
    marginBottom: '10px',
};

// Info row style
const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    padding: '4px 0',
    borderBottom: '1px solid #f4f4f5', // zinc-100
};

const lastInfoRowStyle: React.CSSProperties = {
    ...infoRowStyle,
    borderBottom: 'none',
};

const labelStyle: React.CSSProperties = {
    color: '#71717a', // zinc-500
    fontWeight: 500,
};

const valueStyle: React.CSSProperties = {
    color: '#18181b', // zinc-900
    fontWeight: 600,
};

// Duration badge - amber highlight
const durationBadgeStyle: React.CSSProperties = {
    backgroundColor: '#fef3c7', // amber-100
    color: '#b45309', // amber-700
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 600,
    fontSize: '11px',
};

// Arrow pointer
const arrowBorderStyle: React.CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #e4e4e7',
    margin: '0 auto',
};

const arrowStyle: React.CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: '7px solid transparent',
    borderRight: '7px solid transparent',
    borderTop: '7px solid #ffffff',
    margin: '0 auto',
    marginTop: '-9px',
};

const getVehicleEmoji = (type: number): string => {
    switch (type) {
        case 1: return '🚗';
        case 2: return '🚐';
        case 3: return '🚌';
        case 5: return '🚚';
        default: return '🚗';
    }
};

export function VehicleHoverPopup() {
    const { hoveredVehicle, hoverPosition } = useVehicleHover();
    const [, setTick] = useState(0);

    // Update every second to refresh elapsed time
    useEffect(() => {
        if (!hoveredVehicle) return;

        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [hoveredVehicle]);

    if (!hoveredVehicle || !hoverPosition) return null;

    const entryTimeFormatted = formatEntryTime(hoveredVehicle.entryTime);
    const elapsedTime = formatElapsedTime(hoveredVehicle.entryTime);

    return (
        <div
            style={{
                ...popupContainerStyle,
                left: hoverPosition.x,
                top: hoverPosition.y,
            }}
        >
            <div style={popupStyle}>
                {/* Image Area */}
                <div style={imageContainerStyle}>
                    <span style={emojiStyle}>
                        {getVehicleEmoji(hoveredVehicle.type)}
                    </span>
                </div>

                {/* Body */}
                <div style={bodyStyle}>
                    {/* Plate */}
                    <div style={plateStyle}>
                        {hoveredVehicle.plate}
                    </div>

                    {/* Entry Time */}
                    <div style={infoRowStyle}>
                        <span style={labelStyle}>Giriş</span>
                        <span style={valueStyle}>{entryTimeFormatted}</span>
                    </div>

                    {/* Elapsed Time */}
                    <div style={lastInfoRowStyle}>
                        <span style={labelStyle}>Süre</span>
                        <span style={durationBadgeStyle}>{elapsedTime}</span>
                    </div>
                </div>
            </div>

            {/* Arrow */}
            <div style={arrowBorderStyle} />
            <div style={arrowStyle} />
        </div>
    );
}
