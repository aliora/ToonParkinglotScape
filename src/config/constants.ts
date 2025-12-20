import { VehicleType } from '../types/VehicleTypes';

// ============================================================================
// FROZEN CONFIGURATION OBJECTS - Performance Optimized
// Using Object.freeze() prevents runtime modifications and enables V8 optimizations
// ============================================================================

/**
 * Parking lot dimension constants
 */
export const DIMENSIONS = Object.freeze({
    SLOT_WIDTH: 3,
    SLOT_DEPTH: 6,
    LANE_GAP: 8,
    MAX_ROWS: 4,
    PREFERRED_COLS: 5,
    GAP_SIZE: 8,
    BUFFER: 10,
    BUILDING_GAP: 20,
    STREET_OFFSET: 30,
    PARKING_EXCLUSION_BUFFER: 5,
    BUILDING_EXCLUSION_BUFFER: 10,
    ENTRY_GAP: 15, // Road width gap for perimeter nature
} as const);

/**
 * Vehicle movement physics constants
 */
export const VEHICLE_MOVEMENT = Object.freeze({
    MOVE_SPEED: 10,
    ROTATION_SPEED: 4,
    ARRIVAL_THRESHOLD: 0.1,
    PARKING_APPROACH_DISTANCE: 3.0,
    PARKING_LERP_SPEED: 3.0,
    OUTLINE_THICKNESS: 1.05, // Hover outline scale multiplier (1.04 = %4 bigger)
} as const);

/**
 * Traffic queue and gate configuration
 */
export const QUEUE_CONFIG = Object.freeze({
    MAX_VISIBLE_ENTRY_QUEUE: 10,
    MAX_VISIBLE_EXIT_QUEUE: 10,
    GATE_STOP_DISTANCE: 7.5,
    JUNCTION_POINT_X: -5,
    COLLISION_TIMEOUT: 25.0, // Seconds before forcing movement
    GATE_WAIT_TIMEOUT: 25.0, // Seconds before retrying gate access
    COLLISION_CHECK_DISTANCE: 8, // Distance to check for blocking vehicles
    COLLISION_STOP_DISTANCE: 5.5, // Distance at which to stop for blocking vehicle
    LANE_TOLERANCE: 1.0, // Z tolerance for same-lane detection
    LANE_TOLERANCE_WIDE: 1.5, // Wider tolerance for collision detection
} as const);

/**
 * Vehicle dimensions by type [width, height, length]
 * Type 1: CAR, 2: MINIBUS, 3: BUS, 4: PICKUP, 5: TRUCK, 6: HEAVYTRUCK, 7: MOTORCYCLE
 */
export const VEHICLE_DIMENSIONS = Object.freeze({
    [VehicleType.CAR]: [2, 1, 4] as const,
    [VehicleType.MINIBUS]: [2.2, 1.5, 5] as const,
    [VehicleType.BUS]: [2.5, 2, 8] as const,
    [VehicleType.PICKUP]: [2.2, 1.3, 5] as const,
    [VehicleType.TRUCK]: [2.5, 1.8, 6] as const,
    [VehicleType.HEAVYTRUCK]: [3, 2.5, 10] as const,
    [VehicleType.MOTORCYCLE]: [0.8, 1, 2] as const,
    DEFAULT: [2, 1, 4] as const,
} as const);

/**
 * Vehicle model configurations
 * Types without specific models fallback to CAR models
 */
