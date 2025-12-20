import React, { useMemo } from 'react';
import { Box } from '@react-three/drei';
import { AssetInstance } from '../AssetInstance';
import { ASSETS, PATHS, DIMENSIONS } from '../../config/constants';

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

        const { bushConfig, stoneFence } = ASSETS.nature;
        const texturePath = PATHS.TEXTURE_NATURE;

        // Bush placement function
        const placeBrushEdge = (startX: number, startZ: number, endX: number, endZ: number) => {
            const dx = endX - startX;
            const dz = endZ - startZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const count = Math.ceil(dist / bushConfig.density);

            for (let i = 0; i < count; i++) {
                // Random spacing variation between bushes
                const randomGap = (random() - 0.5) * bushConfig.gapVariation;
                const t = (i + bushConfig.spawnStartOffset + randomGap) / (count + bushConfig.spawnEndOffset);
                const jitterX = (random() - 0.5) * bushConfig.jitterX;
                const jitterZ = (random() - 0.5) * bushConfig.jitterZ;

                const px = startX + dx * t + jitterX + bushConfig.xOffset;
                const pz = startZ + dz * t + jitterZ + bushConfig.zOffset;
                const rotY = bushConfig.randomRotation
                    ? bushConfig.rotation[1] + (random() - 0.5) * Math.PI * 2 * bushConfig.rotationVariation
                    : bushConfig.rotation[1];

                const bIdx = Math.floor(random() * ASSETS.nature.bushes.length);

                const randomScale = bushConfig.scale * (1 + (random() - 0.5) * bushConfig.scaleVariation);

                els.push(
                    <AssetInstance
                        key={`brush-${keyCounter++}`}
                        url={ASSETS.nature.bushes[bIdx]}
                        position={[px, bushConfig.yOffset, pz]}
                        rotation={[bushConfig.rotation[0], rotY, bushConfig.rotation[2]]}
                        scale={randomScale}
                        texturePath={texturePath}
                        wind={true}
                    />
                );
            }
        };

        // Stone fence placement function (for entry side)
        const placeStoneFenceEdge = (startX: number, startZ: number, endX: number, endZ: number) => {
            const dx = endX - startX;
            const dz = endZ - startZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const count = Math.ceil(dist / stoneFence.density);

            for (let i = 0; i < count; i++) {
                // Random spacing variation between fences
                const randomGap = (random() - 0.5) * stoneFence.gapVariation;
                const t = (i + stoneFence.spawnOffset + randomGap) / count;
                const px = startX + dx * t;
                const pz = startZ + dz * t;

                els.push(
                    <AssetInstance
                        key={`stone-fence-${keyCounter++}`}
                        url={stoneFence.model}
                        position={[px, stoneFence.yOffset, pz]}
                        rotation={stoneFence.rotation}
                        scale={stoneFence.scale}
                        preserveMaterials={stoneFence.preserveMaterials}
                        baseColor={stoneFence.baseColor}
                    />
                );
            }
        };

        // Right edge only (opposite of stone fence) - bushes
        placeBrushEdge(boundMaxX, boundMinZ, boundMaxX, boundMaxZ);

        // Border lines for top/bottom edges - single continuous box
        const { parkingLotBorder } = ASSETS.nature;
        if (parkingLotBorder.enabled) {
            const edgeWidth = (boundMaxX - boundMinX) + parkingLotBorder.extraWidth;

            // Top edge - single line
            els.push(
                <Box
                    key="border-top-line"
                    position={[
                        (boundMinX + boundMaxX) / 2 + parkingLotBorder.xOffset,
                        parkingLotBorder.yOffset,
                        boundMinZ + parkingLotBorder.zOffset
                    ]}
                    args={[edgeWidth, parkingLotBorder.boxHeight, parkingLotBorder.boxDepth]}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial color={parkingLotBorder.boxColor} />
                </Box>
            );

            // Bottom edge - single line
            els.push(
                <Box
                    key="border-bottom-line"
                    position={[
                        (boundMinX + boundMaxX) / 2 + parkingLotBorder.xOffset,
                        parkingLotBorder.yOffset,
                        boundMaxZ + parkingLotBorder.zOffset
                    ]}
                    args={[edgeWidth, parkingLotBorder.boxHeight, parkingLotBorder.boxDepth]}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial color={parkingLotBorder.boxColor} />
                </Box>
            );
        }

        // Left edge - Stone fences (skip entry road area)
        const entryGap = DIMENSIONS.ENTRY_GAP; // Road width gap
        // Top part of left edge (above road)
        if (boundMinZ < -entryGap / 2) {
            placeStoneFenceEdge(boundMinX, boundMinZ, boundMinX, -entryGap / 2);
        }
        // Bottom part of left edge (below road)
        if (boundMaxZ > entryGap / 2) {
            placeStoneFenceEdge(boundMinX, entryGap / 2, boundMinX, boundMaxZ);
        }

        return <>{els}</>;
    }, [boundMinX, boundMaxX, boundMinZ, boundMaxZ]);
};
