import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Mesh, Vector3 } from 'three';
import type { VehicleInstance } from '../../stores/useTrafficStore';
import { useTrafficStore } from '../../stores/useTrafficStore';
import { VEHICLE_DIMENSIONS } from '../../config/constants';
import {
    moveTowardsTarget,
    PARKING_APPROACH_DISTANCE,
    PARKING_LERP_SPEED
} from '../../utils/vehicleMovementUtils';

interface VehicleBoxProps {
    data: VehicleInstance;
}

export function VehicleBox({ data }: VehicleBoxProps) {
    const meshRef = useRef<Mesh>(null);

    // Store actions
    const updateVehicleState = useTrafficStore((s) => s.updateVehicleState);
    const updateVehiclePosition = useTrafficStore((s) => s.updateVehiclePosition);
    const removeVehicle = useTrafficStore((s) => s.removeVehicle);

    // Vehicle dimensions from centralized config
    const dimensions: [number, number, number] = useMemo(() => {
        const dims = VEHICLE_DIMENSIONS[data.type as keyof typeof VEHICLE_DIMENSIONS]
            || VEHICLE_DIMENSIONS.DEFAULT;
        return [...dims] as [number, number, number];
    }, [data.type]);

    const vehicleHeight = dimensions[1];

    // Entry waypoints - direct path to parking spot
    const entryPath = useMemo(() => {
        return data.waypoints;
    }, [data.waypoints]);

    // Exit waypoints - direct path out
    const exitPath = useMemo(() => {
        if (!data.isExiting || data.exitWaypoints.length === 0) return [];
        return [...data.exitWaypoints];
    }, [data.isExiting, data.exitWaypoints]);

    // Simple state - just track waypoint index and completion
    // Entry starts at index 1 because vehicle spawns at waypoint 0 (spawn point)
    const [entryWaypointIndex, setEntryWaypointIndex] = useState(1);
    const [exitWaypointIndex, setExitWaypointIndex] = useState(0);
    const [hasParked, setHasParked] = useState(false);
    const [hasExited, setHasExited] = useState(false);

    const frameCount = useRef(0);

    // Initialize position at spawn point
    useEffect(() => {
        if (meshRef.current && !data.isExiting) {
            meshRef.current.position.copy(data.startPosition);
            meshRef.current.position.y = vehicleHeight / 2;
        }
    }, [data.startPosition, vehicleHeight, data.isExiting]);

    // Update position in store periodically
    const updatePosition = useCallback(() => {
        frameCount.current++;
        if (frameCount.current % 10 === 0 && meshRef.current) {
            updateVehiclePosition(data.id, meshRef.current.position);
        }
    }, [data.id, updateVehiclePosition]);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;

        // ==================== EXITING VEHICLE ====================
        if (data.isExiting && !hasExited) {
            if (exitWaypointIndex < exitPath.length) {
                const target = exitPath[exitWaypointIndex];
                const arrived = moveTowardsTarget(mesh, target, delta, vehicleHeight);
                if (arrived) {
                    if (exitWaypointIndex >= exitPath.length - 1) {
                        // Reached exit point - remove vehicle
                        setHasExited(true);
                        removeVehicle(data.id);
                        return;
                    } else {
                        setExitWaypointIndex((i) => i + 1);
                    }
                }
                updatePosition();
            }
            return;
        }

        // ==================== ENTERING VEHICLE ====================
        if (hasParked) return;

        // SAFE GUARD: Clamp index to valid range to prevent out-of-bounds errors
        const currentIndex = Math.min(entryWaypointIndex, entryPath.length - 1);
        const target = entryPath[currentIndex];
        const isLastWaypoint = currentIndex >= entryPath.length - 1;

        if (currentIndex < entryPath.length) {
            // SPECIAL LOGIC FOR PARKING APPROACH (LINEAR EASE OUT)
            if (isLastWaypoint) {
                const currentPos = new Vector3(mesh.position.x, 0, mesh.position.z);
                const targetPos = new Vector3(target.x, 0, target.z);
                const distToTarget = currentPos.distanceTo(targetPos);

                // If within approach distance (and we haven't weirdly overshot significantly), use LERP
                if (distToTarget < PARKING_APPROACH_DISTANCE) {
                    // Position Lerp
                    mesh.position.lerp(new Vector3(target.x, vehicleHeight / 2, target.z), delta * PARKING_LERP_SPEED);

                    // Rotation Lerp
                    let angleDiff = data.targetRotation - mesh.rotation.y;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    mesh.rotation.y += angleDiff * delta * PARKING_LERP_SPEED;

                    // Check if close enough to finish
                    const closeEnough = distToTarget < 0.05 && Math.abs(angleDiff) < 0.05;

                    if (closeEnough) {
                        console.log(`[Vehicle ${data.id}] Parked successfully (Smooth)`);

                        // SNAP TO EXACT TARGET
                        mesh.position.copy(data.targetPosition);
                        mesh.position.y = vehicleHeight / 2;
                        mesh.rotation.y = data.targetRotation;

                        setHasParked(true);
                        updateVehicleState(data.id, 'parked');
                    }
                    updatePosition();
                    return; // SKIP STANDARD MOVEMENT
                }
            }

            // STANDARD MOVEMENT FOR OTHER WAYPOINTS OR WHEN FAR AWAY
            const arrived = moveTowardsTarget(mesh, target, delta, vehicleHeight);
            if (arrived) {
                if (isLastWaypoint) {
                    // This block is reached if we arrived via standard movement (e.g. started very close)
                    console.log(`[Vehicle ${data.id}] Parked successfully (Standard)`);

                    mesh.position.copy(data.targetPosition);
                    mesh.position.y = vehicleHeight / 2;
                    mesh.rotation.y = data.targetRotation;

                    setHasParked(true);
                    updateVehicleState(data.id, 'parked');
                } else {
                    // Safe increment
                    setEntryWaypointIndex((i) => Math.min(i + 1, entryPath.length - 1));
                }
            }
            updatePosition();
        } else {
            // Safety: Should be unreachable with the clamp, but kept for absolute fallback
            if (!hasParked && data.state !== 'parked') {
                console.warn(`[Vehicle ${data.id}] Waypoint index out of bounds (Unexpected), forcing park`);

                // SNAP TO TARGET POSITION AND ROTATION
                mesh.position.copy(data.targetPosition);
                mesh.position.y = vehicleHeight / 2;
                mesh.rotation.y = data.targetRotation;

                setHasParked(true);
                updateVehicleState(data.id, 'parked');
            }
        }
    });

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
