export const DIMENSIONS = {
    SLOT_WIDTH: 3,
    SLOT_DEPTH: 6,
    LANE_GAP: 8,
    MAX_ROWS: 4,
    PREFERRED_COLS: 5,
    GAP_SIZE: 8, // Gap width between blocks of 5
    BUFFER: 10,
    BUILDING_GAP: 20,
    STREET_OFFSET: 30,
    PARKING_EXCLUSION_BUFFER: 5, // No random objects spawn within this distance of parking area
    BUILDING_EXCLUSION_BUFFER: 10, // Buffer distance from buildings
};

import { VehicleType } from '../types/VehicleTypes';

export const VEHICLE_MODELS: Record<VehicleType, { model: string; scale: number; rotation?: [number, number, number]; texture?: string; yOffset?: number }[]> = {
    [VehicleType.CAR]: [
        { model: 'Hatchback.fbx', scale: 0.1, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: 0 },
        { model: 'Muscle.fbx', scale: 0.1, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: 0 },
        { model: 'Muscle_2.fbx', scale: 0.1, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: 0 },
        { model: 'Roadster.fbx', scale: 0.1, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: 0 },
        { model: 'SUV.fbx', scale: 0.1, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: 0 },
        { model: 'Sedan.fbx', scale: 0.1, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: 0 },
        { model: 'Sports.fbx', scale: 0.1, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: 0 },
        { model: 'Taxi.fbx', scale: 0.1, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: 0 }
    ],
    [VehicleType.MINIBUS]: [
        { model: 'Van.fbx', scale: 0.11, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: -0.4 },
        { model: 'Pickup.fbx', scale: 0.11, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: 0 }
    ],
    [VehicleType.BUS]: [
        { model: 'Bus.fbx', scale: 0.13, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: -0.4 }
    ],
    [VehicleType.TRUCK]: [
        { model: 'Truck.fbx', scale: 0.13, rotation: [0, 180, 0], texture: '/Texture/TXT_LowPolyEssentials.png', yOffset: -0.4 }
    ]
};

export const COLORS = {
    GROUND: '#333333',
    LINE: '#FFFFFF',
    GRASS: '#4caf50',
};

export const PATHS = {
    BASE: '/CityEnvironment/',
    VEHICLES: '/Vehicles/',
    TEXTURE_DEFAULT: '/Texture/tex.png',
    TEXTURE_NATURE: '/Texture/TXT_LowPolyEssentials.png',
};

// Parking line fence configuration
export const PARKING_FENCE = {
    model: 'Metal_rod_fence.fbx',
    scale: 1,
    yOffsetMultiplier: 1,    // Y position = (base * multiplier) + offset
    yOffsetAdd: -0.15,           // Additional Y offset
    rotationVertical: [1, Math.PI / 2, 0] as [number, number, number],
    rotationHorizontal: [0, 0, 0] as [number, number, number],
};

