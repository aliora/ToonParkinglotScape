import { create } from 'zustand';
import { Vector3 } from 'three';
import type { IVehicleData } from '../types/VehicleTypes';
import { VehicleType } from '../types/VehicleTypes';
import { createRandomVehicle } from '../utils/VehicleFactory';
import { DIMENSIONS } from '../config/constants';

export interface ParkingSpot {
    id: string;
    position: Vector3;
    laneZ: number;
    occupied: boolean;
    row: number;
    pairIndex: number;
    isTopRow: boolean;
}

export interface VehicleInstance extends IVehicleData {
    targetPosition: Vector3;
    targetRotation: number;
    spotId: string;
    startPosition: Vector3;
    currentPosition: Vector3;
    waypoints: Vector3[];
    // Exit fields
    isExiting: boolean;
    exitWaypoints: Vector3[];
}

interface TrafficState {
    parkingSpots: ParkingSpot[];
    vehicles: VehicleInstance[];
    spawnPoint: Vector3;
    blockHeight: number;
    pairHeight: number;
    numPairs: number;

    setSpots: (spots: ParkingSpot[]) => void;
    setLayoutInfo: (blockHeight: number, pairHeight: number, numPairs: number) => void;
    spawnVehicle: (type?: VehicleType) => VehicleInstance | null;
    removeVehicle: (id: string) => void;
    updateVehicleState: (id: string, state: 'moving' | 'parked') => void;
    updateVehiclePosition: (id: string, position: Vector3) => void;
    startExitingVehicle: (id: string) => void;
}

// Lane Z position (single lane for both entry and exit)
const ENTRY_LANE_Z = -5;

const SPAWN_POINT = new Vector3(-50, 0, ENTRY_LANE_Z);
const JUNCTION_POINT_X = -5;

function generateWaypoints(spot: ParkingSpot): Vector3[] {
    const waypoints: Vector3[] = [];
    const { SLOT_DEPTH } = DIMENSIONS;

    // Direct path to parking spot
    // 1. Start point (spawn)
    waypoints.push(SPAWN_POINT.clone());

    // 2. Junction point on entry lane
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, ENTRY_LANE_Z));

    // 3. Turn to spot's lane
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, spot.laneZ));

    // 4. Move along lane to spot X
    waypoints.push(new Vector3(spot.position.x, 0, spot.laneZ));

    // 5. Approach spot
    const approachOffset = spot.isTopRow ? SLOT_DEPTH / 2 + 0.5 : -(SLOT_DEPTH / 2 + 0.5);
    waypoints.push(new Vector3(spot.position.x, 0, spot.position.z + approachOffset));

    // 6. Final position in spot
    waypoints.push(spot.position.clone());

    return waypoints;
}

function generateExitWaypoints(spot: ParkingSpot): Vector3[] {
    const waypoints: Vector3[] = [];
    const { SLOT_DEPTH } = DIMENSIONS;

    // Exit path is the REVERSE of entry path
    // Entry: spawn -> junction -> lane -> spot
    // Exit:  spot -> lane -> junction -> spawn

    // 1. Back out of spot to approach position
    const approachOffset = spot.isTopRow ? SLOT_DEPTH / 2 + 0.5 : -(SLOT_DEPTH / 2 + 0.5);
    waypoints.push(new Vector3(spot.position.x, 0, spot.position.z + approachOffset));

    // 2. Move to lane
    waypoints.push(new Vector3(spot.position.x, 0, spot.laneZ));

    // 3. Move to junction (same as entry junction)
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, spot.laneZ));

    // 4. Turn to entry lane (z=-5, same as entry)
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, ENTRY_LANE_Z));

    // 5. Exit point (same as spawn point)
    waypoints.push(SPAWN_POINT.clone());

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

        // Find nearest spot
        let nearestSpot = unoccupiedSpots[0];
        let minScore = Math.abs(nearestSpot.position.x) + Math.abs(nearestSpot.laneZ) * 0.5;

        for (const spot of unoccupiedSpots) {
            const score = spot.position.x + Math.abs(spot.laneZ) * 0.5;
            if (score < minScore) {
                minScore = score;
                nearestSpot = spot;
            }
        }

        const waypoints = generateWaypoints(nearestSpot);
        const vehicleData = createRandomVehicle(type);

        // Calculate target rotation based on spot row
        // Top row (North) needs to face South (PI)? No, wait.
        // Lane is Z, Spot is Z +/- offset.
        // If spot is 'top row' (pairIndex * pairHeight - offset), it has smaller Z than Lane.
        // Vehicle moves from Lane (+Z relative to spot) to Spot (-Z direction).
        // So heading is -Z. Rotation should be Math.PI.
        // If spot is 'bottom row', it has larger Z than Lane.
        // Vehicle moves from Lane (-Z relative to spot) to Spot (+Z direction).
        // So heading is +Z. Rotation should be 0.
        const targetRotation = nearestSpot.isTopRow ? Math.PI : 0;

        const vehicleInstance: VehicleInstance = {
            ...vehicleData,
            targetPosition: nearestSpot.position.clone(),
            targetRotation,
            spotId: nearestSpot.id,
            startPosition: SPAWN_POINT.clone(),
            currentPosition: SPAWN_POINT.clone(),
            waypoints,
            isExiting: false,
            exitWaypoints: [],
        };

        console.log(`[Traffic] Vehicle ${vehicleInstance.id} spawned, heading to spot ${nearestSpot.id}`);

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

    startExitingVehicle: (id: string) => {
        const state = get();
        const vehicle = state.vehicles.find((v) => v.id === id);

        if (!vehicle || vehicle.state !== 'parked') {
            console.warn(`[Traffic] Cannot start exit for vehicle ${id}: not found or not parked`);
            return;
        }

        const spot = state.parkingSpots.find((s) => s.id === vehicle.spotId);
        if (!spot) {
            console.warn(`[Traffic] Cannot find spot ${vehicle.spotId} for vehicle ${id}`);
            return;
        }

        const exitWaypoints = generateExitWaypoints(spot);

        console.log(`[Traffic] Vehicle ${id} starting exit`);

        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id
                    ? {
                        ...v,
                        isExiting: true,
                        exitWaypoints,
                        state: 'moving' as const,
                    }
                    : v
            ),
            parkingSpots: state.parkingSpots.map((s) =>
                s.id === vehicle.spotId ? { ...s, occupied: false } : s
            ),
        }));
    },
}));
