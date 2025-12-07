import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Mesh, Vector3 } from 'three';
import type { VehicleInstance } from '../../stores/useTrafficStore';
import { useTrafficStore, QUEUE_POSITIONS } from '../../stores/useTrafficStore';

interface VehicleBoxProps {
    data: VehicleInstance;
}

const MOVE_SPEED = 10;
const ROTATION_SPEED = 4;
const ARRIVAL_THRESHOLD = 0.3;
const MOVEMENT_DELAY = 500;

export function VehicleBox({ data }: VehicleBoxProps) {
    const meshRef = useRef<Mesh>(null);
    const updateVehicleState = useTrafficStore((state) => state.updateVehicleState);
    const updateVehiclePosition = useTrafficStore((state) => state.updateVehiclePosition);
    const setVehicleWaiting = useTrafficStore((state) => state.setVehicleWaiting);

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

    const path = useMemo(() => {
        return [data.startPosition.clone(), ...data.waypoints];
    }, [data.startPosition, data.waypoints]);

    const [currentPointIndex, setCurrentPointIndex] = useState(1);
    const [hasArrived, setHasArrived] = useState(false);
    const [isDelayedStart, setIsDelayedStart] = useState(false);
    const frameCountRef = useRef(0);
    const delayTimerRef = useRef<number | null>(null);

    // Initialize position at spawn point
    useEffect(() => {
        if (meshRef.current && path.length > 0) {
            meshRef.current.position.copy(path[0]);
            meshRef.current.position.y = vehicleHeight / 2;
            if (path.length > 1) {
                const direction = new Vector3().subVectors(path[1], path[0]).normalize();
                const angle = Math.atan2(direction.x, direction.z);
                meshRef.current.rotation.y = angle;
            }
        }
    }, [path, vehicleHeight]);

    // Handle delayed start after barrier opens
    useEffect(() => {
        if (data.canPassBarrier && !isDelayedStart) {
            delayTimerRef.current = window.setTimeout(() => {
                setIsDelayedStart(true);
            }, MOVEMENT_DELAY);
        }
        return () => {
            if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
        };
    }, [data.canPassBarrier, isDelayedStart]);

    useFrame((_, delta) => {
        if (!meshRef.current || hasArrived || path.length === 0) return;

        const mesh = meshRef.current;

        // Get target queue position
        const queuePos = data.queuePosition;
        const targetQueuePoint = queuePos >= 1 && queuePos <= 3
            ? QUEUE_POSITIONS[queuePos - 1]
            : null;

        // If in queue (position 1-3) and not passed barrier yet
        if (targetQueuePoint && !data.canPassBarrier) {
            const distToQueue = new Vector3(mesh.position.x, 0, mesh.position.z)
                .distanceTo(new Vector3(targetQueuePoint.x, 0, targetQueuePoint.z));

            // Move towards queue position
            if (distToQueue > ARRIVAL_THRESHOLD) {
                const direction = new Vector3()
                    .subVectors(targetQueuePoint, mesh.position)
                    .setY(0)
                    .normalize();

                // Rotate
                if (direction.lengthSq() > 0.001) {
                    const targetAngle = Math.atan2(direction.x, direction.z);
                    let angleDiff = targetAngle - mesh.rotation.y;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    mesh.rotation.y += angleDiff * ROTATION_SPEED * delta;
                }

                // Move
                const moveDistance = Math.min(MOVE_SPEED * delta, distToQueue);
                mesh.position.x += direction.x * moveDistance;
                mesh.position.z += direction.z * moveDistance;
                mesh.position.y = vehicleHeight / 2;
            } else {
                // Arrived at queue position, mark as waiting if position 1
                if (queuePos === 1 && !data.isWaitingAtBarrier) {
                    setVehicleWaiting(data.id, true);
                }
            }

            // Report position
            frameCountRef.current++;
            if (frameCountRef.current % 10 === 0) {
                updateVehiclePosition(data.id, mesh.position);
            }
            return;
        }

        // If barrier opened but delay not complete, wait
        if (data.canPassBarrier && !isDelayedStart) {
            frameCountRef.current++;
            if (frameCountRef.current % 10 === 0) {
                updateVehiclePosition(data.id, mesh.position);
            }
            return;
        }

        // Normal navigation to parking spot
        const targetPoint = path[currentPointIndex];

        if (!targetPoint) {
            setHasArrived(true);
            updateVehicleState(data.id, 'parked');
            return;
        }

        const currentPos = new Vector3(mesh.position.x, 0, mesh.position.z);
        const targetPos = new Vector3(targetPoint.x, 0, targetPoint.z);
        const direction = new Vector3().subVectors(targetPos, currentPos);
        const distance = direction.length();
        direction.normalize();

        if (distance < ARRIVAL_THRESHOLD) {
            mesh.position.x = targetPoint.x;
            mesh.position.z = targetPoint.z;
            mesh.position.y = vehicleHeight / 2;

            if (currentPointIndex < path.length - 1) {
                setCurrentPointIndex((prev) => prev + 1);
            } else {
                setHasArrived(true);
                updateVehicleState(data.id, 'parked');
            }
            return;
        }

        if (direction.lengthSq() > 0.001) {
            const targetAngle = Math.atan2(direction.x, direction.z);
            let angleDiff = targetAngle - mesh.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            mesh.rotation.y += angleDiff * ROTATION_SPEED * delta;
        }

        const moveDistance = Math.min(MOVE_SPEED * delta, distance);
        mesh.position.x += direction.x * moveDistance;
        mesh.position.z += direction.z * moveDistance;
        mesh.position.y = vehicleHeight / 2;

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
