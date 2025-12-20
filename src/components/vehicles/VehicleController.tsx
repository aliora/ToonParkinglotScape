import { useRef, useMemo } from 'react';
import { Group } from 'three';
import type { VehicleInstance } from '../../stores/useTrafficStore';
import { useVehicleMovement } from '../../hooks/useVehicleMovement';
import { VehicleView } from './VehicleView';

interface VehicleControllerProps {
    data: VehicleInstance;
}

export function VehicleController({ data }: VehicleControllerProps) {
    const meshRef = useRef<Group>(null);

    // Vehicle dimensions logic
    const dimensions: [number, number, number] = useMemo(() => {
        switch (data.type) {
            case 1: return [2, 1, 4];
            case 2: return [2.2, 1.5, 5];
            case 3: return [2.5, 2, 8];
            case 5: return [2.5, 1.8, 6];
            default: return [2, 1, 4];
        }
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
