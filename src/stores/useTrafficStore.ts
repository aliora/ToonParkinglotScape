import { create } from 'zustand';
import { Vector3 } from 'three';
import type { IVehicleData } from '../types/VehicleTypes';
import { VehicleType } from '../types/VehicleTypes';
import { createRandomVehicle } from '../utils/VehicleFactory';
import { DIMENSIONS } from '../config/constants';

// --- CONFIGURATION CONSTANTS ---
const MAX_VISIBLE_ENTRY_QUEUE = 3;
const MAX_VISIBLE_EXIT_QUEUE = 3;
const ENTRY_LANE_Z = -5;
const SPAWN_POINT = new Vector3(-50, 0, ENTRY_LANE_Z);
const JUNCTION_POINT_X = -5;

// --- TYPES & INTERFACES ---

export const GateState = {
    IDLE: 'IDLE',
    OPENING: 'OPENING',
    OPEN: 'OPEN',
    CLOSING: 'CLOSING',
    LOCKED: 'LOCKED'
} as const;

export type GateState = typeof GateState[keyof typeof GateState];

export interface VirtualVehicleRequest {
    id: string;
    type?: VehicleType;
    requestTime: number;
}

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
    // State machine extensions
    isPendingExit?: boolean; // Waiting in spot for exit queue space
}

interface TrafficState {
    parkingSpots: ParkingSpot[];
    vehicles: VehicleInstance[];

    // Virtual Queue & Gate State
    virtualEntryBacklog: VirtualVehicleRequest[];
    gateState: GateState;
    currentGateVehicleId: string | null;

    spawnPoint: Vector3;
    blockHeight: number;
    pairHeight: number;
    numPairs: number;

    setSpots: (spots: ParkingSpot[]) => void;
    setLayoutInfo: (blockHeight: number, pairHeight: number, numPairs: number) => void;

    // Modified Actions
    spawnVehicle: (type?: VehicleType) => void;
    removeVehicle: (id: string) => void;
    updateVehicleState: (id: string, state: 'moving' | 'parked') => void;
    updateVehiclePosition: (id: string, position: Vector3) => void;
    startExitingVehicle: (id: string) => void;

    // Gate Control Actions
    requestGateAccess: (vehicleId: string) => boolean;
    notifyGateOpen: () => void;
    notifyPassageComplete: (vehicleId: string) => void;
    notifyGateClosed: () => void;

    // Internal Helper
    processQueues: () => void;
}

// --- HELPER FUNCTIONS ---

function generateWaypoints(spot: ParkingSpot): Vector3[] {
    const waypoints: Vector3[] = [];
    const { SLOT_DEPTH } = DIMENSIONS;

    // Direct path to parking spot
    waypoints.push(SPAWN_POINT.clone());
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, ENTRY_LANE_Z));
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, spot.laneZ));
    waypoints.push(new Vector3(spot.position.x, 0, spot.laneZ));
    const approachOffset = spot.isTopRow ? SLOT_DEPTH / 2 + 0.5 : -(SLOT_DEPTH / 2 + 0.5);
    waypoints.push(new Vector3(spot.position.x, 0, spot.position.z + approachOffset));
    waypoints.push(spot.position.clone());

    return waypoints;
}

function generateExitWaypoints(spot: ParkingSpot): Vector3[] {
    const waypoints: Vector3[] = [];
    const { SLOT_DEPTH } = DIMENSIONS;

    const approachOffset = spot.isTopRow ? SLOT_DEPTH / 2 + 0.5 : -(SLOT_DEPTH / 2 + 0.5);
    waypoints.push(new Vector3(spot.position.x, 0, spot.position.z + approachOffset));
    waypoints.push(new Vector3(spot.position.x, 0, spot.laneZ));
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, spot.laneZ));
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, ENTRY_LANE_Z));
    waypoints.push(SPAWN_POINT.clone());

    return waypoints;
}

// --- STORE IMPLEMENTATION ---

