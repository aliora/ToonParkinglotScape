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

// Entry queue positions at barrier (z = -5 for entry lane)
// Vehicles come from LEFT and queue towards barrier
export const QUEUE_POSITIONS = [
    new Vector3(-22, 0, -5), // Position 1 - closest to barrier
    new Vector3(-32, 0, -5), // Position 2
    new Vector3(-42, 0, -5), // Position 3 - furthest (spawn side)
];

// Exit queue positions - matches debug markers
// Vehicles come from parking area and queue towards exit
export const EXIT_QUEUE_POSITIONS = [
    new Vector3(-8, 0, 8),   // Position 1 - closest to barrier
    new Vector3(2, 0, 10),   // Position 2
    new Vector3(12, 0, 10),  // Position 3 - closest to parking area
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
    // Exit queue fields
    isExiting: boolean; // True when vehicle is in exit mode
    exitQueuePosition: number; // 0 = passed, 1-3 = exit queue, -1 = not in queue
    isWaitingAtExitBarrier: boolean;
    canPassExitBarrier: boolean;
    exitWaypoints: Vector3[];
    isExitTransitioning: boolean; // True while moving to new exit queue position
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
    // Exit queue state
    exitQueueTransitioning: boolean;

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
    // Exit queue system
    startExitingVehicle: (id: string) => void;
    getNextExitQueuePosition: () => number;
    notifyVehicleArrivedAtExitQueuePosition: (id: string) => void;
    setVehicleExitWaiting: (id: string, waiting: boolean) => void;
    grantExitBarrierPass: (id: string) => void;
    getNextExitWaitingVehicle: () => VehicleInstance | null;
    advanceExitQueue: () => void;
}

// Lane Z positions
const ENTRY_LANE_Z = -5; // Entry lane at z = -5
const EXIT_LANE_Z = 5;   // Exit lane at z = +5

const SPAWN_POINT = new Vector3(-70, 0, ENTRY_LANE_Z); // Spawn on entry lane (extended)
const ENTRY_POINT = new Vector3(-5, 0, ENTRY_LANE_Z);   // Entry point on entry lane
const EXIT_POINT = new Vector3(-70, 0, EXIT_LANE_Z);    // Exit point on exit lane (extended)
const JUNCTION_POINT_X = -5;

function generateWaypoints(spot: ParkingSpot): Vector3[] {
    const waypoints: Vector3[] = [];
    const { SLOT_DEPTH } = DIMENSIONS;

    // Entry: come from entry lane (z = -5)
    waypoints.push(ENTRY_POINT.clone());
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, ENTRY_LANE_Z));

    // Turn into parking area lanes
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, spot.laneZ));

    const laneApproachX = spot.position.x;
    waypoints.push(new Vector3(laneApproachX, 0, spot.laneZ));

    const approachOffset = spot.isTopRow ? SLOT_DEPTH / 2 + 0.5 : -(SLOT_DEPTH / 2 + 0.5);
    waypoints.push(new Vector3(spot.position.x, 0, spot.position.z + approachOffset));
    waypoints.push(spot.position.clone());

    return waypoints;
}

