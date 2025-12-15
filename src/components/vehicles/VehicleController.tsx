import { useRef, useMemo } from 'react';
import { Mesh } from 'three';
import type { VehicleInstance } from '../../stores/useTrafficStore';
import { useVehicleMovement } from '../../hooks/useVehicleMovement';
import { VehicleView } from './VehicleView';

interface VehicleControllerProps {
    data: VehicleInstance;
}

export function VehicleController({ data }: VehicleControllerProps) {
    const meshRef = useRef<Mesh>(null);

    // Vehicle dimensions logic
    const dimensions: [number, number, number] = useMemo(() => {
        switch (data.type) {
            case 1: return [2, 1, 4];
            case 2: return [2.2, 1.5, 5];
            case 3: return [2.5, 2, 8];
            case 4: return [2, 1.2, 4.5];
            case 5: return [2.5, 1.8, 6];
            case 6: return [3, 2.5, 10];
            case 7: return [0.8, 1, 2];
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
            dimensions={dimensions}
            vehicleHeight={vehicleHeight}
            color={data.color}
            position={{ x: data.currentPosition.x, z: data.currentPosition.z }}
        />
    );
}

export default VehicleController;