export const useTrafficStore = create<TrafficState>((set, get) => ({
    parkingSpots: [],
    vehicles: [],
    spawnPoint: SPAWN_POINT,
    blockHeight: 0,
    pairHeight: 0,
    numPairs: 0,

    virtualEntryBacklog: [],
    gateState: GateState.IDLE,
    currentGateVehicleId: null,

    setSpots: (spots) => set({ parkingSpots: spots }),

    setLayoutInfo: (blockHeight, pairHeight, numPairs) =>
        set({ blockHeight, pairHeight, numPairs }),

    processQueues: () => {
        const state = get();

        // --- QUEUE PROCESSING ---
        // We process Entry and Exit queues INDEPENDENTLY.
        // The Gate Mutex (in useVehicleMovement) handles the physical bottleneck.
        // Here we just ensure we fill the "Visible" queues from the "Virtual" backlogs up to capacity.

        // 1. Process Entry Backlog
        const visibleEntryCount = state.vehicles.filter(v =>
            !v.isExiting && v.state !== 'parked'
        ).length;

        if (visibleEntryCount < MAX_VISIBLE_ENTRY_QUEUE && state.virtualEntryBacklog.length > 0) {
            const [nextRequest, ...remainingBacklog] = state.virtualEntryBacklog;

            const unoccupiedSpots = state.parkingSpots.filter((spot) => !spot.occupied);

            // Only spawn if there is a spot available (Capacity Constraint)
            if (unoccupiedSpots.length > 0) {
                // Find nearest spot logic
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
                const vehicleData = createRandomVehicle(nextRequest.type);

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
                    state: 'moving'
                };

                console.log(`[Traffic] Spawning backlog vehicle ${vehicleInstance.id}`);

                set({
                    parkingSpots: state.parkingSpots.map((spot) =>
                        spot.id === nearestSpot.id ? { ...spot, occupied: true } : spot
                    ),
                    vehicles: [...state.vehicles, vehicleInstance],
                    virtualEntryBacklog: remainingBacklog
                });
            } else {
                // No spots, keep in backlog
            }
        }

        // 2. Process Pending Exits
        const visibleExitCount = state.vehicles.filter(v =>
            v.isExiting && v.state === 'moving'
        ).length;

        if (visibleExitCount < MAX_VISIBLE_EXIT_QUEUE) {
            const pendingExitVehicle = state.vehicles.find(v => v.isPendingExit);

            if (pendingExitVehicle) {
                console.log(`[Traffic] releasing pending exit vehicle ${pendingExitVehicle.id}`);
                const vehicle = pendingExitVehicle;
                const spot = state.parkingSpots.find((s) => s.id === vehicle.spotId);

                if (spot) {
                    const exitWaypoints = generateExitWaypoints(spot);

                    set(state => ({
                        vehicles: state.vehicles.map(v =>
                            v.id === vehicle.id ? {
                                ...v,
                                isExiting: true,
                                isPendingExit: false,
                                exitWaypoints,
                                state: 'moving'
                            } : v
                        ),
                        // Spot becomes free immediately upon 'startExiting'? 
                        // Or when they leave? 
                        // Usually 'occupied' implies 'reserved for this car'. 
                        // If we set occupied: false here, a new car might spawn for it.
                        // That matches "Capacity" logic. The exiting car is "leaving the spot".
                        parkingSpots: state.parkingSpots.map(s =>
                            s.id === vehicle.spotId ? { ...s, occupied: false } : s
                        )
                    }));
                }
            }
        }
    },

    spawnVehicle: (type?: VehicleType) => {
        const state = get();

        const visibleEntryCount = state.vehicles.filter(v =>
            !v.isExiting && v.state !== 'parked'
        ).length;

        if (visibleEntryCount < MAX_VISIBLE_ENTRY_QUEUE) {
            const unocc = state.parkingSpots.filter(s => !s.occupied);
            if (unocc.length === 0) {
                console.warn('No spots available for spawn');
                return;
            }

            set(state => ({
                virtualEntryBacklog: [...state.virtualEntryBacklog, {
                    id: `req-${Date.now()}`,
                    type,
                    requestTime: Date.now()
                }]
            }));

            get().processQueues();

        } else {
            console.log('[Traffic] Visible queue full, adding to backlog');
            set(state => ({
                virtualEntryBacklog: [...state.virtualEntryBacklog, {
                    id: `req-${Date.now()}`,
                    type,
                    requestTime: Date.now()
                }]
            }));
        }
    },

    removeVehicle: (id: string) => {
        set((state) => ({
            vehicles: state.vehicles.filter((v) => v.id !== id),
        }));
        get().processQueues();
    },

    updateVehicleState: (id: string, newState: 'moving' | 'parked') => {
        set((state) => ({
            vehicles: state.vehicles.map((v) =>
                v.id === id ? { ...v, state: newState } : v
            ),
        }));

        if (newState === 'parked') {
            get().processQueues();
        }
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
            console.warn(`[Traffic] Cannot start exit for vehicle ${id}`);
            return;
        }

        const visibleExitCount = state.vehicles.filter(v => v.isExiting && v.state === 'moving').length;

        if (visibleExitCount < MAX_VISIBLE_EXIT_QUEUE) {
            const spot = state.parkingSpots.find((s) => s.id === vehicle.spotId);
            if (!spot) return;

            const exitWaypoints = generateExitWaypoints(spot);
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
        } else {
            console.log(`[Traffic] Exit queue full, marking vehicle ${id} as PENDING_EXIT`);
            set((state) => ({
                vehicles: state.vehicles.map((v) =>
                    v.id === id ? { ...v, isPendingExit: true } : v
                ),
            }));
        }
    },

    // --- Gate Control Implementations ---

    requestGateAccess: (vehicleId: string) => {
        const state = get();

        if (state.gateState === GateState.IDLE) {
            const requestingVehicle = state.vehicles.find(v => v.id === vehicleId);
            if (!requestingVehicle) return false;

            // PRIORITY CHECK:
            // If this is an ENTRY request, check if there are any active EXITING vehicles.
            // If yes, Deny Entry to let Exit proceed (even if Exit hasn't requested yet).
            if (!requestingVehicle.isExiting) {
                const hasActiveExits = state.vehicles.some(v => v.isExiting && v.state === 'moving');
                if (hasActiveExits) {
                    console.log(`[Gate] Access Denied to ${vehicleId} (Exit Priority)`);
                    return false;
                }
            }

            console.log(`[Gate] Access granted to ${vehicleId}`);
            set({
                gateState: GateState.OPENING,
                currentGateVehicleId: vehicleId
            });
            return true;
        }
        return false;
    },

    notifyGateOpen: () => {
        console.log('[Gate] Gate is OPEN');
        set({ gateState: GateState.OPEN });
    },

    notifyPassageComplete: (vehicleId: string) => {
        const state = get();
        if (state.currentGateVehicleId === vehicleId) {
            console.log(`[Gate] Passage complete for ${vehicleId}, closing gate.`);
            set({ gateState: GateState.CLOSING });
        }
    },

    notifyGateClosed: () => {
        console.log('[Gate] Gate is CLOSED (IDLE)');
        set({
            gateState: GateState.IDLE,
            currentGateVehicleId: null
        });
        get().processQueues();
    }
}));
