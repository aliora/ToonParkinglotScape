import { useRef, useMemo } from 'react';
import { Group } from 'three';
import type { VehicleInstance } from '../../stores/useTrafficStore';
import { useVehicleMovement } from '../../hooks/useVehicleMovement';
import { VehicleView } from './VehicleView';
import { VEHICLE_DIMENSIONS } from '../../config/constants';

interface VehicleControllerProps {
    data: VehicleInstance;
}

export function VehicleController({ data }: VehicleControllerProps) {
    const meshRef = useRef<Group>(null);

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

    return (
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
        />
    );
}

export default VehicleController;
