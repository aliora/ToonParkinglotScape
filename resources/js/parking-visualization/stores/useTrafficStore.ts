import { create } from 'zustand';
import type { VehicleInstance, InitialVehicle, VehicleEnteredEvent, MountConfig } from '../types';

interface TrafficState {
    vehicles: VehicleInstance[];
    capacity: number;
    parkId: number;
    onVehicleCountChange?: (count: number) => void;

    // Actions
    initialize: (config: MountConfig) => void;
    addVehicle: (event: VehicleEnteredEvent) => void;
    removeVehicle: (sessionUid: string) => void;
    getNextFreeSpot: () => number;
    calculatePosition: (spotIndex: number, capacity: number) => { x: number; z: number };
}

/**
 * Calculate grid dimensions based on capacity
 */
function calculateGridDimensions(capacity: number): { cols: number; rows: number } {
    const cols = Math.ceil(Math.sqrt(capacity));
    const rows = Math.ceil(capacity / cols);
    return { cols, rows };
}

/**
 * Calculate 3D position for a parking spot
 */
function calculateSpotPosition(
    spotIndex: number,
    capacity: number
): { x: number; z: number } {
    const { cols } = calculateGridDimensions(capacity);

    const slotWidth = 3;
    const slotDepth = 5;
    const laneWidth = 4;

    const col = spotIndex % cols;
    const row = Math.floor(spotIndex / cols);

    // Determine if this is top or bottom row of the lane
    const isTopRow = row % 2 === 0;
    const laneIndex = Math.floor(row / 2);

    const x = col * slotWidth;
    const z = laneIndex * (slotDepth * 2 + laneWidth) + (isTopRow ? 0 : slotDepth);

    return { x, z };
}

export const useTrafficStore = create<TrafficState>((set, get) => ({
    vehicles: [],
    capacity: 50,
    parkId: 0,
    onVehicleCountChange: undefined,

    initialize: (config: MountConfig) => {
        const vehicles: VehicleInstance[] = config.initialVehicles.map(
            (v: InitialVehicle, index: number) => ({
                ...v,
                spotIndex: index,
                position: calculateSpotPosition(index, config.capacity),
            })
        );

        set({
            vehicles,
            capacity: config.capacity,
            parkId: config.parkId,
            onVehicleCountChange: config.onVehicleCountChange,
        });

        // Notify host about initial count
        config.onVehicleCountChange?.(vehicles.length);

        console.log('[TrafficStore] Initialized with', vehicles.length, 'vehicles');
    },

    getNextFreeSpot: () => {
        const { vehicles, capacity } = get();
        const occupiedSpots = new Set(vehicles.map((v) => v.spotIndex));

        for (let i = 0; i < capacity; i++) {
            if (!occupiedSpots.has(i)) {
                return i;
            }
        }
        // Fallback: use next index beyond current vehicles
        return vehicles.length;
    },

    calculatePosition: (spotIndex: number, capacity: number) => {
        return calculateSpotPosition(spotIndex, capacity);
    },

    addVehicle: (event: VehicleEnteredEvent) => {
        const { vehicles, capacity, onVehicleCountChange, getNextFreeSpot, calculatePosition } = get();

        // Check if vehicle already exists
        if (vehicles.some((v) => v.id === event.sessionUid)) {
            console.log('[TrafficStore] Vehicle already exists:', event.sessionUid);
            return;
        }

        const spotIndex = getNextFreeSpot();
        const position = calculatePosition(spotIndex, capacity);

        const newVehicle: VehicleInstance = {
            id: event.sessionUid,
            plateNumber: event.plateNumber,
            photoUrl: event.photoUrl,
            entryAt: new Date().toISOString(),
            vehicleClass: event.vehicleClass ?? 1,
            spotIndex,
            position,
        };

        set((state) => ({
            vehicles: [...state.vehicles, newVehicle],
        }));

        // Notify host
        onVehicleCountChange?.(vehicles.length + 1);

        console.log('[TrafficStore] Vehicle added:', event.sessionUid);
    },

    removeVehicle: (sessionUid: string) => {
        const { vehicles, onVehicleCountChange } = get();

        const vehicleExists = vehicles.some((v) => v.id === sessionUid);
        if (!vehicleExists) {
            console.log('[TrafficStore] Vehicle not found:', sessionUid);
            return;
        }

        set((state) => ({
            vehicles: state.vehicles.filter((v) => v.id !== sessionUid),
        }));

        // Notify host
        onVehicleCountChange?.(vehicles.length - 1);

        console.log('[TrafficStore] Vehicle removed:', sessionUid);
    },
}));
