import React, { useMemo } from 'react';
import { AssetInstance } from '../AssetInstance';
import { ASSETS, DIMENSIONS } from '../../config/constants';
import { useParkingLayout } from '../../hooks/useParkingLayout';

interface Props {
    capacity: number;
    isNight: boolean;
}

const StreetLight: React.FC<{
    position: [number, number, number];
    rotation: [number, number, number];
    isNight: boolean;
    coneVariation?: {
        radius: number;
        rotation: [number, number, number];
    };
}> = ({ position, rotation, isNight, coneVariation }) => {
    const { lightScale, preserveMaterials, baseColor, cone } = ASSETS.street;

    // Apply variations if they exist, otherwise use defaults
    const finalConeRotation: [number, number, number] = coneVariation
        ? [
            cone.rotation[0] + coneVariation.rotation[0],
            cone.rotation[1] + coneVariation.rotation[1],
            cone.rotation[2] + coneVariation.rotation[2],
        ]
        : cone.rotation;

    const finalRadius = coneVariation ? cone.radius + coneVariation.radius : cone.radius;

    return (
        <group position={position} rotation={rotation}>
            <AssetInstance
                url={ASSETS.street.lights[0]}
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
                scale={lightScale}
                preserveMaterials={preserveMaterials}
                baseColor={baseColor}
            />
            {cone.enabled && isNight && (
                <mesh
                    position={cone.position}
                    rotation={finalConeRotation}
                >
                    <coneGeometry args={[finalRadius, cone.height, cone.segments]} />
                    <meshBasicMaterial
                        color={cone.color}
                        opacity={cone.opacity}
                        transparent
                        depthWrite={false}
                    />
                </mesh>
            )}
        </group>
    );
};

export const InteriorLights: React.FC<Props> = ({ capacity, isNight }) => {
    const { rows, cols, blockHeight, pairHeight } = useParkingLayout(capacity);

    return useMemo(() => {
        const els: React.ReactNode[] = [];
        const { SLOT_WIDTH, SLOT_DEPTH, LANE_GAP, GAP_SIZE } = DIMENSIONS;
        const startX = 5;
        const startBlockZ = -(blockHeight / 2) + pairHeight / 2;

        const baseRotation = ASSETS.street.lightRotation;
        const yOffset = ASSETS.street.lightYOffset;

        // Helper to generate random variation based on config
        const getConeVariation = () => {
            const { radiusVariation, rotationVariation } = ASSETS.street.cone;
            return {
                radius: (Math.random() - 0.5) * 2 * radiusVariation,
                rotation: [
                    (Math.random() - 0.5) * 2 * rotationVariation,
                    (Math.random() - 0.5) * 2 * rotationVariation,
                    (Math.random() - 0.5) * 2 * rotationVariation,
                ] as [number, number, number]
            };
        };

        for (let r = 0; r < rows; r++) {
            const pairIndex = Math.floor(r / 2);
            const isEven = r % 2 === 0;
            const pairCenterZ = startBlockZ + pairIndex * pairHeight;
            const zPos = isEven
                ? pairCenterZ - (LANE_GAP / 2 + SLOT_DEPTH / 2)
                : pairCenterZ + (LANE_GAP / 2 + SLOT_DEPTH / 2);

            const backLineZ = isEven ? zPos - SLOT_DEPTH / 5 : zPos + SLOT_DEPTH / 5;
            const lightRotY = isEven ? Math.PI / 2 : -Math.PI / 2;
            const zOffsetDir = isEven ? -0.5 : 0.5;

            const rotation: [number, number, number] = [
                baseRotation[0],
                baseRotation[1] + lightRotY,
                baseRotation[2]
            ];

            // 1. Place Start Light
            els.push(
                <StreetLight
                    key={`int-light-start-${r}`}
                    position={[3, yOffset, backLineZ + zOffsetDir]}
                    rotation={rotation}
                    isNight={isNight}
                    coneVariation={getConeVariation()}
                />
            );

            // 2. Place Gap Lights
            for (let s = 0; s < cols; s++) {
                if ((s + 1) % 5 === 0) {
                    if (s === cols - 1) continue;

                    const gapCenterX = startX + (s + 1.7) * SLOT_WIDTH + Math.floor(s / 5) * GAP_SIZE + GAP_SIZE / 2;

                    els.push(
                        <StreetLight
                            key={`int-light-${r}-${s}`}
                            position={[gapCenterX, yOffset, backLineZ + zOffsetDir]}
                            rotation={rotation}
                            isNight={isNight}
                            coneVariation={getConeVariation()}
                        />
                    );
                }
            }
        }
        return <>{els}</>;
    }, [capacity, rows, cols, blockHeight, pairHeight, isNight]);
};