export const ASSETS = {
    buildings: Array.from({ length: 2 }, (_, i) => `Building_${i + 1}.fbx`),
    nature: {
        trees: ['Tree2.fbx', 'Tree.fbx', 'dead_tree.fbx'],
        treeConfig: {
            globalScaleMultiplier: 0.1,  // Multiply all scatter scales by this value
            scale: 0.3,                // Base scale
            scaleVariation: 0.4,        // Random scale variation (0-1)
            rotation: [0, 0, 0] as [number, number, number],
            randomRotation: true,       // Enable random Y rotation
            rotationVariation: 1.0,     // Full 360° random rotation
            yOffset: 0,                 // Y offset
        },
        rocks: [
            'Rock_02.fbx', 'Rock_04_1__5_.fbx', 'Rock_04.fbx', 'Rock_05.fbx', 'bush.fbx'
        ],
        bushes: ['bush.fbx'],
        bushConfig: {
            scale: 0.0008,
            scaleVariation: 0.3,    // Random scale variation (0-1)
            rotation: [0, -190, 0] as [number, number, number],
            xOffset: 4.5,             // X location offset
            yOffset: -0.5,
            zOffset: 0,             // Z location offset
            spawnStartOffset: 0.5,    // Spawn start position offset
            spawnEndOffset: 0,      // Spawn end position offset
            density: 2,             // Distance between bushes
            gapVariation: 0.3,      // Random gap variation between bushes
            jitterX: 1,             // Random X offset range
            jitterZ: 1,             // Random Z offset range
            randomRotation: true,   // Enable random Y rotation
            rotationVariation: 0.15, // Random rotation amount (0-1, where 1 = full 360°)
        },
        stoneFence: {
            model: 'Stone_fence.fbx',
            scale: 1,
            rotation: [0, -190, 0] as [number, number, number],
            yOffset: 0,
            spawnOffset: 0.5,         // Spawn start position offset
            density: 2,             // Distance between fences
            gapVariation: 0.2,      // Random gap variation (0-1). Adds random spacing between fences
            preserveMaterials: true,
            baseColor: '#c2a47fff',   // Stone brown color
        },
        // Border config for top/bottom edges - single continuous line
        parkingLotBorder: {
            enabled: true,
            boxHeight: 0.1,             // Line height (Y)
            boxDepth: 0.3,              // Line depth (Z) - width auto-scales to parking lot
            boxColor: '#c4c4c4ff',      // Line color
            extraWidth: 5,              // Extra width to add to auto-calculated length
            xOffset: 2.5,               // X position offset
            yOffset: 0.1,               // Y offset (lift above ground)
            zOffset: 0,                 // Z position offset
        }
    },
    street: {
        lights: ['Street_light.fbx'],
        lightScale: 0.035 * 30,
        lightRotation: [0, -190, 0] as [number, number, number],
        lightYOffset: 0,
        preserveMaterials: true,
        baseColor: '#9e9e9eff',  // Material base color (hex)
        cone: {
            enabled: true,
            color: '#fff368',   // Light yellow
            opacity: 0.15,       // Transparent/Low opacity
            height: 10,          // Beam length
            radius: 4,          // Bottom radius
            position: [0, 1.5, 3.5] as [number, number, number], // Start point (x, y, z)
            rotation: [-0.5, 0, 0] as [number, number, number],
            segments: 12,
            radiusVariation: 0.5,   // Random variation in radius (+/-)
            rotationVariation: 0.1, // Random variation in rotation (radians, +/-)
        }
    },
    entry: {
        signs: [], // Populated or empty based on availability
    },
    scatter: [
        // Trees (with their own materials)
        { url: 'Tree2.fbx', scale: 50, preserveMaterials: true },
        { url: 'Tree.fbx', scale: 50, preserveMaterials: true },
        { url: 'dead_tree.fbx', scale: 0.035, preserveMaterials: false },
        // Rocks (use texture)
        { url: 'Rock_05.fbx', scale: 0.02, preserveMaterials: false },
        { url: 'Rock_04.fbx', scale: 0.015, preserveMaterials: false },
        { url: 'Rock_04_1__5_.fbx', scale: 0.02, preserveMaterials: false },
        { url: 'Rock_02.fbx', scale: 0.015, preserveMaterials: false },
    ],
    scatterGroups: {
        greenery: [
            { url: 'Tree2.fbx', scale: 20, preserveMaterials: true, type: 'tree', randomScaleMin: 0.8, randomScaleMax: 1, collisionRadius: 2 },
            { url: 'Tree.fbx', scale: 20, preserveMaterials: true, type: 'tree', randomScaleMin: 0.8, randomScaleMax: 1, collisionRadius: 2 },
            { url: 'bush.fbx', scale: 0.008, preserveMaterials: false, type: 'bush', randomScaleMin: 0.7, randomScaleMax: 1.6, collisionRadius: 0.8 },
        ],
        dead: [
            { url: 'dead_tree.fbx', scale: 0.02, preserveMaterials: false, type: 'tree', randomScaleMin: 0.8, randomScaleMax: 1, collisionRadius: 1.5 },
            { url: 'Rock_05.fbx', scale: 0.003, preserveMaterials: false, type: 'rock', randomScaleMin: 0.7, randomScaleMax: 1.5, collisionRadius: 4 },
            { url: 'Rock_04.fbx', scale: 0.003, preserveMaterials: false, type: 'rock', randomScaleMin: 0.7, randomScaleMax: 1.5, collisionRadius: 3.5 },
            { url: 'Rock_04_1__5_.fbx', scale: 0.02, preserveMaterials: false, type: 'rock', randomScaleMin: 0.7, randomScaleMax: 1.5, collisionRadius: 4 },
            { url: 'Rock_02.fbx', scale: 0.003, preserveMaterials: false, type: 'rock', randomScaleMin: 0.7, randomScaleMax: 1.5, collisionRadius: 3 },
        ]
    },
    clouds: [
        'Cloud_1.fbx',
        'Cloud_2.fbx',
        'Cloud_3.fbx'
    ]
};
export const TRAFFIC_CONFIG = {
    ROAD_WIDTH: 22,           // Total width of the two-lane road
    LANE_OFFSET: 2,          // Distance from center (Z=0) to lane center (+/-)
    BARRIER_X: -13.6,          // X position of the barriers
    BARRIER_Z_BASE: 8,       // Distance from center (Z=0) to barrier base position (+/-)
    BARRIER_ARM_LENGTH: 6.4, // Length of the barrier arm
    SPAWN_X: -60,            // X position for spawning vehicles
};


