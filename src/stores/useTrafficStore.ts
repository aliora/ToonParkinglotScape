import { create } from 'zustand';
import { Vector3 } from 'three';
import type { IVehicleData, ExternalVehicleData } from '../types/VehicleTypes';
import { VehicleType, normalizeVehicleType } from '../types/VehicleTypes';
import { createRandomVehicle, createVehicleFromExternal } from '../utils/VehicleFactory';
import { DIMENSIONS, TRAFFIC_CONFIG, QUEUE_CONFIG } from '../config/constants';

// --- CONFIGURATION CONSTANTS (from centralized config) ---
const { MAX_VISIBLE_ENTRY_QUEUE, MAX_VISIBLE_EXIT_QUEUE, JUNCTION_POINT_X } = QUEUE_CONFIG;

// Lane Configuration
// Entry Lane: Top lane - LHT (swapped)
const ENTRY_LANE_Z = -TRAFFIC_CONFIG.LANE_OFFSET;
// Exit Lane:  Bottom lane - LHT (swapped)
const EXIT_LANE_Z = TRAFFIC_CONFIG.LANE_OFFSET;

const SPAWN_POINT = new Vector3(TRAFFIC_CONFIG.SPAWN_X, 0, ENTRY_LANE_Z);

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

// --- WORLD CONFIG ---
export interface WorldConfig {
    timeOfDay: 'Day' | 'Night';
    capacity: number;
    nature: {
        numClusters: number;
        baseClusterRadius: number;
        scatterCount: number;
        greeneryChance: number;
        sparseGreeneryChance: number;
    };
}

export interface TrafficState {
    parkingSpots: ParkingSpot[];
    vehicles: VehicleInstance[];

    // World Config
    worldConfig: WorldConfig;
    setWorldConfig: (config: Partial<WorldConfig> | ((prev: WorldConfig) => Partial<WorldConfig>)) => void;
    setNatureConfig: (config: Partial<WorldConfig['nature']>) => void;

    // Virtual Queue & Gate State
    virtualEntryBacklog: VirtualVehicleRequest[];

    // Dual Gate States
    entryGateState: GateState;
    exitGateState: GateState;

    currentEntryGateVehicleId: string | null;
    currentExitGateVehicleId: string | null;

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

    // Gate Control Actions - ENTRY
    requestEntryGateAccess: (vehicleId: string) => boolean;
    notifyEntryGateOpen: () => void;
    notifyEntryPassageComplete: (vehicleId: string) => void;
    notifyEntryGateClosed: () => void;

    // Gate Control Actions - EXIT
    requestExitGateAccess: (vehicleId: string) => boolean;
    notifyExitGateOpen: () => void;
    notifyExitPassageComplete: (vehicleId: string) => void;
    notifyExitGateClosed: () => void;

    // Internal Helper
    processQueues: () => void;

    // --- EXTERNAL API FUNCTIONS ---
    /** Add vehicle with animated entry (from external system) */
    addExternalVehicle: (data: ExternalVehicleData) => void;
    /** Initialize pre-parked vehicles instantly (no animation) */
    initPreParkedVehicles: (vehicles: ExternalVehicleData[]) => void;
    /** Trigger vehicle exit from external system */
    triggerVehicleExit: (vehicleId: string) => void;
    /** Get available spot count */
    getAvailableSpotCount: () => number;

    // --- EVENT CALLBACKS ---
    eventCallbacks: {
        onVehicleParked: ((data: ExternalVehicleData) => void)[];
        onVehicleExited: ((vehicleId: string) => void)[];
        onParkingFull: (() => void)[];
    };
    registerCallback: (event: 'onVehicleParked' | 'onVehicleExited' | 'onParkingFull', callback: Function) => () => void;
    emitEvent: (event: 'onVehicleParked' | 'onVehicleExited' | 'onParkingFull', data?: any) => void;
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
    // Use EXIT LANE for return
    waypoints.push(new Vector3(JUNCTION_POINT_X, 0, EXIT_LANE_Z));
    waypoints.push(new Vector3(TRAFFIC_CONFIG.EXIT_POINT_X, 0, EXIT_LANE_Z)); // Exit point

    return waypoints;
}

// --- STORE IMPLEMENTATION ---

