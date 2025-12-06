import React, { useMemo, Suspense } from 'react';
import { useFBX, Box, useTexture, Plane } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { ErrorBoundary } from './ErrorBoundary';

interface EnvironmentWrapperProps {
    capacity?: number;
}

// Pre-define asset lists for random selection
const ASSETS = {
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
        brushes: [
            'bush.fbx'
        ]
    },
    street: {
        lights: ['Light.fbx'],
        hydrants: ['Hydrant.fbx'],
        trash: ['Trash_Big.fbx', 'Trash_Bag_1.fbx'],
        stops: ['Bus_Stop.fbx', 'Tram_Stop.fbx'],
        misc: ['Newspaper_Stand.fbx']
    },
    entry: {
        signs: Array.from({ length: 7 }, (_, i) => `Road_Sign_${i + 1}.fbx`),
        trafficLights: ['Traffic_Light_1.fbx', 'Traffic_Light_2.fbx'],
        workSigns: ['Road_Work_Sign_1.fbx', 'Road_Work_Sign_2.fbx']
    }
};

const BASE_PATH = '/CityEnvironment/';

const InnerAssetInstance = ({ url, position, rotation, scale, texturePath }: any) => {
    const fbx = useFBX(BASE_PATH + url);
    // Default to city texture if not provided, but allow overriding for nature assets
    const texPathToUse = texturePath || '/Texture/tex.png';
    const texture = useTexture(texPathToUse);

    const scene = useMemo(() => {
        const clone = SkeletonUtils.clone(fbx);
        clone.traverse((child: any) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    map: texture,
                    transparent: true, // In case of alpha in low poly texture
                    alphaTest: 0.5
                });
            }
        });
        return clone;
    }, [fbx, texture]);

    return <primitive object={scene} position={position} rotation={rotation} scale={[scale, scale, scale]} />;
}

const AssetFallback = ({ position, rotation, scale }: any) => {
    return (
        <React.Fragment>
            <Box args={[1, 1, 1]} position={position} rotation={rotation} scale={[scale * 100, scale * 100, scale * 100]}>
                <meshStandardMaterial color="red" wireframe />
            </Box>
        </React.Fragment>
    )
}

const AssetInstance = (props: { url: string, position: [number, number, number], rotation?: [number, number, number], scale?: number, texturePath?: string }) => {
    return (
        <ErrorBoundary fallback={<AssetFallback {...props} />}>
            <Suspense fallback={null}>
                <InnerAssetInstance {...props} />
            </Suspense>
        </ErrorBoundary>
    );
};

