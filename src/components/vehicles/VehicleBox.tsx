import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Mesh, Vector3 } from 'three';
import type { VehicleInstance } from '../../stores/useTrafficStore';
import { useTrafficStore } from '../../stores/useTrafficStore';

interface VehicleBoxProps {
    data: VehicleInstance;
}

const MOVE_SPEED = 10;
const ROTATION_SPEED = 4;
const ARRIVAL_THRESHOLD = 0.3;

export function VehicleBox({ data }: VehicleBoxProps) {
    const meshRef = useRef<Mesh>(null);
    const updateVehicleState = useTrafficStore((state) => state.updateVehicleState);
    const updateVehiclePosition = useTrafficStore((state) => state.updateVehiclePosition);

    // Box dimensions based on vehicle type - MUST BE DEFINED BEFORE useFrame
    const dimensions: [number, number, number] = useMemo(() => {
        switch (data.type) {
            case 1: // CAR
                return [2, 1, 4];
            case 2: // MINIBUS
                return [2.2, 1.5, 5];
            case 3: // BUS
                return [2.5, 2, 8];
            case 4: // PICKUP
                return [2, 1.2, 4.5];
            case 5: // TRUCK
                return [2.5, 1.8, 6];
            case 6: // HEAVYTRUCK
                return [3, 2.5, 10];
            case 7: // MOTORCYCLE
                return [0.8, 1, 2];
            default:
                return [2, 1, 4];
        }
    }, [data.type]);

    const vehicleHeight = dimensions[1];

    // Use waypoints from vehicle data
    const path = useMemo(() => {
        // Start with spawn position, then follow waypoints
        return [data.startPosition.clone(), ...data.waypoints];
    }, [data.startPosition, data.waypoints]);

    const [currentPointIndex, setCurrentPointIndex] = useState(1); // Start at first waypoint
    const [hasArrived, setHasArrived] = useState(false);
    const frameCountRef = useRef(0);

    // Initialize position at spawn point
    useEffect(() => {
        if (meshRef.current && path.length > 0) {
            meshRef.current.position.copy(path[0]);
            meshRef.current.position.y = vehicleHeight / 2;
            // Face initial direction
            if (path.length > 1) {
                const direction = new Vector3().subVectors(path[1], path[0]).normalize();
                const angle = Math.atan2(direction.x, direction.z);
                meshRef.current.rotation.y = angle;
            }
        }
    }, [path, vehicleHeight]);

    useFrame((_, delta) => {
        if (!meshRef.current || hasArrived || path.length === 0) return;

        const mesh = meshRef.current;
        const targetPoint = path[currentPointIndex];

        if (!targetPoint) {
            setHasArrived(true);
            updateVehicleState(data.id, 'parked');
            return;
        }

        // Calculate direction to target (XZ plane only)
        const currentPos = new Vector3(mesh.position.x, 0, mesh.position.z);
        const targetPos = new Vector3(targetPoint.x, 0, targetPoint.z);
        const direction = new Vector3().subVectors(targetPos, currentPos);
        const distance = direction.length();
        direction.normalize();

        // Check if reached current waypoint
        if (distance < ARRIVAL_THRESHOLD) {
            mesh.position.x = targetPoint.x;
            mesh.position.z = targetPoint.z;
            mesh.position.y = vehicleHeight / 2;

            if (currentPointIndex < path.length - 1) {
                setCurrentPointIndex((prev) => prev + 1);
            } else {
                // Arrived at final destination
                setHasArrived(true);
                updateVehicleState(data.id, 'parked');
            }
            return;
        }

        // Rotate towards target (Y-axis rotation only)
        if (direction.lengthSq() > 0.001) {
            const targetAngle = Math.atan2(direction.x, direction.z);
            const currentRotation = mesh.rotation.y;

            // Normalize angle difference
            let angleDiff = targetAngle - currentRotation;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Smoothly rotate
            mesh.rotation.y += angleDiff * ROTATION_SPEED * delta;
        }

        // Move forward
        const moveDistance = Math.min(MOVE_SPEED * delta, distance);
        mesh.position.x += direction.x * moveDistance;
        mesh.position.z += direction.z * moveDistance;
        mesh.position.y = vehicleHeight / 2;

        // Report position to store every 10 frames for barrier detection
        frameCountRef.current++;
        if (frameCountRef.current % 10 === 0) {
            updateVehiclePosition(data.id, mesh.position);
        }
    });

    return (
        <Box
            ref={meshRef}
            args={dimensions}
            position={[data.startPosition.x, vehicleHeight / 2, data.startPosition.z]}
            castShadow
        >
            <meshStandardMaterial color={data.color} />
        </Box>
    );
}

export default VehicleBox;