export const useTrafficStore = create<TrafficState>((set, get) => ({
    parkingSpots: [],
    vehicles: [],
    spawnPoint: SPAWN_POINT,

    worldConfig: {
        timeOfDay: 'Day',
        capacity: 20,
        nature: {
            numClusters: 12,
            baseClusterRadius: 15,
            scatterCount: 200,
            greeneryChance: 0.6,
            sparseGreeneryChance: 0.15
        }
    },

    setWorldConfig: (config) => set((state) => {
        const newConfig = typeof config === 'function' ? config(state.worldConfig) : config;
        return { worldConfig: { ...state.worldConfig, ...newConfig } };
    }),

    setNatureConfig: (config) => set((state) => ({
        worldConfig: {
            ...state.worldConfig,
            nature: { ...state.worldConfig.nature, ...config }
        }
    })),
    blockHeight: 0,
    pairHeight: 0,
    numPairs: 0,

    virtualEntryBacklog: [],

    entryGateState: GateState.IDLE,
    exitGateState: GateState.IDLE,

    currentEntryGateVehicleId: null,
    currentExitGateVehicleId: null,

    setSpots: (spots) => set({ parkingSpots: spots }),

    setLayoutInfo: (blockHeight, pairHeight, numPairs) =>
        set({ blockHeight, pairHeight, numPairs }),

    processQueues: () => {
        const state = get();

        // --- QUEUE PROCESSING ---

        // 1. Process Entry Backlog
        const visibleEntryCount = state.vehicles.filter(v =>
            !v.isExiting && v.state !== 'parked'
        ).length;

        if (visibleEntryCount < MAX_VISIBLE_ENTRY_QUEUE && state.virtualEntryBacklog.length > 0) {
            const [nextRequest, ...remainingBacklog] = state.virtualEntryBacklog;

            const unoccupiedSpots = state.parkingSpots.filter((spot) => !spot.occupied);

            if (unoccupiedSpots.length > 0) {
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

    // --- ENTRY Gate Control Implementations ---

    requestEntryGateAccess: (vehicleId: string) => {
        const state = get();

        if (state.entryGateState === GateState.IDLE) {
            console.log(`[Entry Gate] Access granted to ${vehicleId}`);
            set({
                entryGateState: GateState.OPENING,
                currentEntryGateVehicleId: vehicleId
            });
            return true;
        }
        return false;
    },

    notifyEntryGateOpen: () => {
        console.log('[Entry Gate] Gate is OPEN');
        set({ entryGateState: GateState.OPEN });
    },

    notifyEntryPassageComplete: (vehicleId: string) => {
        console.log(`[Entry Gate] Passage complete for ${vehicleId}, closing gate.`);
        set({ entryGateState: GateState.CLOSING });
    },

    notifyEntryGateClosed: () => {
        console.log('[Entry Gate] Gate is CLOSED (IDLE)');
        set({
            entryGateState: GateState.IDLE,
            currentEntryGateVehicleId: null
        });
        get().processQueues();
    },

    // --- EXIT Gate Control Implementations ---

    requestExitGateAccess: (vehicleId: string) => {
        const state = get();

        if (state.exitGateState === GateState.IDLE) {
            console.log(`[Exit Gate] Access granted to ${vehicleId}`);
            set({
                exitGateState: GateState.OPENING,
                currentExitGateVehicleId: vehicleId
            });
            return true;
        }
        return false;
    },

    notifyExitGateOpen: () => {
        console.log('[Exit Gate] Gate is OPEN');
        set({ exitGateState: GateState.OPEN });
    },

    notifyExitPassageComplete: (vehicleId: string) => {
        console.log(`[Exit Gate] Passage complete for ${vehicleId}, closing gate.`);
        set({ exitGateState: GateState.CLOSING });
    },

    notifyExitGateClosed: () => {
        console.log('[Exit Gate] Gate is CLOSED (IDLE)');
        set({
            exitGateState: GateState.IDLE,
            currentExitGateVehicleId: null
        });
        get().processQueues();
    },

    // --- EVENT CALLBACKS ---
    eventCallbacks: {
        onVehicleParked: [],
        onVehicleExited: [],
        onParkingFull: [],
    },

    registerCallback: (event, callback) => {
        const state = get();
        (state.eventCallbacks[event] as Function[]).push(callback);
        // Return unsubscribe function
        return () => {
            const callbacks = get().eventCallbacks[event] as Function[];
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        };
    },

    emitEvent: (event, data) => {
        const callbacks = get().eventCallbacks[event] as Function[];
        callbacks.forEach(cb => cb(data));
    },

    // --- EXTERNAL API FUNCTIONS ---

    getAvailableSpotCount: () => {
        return get().parkingSpots.filter(s => !s.occupied).length;
    },

    addExternalVehicle: (extData: ExternalVehicleData) => {
        const state = get();
        const normalizedType = normalizeVehicleType(extData.type);

        const visibleEntryCount = state.vehicles.filter(v =>
            !v.isExiting && v.state !== 'parked'
        ).length;

        const unocc = state.parkingSpots.filter(s => !s.occupied);
        if (unocc.length === 0) {
            console.warn('[External API] No spots available');
            get().emitEvent('onParkingFull');
            return;
        }

        // If queue is full, add to backlog
        if (visibleEntryCount >= MAX_VISIBLE_ENTRY_QUEUE) {
            console.log('[External API] Queue full, adding to backlog');
            set(state => ({
                virtualEntryBacklog: [...state.virtualEntryBacklog, {
                    id: extData.id,
                    type: normalizedType,
                    requestTime: Date.now(),
                    externalData: extData, // Store original data
                }]
            }));
            return;
        }

        // Find nearest spot
        let nearestSpot = unocc[0];
        let minScore = Math.abs(nearestSpot.position.x) + Math.abs(nearestSpot.laneZ) * 0.5;
        for (const spot of unocc) {
            const score = spot.position.x + Math.abs(spot.laneZ) * 0.5;
            if (score < minScore) {
                minScore = score;
                nearestSpot = spot;
            }
        }

        const waypoints = generateWaypoints(nearestSpot);
        const vehicleData = createVehicleFromExternal(extData);

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

        console.log(`[External API] Spawning vehicle ${vehicleInstance.id} (plate: ${vehicleInstance.plate})`);

        set({
            parkingSpots: state.parkingSpots.map((spot) =>
                spot.id === nearestSpot.id ? { ...spot, occupied: true } : spot
            ),
            vehicles: [...state.vehicles, vehicleInstance],
        });
    },

    initPreParkedVehicles: (vehicles: ExternalVehicleData[]) => {
        const state = get();
        const availableSpots = state.parkingSpots.filter(s => !s.occupied);

        const preParkedVehicles: VehicleInstance[] = [];
        const updatedSpotIds: string[] = [];

        vehicles.forEach((extVehicle, index) => {
            if (index >= availableSpots.length) {
                console.warn(`[External API] No spot available for pre-parked vehicle ${extVehicle.id}`);
                return;
            }

            const spot = availableSpots[index];
            const vehicleData = createVehicleFromExternal(extVehicle);
            const targetRotation = spot.isTopRow ? Math.PI : 0;

            // Create vehicle directly at parking position (no animation)
            const vehicleInstance: VehicleInstance = {
                ...vehicleData,
                state: 'parked', // Already parked
                targetPosition: spot.position.clone(),
                targetRotation,
                spotId: spot.id,
                startPosition: spot.position.clone(),
                currentPosition: spot.position.clone(),
                waypoints: [], // Empty = no movement
                isExiting: false,
                exitWaypoints: [],
            };

            preParkedVehicles.push(vehicleInstance);
            updatedSpotIds.push(spot.id);

            console.log(`[External API] Pre-parked vehicle ${vehicleInstance.id} (plate: ${vehicleInstance.plate}) at spot ${spot.id}`);
        });

        set({
            vehicles: [...state.vehicles, ...preParkedVehicles],
            parkingSpots: state.parkingSpots.map(s =>
                updatedSpotIds.includes(s.id) ? { ...s, occupied: true } : s
            ),
        });
    },

    triggerVehicleExit: (vehicleId: string) => {
        const state = get();
        const vehicle = state.vehicles.find(v => v.id === vehicleId);

        if (!vehicle) {
            console.warn(`[External API] Vehicle ${vehicleId} not found`);
            return;
        }

        if (vehicle.state !== 'parked') {
            console.warn(`[External API] Vehicle ${vehicleId} is not parked (state: ${vehicle.state})`);
            return;
        }

        // Use existing startExitingVehicle logic
        get().startExitingVehicle(vehicleId);
    },
}));
