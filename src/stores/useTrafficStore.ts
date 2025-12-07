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

// Exit queue positions (5 total: 2 left, 2 right, 1 center)
// All face barrier (rotation 0 = facing +X toward barrier)
// Positions 1-4 are waiting positions, Position 5 is the exit point
export const EXIT_QUEUE_POSITIONS = [
    { pos: new Vector3(-6, 0, -15), rotation: 0 },  // Position 1 - left side, front
    { pos: new Vector3(-10, 0, -10), rotation: 0 },  // Position 2 - left side, back
    { pos: new Vector3(-10, 0, 10), rotation: 0 },   // Position 3 - right side, front
    { pos: new Vector3(-6, 0, 15), rotation: 0 },    // Position 4 - right side, back
    { pos: new Vector3(-14, 0, 0), rotation: 0 },    // Position 5 - CENTER (exit point)
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
    // Exit system
    isExiting: boolean;
    exitQueuePosition: number; // 1-4 = exit queue, -1 = not in exit queue
    waitingToExit: boolean; // Waiting in park for exit queue space
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
    // Exit system
    exitQueue: string[]; // Vehicle IDs waiting to exit (in park)

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
    advanceQueue: () => void;
    setVehicleQueuePosition: (id: string, position: number) => void;
    processSpawnQueue: () => void;
    queueSpawn: (type?: VehicleType) => void;
    // Exit actions
    triggerVehicleExit: (id: string) => void;
    processExitQueue: () => void;
    grantExitPass: (id: string) => void;
    getNextExitingVehicle: () => VehicleInstance | null;
    advanceExitQueue: () => void;
    releaseExitGate: (id: string) => void;
    hasEntryVehicles: () => boolean;
}

const SPAWN_POINT = new Vector3(-45, 0, 0);
const ENTRY_POINT = new Vector3(-5, 0, 0);
const EXIT_POINT = new Vector3(-45, 0, 0); // Vehicles exit to spawn point
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

