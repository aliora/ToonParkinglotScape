import { forwardRef } from 'react';
import { Box } from '@react-three/drei';
import { Mesh } from 'three';

interface VehicleViewProps {
    dimensions: [number, number, number];
    vehicleHeight: number;
    color: string;
    position: { x: number; z: number }; // Initial render pos mostly handled by ref mutation, but good for keying
}

export const VehicleView = forwardRef<Mesh, VehicleViewProps>(
    ({ dimensions, vehicleHeight, color, position }, ref) => {
        return (
            <Box
                ref={ref}
                args={dimensions}
                position={[position.x, vehicleHeight / 2, position.z]}
                castShadow
            >
                <meshStandardMaterial color={color} />
            </Box>
        );
    }
);

VehicleView.displayName = 'VehicleView';
