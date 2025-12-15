import { forwardRef } from 'react';
import { Group } from 'three';
import { AssetInstance } from '../AssetInstance';
import { PATHS } from '../../config/constants';

interface VehicleViewProps {
    dimensions: [number, number, number];
    vehicleHeight: number;
    color: string;
    position: { x: number; z: number };
    modelUrl: string;
    modelScale: number;
    modelRotation?: [number, number, number];
    modelTexture?: string;
    modelYOffset?: number;
}

export const VehicleView = forwardRef<Group, VehicleViewProps>(
    ({ dimensions, vehicleHeight, color, position, modelUrl, modelScale, modelRotation, modelTexture, modelYOffset }, ref) => {
        // Convert degrees to radians for default rotation
        const defaultRotation: [number, number, number] = modelRotation
            ? [modelRotation[0] * Math.PI / 180, modelRotation[1] * Math.PI / 180, modelRotation[2] * Math.PI / 180]
            : [0, 0, 0];

        // Base offset is -0.5 (to align with ground typically), add custom offset
        const yPos = -0.5 + (modelYOffset || 0);

        return (
            <group ref={ref} position={[position.x, vehicleHeight / 2, position.z]}>
                <AssetInstance
                    url={modelUrl}
                    position={[0, yPos, 0]}
                    rotation={defaultRotation}
                    scale={modelScale}
                    basePath={PATHS.VEHICLES}
                    preserveMaterials
                    texturePath={modelTexture}
                    baseColor={color} // Some vehicles might use this tint
                />
            </group>
        );
    }
);

VehicleView.displayName = 'VehicleView';
