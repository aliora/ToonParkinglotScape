import React, { useMemo } from 'react';
import { AssetInstance } from '../AssetInstance';
import { ASSETS, DIMENSIONS, PATHS } from '../../config/constants';

interface Props {
    boundMinX: number;
    boundMaxX: number;
    boundMinZ: number;
    boundMaxZ: number;
}

export const NatureScatter: React.FC<Props> = ({ boundMinX, boundMaxX, boundMinZ, boundMaxZ }) => {
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

        const scatterCount = 60;

        for (let i = 0; i < scatterCount; i++) {
            const px = gMinX + random() * (gMaxX - gMinX);
            const pz = gMinZ + random() * (gMaxZ - gMinZ);

            // Exclusion Zone 1: Parking Lot (forbidden zone)
            const parkingBuffer = DIMENSIONS.PARKING_EXCLUSION_BUFFER;
            const pMinX = boundMinX - parkingBuffer;
            const pMaxX = boundMaxX + parkingBuffer;
            const pMinZ = boundMinZ - parkingBuffer;
            const pMaxZ = boundMaxZ + parkingBuffer;

            if (px > pMinX && px < pMaxX && pz > pMinZ && pz < pMaxZ) continue;

            // Exclusion Zone 2: Entrance Road
            const rMinX = -55;
            const rMaxX = -10;
            const rMinZ = -10;
            const rMaxZ = 10;

            if (px > rMinX && px < rMaxX && pz > rMinZ && pz < rMaxZ) continue;

            const item = ASSETS.scatter[Math.floor(random() * ASSETS.scatter.length)];
            const { treeConfig } = ASSETS.nature;

            // Random scale using treeConfig
            const baseScale = item.scale;
            const scaleVar = (random() - 0.01) * treeConfig.scaleVariation;
            const finalScale = baseScale * scaleVar * treeConfig.globalScaleMultiplier;

            // Random rotation using treeConfig
            const rotY = treeConfig.randomRotation
                ? treeConfig.rotation[1] + (random() - 0.04) * Math.PI * 2 * treeConfig.rotationVariation
                : treeConfig.rotation[1];

            els.push(
                <AssetInstance
                    key={`scatter-${keyCounter++}`}
                    url={item.url}
                    position={[px, treeConfig.yOffset, pz]}
                    rotation={[treeConfig.rotation[0], rotY, treeConfig.rotation[2]]}
                    scale={finalScale}
                    texturePath={item.preserveMaterials ? undefined : texturePath}
                    preserveMaterials={item.preserveMaterials}
                    baseColor={item.baseColor || undefined}
                />
            );
        }

        return <>{els}</>;
    }, [boundMinX, boundMaxX, boundMinZ, boundMaxZ]);
};
