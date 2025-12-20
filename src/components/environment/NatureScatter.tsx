import React, { useMemo } from 'react';
import { AssetInstance } from '../AssetInstance';
import { ASSETS, DIMENSIONS, PATHS } from '../../config/constants';
import { useTrafficStore } from '../../stores/useTrafficStore';

interface Props {
    boundMinX: number;
    boundMaxX: number;
    boundMinZ: number;
    boundMaxZ: number;
}

type ClusterType = 'greenery' | 'dead';

interface Cluster {
    x: number;
    z: number;
    type: ClusterType;
    radius: number;
}

export const NatureScatter: React.FC<Props> = ({ boundMinX, boundMaxX, boundMinZ, boundMaxZ }) => {
    const {
        numClusters,
        baseClusterRadius,
        scatterCount,
        greeneryChance,
        sparseGreeneryChance
    } = useTrafficStore(state => state.worldConfig.nature);

    return useMemo(() => {
        const els: React.ReactNode[] = [];
        let keyCounter = 0;
        const random = () => Math.random();
        const texturePath = PATHS.TEXTURE_NATURE;

        const { STREET_OFFSET } = DIMENSIONS;

        const buildingLineOffset = STREET_OFFSET;
        const buildingBuffer = DIMENSIONS.BUILDING_EXCLUSION_BUFFER;

        const spawnOffset = buildingLineOffset - buildingBuffer;

        const gMinX = boundMinX - spawnOffset;
        const gMaxX = boundMaxX + spawnOffset;
        const gMinZ = boundMinZ - spawnOffset;
        const gMaxZ = boundMaxZ + spawnOffset;

        // Configuration
        // const numClusters = 12; // Replaced by useControls
        // const baseClusterRadius = 15; // Replaced by useControls
        // const scatterCount = 200; // Replaced by useControls

        // Generate Clusters
        const clusters: Cluster[] = [];
        for (let i = 0; i < numClusters; i++) {
            const cx = gMinX + random() * (gMaxX - gMinX);
            const cz = gMinZ + random() * (gMaxZ - gMinZ);

            // Check exclusion for cluster center (to avoid centering a cluster inside the parking lot)
            const parkingBuffer = DIMENSIONS.PARKING_EXCLUSION_BUFFER + 5; // Extra buffer for centers
            if (cx > boundMinX - parkingBuffer && cx < boundMaxX + parkingBuffer &&
                cz > boundMinZ - parkingBuffer && cz < boundMaxZ + parkingBuffer) {
                i--; // Retry
                continue;
            }

            // greeneryChance determines probability of being 'greenery'. 
            // If random() < greeneryChance -> greenery, else dead.
            const type: ClusterType = random() < greeneryChance ? 'greenery' : 'dead';

            clusters.push({
                x: cx,
                z: cz,
                type,
                radius: baseClusterRadius + (random() * 10 - 5) // Random radius variation
            });
        }

        // Spawn Assets Logic
        const occupiedSpots: { x: number; z: number; radius: number }[] = [];

        const spawnItem = (x: number, z: number, item: any, treeConfig: any) => {
            // Collision Check
            const myRadius = item.collisionRadius || 1;
            // Check against existing spots
            for (const spot of occupiedSpots) {
                const dx = x - spot.x;
                const dz = z - spot.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < (spot.radius + myRadius) * 0.8) { // 0.8 multiplier allows slight overlap for better density
                    return null;
                }
            }

            // Validation passed, create element
            const baseScale = item.scale;

            // Use item-specific random range if available, otherwise default to 0.6 - 1.4
            const minVar = (item as any).randomScaleMin ?? 0.6;
            const maxVar = (item as any).randomScaleMax ?? 1.4;

            const scaleVar = minVar + random() * (maxVar - minVar);
            let finalScale = baseScale * scaleVar * treeConfig.globalScaleMultiplier;

            // Adjust scale for specific types if needed
            if (item.type === 'rock') {
                finalScale *= (0.8 + random() * 0.4);
            }

            // Random rotation
            const rotY = treeConfig.randomRotation
                ? treeConfig.rotation[1] + (random() - 0.04) * Math.PI * 2 * treeConfig.rotationVariation
                : treeConfig.rotation[1];

            occupiedSpots.push({ x, z, radius: myRadius });

            return (
                <AssetInstance
                    key={`scatter-${keyCounter++}`}
                    url={item.url}
                    position={[x, treeConfig.yOffset, z]}
                    rotation={[treeConfig.rotation[0], rotY, treeConfig.rotation[2]]}
                    scale={finalScale}
                    texturePath={item.preserveMaterials ? undefined : texturePath}
                    preserveMaterials={item.preserveMaterials}
                    baseColor={(item as any).baseColor || undefined}
                    wind={item.type === 'tree' || item.type === 'bush'}
                />
            );
        };

        const trySpawn = (onlyRocks: boolean) => {
            // Pick a random point in the world
            const px = gMinX + random() * (gMaxX - gMinX);
            const pz = gMinZ + random() * (gMaxZ - gMinZ);

            // Exclusion Zone 1: Parking Lot (forbidden zone)
            const parkingBuffer = DIMENSIONS.PARKING_EXCLUSION_BUFFER;
            const pMinX = boundMinX - parkingBuffer;
            const pMaxX = boundMaxX + parkingBuffer;
            const pMinZ = boundMinZ - parkingBuffer;
            const pMaxZ = boundMaxZ + parkingBuffer;

            if (px > pMinX && px < pMaxX && pz > pMinZ && pz < pMaxZ) return;

            // Exclusion Zone 2: Entrance Road
            const rMinX = -55;
            const rMaxX = -10;
            const rMinZ = -10;
            const rMaxZ = 10;

            if (px > rMinX && px < rMaxX && pz > rMinZ && pz < rMaxZ) return;

            // Determine Cluster Membership
            let closestDist = Infinity;
            let targetCluster: Cluster | null = null;

            for (const cluster of clusters) {
                const dist = Math.sqrt(Math.pow(px - cluster.x, 2) + Math.pow(pz - cluster.z, 2));
                if (dist < closestDist) {
                    closestDist = dist;
                    targetCluster = cluster;
                }
            }

            let assetGroup;

            if (targetCluster && closestDist < targetCluster.radius) {
                // Inside a cluster
                assetGroup = ASSETS.scatterGroups[targetCluster.type];
            } else {
                // Outside any cluster - sparse greenery or empty
                if (random() < sparseGreeneryChance) {
                    assetGroup = ASSETS.scatterGroups.greenery;
                } else {
                    return; // Empty space
                }
            }

            // Pick random asset
            const item = assetGroup[Math.floor(random() * assetGroup.length)] as any;

            // Filter pass
            if (onlyRocks) {
                if (item.type !== 'rock') return;
            } else {
                if (item.type === 'rock') return; // Rocks already spawned in pass 1
            }

            const { treeConfig } = ASSETS.nature;
            const el = spawnItem(px, pz, item, treeConfig);
            if (el) els.push(el);
        };

        // Pass 1: Rocks
        // Run fewer iterations for rocks since they are sparse but big
        for (let i = 0; i < scatterCount; i++) {
            trySpawn(true);
        }

        // Pass 2: Others
        for (let i = 0; i < scatterCount; i++) {
            trySpawn(false);
        }

        return <>{els}</>;
    }, [boundMinX, boundMaxX, boundMinZ, boundMaxZ, numClusters, baseClusterRadius, scatterCount, greeneryChance, sparseGreeneryChance]);
};
