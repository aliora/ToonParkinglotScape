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

// Queue positions at barrier (X coordinates)
export const QUEUE_POSITIONS = [
    new Vector3(-20, 0, 0), // Position 1 - closest to barrier
    new Vector3(-28, 0, 0), // Position 2
    new Vector3(-36, 0, 0), // Position 3 - furthest
];

export interface VehicleInstance extends IVehicleData {
    targetPosition: Vector3;
    spotId: string;
    startPosition: Vector3;
    currentPosition: Vector3;
    waypoints: Vector3[];
    isWaitingAtBarrier: boolean;
    canPassBarrier: boolean;
    queuePosition: number; // 0 = at barrier, 1-3 = queue positions, -1 = not in queue
}

interface PendingSpawn {
    type?: VehicleType;
    id: string;
}

interface TrafficState {
    parkingSpots: ParkingSpot[];
    vehicles: VehicleInstance[];
    spawnPoint: Vector3;
    blockHeight: number;
    pairHeight: number;
    numPairs: number;
    barrierBusy: boolean;
    spawnQueue: PendingSpawn[]; // Vehicles waiting to be spawned

    setSpots: (spots: ParkingSpot[]) => void;
    setLayoutInfo: (blockHeight: number, pairHeight: number, numPairs: number) => void;
    spawnVehicle: (type?: VehicleType) => VehicleInstance | null;
    removeVehicle: (id: string) => void;
    updateVehicleState: (id: string, state: 'moving' | 'parked') => void;
    updateVehiclePosition: (id: string, position: Vector3) => void;
    setVehicleWaiting: (id: string, waiting: boolean) => void;
    grantBarrierPass: (id: string) => void;
    setBarrierBusy: (busy: boolean) => void;
    getNextWaitingVehicle: () => VehicleInstance | null;
    advanceQueue: () => void; // Move vehicles forward in queue
    setVehicleQueuePosition: (id: string, position: number) => void;
    processSpawnQueue: () => void; // Spawn from queue when space available
    queueSpawn: (type?: VehicleType) => void; // Add to spawn queue instead of immediate spawn
}

const SPAWN_POINT = new Vector3(-45, 0, 0);
const ENTRY_POINT = new Vector3(-5, 0, 0);
const JUNCTION_POINT_X = -5;

function generateWaypoints(spot: ParkingSpot): Vector3[] {
    const waypoints: Vector3[] = [];
    const { SLOT_DEPTH } = DIMENSIONS;

    waypoints.push(ENTRY_POINT.clone());
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, 0));
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, spot.laneZ));

    const laneApproachX = spot.position.x;
    waypoints.push(new Vector3(laneApproachX, 0, spot.laneZ));

    const approachOffset = spot.isTopRow ? SLOT_DEPTH / 2 + 0.5 : -(SLOT_DEPTH / 2 + 0.5);
    waypoints.push(new Vector3(spot.position.x, 0, spot.position.z + approachOffset));
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
    barrierBusy: false,
    spawnQueue: [],

    setSpots: (spots) => set({ parkingSpots: spots }),

    setLayoutInfo: (blockHeight, pairHeight, numPairs) =>
        set({ blockHeight, pairHeight, numPairs }),

    // Queue a vehicle spawn (doesn't spawn immediately)
    queueSpawn: (type?: VehicleType) => {
        const id = `pending-${Date.now()}`;
        set((state) => ({
            spawnQueue: [...state.spawnQueue, { type, id }],
        }));
        // Try to process queue
        get().processSpawnQueue();
    },

    // Process spawn queue when space is available
    processSpawnQueue: () => {
        const state = get();
        const vehiclesInQueue = state.vehicles.filter(
            (v) => v.queuePosition >= 1 && v.queuePosition <= 3
        ).length;

        // Can spawn if less than 3 vehicles in physical queue
        if (vehiclesInQueue < 3 && state.spawnQueue.length > 0) {
            const pending = state.spawnQueue[0];
            // Remove from spawn queue
            set((s) => ({ spawnQueue: s.spawnQueue.slice(1) }));
            // Spawn the vehicle
            get().spawnVehicle(pending.type);
        }
    },

    spawnVehicle: (type?: VehicleType) => {
        const state = get();
        const unoccupiedSpots = state.parkingSpots.filter((spot) => !spot.occupied);

        if (unoccupiedSpots.length === 0) {
            console.warn('No available parking spots');
            return null;
        }

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

        // Determine initial queue position (find first available)
        const vehiclesInQueue = state.vehicles.filter(
            (v) => v.queuePosition >= 1 && v.queuePosition <= 3
        );
        let assignedQueuePos = -1;
        for (let i = 3; i >= 1; i--) {
            if (!vehiclesInQueue.some((v) => v.queuePosition === i)) {
                assignedQueuePos = i;
            }
        }
        // If all queue positions taken, assign to back (3)
        if (assignedQueuePos === -1) assignedQueuePos = 3;

        const vehicleInstance: VehicleInstance = {
            ...vehicleData,
            targetPosition: nearestSpot.position.clone(),
            spotId: nearestSpot.id,
            startPosition: SPAWN_POINT.clone(),
            currentPosition: SPAWN_POINT.clone(),
            waypoints,
            isWaitingAtBarrier: false,
            canPassBarrier: false,
            queuePosition: assignedQueuePos,
        };

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

    setVehicleWaiting: (id: string, waiting: boolean) => {
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id ? { ...v, isWaitingAtBarrier: waiting } : v
            ),
        }));
    },

    setVehicleQueuePosition: (id: string, position: number) => {
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id ? { ...v, queuePosition: position } : v
            ),
        }));
    },

    grantBarrierPass: (id: string) => {
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id ? { ...v, canPassBarrier: true, isWaitingAtBarrier: false, queuePosition: 0 } : v
            ),
            barrierBusy: true,
        }));
    },

    setBarrierBusy: (busy: boolean) => {
        set({ barrierBusy: busy });
        // When barrier becomes free, advance queue
        if (!busy) {
            get().advanceQueue();
        }
    },

    // Advance vehicles forward in queue
    advanceQueue: () => {
        set((state) => ({
            vehicles: state.vehicles.map((v) => {
                if (v.queuePosition > 1 && v.queuePosition <= 3) {
                    // Move forward by 1 position
                    return { ...v, queuePosition: v.queuePosition - 1 };
                }
                return v;
            }),
        }));
        // Try to spawn more from queue
        setTimeout(() => get().processSpawnQueue(), 500);
    },

    getNextWaitingVehicle: () => {
        const state = get();
        // Get the vehicle in position 1 that is waiting
        return state.vehicles.find(
            (v) => v.queuePosition === 1 && v.isWaitingAtBarrier && !v.canPassBarrier
        ) || null;
    },
}));