// Generate exit waypoints (reverse of entry)
function generateExitWaypoints(spot: ParkingSpot, exitQueuePos: { pos: Vector3; rotation: number }): Vector3[] {
    const waypoints: Vector3[] = [];
    const { SLOT_DEPTH } = DIMENSIONS;

    // Reverse out of spot
    const approachOffset = spot.isTopRow ? SLOT_DEPTH / 2 + 0.5 : -(SLOT_DEPTH / 2 + 0.5);
    waypoints.push(new Vector3(spot.position.x, 0, spot.position.z + approachOffset));

    // Back to lane
    waypoints.push(new Vector3(spot.position.x, 0, spot.laneZ));

    // Exit queue position
    waypoints.push(exitQueuePos.pos.clone());

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
    exitQueue: [],

    setSpots: (spots) => set({ parkingSpots: spots }),

    setLayoutInfo: (blockHeight, pairHeight, numPairs) =>
        set({ blockHeight, pairHeight, numPairs }),

    queueSpawn: (type?: VehicleType) => {
        const id = `pending-${Date.now()}`;
        set((state) => ({
            spawnQueue: [...state.spawnQueue, { type, id }],
        }));
        get().processSpawnQueue();
    },

    processSpawnQueue: () => {
        const state = get();
        const vehiclesInQueue = state.vehicles.filter(
            (v) => v.queuePosition >= 1 && v.queuePosition <= 3 && !v.isExiting
        ).length;

        if (vehiclesInQueue < 3 && state.spawnQueue.length > 0) {
            const pending = state.spawnQueue[0];
            set((s) => ({ spawnQueue: s.spawnQueue.slice(1) }));
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

        const vehiclesInQueue = state.vehicles.filter(
            (v) => v.queuePosition >= 1 && v.queuePosition <= 3 && !v.isExiting
        );

        // Find the furthest back occupied position (highest number)
        let maxOccupiedPos = 0;
        vehiclesInQueue.forEach((v) => {
            if (v.queuePosition > maxOccupiedPos) {
                maxOccupiedPos = v.queuePosition;
            }
        });

        // Assign next available position at the BACK of the queue
        // If queue is empty (max=0), assign 1.
        // If 1 is occupied (max=1), assign 2.
        // If 2 is occupied (max=2), assign 3.
        let assignedQueuePos = maxOccupiedPos + 1;

        // If calculated position > 3, we can't spawn (should be handled by processSpawnQueue check)
        // But for safety, cap at 3 or return null if strict
        if (assignedQueuePos > 3) {
            // This shouldn't happen if processSpawnQueue did its job, but fallback:
            assignedQueuePos = 3;
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
            isExiting: false,
            exitQueuePosition: -1,
            waitingToExit: false,
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
            exitQueue: state.exitQueue.filter((vid) => vid !== id),
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
        set((state) => ({
            vehicles: state.vehicles.map((v) => {
                if (v.queuePosition > 1 && v.queuePosition <= 3 && !v.isExiting) {
                    return { ...v, queuePosition: v.queuePosition - 1 };
                }
                return v;
            }),
        }));
        setTimeout(() => get().processSpawnQueue(), 500);
    },

    getNextWaitingVehicle: () => {
        const state = get();
        return state.vehicles.find(
            (v) => v.queuePosition === 1 && v.isWaitingAtBarrier && !v.canPassBarrier && !v.isExiting
        ) || null;
    },

    // Check if there are entry vehicles in queue
    hasEntryVehicles: () => {
        const state = get();
        return state.vehicles.some(
            (v) => v.queuePosition >= 1 && v.queuePosition <= 3 && !v.isExiting && !v.canPassBarrier
        );
    },

    // Trigger a parked vehicle to exit
    triggerVehicleExit: (id: string) => {
        const state = get();
        const vehicle = state.vehicles.find((v) => v.id === id);
        if (!vehicle || vehicle.state !== 'parked') return;

        // Find available exit queue position
        const vehiclesInExitQueue = state.vehicles.filter(
            (v) => v.exitQueuePosition >= 1 && v.exitQueuePosition <= 4
        );

        let assignedPos = -1;
        for (let i = 1; i <= 4; i++) {
            if (!vehiclesInExitQueue.some((v) => v.exitQueuePosition === i)) {
                assignedPos = i;
                break;
            }
        }

        if (assignedPos === -1) {
            // All exit positions full, add to exit wait queue
            set((s) => ({
                vehicles: s.vehicles.map((v) =>
                    v.id === id ? { ...v, waitingToExit: true } : v
                ),
                exitQueue: [...s.exitQueue, id],
            }));
            return;
        }

        // Find the parking spot for exit waypoints
        const spot = state.parkingSpots.find((s) => s.id === vehicle.spotId);
        if (!spot) return;

        const exitWaypoints = generateExitWaypoints(spot, EXIT_QUEUE_POSITIONS[assignedPos - 1]);

        set((s) => ({
            vehicles: s.vehicles.map((v) =>
                v.id === id
                    ? {
                        ...v,
                        isExiting: true,
                        exitQueuePosition: assignedPos,
                        waypoints: exitWaypoints,
                        state: 'moving',
                        isWaitingAtBarrier: false,
                        canPassBarrier: false,
                    }
                    : v
            ),
            parkingSpots: s.parkingSpots.map((sp) =>
                sp.id === vehicle.spotId ? { ...sp, occupied: false } : sp
            ),
        }));
    },

    // Process vehicles waiting in park for exit queue space
    processExitQueue: () => {
        const state = get();
        if (state.exitQueue.length === 0) return;

        const vehiclesInExitQueue = state.vehicles.filter(
            (v) => v.exitQueuePosition >= 1 && v.exitQueuePosition <= 4
        );

        if (vehiclesInExitQueue.length < 4) {
            const nextId = state.exitQueue[0];
            set((s) => ({ exitQueue: s.exitQueue.slice(1) }));
            get().triggerVehicleExit(nextId);
        }
    },

    // Grant exit pass (when barrier opens for exit)
    grantExitPass: (id: string) => {
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id
                    ? {
                        ...v,
                        canPassBarrier: true,
                        isWaitingAtBarrier: false,
                        // exitQueuePosition remains 5 to block the center until barrier closes
                        waypoints: [
                            EXIT_QUEUE_POSITIONS[4].pos.clone(), // Ensure visiting center/orange point
                            EXIT_POINT.clone(), // Final exit point (back to start)
                        ],
                    }
                    : v
            ),
            barrierBusy: true,
        }));
    },

    // Release exit gate usage (clears position 5)
    releaseExitGate: (id: string) => {
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id ? { ...v, exitQueuePosition: 0 } : v
            ),
        }));
    },

    // Get next exiting vehicle (only position 5 can exit)
    getNextExitingVehicle: () => {
        const state = get();
        // Only allow exit if no entry vehicles
        if (state.hasEntryVehicles()) return null;

        // Only vehicle at position 5 (center) can exit
        return state.vehicles.find(
            (v) =>
                v.isExiting &&
                v.exitQueuePosition === 5 &&
                v.isWaitingAtBarrier &&
                !v.canPassBarrier
        ) || null;
    },

    // Advance exit queue - move front positions (1/3) to center (5) when no entry vehicles
    // Logic: Red Points (1-4) -> Orange Point (5) -> Exit
    // Priority: Entry vehicles > Exit vehicles
    advanceExitQueue: () => {
        const state = get();
        const hasEntry = state.hasEntryVehicles();
        const centerOccupied = state.vehicles.some(
            (v) => v.isExiting && v.exitQueuePosition === 5
        );

        set((s) => ({
            vehicles: s.vehicles.map((v) => {
                if (!v.isExiting) return v;

                // Move back positions forward (2→1, 4→3)
                if (v.exitQueuePosition === 2) {
                    const pos1Occupied = s.vehicles.some(
                        (x) => x.id !== v.id && x.isExiting && x.exitQueuePosition === 1
                    );
                    if (!pos1Occupied) {
                        const newWaypoints = [EXIT_QUEUE_POSITIONS[0].pos.clone()];
                        return { ...v, exitQueuePosition: 1, waypoints: newWaypoints, isWaitingAtBarrier: false };
                    }
                }
                if (v.exitQueuePosition === 4) {
                    const pos3Occupied = s.vehicles.some(
                        (x) => x.id !== v.id && x.isExiting && x.exitQueuePosition === 3
                    );
                    if (!pos3Occupied) {
                        const newWaypoints = [EXIT_QUEUE_POSITIONS[2].pos.clone()];
                        return { ...v, exitQueuePosition: 3, waypoints: newWaypoints, isWaitingAtBarrier: false };
                    }
                }

                // Move front positions to center (1→5 or 3→5) only if no entry vehicles
                if (!hasEntry && !centerOccupied) {
                    if (v.exitQueuePosition === 1 && v.isWaitingAtBarrier) {
                        const newWaypoints = [EXIT_QUEUE_POSITIONS[4].pos.clone()];
                        return { ...v, exitQueuePosition: 5, waypoints: newWaypoints, isWaitingAtBarrier: false };
                    }
                    if (v.exitQueuePosition === 3 && v.isWaitingAtBarrier &&
                        !s.vehicles.some((x) => x.isExiting && x.exitQueuePosition === 1)) {
                        const newWaypoints = [EXIT_QUEUE_POSITIONS[4].pos.clone()];
                        return { ...v, exitQueuePosition: 5, waypoints: newWaypoints, isWaitingAtBarrier: false };
                    }
                }

                return v;
            }),
        }));

        // Process waiting in park queue
        setTimeout(() => get().processExitQueue(), 500);
    },
}));
