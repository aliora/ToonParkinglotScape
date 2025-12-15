import { useState, useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Mesh } from 'three';
import type { VehicleInstance } from '../stores/useTrafficStore';
import { useTrafficStore } from '../stores/useTrafficStore';
import {
    moveTowardsTarget,
    PARKING_APPROACH_DISTANCE,
    PARKING_LERP_SPEED
} from '../utils/vehicleMovementUtils';

interface UseVehicleMovementProps {
    data: VehicleInstance;
    vehicleHeight: number;
    meshRef: React.RefObject<Mesh | null>;
}

export function useVehicleMovement({ data, vehicleHeight, meshRef }: UseVehicleMovementProps) {
    const updateVehicleState = useTrafficStore((s) => s.updateVehicleState);
    const updateVehiclePosition = useTrafficStore((s) => s.updateVehiclePosition);
    const removeVehicle = useTrafficStore((s) => s.removeVehicle);

    const [entryWaypointIndex, setEntryWaypointIndex] = useState(1);
    const [exitWaypointIndex, setExitWaypointIndex] = useState(0);
    const [hasParked, setHasParked] = useState(false);
    const [hasExited, setHasExited] = useState(false);
    const frameCount = useRef(0);

    // Initial position
    useEffect(() => {
        if (meshRef.current && !data.isExiting) {
            meshRef.current.position.copy(data.startPosition);
            meshRef.current.position.y = vehicleHeight / 2;
        }
    }, [data.startPosition, vehicleHeight, data.isExiting]);

    // Position sync
    const updatePosition = useCallback(() => {
        frameCount.current++;
        if (frameCount.current % 10 === 0 && meshRef.current) {
            updateVehiclePosition(data.id, meshRef.current.position);
        }
    }, [data.id, updateVehiclePosition]);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;

        // ==================== EXITING ====================
        if (data.isExiting && !hasExited) {
            const exitPath = data.exitWaypoints;
            if (exitWaypointIndex < exitPath.length) {
                const target = exitPath[exitWaypointIndex];
                const arrived = moveTowardsTarget(mesh, target, delta, vehicleHeight);
                if (arrived) {
                    if (exitWaypointIndex >= exitPath.length - 1) {
                        setHasExited(true);
                        removeVehicle(data.id);
                        return;
                    } else {
                        setExitWaypointIndex(i => i + 1);
                    }
                }
                updatePosition();
            }
            return;
        }

        // ==================== ENTERING ====================
        if (hasParked) return;

        const entryPath = data.waypoints;
        const currentIndex = Math.min(entryWaypointIndex, entryPath.length - 1);
        const target = entryPath[currentIndex];
        const isLastWaypoint = currentIndex >= entryPath.length - 1;

        if (currentIndex < entryPath.length) {
            // Smooth Parking Logic
            if (isLastWaypoint) {
                const currentPos = new Vector3(mesh.position.x, 0, mesh.position.z);
                const targetPos = new Vector3(target.x, 0, target.z);
                const distToTarget = currentPos.distanceTo(targetPos);

                if (distToTarget < PARKING_APPROACH_DISTANCE) {
                    mesh.position.lerp(new Vector3(target.x, vehicleHeight / 2, target.z), delta * PARKING_LERP_SPEED);

                    let angleDiff = data.targetRotation - mesh.rotation.y;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    mesh.rotation.y += angleDiff * delta * PARKING_LERP_SPEED;

                    const closeEnough = distToTarget < 0.05 && Math.abs(angleDiff) < 0.05;

                    if (closeEnough) {
                        console.log(`[Vehicle ${data.id}] Parked successfully (Smooth)`);
                        mesh.position.copy(data.targetPosition);
                        mesh.position.y = vehicleHeight / 2;
                        mesh.rotation.y = data.targetRotation;
                        setHasParked(true);
                        updateVehicleState(data.id, 'parked');
                    }
                    updatePosition();
                    return;
                }
            }

            // Standard Logic
            const arrived = moveTowardsTarget(mesh, target, delta, vehicleHeight);
            if (arrived) {
                if (isLastWaypoint) {
                    console.log(`[Vehicle ${data.id}] Parked successfully (Standard)`);
                    mesh.position.copy(data.targetPosition);
                    mesh.position.y = vehicleHeight / 2;
                    mesh.rotation.y = data.targetRotation;
                    setHasParked(true);
                    updateVehicleState(data.id, 'parked');
                } else {
                    setEntryWaypointIndex(i => Math.min(i + 1, entryPath.length - 1));
                }
            }
            updatePosition();
        } else {
            // Safety fallback
            if (!hasParked && data.state !== 'parked') {
                console.warn(`[Vehicle ${data.id}] Waypoint index out of bounds, forcing park`);
                mesh.position.copy(data.targetPosition);
                mesh.position.y = vehicleHeight / 2;
                mesh.rotation.y = data.targetRotation;
                setHasParked(true);
                updateVehicleState(data.id, 'parked');
            }
        }
    });

    return { hasParked, hasExited };
}
