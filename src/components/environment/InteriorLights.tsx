import React, { useMemo } from 'react';
import { AssetInstance } from '../AssetInstance';
import { ASSETS, DIMENSIONS } from '../../config/constants';
import { useParkingLayout } from '../../hooks/useParkingLayout';

interface Props {
    capacity: number;
}

export const InteriorLights: React.FC<Props> = ({ capacity }) => {
    const { rows, cols, blockHeight, pairHeight } = useParkingLayout(capacity);

    return useMemo(() => {
        const els: React.ReactNode[] = [];
        const { SLOT_WIDTH, SLOT_DEPTH, LANE_GAP, GAP_SIZE } = DIMENSIONS;
        const startX = 5;
        const startBlockZ = -(blockHeight / 2) + pairHeight / 2;

        for (let r = 0; r < rows; r++) {
            const pairIndex = Math.floor(r / 2);
            const isEven = r % 2 === 0;
            const pairCenterZ = startBlockZ + pairIndex * pairHeight;
            const zPos = isEven
                ? pairCenterZ - (LANE_GAP / 2 + SLOT_DEPTH / 2)
                : pairCenterZ + (LANE_GAP / 2 + SLOT_DEPTH / 2);

            const backLineZ = isEven ? zPos - SLOT_DEPTH / 5 : zPos + SLOT_DEPTH / 5;
            const lightRotY = isEven ? Math.PI / 2 : -Math.PI / 2;
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
                if ((s + 1) % 5 === 0) {
                    if (s === cols - 1) continue;

                    const gapCenterX = startX + (s + 1) * SLOT_WIDTH + Math.floor(s / 5) * GAP_SIZE + GAP_SIZE / 2;

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
        return <>{els}</>;
    }, [capacity, rows, cols, blockHeight, pairHeight]);
};