// Generate exit waypoints using EXIT lane (z = +5)
function generateExitWaypoints(spot: ParkingSpot): Vector3[] {
    const waypoints: Vector3[] = [];
    const { SLOT_DEPTH } = DIMENSIONS;

    // 1. Move out of spot to lane
    const approachOffset = spot.isTopRow ? SLOT_DEPTH / 2 + 0.5 : -(SLOT_DEPTH / 2 + 0.5);
    waypoints.push(new Vector3(spot.position.x, 0, spot.position.z + approachOffset));

    // 2. Move along the lane
    waypoints.push(new Vector3(spot.position.x, 0, spot.laneZ));

    // 3. Move to junction point
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, spot.laneZ));

    // 4. Move to exit lane (z = +5)
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, EXIT_LANE_Z));

    // After passing barrier, continue to EXIT_POINT
    waypoints.push(EXIT_POINT.clone());

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
    exitQueueTransitioning: false,

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
            // Exit fields initialized to default
            isExiting: false,
            exitQueuePosition: -1,
            isWaitingAtExitBarrier: false,
            canPassExitBarrier: false,
            exitWaypoints: [],
            isExitTransitioning: false,
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
            get().advanceExitQueue();
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

    // ==================== EXIT QUEUE SYSTEM ====================

    // Start the exit process for a parked vehicle
    startExitingVehicle: (id: string) => {
        const state = get();
        const vehicle = state.vehicles.find((v) => v.id === id);

        if (!vehicle || vehicle.state !== 'parked') {
            console.warn(`[ExitQueue] Cannot start exit for vehicle ${id}: not found or not parked`);
            return;
        }

        // Get spot info to generate exit waypoints
        const spot = state.parkingSpots.find((s) => s.id === vehicle.spotId);
        if (!spot) {
            console.warn(`[ExitQueue] Cannot find spot ${vehicle.spotId} for vehicle ${id}`);
            return;
        }

        // Get next exit queue position
        const exitQueuePos = state.getNextExitQueuePosition();
        if (exitQueuePos === -1) {
            console.warn(`[ExitQueue] Exit queue is full, vehicle ${id} must wait`);
            return;
        }

        const exitWaypoints = generateExitWaypoints(spot);

        console.log(`[ExitQueue] Vehicle ${id} starting exit, assigned queue position ${exitQueuePos}`);

        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id
                    ? {
                        ...v,
                        isExiting: true,
                        exitQueuePosition: exitQueuePos,
                        exitWaypoints,
                        state: 'moving' as const,
                        isExitTransitioning: true,
                    }
                    : v
            ),
            // Free up the parking spot
            parkingSpots: state.parkingSpots.map((s) =>
                s.id === vehicle.spotId ? { ...s, occupied: false } : s
            ),
        }));
    },

    // Get next available exit queue position
    getNextExitQueuePosition: () => {
        const state = get();
        const vehiclesInExitQueue = state.vehicles.filter(
            (v) => v.exitQueuePosition >= 1 && v.exitQueuePosition <= 3
        );

        if (vehiclesInExitQueue.length >= 3) return -1;

        // Find the highest occupied position
        let maxOccupiedPos = 0;
        vehiclesInExitQueue.forEach((v) => {
            if (v.exitQueuePosition > maxOccupiedPos) {
                maxOccupiedPos = v.exitQueuePosition;
            }
        });

        return maxOccupiedPos + 1;
    },

    // Notify that a vehicle has arrived at its exit queue position
    notifyVehicleArrivedAtExitQueuePosition: (id: string) => {
        console.log(`[ExitQueue] Vehicle ${id} arrived at exit queue position`);

        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id ? { ...v, isExitTransitioning: false } : v
            ),
        }));

        // Check if all vehicles have finished transitioning
        const state = get();
        const anyStillTransitioning = state.vehicles.some(
            (v) => v.isExitTransitioning && v.exitQueuePosition >= 1 && v.exitQueuePosition <= 3
        );

        if (!anyStillTransitioning && state.exitQueueTransitioning) {
            console.log('[ExitQueue] All exit vehicles settled, queue ready');
            set({ exitQueueTransitioning: false });
        }
    },

    // Set vehicle waiting at exit barrier
    setVehicleExitWaiting: (id: string, waiting: boolean) => {
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id ? { ...v, isWaitingAtExitBarrier: waiting } : v
            ),
        }));
    },

    // Grant exit barrier pass to a vehicle
    grantExitBarrierPass: (id: string) => {
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id
                    ? { ...v, canPassExitBarrier: true, isWaitingAtExitBarrier: false, exitQueuePosition: 0 }
                    : v
            ),
            barrierBusy: true,
        }));
    },

    // Get next vehicle waiting at exit barrier
    getNextExitWaitingVehicle: () => {
        const state = get();
        return state.vehicles.find(
            (v) => v.exitQueuePosition === 1 && v.isWaitingAtExitBarrier && !v.canPassExitBarrier
        ) || null;
    },

    // Advance exit queue (when a vehicle passes the barrier)
    advanceExitQueue: () => {
        const state = get();

        const vehiclesToAdvance = state.vehicles.filter(
            (v) => v.exitQueuePosition > 1 && v.exitQueuePosition <= 3
        );

        if (vehiclesToAdvance.length === 0) {
            return;
        }

        console.log('[ExitQueue] Advancing exit queue...');
        set({ exitQueueTransitioning: true });

        set((state) => ({
            vehicles: state.vehicles.map((v) => {
                if (v.exitQueuePosition > 1 && v.exitQueuePosition <= 3) {
                    console.log(`[ExitQueue] Vehicle ${v.id} moving from exit position ${v.exitQueuePosition} to ${v.exitQueuePosition - 1}`);
                    return { ...v, exitQueuePosition: v.exitQueuePosition - 1, isExitTransitioning: true };
                }
                return v;
            }),
        }));
    },
}));