export const EnvironmentWrapper: React.FC<EnvironmentWrapperProps> = ({ capacity = 20 }) => {

    // --- 1. Calculate Parking Lot Bounding Box ---
    const slotWidth = 3;
    const slotDepth = 6;
    const laneGap = 8;
    const maxRows = 4;
    const preferredCols = 5;
    const gapSize = 8;

    let rows = 1;
    let cols = capacity;

    if (capacity > 0) {
        const neededRows = Math.ceil(capacity / preferredCols);
        rows = Math.max(1, Math.min(maxRows, neededRows));
        cols = Math.ceil(capacity / rows);
    }

    const numGaps = Math.floor((cols - 1) / 5);
    const parkingWidth = cols * slotWidth + numGaps * gapSize;

    const pairHeight = 2 * slotDepth + laneGap;
    const totalPairs = Math.ceil(rows / 2);
    const blockHeight = totalPairs * pairHeight;

    const minZ = -blockHeight / 2 - 5;
    const maxZ = blockHeight / 2 + 5;
    const minX = -5; // Entrance area
    const maxX = parkingWidth + 10; // Right edge

    // Buffer zone
    const buffer = 10;
    const boundMinX = minX - buffer;
    const boundMaxX = maxX + buffer;
    // Removed buffer for Z axis to eliminate gap between ground and brushes
    const boundMinZ = minZ;
    const boundMaxZ = maxZ;


    // --- 2. Procedural Placement Logic ---

    const elements = useMemo(() => {
        const els: React.ReactNode[] = [];
        let keyCounter = 0;
        const random = () => Math.random();

        // A. Background Buildings (Dense Neighborhood)
        const buildingGap = 18;
        const streetOffset = 25;

        const bMinX = boundMinX - streetOffset;
        const bMaxX = boundMaxX + streetOffset;
        const bMinZ = boundMinZ - streetOffset;
        const bMaxZ = boundMaxZ + streetOffset;

        const placeBuildingEdge = (startX: number, startZ: number, endX: number, endZ: number) => {
            const dx = endX - startX;
            const dz = endZ - startZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const count = Math.ceil(dist / buildingGap);
            const angle = Math.atan2(dz, dx);

            for (let i = 0; i < count; i++) {
                const t = i / count;
                const px = startX + dx * t;
                const pz = startZ + dz * t;
                const bIdx = Math.floor(random() * ASSETS.buildings.length);

                els.push(
                    <AssetInstance
                        key={`bg-${keyCounter++}`}
                        url={ASSETS.buildings[bIdx]}
                        position={[px, 0, pz]}
                        rotation={[0, -angle + Math.PI, 0]}
                        scale={0.05} // Restored building scale
                    />
                );
            }
        };

        // Building Walls
        placeBuildingEdge(bMinX, bMinZ, bMaxX, bMinZ);
        placeBuildingEdge(bMaxX, bMinZ, bMaxX, bMaxZ);
        placeBuildingEdge(bMaxX, bMaxZ, bMinX, bMaxZ);

        // Split Left Edge for Entrance
        const buildingEntranceGap = 40;
        if (bMaxZ > buildingEntranceGap / 2) {
            placeBuildingEdge(bMinX, bMaxZ, bMinX, buildingEntranceGap / 2);
        }
        if (bMinZ < -buildingEntranceGap / 2) {
            placeBuildingEdge(bMinX, -buildingEntranceGap / 2, bMinX, bMinZ);
        }

        // B. Perimeter "Brush" (Dense Bushes Only)
        // "sadece burhslar otoparkın etrafını tam olarka kaplamalı"
        const brushDensity = 0.4; // Increased density from 1.0 to 0.4 to prevent gaps
        const natureTexture = '/Texture/TXT_LowPolyEssentials.png';

        const placeBrushEdge = (startX: number, startZ: number, endX: number, endZ: number) => {
            const dx = endX - startX;
            const dz = endZ - startZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const count = Math.ceil(dist / brushDensity);

            for (let i = 0; i < count; i++) {
                const t = i / count;
                const jitterX = (random() - 0.5) * 1.5; // Reduced jitter slightly
                const jitterZ = (random() - 0.5) * 1.5;

                const px = startX + dx * t + jitterX;
                const pz = startZ + dz * t + jitterZ;
                const rotY = random() * Math.PI * 2;

                const bIdx = Math.floor(random() * ASSETS.nature.brushes.length);
                // Adjusted scale to be slightly larger while keeping them small
                const s = (0.025 + random() * 0.02) * 0.035;

                els.push(
                    <AssetInstance
                        key={`brush-${keyCounter++}`}
                        url={ASSETS.nature.brushes[bIdx]}
                        position={[px, 0, pz]}
                        rotation={[0, rotY, 0]}
                        scale={s}
                        texturePath={natureTexture}
                    />
                );
            }
        };

        // Top
        placeBrushEdge(boundMinX, boundMinZ, boundMaxX, boundMinZ);
        // Right
        placeBrushEdge(boundMaxX, boundMinZ, boundMaxX, boundMaxZ);
        // Bottom
        placeBrushEdge(boundMaxX, boundMaxZ, boundMinX, boundMaxZ);

        // Left Brush Gap
        const entryGap = 15;
        if (boundMinZ < -entryGap / 2) {
            placeBrushEdge(boundMinX, boundMinZ, boundMinX, -entryGap / 2);
        }
        if (boundMaxZ > entryGap / 2) {
            placeBrushEdge(boundMinX, entryGap / 2, boundMinX, boundMaxZ);
        }




        // D. Street Furniture (Sidewalk) - Mixed in or near the brush line?
        // User didn't specify removing them, but "environment" focus was nature.
        // Let's keep them sparsely near the brush line (outside).
        const sidewalkScatter = 15;
        const sBoundsMinX = boundMinX - 8;
        const sBoundsMaxX = boundMaxX + 8;
        const sBoundsMinZ = boundMinZ - 8;
        const sBoundsMaxZ = boundMaxZ + 8;

        for (let i = 0; i < sidewalkScatter; i++) {
            const side = Math.floor(random() * 4);
            let px = 0, pz = 0;
            if (side === 0) {
                px = sBoundsMinX + random() * (sBoundsMaxX - sBoundsMinX);
                pz = sBoundsMinZ;
            } else if (side === 1) {
                px = sBoundsMaxX;
                pz = sBoundsMinZ + random() * (sBoundsMaxZ - sBoundsMinZ);
            } else if (side === 2) {
                px = sBoundsMinX + random() * (sBoundsMaxX - sBoundsMinX);
                pz = sBoundsMaxZ;
            } else {
                px = sBoundsMinX;
                pz = sBoundsMinZ + random() * (sBoundsMaxZ - sBoundsMinZ);
            }

            const typeRoll = random();
            let url = ASSETS.street.lights[0];
            let s = 0.035;

            if (typeRoll < 0.3) {
                url = ASSETS.street.lights[0];
            } else if (typeRoll < 0.5) {
                url = ASSETS.street.hydrants[0];
            } else if (typeRoll < 0.7) {
                url = ASSETS.street.trash[Math.floor(random() * ASSETS.street.trash.length)];
            } else if (typeRoll < 0.8) {
                url = ASSETS.street.stops[Math.floor(random() * ASSETS.street.stops.length)];
                s = 0.045;
            } else {
                url = ASSETS.street.misc[0];
            }

            els.push(
                <AssetInstance
                    key={`prop-${keyCounter++}`}
                    url={url}
                    position={[px, 0, pz]}
                    rotation={[0, random() * Math.PI * 2, 0]}
                    scale={s}
                />
            );
        }

        // E. Entry/Exit Logic
        els.push(
            <AssetInstance
                key="entry-sign-1"
                url={ASSETS.entry.signs[0]}
                position={[boundMinX - 5, 0, -8]}
                rotation={[0, Math.PI / 2, 0]}
                scale={0.045}
            />
        );
        els.push(
            <AssetInstance
                key="traffic-light-1"
                url={ASSETS.entry.trafficLights[0]}
                position={[minX - 2, 0, 5]}
                rotation={[0, -Math.PI / 2, 0]}
                scale={0.05}
            />
        );

        // --- Connection Road (Exit/Entry) ---
        // A double lane road extending from the parking entrance (minX) outwards to the left.
        const roadLength = 35;
        const roadWidth = 14;
        const roadStartX = minX - 10;
        // Sync end point to start point
        const roadEndX = roadStartX - roadLength;
        const roadCenterX = (roadStartX + roadEndX) / 2;

        // Road Asphalt
        els.push(
            <group key="connection-road">
                <Box
                    position={[roadCenterX, 0.01, 0]}
                    args={[roadLength, 0.05, roadWidth]}
                    receiveShadow
                >
                    <meshStandardMaterial color="#333333" />
                </Box>
                {/* Road Center Lines (Double or Dashed) */}
                {/* Let's make a dashed white line in the center */}
                {Array.from({ length: 10 }).map((_, i) => (
                    <Box
                        key={`road-line-${i}`}
                        position={[roadStartX - (i * (roadLength / 10)) - 2.5, 0.06, 0]} // Raised Y to 0.06
                        args={[2.5, 0.02, 0.4]}
                    >
                        <meshStandardMaterial color="#FFFFFF" />
                    </Box>
                ))}
            </group>
        );

        // F. Interior Parking Lights
        // Place a light every 5 parking slots (GAP AREAS)
        // Since gapSize is now 8, we have plenty of space in the gaps.
        const startX = 5;
        const startBlockZ = -(blockHeight / 2) + pairHeight / 2;

        for (let r = 0; r < rows; r++) {
            const pairIndex = Math.floor(r / 2);
            const isEven = r % 2 === 0;
            const pairCenterZ = startBlockZ + pairIndex * pairHeight;
            const zPos = isEven
                ? pairCenterZ - (laneGap / 2 + slotDepth / 2)
                : pairCenterZ + (laneGap / 2 + slotDepth / 2);

            // Back of the slot (where we might center on Z, but placed in X gap)
            const backLineZ = isEven ? zPos - slotDepth / 5 : zPos + slotDepth / 5;

            // --- Configuration for Interior Lights ---
            // Fix: Aligning to Z-axis to face the parking slots directly.
            // User requested 90 degree rotation to face "inside".
            // Assuming model faces X-axis by default.
            // Even Row (Top): Face +Z (Down) -> Need -90 or +270? Or +90?
            // Let's try 90 degrees offset.

            const lightRotY = isEven ? Math.PI / 2 : -Math.PI / 2;

            // Middle/Gap lights: Same logic, face the car.
            // This prevents them from pointing sideways into each other (intersecting) 
            // and ensures they look "inside" not "outside".

            const zOffset = isEven ? -0.5 : 0.5;

            // 1. Place Start Light
            els.push(
                <AssetInstance
                    key={`int-light-start-${r}`}
                    url={ASSETS.street.lights[0]}
                    position={[3, 0, backLineZ + zOffset]}
                    rotation={[0, lightRotY, 0]}
                    scale={0.035 * 1.2}
                />
            );

            // 2. Place Gap Lights
            for (let s = 0; s < cols; s++) {
                // Check if we are at the end of a block of 5
                if ((s + 1) % 5 === 0) {
                    if (s === cols - 1) continue;

                    const gapCenterX = startX + (s + 1) * slotWidth + Math.floor(s / 5) * gapSize + gapSize / 2;

                    els.push(
                        <AssetInstance
                            key={`int-light-${r}-${s}`}
                            url={ASSETS.street.lights[0]}
                            position={[gapCenterX, 0, backLineZ + zOffset]}
                            rotation={[0, lightRotY, 0]}
                            scale={0.035 * 1.2}
                        />
                    );
                }
            }
        }

        return els;

    }, [capacity, boundMinX, boundMaxX, boundMinZ, boundMaxZ]);

    // --- 3. Grass Ground Logic ---
    const streetOffset = 25;
    const grassMargin = 10; // Extra margin to ensure full coverage
    const grassMinX = boundMinX - streetOffset - grassMargin;
    const grassMaxX = boundMaxX + streetOffset + grassMargin;
    const grassMinZ = boundMinZ - streetOffset - grassMargin;
    const grassMaxZ = boundMaxZ + streetOffset + grassMargin;

    const grassWidth = grassMaxX - grassMinX;
    const grassDepth = grassMaxZ - grassMinZ;
    const grassCenterX = (grassMinX + grassMaxX) / 2;
    const grassCenterZ = (grassMinZ + grassMaxZ) / 2;

    return (
        <group>
            {/* Grass Ground */}
            <Plane
                args={[grassWidth, grassDepth]}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[grassCenterX, -0.05, grassCenterZ]}
                receiveShadow
            >
                <meshStandardMaterial color="#4caf50" roughness={1} />
            </Plane>

            <Suspense fallback={null}>
                {elements}
            </Suspense>
        </group>
    );
};
