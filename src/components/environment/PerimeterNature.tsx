import React, { useMemo } from 'react';
import { AssetInstance } from '../AssetInstance';
import { ASSETS, PATHS } from '../../config/constants';

interface Props {
    boundMinX: number;
    boundMaxX: number;
    boundMinZ: number;
    boundMaxZ: number;
}

export const PerimeterNature: React.FC<Props> = ({ boundMinX, boundMaxX, boundMinZ, boundMaxZ }) => {
    return useMemo(() => {
        const els: React.ReactNode[] = [];
        let keyCounter = 0;
        const random = () => Math.random();

        const brushDensity = 2.7; // Optimized density
        const texturePath = PATHS.TEXTURE_NATURE;

        const placeBrushEdge = (startX: number, startZ: number, endX: number, endZ: number) => {
            const dx = endX - startX;
            const dz = endZ - startZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const count = Math.ceil(dist / brushDensity);

            for (let i = 0; i < count; i++) {
                const t = i / count;
                const jitterX = (random() - 0.5) * 1.5;
                const jitterZ = (random() - 0.5) * 1.5;

                const px = startX + dx * t + jitterX;
                const pz = startZ + dz * t + jitterZ;
                const rotY = random() * Math.PI * 2;

                const bIdx = Math.floor(random() * ASSETS.nature.bushes.length);


                els.push(
                    <AssetInstance
                        key={`brush-${keyCounter++}`}
                        url={ASSETS.nature.bushes[bIdx]}
                        position={[px, 0, pz]}
                        rotation={[0, rotY, 0]}
                        scale={0.0022}
                        texturePath={texturePath}
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

        // Left Brush Gap for Entrance
        const entryGap = 15;
        if (boundMinZ < -entryGap / 2) {
            placeBrushEdge(boundMinX, boundMinZ, boundMinX, -entryGap / 2);
        }
        if (boundMaxZ > entryGap / 2) {
            placeBrushEdge(boundMinX, entryGap / 2, boundMinX, boundMaxZ);
        }

        return <>{els}</>;
    }, [boundMinX, boundMaxX, boundMinZ, boundMaxZ]);
};
