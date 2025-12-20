import { useRef, useMemo, useState, useCallback } from 'react';
import { Group, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import type { VehicleInstance } from '../../stores/useTrafficStore';
import { useVehicleMovement } from '../../hooks/useVehicleMovement';
import { VehicleView } from './VehicleView';
import { VEHICLE_DIMENSIONS } from '../../config/constants';
import { useVehicleHover } from './VehicleHoverPopup';

interface VehicleControllerProps {
    data: VehicleInstance;
}

export function VehicleController({ data }: VehicleControllerProps) {
    const meshRef = useRef<Group>(null);
    const [isHovered, setIsHovered] = useState(false);
    const { camera, size } = useThree();
    const { setHoveredVehicle } = useVehicleHover();

    // Vehicle dimensions from centralized config
    const dimensions: [number, number, number] = useMemo(() => {
        const dims = VEHICLE_DIMENSIONS[data.type as keyof typeof VEHICLE_DIMENSIONS]
            || VEHICLE_DIMENSIONS.DEFAULT;
        return [...dims] as [number, number, number];
    }, [data.type]);

    const vehicleHeight = dimensions[1];

    // Hook handles movement logic
    useVehicleMovement({
        data,
        vehicleHeight,
        meshRef
    });

    // Convert 3D position to screen coordinates
    const getScreenPosition = useCallback(() => {
        if (!meshRef.current) return { x: 0, y: 0 };

        const worldPos = new Vector3();
        meshRef.current.getWorldPosition(worldPos);

        // Offset upward to position popup above the vehicle
        worldPos.y += vehicleHeight + 1.5;

        // Project to screen coordinates
        const projected = worldPos.clone().project(camera);

        const x = (projected.x * 0.5 + 0.5) * size.width;
        const y = (-projected.y * 0.5 + 0.5) * size.height;

        return { x, y };
    }, [camera, size, vehicleHeight]);

    const handlePointerEnter = useCallback((e: any) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';

        const screenPos = getScreenPosition();
        setHoveredVehicle(data, screenPos);
    }, [data, setHoveredVehicle, getScreenPosition]);

    const handlePointerLeave = useCallback((e: any) => {
        e.stopPropagation();
        setIsHovered(false);
        document.body.style.cursor = 'auto';
        setHoveredVehicle(null);
    }, [setHoveredVehicle]);

    const handlePointerMove = useCallback(() => {
        if (isHovered) {
            const screenPos = getScreenPosition();
            setHoveredVehicle(data, screenPos);
        }
    }, [isHovered, data, setHoveredVehicle, getScreenPosition]);

    return (
        <group
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onPointerMove={handlePointerMove}
        >
            <VehicleView
                ref={meshRef}
                vehicleHeight={vehicleHeight}
                color={data.color}
                position={{ x: data.currentPosition.x, z: data.currentPosition.z }}
                modelUrl={data.modelUrl}
                modelScale={data.modelScale}
                modelRotation={data.modelRotation}
                modelTexture={data.modelTexture}
                modelYOffset={data.modelYOffset}
                isHovered={isHovered}
            />
        </group>
    );
}

export default VehicleController;
