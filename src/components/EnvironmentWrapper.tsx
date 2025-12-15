import React, { Suspense } from 'react';
import { Plane } from '@react-three/drei';
import { useControls } from 'leva';
import { AssetInstance } from './AssetInstance';
import { useParkingLayout } from '../hooks/useParkingLayout';
import { DIMENSIONS, ASSETS, COLORS } from '../config/constants';
import { SurroundingBuildings } from './environment/SurroundingBuildings';
import { PerimeterNature } from './environment/PerimeterNature';
import { LowPolyClouds } from './environment/LowPolyClouds';
import { ConnectionRoad } from './environment/ConnectionRoad';
import { InteriorLights } from './environment/InteriorLights';
import { NatureScatter } from './environment/NatureScatter';
import { WindEffect } from './environment/WindEffect';

interface EnvironmentWrapperProps {
    capacity?: number;
}

export const EnvironmentWrapper: React.FC<EnvironmentWrapperProps> = ({ capacity = 20 }) => {
    // Read timeOfDay same as App.tsx to determine cloud color
    // We use a separate useControls call but it syncs with the one in App.tsx by key
    const { timeOfDay } = useControls('Environment', {
        timeOfDay: { options: ['Day', 'Night'], value: 'Day' },
    });
    const isNight = timeOfDay === 'Night';
    const cloudColor = '#ffffff';
    const {
        boundMinX,
        boundMaxX,
        boundMinZ,
        boundMaxZ,
        minX
    } = useParkingLayout(capacity);

    // Grass Ground Logic
    const streetOffset = DIMENSIONS.STREET_OFFSET - 5; // Slight adjustment 
    const grassMargin = 10;
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
                <meshStandardMaterial color={COLORS.GRASS} roughness={1} />
            </Plane>

            <Suspense fallback={null}>
                {/* Visual Elements */}
                <SurroundingBuildings
                    boundMinX={boundMinX}
                    boundMaxX={boundMaxX}
                    boundMinZ={boundMinZ}
                    boundMaxZ={boundMaxZ}
                />

                <PerimeterNature
                    boundMinX={boundMinX}
                    boundMaxX={boundMaxX}
                    boundMinZ={boundMinZ}
                    boundMaxZ={boundMaxZ}
                />

                <LowPolyClouds
                    boundMinX={boundMinX}
                    boundMaxX={boundMaxX}
                    boundMinZ={boundMinZ}
                    boundMaxZ={boundMaxZ}
                    density={0.5}
                    color={cloudColor}
                />

                <NatureScatter
                    boundMinX={boundMinX}
                    boundMaxX={boundMaxX}
                    boundMinZ={boundMinZ}
                    boundMaxZ={boundMaxZ}
                />

                <WindEffect
                    boundMinX={boundMinX}
                    boundMaxX={boundMaxX}
                    boundMinZ={boundMinZ}
                    boundMaxZ={boundMaxZ}
                />

                <ConnectionRoad minX={minX} />

                <InteriorLights capacity={capacity} isNight={isNight} />

                {/* Entry Sign - kept simple here as it's a single item */}
                {ASSETS.entry.signs.length > 0 && (
                    <AssetInstance
                        key="entry-sign-1"
                        url={ASSETS.entry.signs[0]}
                        position={[boundMinX - 5, 0, -8]}
                        rotation={[0, Math.PI / 2, 0]}
                        scale={0.045}
                    />
                )}
            </Suspense>
        </group>
    );
};

