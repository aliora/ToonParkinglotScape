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
        const buildingBuffer = 5;
        const parkingBuffer = 2;

        const spawnOffset = buildingLineOffset - buildingBuffer;

        const gMinX = boundMinX - spawnOffset;
        const gMaxX = boundMaxX + spawnOffset;
        const gMinZ = boundMinZ - spawnOffset;
        const gMaxZ = boundMaxZ + spawnOffset;

        const scatterCount = 60;

        for (let i = 0; i < scatterCount; i++) {
            const px = gMinX + random() * (gMaxX - gMinX);
            const pz = gMinZ + random() * (gMaxZ - gMinZ);

            // Exclusion Zone 1: Parking Lot
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
            const rotY = random() * Math.PI * 2;
            const s = item.scale * (0.01 + random() * 0.004);

            els.push(
                <AssetInstance
                    key={`scatter-${keyCounter++}`}
                    url={item.url}
                    position={[px, 0, pz]}
                    rotation={[0, rotY, 0]}
                    scale={s}
                    texturePath={texturePath}
                />
            );
        }

        return <>{els}</>;
    }, [boundMinX, boundMaxX, boundMinZ, boundMaxZ]);
};
