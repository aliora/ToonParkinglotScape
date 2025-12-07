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
};

export const COLORS = {
    GROUND: '#333333',
    LINE: '#FFFFFF',
    GRASS: '#4caf50',
};

export const PATHS = {
    BASE: '/CityEnvironment/',
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
    buildings: Array.from({ length: 7 }, (_, i) => `Building_${i + 1}.fbx`),
    nature: {
        trees: [
            'Tree_01__23_.fbx', 'Tree_02__1_.fbx', 'Tree_03__1_.fbx',
            'Tree_04__1_.fbx', 'Tree_04.fbx', 'Tree_05__4_.fbx',
            'dead_tree.fbx'
        ],
        rocks: [
            'Rock_02.fbx', 'Rock_04_1__5_.fbx', 'Rock_04.fbx', 'Rock_05.fbx'
        ],
        bushes: [
            'bush.fbx'
        ]
    },
    street: {
        lights: ['Street_light.fbx'],
        lightScale: 0.035 * 30,
        lightRotation: [0, -190, 0] as [number, number, number],
        lightYOffset: 0,
        preserveMaterials: true,
        baseColor: '#9e9e9eff',  // Material base color (hex)
    },
    entry: {
        signs: [], // Populated or empty based on availability
    },
    scatter: [
        { url: 'Tree_04.fbx', scale: 0.045 },
        { url: 'Tree_05__4_.fbx', scale: 0.05 },
        { url: 'Tree_04__1_.fbx', scale: 0.045 },
        { url: 'Tree_03__1_.fbx', scale: 0.04 },
        { url: 'Tree_02__1_.fbx', scale: 0.04 },
        { url: 'Tree_01__23_.fbx', scale: 0.045 },
        { url: 'Trash_Small.fbx', scale: 0.015 },
        { url: 'root_tree.fbx', scale: 0.025 },
        { url: 'Rock_05.fbx', scale: 0.02 },
        { url: 'Rock_04.fbx', scale: 0.015 },
        { url: 'Rock_04_1__5_.fbx', scale: 0.02 },
        { url: 'Rock_02.fbx', scale: 0.015 },
        { url: 'dead_tree.fbx', scale: 0.035 }
    ]
};
