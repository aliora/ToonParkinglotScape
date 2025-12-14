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

// Entry queue positions at barrier
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
    queuePosition: number; // 0 = passed, 1-3 = entry queue, -1 = not in queue
    // Queue transition tracking
    isTransitioning: boolean; // True while moving to new queue position
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
    spawnQueue: PendingSpawn[];
    // Queue transition lock - prevents spawning during queue advancement
    queueTransitioning: boolean;

    setSpots: (spots: ParkingSpot[]) => void;
    setLayoutInfo: (blockHeight: number, pairHeight: number, numPairs: number) => void;
    // Spawn system
    queueSpawn: (type?: VehicleType) => void;
    tryProcessSpawnQueue: () => void;
    isQueueReady: () => boolean;
    getNextQueuePosition: () => number;
    spawnVehicle: (type?: VehicleType, queuePos?: number) => VehicleInstance | null;
    notifyVehicleArrivedAtQueuePosition: (id: string) => void;
    // Vehicle actions
    removeVehicle: (id: string) => void;
    updateVehicleState: (id: string, state: 'moving' | 'parked') => void;
    updateVehiclePosition: (id: string, position: Vector3) => void;
    setVehicleWaiting: (id: string, waiting: boolean) => void;
    grantBarrierPass: (id: string) => void;
    setBarrierBusy: (busy: boolean) => void;
    getNextWaitingVehicle: () => VehicleInstance | null;
    advanceQueue: () => void;
    setVehicleQueuePosition: (id: string, position: number) => void;
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
    queueTransitioning: false,

    setSpots: (spots) => set({ parkingSpots: spots }),

    setLayoutInfo: (blockHeight, pairHeight, numPairs) =>
        set({ blockHeight, pairHeight, numPairs }),

    // Check if queue is ready for a new spawn
    isQueueReady: () => {
        const state = get();
        // Don't spawn while queue is transitioning
        if (state.queueTransitioning) return false;
        // Don't spawn if any vehicle is still transitioning to their position
        const anyVehicleTransitioning = state.vehicles.some(
            (v) => v.isTransitioning && v.queuePosition >= 1 && v.queuePosition <= 3
        );
        if (anyVehicleTransitioning) return false;
        return true;
    },

    // Get the next available queue position (returns -1 if queue is full)
    getNextQueuePosition: () => {
        const state = get();
        const vehiclesInQueue = state.vehicles.filter(
            (v) => v.queuePosition >= 1 && v.queuePosition <= 3
        );

        if (vehiclesInQueue.length >= 3) return -1;

        // Find the highest occupied position
        let maxOccupiedPos = 0;
        vehiclesInQueue.forEach((v) => {
            if (v.queuePosition > maxOccupiedPos) {
                maxOccupiedPos = v.queuePosition;
            }
        });

        // Next position is one after the highest
        return maxOccupiedPos + 1;
    },

    // Queue a spawn request (adds to pending queue)
    queueSpawn: (type?: VehicleType) => {
        const id = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
            spawnQueue: [...state.spawnQueue, { type, id }],
        }));
        // Try to process immediately if conditions allow
        get().tryProcessSpawnQueue();
    },

    // Try to process spawn queue (only spawns if conditions are met)
    tryProcessSpawnQueue: () => {
        const state = get();

        // Check if queue is ready
        if (!state.isQueueReady()) {
            console.log('[SpawnQueue] Queue not ready, waiting...');
            return;
        }

        // Check if there are pending spawns
        if (state.spawnQueue.length === 0) {
            return;
        }

        // Get next queue position
        const nextPos = state.getNextQueuePosition();
        if (nextPos === -1) {
            console.log('[SpawnQueue] Queue full, waiting...');
            return;
        }

        // Pop from spawn queue and spawn
        const pending = state.spawnQueue[0];
        set((s) => ({ spawnQueue: s.spawnQueue.slice(1) }));

        console.log(`[SpawnQueue] Spawning vehicle at queue position ${nextPos}`);
        get().spawnVehicle(pending.type, nextPos);
    },

    // Notify that a vehicle has arrived at its queue position
    notifyVehicleArrivedAtQueuePosition: (id: string) => {
        console.log(`[SpawnQueue] Vehicle ${id} arrived at queue position`);

        // Clear transitioning flag for this vehicle
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id ? { ...v, isTransitioning: false } : v
            ),
        }));

        // Check if all vehicles have finished transitioning
        const state = get();
        const anyStillTransitioning = state.vehicles.some(
            (v) => v.isTransitioning && v.queuePosition >= 1 && v.queuePosition <= 3
        );

        if (!anyStillTransitioning && state.queueTransitioning) {
            console.log('[SpawnQueue] All vehicles settled, queue ready');
            set({ queueTransitioning: false });
            // Now try to spawn next vehicle
            get().tryProcessSpawnQueue();
        }
    },

    // Spawn vehicle at specific queue position
    spawnVehicle: (type?: VehicleType, queuePos?: number) => {
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

        // Use provided queue position or calculate it
        const assignedQueuePos = queuePos ?? state.getNextQueuePosition();

        if (assignedQueuePos === -1 || assignedQueuePos > 3) {
            console.warn('Queue is full, cannot spawn');
            return null;
        }

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
            isTransitioning: true, // New vehicle is transitioning to queue position
        };

        console.log(`[SpawnQueue] Vehicle ${vehicleInstance.id} spawned, heading to position ${assignedQueuePos}`);

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
        if (!busy) {
            get().advanceQueue();
        }
    },

    advanceQueue: () => {
        const state = get();

        // Check if there are vehicles to advance
        const vehiclesToAdvance = state.vehicles.filter(
            (v) => v.queuePosition > 1 && v.queuePosition <= 3
        );

        if (vehiclesToAdvance.length === 0) {
            // No vehicles to advance, just try to spawn
            get().tryProcessSpawnQueue();
            return;
        }

        // Set transitioning flag to prevent spawning during queue movement
        console.log('[SpawnQueue] Advancing queue, blocking spawns...');
        set({ queueTransitioning: true });

        set((state) => ({
            vehicles: state.vehicles.map((v) => {
                if (v.queuePosition > 1 && v.queuePosition <= 3) {
                    // Mark vehicle as transitioning and advance position
                    console.log(`[SpawnQueue] Vehicle ${v.id} moving from position ${v.queuePosition} to ${v.queuePosition - 1}`);
                    return { ...v, queuePosition: v.queuePosition - 1, isTransitioning: true };
                }
                return v;
            }),
        }));
    },

    getNextWaitingVehicle: () => {
        const state = get();
        return state.vehicles.find(
            (v) => v.queuePosition === 1 && v.isWaitingAtBarrier && !v.canPassBarrier
        ) || null;
    },
}));