export const VEHICLE_MODELS: Readonly<Record<VehicleType, readonly { readonly model: string; readonly scale: number; readonly rotation?: readonly [number, number, number]; readonly yOffset?: number }[]>> = Object.freeze({
    [VehicleType.CAR]: Object.freeze([
        Object.freeze({ model: 'Hatchback.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
        Object.freeze({ model: 'Muscle.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
        Object.freeze({ model: 'Muscle_2.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
        Object.freeze({ model: 'Roadster.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
        Object.freeze({ model: 'SUV.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
        Object.freeze({ model: 'Sedan.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
        Object.freeze({ model: 'Sports.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
        Object.freeze({ model: 'Taxi.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
    ]),
    [VehicleType.MINIBUS]: Object.freeze([
        Object.freeze({ model: 'Van.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
    ]),
    [VehicleType.BUS]: Object.freeze([
        Object.freeze({ model: 'Bus.fbx', scale: 0.5, rotation: [0, 0, 0] as const, yOffset: 0 }),
    ]),
    [VehicleType.PICKUP]: Object.freeze([
        Object.freeze({ model: 'Pickup.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
    ]),
    [VehicleType.TRUCK]: Object.freeze([
        Object.freeze({ model: 'Truck.fbx', scale: 0.5, rotation: [0, 0, 0] as const, yOffset: 0 }),
    ]),
    // HEAVYTRUCK - Uses Truck model as fallback
    [VehicleType.HEAVYTRUCK]: Object.freeze([
        Object.freeze({ model: 'Truck.fbx', scale: 0.6, rotation: [0, 0, 0] as const, yOffset: 0 }),
    ]),
    // MOTORCYCLE - Uses smallest car model as fallback (no motorcycle model available)
    [VehicleType.MOTORCYCLE]: Object.freeze([
        Object.freeze({ model: 'Hatchback.fbx', scale: 0.4, rotation: [0, 0, 0] as const, yOffset: 0 }),
    ]),
});

/**
 * Color constants
 */
export const COLORS = Object.freeze({
    GROUND: '#333333',
    LINE: '#FFFFFF',
    GRASS: '#4caf50',
} as const);

/**
 * Asset path constants
 */
export const PATHS = Object.freeze({
    BASE: '/CityEnvironment/',
    VEHICLES: '/Vehicles/',
    TEXTURE_DEFAULT: '/Texture/tex.png',
    TEXTURE_NATURE: '/Texture/TXT_LowPolyEssentials.png',
} as const);

/**
 * Parking fence configuration
 */
export const PARKING_FENCE = Object.freeze({
    model: 'Metal_rod_fence.fbx',
    scale: 1,
    yOffsetMultiplier: 1,
    yOffsetAdd: -0.15,
    rotationVertical: [1, Math.PI / 2, 0] as const,
    rotationHorizontal: [0, 0, 0] as const,
} as const);

/**
 * Traffic lane and barrier configuration
 */
export const TRAFFIC_CONFIG = Object.freeze({
    ROAD_WIDTH: 22,
    LANE_OFFSET: 4.8,
    BARRIER_X: -13.6,
    BARRIER_Z_BASE: 8,
    BARRIER_ARM_LENGTH: 6.4,
    SPAWN_X: -60,
    EXIT_POINT_X: -50, // X position where vehicles exit the scene
} as const);

// Pre-computed rotation values to avoid runtime Math operations
export const ROTATIONS = Object.freeze({
    HALF_PI: Math.PI / 2,
    PI: Math.PI,
    TWO_PI: Math.PI * 2,
    NEG_HALF_PI: -Math.PI / 2,
} as const);

/**
 * Nature and environment assets configuration
 */
export const ASSETS = Object.freeze({
    buildings: Object.freeze(['Building_1.fbx', 'Building_2.fbx']),
    nature: Object.freeze({
        trees: Object.freeze(['Tree2.fbx', 'Tree.fbx', 'dead_tree.fbx']),
        treeConfig: Object.freeze({
            globalScaleMultiplier: 0.1,
            scale: 0.3,
            scaleVariation: 0.4,
            rotation: [0, 0, 0] as const,
            randomRotation: true,
            rotationVariation: 1.0,
            yOffset: 0,
        }),
        rocks: Object.freeze([
            'Rock_02.fbx', 'Rock_04_1__5_.fbx', 'Rock_04.fbx', 'Rock_05.fbx', 'bush.fbx'
        ]),
        bushes: Object.freeze(['bush.fbx']),
        bushConfig: Object.freeze({
            scale: 0.0008,
            scaleVariation: 0.3,
            rotation: [0, -190, 0] as const,
            xOffset: 4.5,
            yOffset: -0.5,
            zOffset: 0,
            spawnStartOffset: 0.5,
            spawnEndOffset: 0,
            density: 2,
            gapVariation: 0.3,
            jitterX: 1,
            jitterZ: 1,
            randomRotation: true,
            rotationVariation: 0.15,
        }),
        stoneFence: Object.freeze({
            model: 'Stone_fence.fbx',
            scale: 1,
            rotation: [0, -190, 0] as const,
            yOffset: 0,
            spawnOffset: 0.5,
            density: 2,
            gapVariation: 0.2,
            preserveMaterials: true,
            baseColor: '#c2a47fff',
        }),
        parkingLotBorder: Object.freeze({
            enabled: true,
            boxHeight: 0.1,
            boxDepth: 0.3,
            boxColor: '#c4c4c4ff',
            extraWidth: 5,
            xOffset: 2.5,
            yOffset: 0.1,
            zOffset: 0,
        }),
    }),
    street: Object.freeze({
        lights: Object.freeze(['Street_light.fbx']),
        lightScale: 0.035 * 30,
        lightRotation: [0, -190, 0] as const,
        lightYOffset: 0,
        preserveMaterials: true,
        baseColor: '#9e9e9eff',
        cone: Object.freeze({
            enabled: true,
            color: '#fff368',
            opacity: 0.15,
            height: 10,
            radius: 4,
            position: [0, 1.5, 3.5] as const,
            rotation: [-0.5, 0, 0] as const,
            segments: 12,
            radiusVariation: 0.5,
            rotationVariation: 0.1,
        }),
    }),
    entry: Object.freeze({
        signs: Object.freeze([]),
    }),
    scatter: Object.freeze([
        Object.freeze({ url: 'Tree2.fbx', scale: 50, preserveMaterials: true }),
        Object.freeze({ url: 'Tree.fbx', scale: 50, preserveMaterials: true }),
        Object.freeze({ url: 'dead_tree.fbx', scale: 0.035, preserveMaterials: false }),
        Object.freeze({ url: 'Rock_05.fbx', scale: 0.02, preserveMaterials: false }),
        Object.freeze({ url: 'Rock_04.fbx', scale: 0.015, preserveMaterials: false }),
        Object.freeze({ url: 'Rock_04_1__5_.fbx', scale: 0.02, preserveMaterials: false }),
        Object.freeze({ url: 'Rock_02.fbx', scale: 0.015, preserveMaterials: false }),
    ]),
    scatterGroups: Object.freeze({
        greenery: Object.freeze([
            Object.freeze({ url: 'Tree2.fbx', scale: 20, preserveMaterials: true, type: 'tree', randomScaleMin: 0.8, randomScaleMax: 1, collisionRadius: 2 }),
            Object.freeze({ url: 'Tree.fbx', scale: 20, preserveMaterials: true, type: 'tree', randomScaleMin: 0.8, randomScaleMax: 1, collisionRadius: 2 }),
            Object.freeze({ url: 'bush.fbx', scale: 0.008, preserveMaterials: false, type: 'bush', randomScaleMin: 0.7, randomScaleMax: 1.6, collisionRadius: 0.8 }),
        ]),
        dead: Object.freeze([
            Object.freeze({ url: 'dead_tree.fbx', scale: 0.02, preserveMaterials: false, type: 'tree', randomScaleMin: 0.8, randomScaleMax: 1, collisionRadius: 1.5 }),
            Object.freeze({ url: 'Rock_05.fbx', scale: 0.003, preserveMaterials: false, type: 'rock', randomScaleMin: 0.7, randomScaleMax: 1.5, collisionRadius: 4 }),
            Object.freeze({ url: 'Rock_04.fbx', scale: 0.003, preserveMaterials: false, type: 'rock', randomScaleMin: 0.7, randomScaleMax: 1.5, collisionRadius: 3.5 }),
            Object.freeze({ url: 'Rock_04_1__5_.fbx', scale: 0.02, preserveMaterials: false, type: 'rock', randomScaleMin: 0.7, randomScaleMax: 1.5, collisionRadius: 4 }),
            Object.freeze({ url: 'Rock_02.fbx', scale: 0.003, preserveMaterials: false, type: 'rock', randomScaleMin: 0.7, randomScaleMax: 1.5, collisionRadius: 3 }),
        ]),
    }),
    clouds: Object.freeze([
        'Cloud_1.fbx',
        'Cloud_2.fbx',
        'Cloud_3.fbx'
    ]),
});
