import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Mesh, Vector3 } from 'three';
import type { VehicleInstance } from '../../stores/useTrafficStore';
import { useTrafficStore, QUEUE_POSITIONS, EXIT_QUEUE_POSITIONS } from '../../stores/useTrafficStore';

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
    const removeVehicle = useTrafficStore((state) => state.removeVehicle);

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

    // Entry path or exit path based on isExiting
    const path = useMemo(() => {
        if (data.isExiting) {
            // Exit path starts from current position to waypoints
            return data.waypoints;
        }
        return [data.startPosition.clone(), ...data.waypoints];
    }, [data.startPosition, data.waypoints, data.isExiting]);

    const [currentPointIndex, setCurrentPointIndex] = useState(data.isExiting ? 0 : 1);
    const [hasArrived, setHasArrived] = useState(false);
    const [isDelayedStart, setIsDelayedStart] = useState(false);
    const [hasExited, setHasExited] = useState(false);
    const frameCountRef = useRef(0);
    const delayTimerRef = useRef<number | null>(null);

    // Reset state when isExiting changes
    useEffect(() => {
        if (data.isExiting) {
            setCurrentPointIndex(0);
            setHasArrived(false);
            setIsDelayedStart(false);
        }
    }, [data.isExiting]);

    // Reset state when exitQueuePosition changes (vehicle moving to new position)
    const prevExitPosRef = useRef(data.exitQueuePosition);
    useEffect(() => {
        if (data.isExiting && data.exitQueuePosition !== prevExitPosRef.current) {
            // Position changed, reset navigation
            setCurrentPointIndex(0);
            prevExitPosRef.current = data.exitQueuePosition;
        }
    }, [data.isExiting, data.exitQueuePosition]);

    // Initialize position at spawn point (only for entering vehicles)
    useEffect(() => {
        if (meshRef.current && path.length > 0 && !data.isExiting) {
            meshRef.current.position.copy(path[0]);
            meshRef.current.position.y = vehicleHeight / 2;
            if (path.length > 1) {
                const direction = new Vector3().subVectors(path[1], path[0]).normalize();
                const angle = Math.atan2(direction.x, direction.z);
                meshRef.current.rotation.y = angle;
            }
        }
    }, [path, vehicleHeight, data.isExiting]);

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
        if (!meshRef.current || hasExited) return;

        const mesh = meshRef.current;

        // Handle EXITING vehicle
        if (data.isExiting) {
            // Get exit queue target (positions 1-5)
            const exitPos = data.exitQueuePosition;
            const exitQueueData = exitPos >= 1 && exitPos <= 5
                ? EXIT_QUEUE_POSITIONS[exitPos - 1]
                : null;
            const targetExitPoint = exitQueueData?.pos || null;
            const targetExitRotation = exitQueueData?.rotation || 0;

            // If waiting for exit barrier pass and not granted yet
            if (targetExitPoint && !data.canPassBarrier) {
                // Navigate to exit queue position
                if (path.length > 0 && currentPointIndex < path.length) {
                    const currentTarget = path[currentPointIndex];
                    const distToCurrent = new Vector3(mesh.position.x, 0, mesh.position.z)
                        .distanceTo(new Vector3(currentTarget.x, 0, currentTarget.z));

                    if (distToCurrent < ARRIVAL_THRESHOLD) {
                        if (currentPointIndex < path.length - 1) {
                            setCurrentPointIndex((prev) => prev + 1);
                        } else {
                            // Arrived at exit queue position - apply target rotation
                            let angleDiff = targetExitRotation - mesh.rotation.y;
                            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                            if (Math.abs(angleDiff) > 0.05) {
                                mesh.rotation.y += angleDiff * ROTATION_SPEED * delta;
                            } else {
                                mesh.rotation.y = targetExitRotation;
                                // Positions 1, 3, 5 can wait at barrier
                                if ((exitPos === 1 || exitPos === 3 || exitPos === 5) && !data.isWaitingAtBarrier) {
                                    setVehicleWaiting(data.id, true);
                                }
                            }
                        }
                    } else {
                        const direction = new Vector3()
                            .subVectors(currentTarget, mesh.position)
                            .setY(0)
                            .normalize();

                        if (direction.lengthSq() > 0.001) {
                            const targetAngle = Math.atan2(direction.x, direction.z);
                            let angleDiff = targetAngle - mesh.rotation.y;
                            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                            mesh.rotation.y += angleDiff * ROTATION_SPEED * delta;
                        }

                        const moveDistance = Math.min(MOVE_SPEED * delta, distToCurrent);
                        mesh.position.x += direction.x * moveDistance;
                        mesh.position.z += direction.z * moveDistance;
                        mesh.position.y = vehicleHeight / 2;
                    }
                }

                frameCountRef.current++;
                if (frameCountRef.current % 10 === 0) {
                    updateVehiclePosition(data.id, mesh.position);
                }
                return;
            }

            // Exit barrier pass granted - move to exit
            if (data.canPassBarrier) {
                if (!isDelayedStart) {
                    frameCountRef.current++;
                    if (frameCountRef.current % 10 === 0) {
                        updateVehiclePosition(data.id, mesh.position);
                    }
                    return;
                }

                // Move towards exit point
                const exitTarget = path[path.length - 1] || new Vector3(-45, 0, 0);
                const distToExit = new Vector3(mesh.position.x, 0, mesh.position.z)
                    .distanceTo(new Vector3(exitTarget.x, 0, exitTarget.z));

                if (distToExit < ARRIVAL_THRESHOLD) {
                    // Vehicle has exited
                    setHasExited(true);
                    removeVehicle(data.id);
                    return;
                }

                const direction = new Vector3()
                    .subVectors(exitTarget, mesh.position)
                    .setY(0)
                    .normalize();

                if (direction.lengthSq() > 0.001) {
                    const targetAngle = Math.atan2(direction.x, direction.z);
                    let angleDiff = targetAngle - mesh.rotation.y;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    mesh.rotation.y += angleDiff * ROTATION_SPEED * delta;
                }

                const moveDistance = Math.min(MOVE_SPEED * delta, distToExit);
                mesh.position.x += direction.x * moveDistance;
                mesh.position.z += direction.z * moveDistance;
                mesh.position.y = vehicleHeight / 2;

                frameCountRef.current++;
                if (frameCountRef.current % 10 === 0) {
                    updateVehiclePosition(data.id, mesh.position);
                }
                return;
            }
        }

        // Handle ENTERING vehicle (existing logic)
        if (hasArrived || path.length === 0) return;

        // Entry queue logic
        const queuePos = data.queuePosition;
        const targetQueuePoint = queuePos >= 1 && queuePos <= 3
            ? QUEUE_POSITIONS[queuePos - 1]
            : null;

        if (targetQueuePoint && !data.canPassBarrier) {
            const distToQueue = new Vector3(mesh.position.x, 0, mesh.position.z)
                .distanceTo(new Vector3(targetQueuePoint.x, 0, targetQueuePoint.z));

            if (distToQueue > ARRIVAL_THRESHOLD) {
                const direction = new Vector3()
                    .subVectors(targetQueuePoint, mesh.position)
                    .setY(0)
                    .normalize();

                if (direction.lengthSq() > 0.001) {
                    const targetAngle = Math.atan2(direction.x, direction.z);
                    let angleDiff = targetAngle - mesh.rotation.y;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    mesh.rotation.y += angleDiff * ROTATION_SPEED * delta;
                }

                const moveDistance = Math.min(MOVE_SPEED * delta, distToQueue);
                mesh.position.x += direction.x * moveDistance;
                mesh.position.z += direction.z * moveDistance;
                mesh.position.y = vehicleHeight / 2;
            } else {
                if (queuePos === 1 && !data.isWaitingAtBarrier) {
                    setVehicleWaiting(data.id, true);
                }
            }

            frameCountRef.current++;
            if (frameCountRef.current % 10 === 0) {
                updateVehiclePosition(data.id, mesh.position);
            }
            return;
        }

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

    if (hasExited) return null;

    return (
        <Box
            ref={meshRef}
            args={dimensions}
            position={[data.currentPosition.x, vehicleHeight / 2, data.currentPosition.z]}
            castShadow
        >
            <meshStandardMaterial color={data.color} />
        </Box>
    );
}

export default VehicleBox;
