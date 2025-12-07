import { create } from 'zustand';
import { Vector3 } from 'three';
import type { IVehicleData } from '../types/VehicleTypes';
import { VehicleType } from '../types/VehicleTypes';
import { createRandomVehicle } from '../utils/VehicleFactory';
import { DIMENSIONS } from '../config/constants';

export interface ParkingSpot {
    id: string;
    position: Vector3;
    laneZ: number; // Z position of the lane this spot faces
    occupied: boolean;
    row: number;
    pairIndex: number; // Which pair of rows this spot belongs to (0, 1, 2...)
    isTopRow: boolean; // If true, vehicle enters from below (positive Z direction)
}

export interface VehicleInstance extends IVehicleData {
    targetPosition: Vector3;
    spotId: string;
    startPosition: Vector3;
    currentPosition: Vector3; // Real-time position for collision detection
    waypoints: Vector3[]; // Manhattan-style path waypoints
}

interface TrafficState {
    parkingSpots: ParkingSpot[];
    vehicles: VehicleInstance[];
    spawnPoint: Vector3;
    // Layout info for waypoint generation
    blockHeight: number;
    pairHeight: number;
    numPairs: number;

    setSpots: (spots: ParkingSpot[]) => void;
    setLayoutInfo: (blockHeight: number, pairHeight: number, numPairs: number) => void;
    spawnVehicle: (type?: VehicleType) => VehicleInstance | null;
    removeVehicle: (id: string) => void;
    updateVehicleState: (id: string, state: 'moving' | 'parked') => void;
    updateVehiclePosition: (id: string, position: Vector3) => void;
}

// Barrier spawn point (where vehicles enter - further back on road)
const SPAWN_POINT = new Vector3(-45, 0, 0);
// Entry point onto the main parking area
const ENTRY_POINT = new Vector3(-5, 0, 0);
// Junction point where vehicles choose upper or lower lane
const JUNCTION_POINT_X = -5;

/**
 * Generate Manhattan-style path from spawn to parking spot
 * Path: Barrier → Entry → Junction → Choose Lane (upper/lower) → Navigate to column → Turn into spot
 */
function generateWaypoints(spot: ParkingSpot): Vector3[] {
    const waypoints: Vector3[] = [];
    const { SLOT_DEPTH } = DIMENSIONS;

    // 1. Entry point - onto main driveway
    waypoints.push(ENTRY_POINT.clone());

    // 2. Junction point - where lanes split
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, 0));

    // 3. Turn into the selected lane (upper or lower based on spot's laneZ)
    // This is the "şerit seçimi" - go to the correct lane first
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, spot.laneZ));

    // 4. Move along lane to X position of parking spot
    const laneApproachX = spot.position.x;
    waypoints.push(new Vector3(laneApproachX, 0, spot.laneZ));

    // 5. Turn into parking spot approach
    // If top row: vehicle approaches from lane (positive Z side of spot)
    // If bottom row: vehicle approaches from lane (negative Z side of spot)
    const approachOffset = spot.isTopRow ? SLOT_DEPTH / 2 + 0.5 : -(SLOT_DEPTH / 2 + 0.5);
    waypoints.push(new Vector3(spot.position.x, 0, spot.position.z + approachOffset));

    // 6. Final position - center of parking spot
    waypoints.push(spot.position.clone());

    return waypoints;
}

export const useTrafficStore = create<TrafficState>((set, get) => ({
    parkingSpots: [],
    vehicles: [],
    spawnPoint: SPAWN_POINT,
    blockHeight: 0,
    pairHeight: 0,
    numPairs: 0,

    setSpots: (spots) => set({ parkingSpots: spots }),

    setLayoutInfo: (blockHeight, pairHeight, numPairs) =>
        set({ blockHeight, pairHeight, numPairs }),

    spawnVehicle: (type?: VehicleType) => {
        const state = get();
        const unoccupiedSpots = state.parkingSpots.filter((spot) => !spot.occupied);

        if (unoccupiedSpots.length === 0) {
            console.warn('No available parking spots');
            return null;
        }

        // Find nearest spot by X position (closer to entry = shorter drive)
        // Then by lane distance (closer lanes first)
        let nearestSpot = unoccupiedSpots[0];
        let minScore = Math.abs(nearestSpot.position.x) + Math.abs(nearestSpot.laneZ) * 0.5;

        for (const spot of unoccupiedSpots) {
            const score = spot.position.x + Math.abs(spot.laneZ) * 0.5;
            if (score < minScore) {
                minScore = score;
                nearestSpot = spot;
            }
        }

        // Generate path waypoints
        const waypoints = generateWaypoints(nearestSpot);

        // Create vehicle
        const vehicleData = createRandomVehicle(type);
        const vehicleInstance: VehicleInstance = {
            ...vehicleData,
            targetPosition: nearestSpot.position.clone(),
            spotId: nearestSpot.id,
            startPosition: SPAWN_POINT.clone(),
            currentPosition: SPAWN_POINT.clone(),
            waypoints,
        };

        // Mark spot as occupied and add vehicle
        set((state) => ({
            parkingSpots: state.parkingSpots.map((spot) =>
                spot.id === nearestSpot.id ? { ...spot, occupied: true } : spot
            ),
            vehicles: [...state.vehicles, vehicleInstance],
        }));

        return vehicleInstance;
    },

    removeVehicle: (id: string) => {
        const state = get();
        const vehicle = state.vehicles.find((v) => v.id === id);

        if (!vehicle) return;

        set((state) => ({
            parkingSpots: state.parkingSpots.map((spot) =>
                spot.id === vehicle.spotId ? { ...spot, occupied: false } : spot
            ),
            vehicles: state.vehicles.filter((v) => v.id !== id),
        }));
    },

    updateVehicleState: (id: string, newState: 'moving' | 'parked') => {
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id ? { ...v, state: newState } : v
            ),
        }));
    },

    updateVehiclePosition: (id: string, position: Vector3) => {
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id ? { ...v, currentPosition: position.clone() } : v
            ),
        }));
    },
}));
