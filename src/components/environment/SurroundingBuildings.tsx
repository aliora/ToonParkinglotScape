import React, { useMemo } from 'react';
import { AssetInstance } from '../AssetInstance';
import { ASSETS, DIMENSIONS } from '../../config/constants';

interface Props {
    boundMinX: number;
    boundMaxX: number;
    boundMinZ: number;
    boundMaxZ: number;
}

export const SurroundingBuildings: React.FC<Props> = ({ boundMinX, boundMaxX, boundMinZ, boundMaxZ }) => {
    return useMemo(() => {
        const els: React.ReactNode[] = [];
        let keyCounter = 0;
        const random = () => Math.random();

        const { BUILDING_GAP, STREET_OFFSET } = DIMENSIONS;

        // Move buildings further away based on offset
        const bMinX = boundMinX - STREET_OFFSET;
        const bMaxX = boundMaxX + STREET_OFFSET;
        const bMinZ = boundMinZ - STREET_OFFSET;
        const bMaxZ = boundMaxZ + STREET_OFFSET;

        const placeBuildingEdge = (startX: number, startZ: number, endX: number, endZ: number) => {
            const dx = endX - startX;
            const dz = endZ - startZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const count = Math.ceil(dist / BUILDING_GAP);
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
                        scale={0.05}
                    />
                );
            }
        };

        // Building Walls (U-shape)
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

        return <>{els}</>;
    }, [boundMinX, boundMaxX, boundMinZ, boundMaxZ]);
};
