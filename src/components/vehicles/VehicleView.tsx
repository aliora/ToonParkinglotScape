import { forwardRef, useMemo } from 'react';
import { Group, Color, MeshBasicMaterial, BackSide } from 'three';
import { AssetInstance } from '../AssetInstance';
import { PATHS, VEHICLE_MOVEMENT } from '../../config/constants';
import { useFBX } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';

interface VehicleViewProps {
    vehicleHeight: number;
    color?: string;
    position: { x: number; z: number };
    modelUrl: string;
    modelScale: number;
    modelRotation?: [number, number, number] | readonly [number, number, number];
    modelTexture?: string;
    modelYOffset?: number;
    isHovered?: boolean;
}

// Outline material for hover effect - Filament amber/orange color
const outlineMaterial = new MeshBasicMaterial({
    color: new Color('#f59e0b'), // Tailwind amber-500
    side: BackSide,
});

// Component for outline effect
const VehicleOutline: React.FC<{
    modelUrl: string;
    modelScale: number;
    rotation: [number, number, number];
    yPos: number;
}> = ({ modelUrl, modelScale, rotation, yPos }) => {
    const fbx = useFBX(PATHS.VEHICLES + modelUrl);

    const outlineScene = useMemo(() => {
        const clone = SkeletonUtils.clone(fbx);
        clone.traverse((child: any) => {
            if (child.isMesh) {
                child.material = outlineMaterial;
                child.renderOrder = -1;
            }
        });
        return clone;
    }, [fbx]);

    // Use configurable outline thickness from constants
    const outlineScale = modelScale * VEHICLE_MOVEMENT.OUTLINE_THICKNESS;

    return (
        <primitive
            object={outlineScene}
            position={[0, yPos, 0]}
            rotation={rotation}
            scale={[outlineScale, outlineScale, outlineScale]}
        />
    );
};

export const VehicleView = forwardRef<Group, VehicleViewProps>(
    ({ vehicleHeight, color, position, modelUrl, modelScale, modelRotation, modelTexture, modelYOffset, isHovered }, ref) => {
        // Convert degrees to radians for default rotation
        const defaultRotation: [number, number, number] = modelRotation
            ? [modelRotation[0] * Math.PI / 180, modelRotation[1] * Math.PI / 180, modelRotation[2] * Math.PI / 180]
            : [0, 0, 0];

        // Base offset is -0.5 (to align with ground typically), add custom offset
        const yPos = -0.5 + (modelYOffset || 0);

        return (
            <group ref={ref} position={[position.x, vehicleHeight / 2, position.z]}>
                {/* Outline effect when hovered */}
                {isHovered && (
                    <VehicleOutline
                        modelUrl={modelUrl}
                        modelScale={modelScale}
                        rotation={defaultRotation}
                        yPos={yPos}
                    />
                )}

                {/* Main vehicle model */}
                <AssetInstance
                    url={modelUrl}
                    position={[0, yPos, 0]}
                    rotation={defaultRotation}
                    scale={modelScale}
                    basePath={PATHS.VEHICLES}
                    preserveMaterials
                    texturePath={modelTexture}
                    baseColor={color}
                />

                {/* Hover glow effect - Filament amber */}
                {isHovered && (
                    <pointLight
                        position={[0, 1, 0]}
                        color="#f59e0b"
                        intensity={3}
                        distance={6}
                    />
                )}
            </group>
        );
    }
);

VehicleView.displayName = 'VehicleView';
