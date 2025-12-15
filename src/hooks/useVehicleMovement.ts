import { useState, useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Mesh } from 'three';
import type { VehicleInstance } from '../stores/useTrafficStore';
import { useTrafficStore, GateState } from '../stores/useTrafficStore';
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

// Gate X position is around -14.
const GATE_X_POS = -14;
const GATE_STOP_DISTANCE = 6; // Stop this far before

export function useVehicleMovement({ data, vehicleHeight, meshRef }: UseVehicleMovementProps) {
    const updateVehicleState = useTrafficStore((s) => s.updateVehicleState);
    const updateVehiclePosition = useTrafficStore((s) => s.updateVehiclePosition);
    const removeVehicle = useTrafficStore((s) => s.removeVehicle);

    // Gate Actions
    const requestGateAccess = useTrafficStore((s) => s.requestGateAccess);
    const notifyPassageComplete = useTrafficStore((s) => s.notifyPassageComplete);
    const gateState = useTrafficStore((s) => s.gateState);
    const currentGateVehicleId = useTrafficStore((s) => s.currentGateVehicleId);

    const [entryWaypointIndex, setEntryWaypointIndex] = useState(1);
    const [exitWaypointIndex, setExitWaypointIndex] = useState(0);
    const [hasParked, setHasParked] = useState(false);
    const [hasExited, setHasExited] = useState(false);

    // Gate Local State
    const [hasPassedGate, setHasPassedGate] = useState(false);

    const frameCount = useRef(0);

    // Initial position
    useEffect(() => {
        if (meshRef.current && !data.isExiting) {
            meshRef.current.position.copy(data.startPosition);
            meshRef.current.position.y = vehicleHeight / 2;
        }
    }, [data.startPosition, vehicleHeight, data.isExiting]);

    // Reset gate passed state when starting exit
    useEffect(() => {
        if (data.isExiting) {
            setHasPassedGate(false);
            setHasParked(false); // Clean up park state just in case
        }
    }, [data.isExiting]);

    // Position sync
    const updatePosition = useCallback(() => {
        frameCount.current++;
        if (frameCount.current % 10 === 0 && meshRef.current) {
            updateVehiclePosition(data.id, meshRef.current.position);
        }
    }, [data.id, updateVehiclePosition]);

    const vehicles = useTrafficStore((s) => s.vehicles); // Need access to all vehicles for collision check

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;
        const currentX = mesh.position.x;
        const currentZ = mesh.position.z;

        // --- COLLISION AVOIDANCE (Natural Queue) ---
        // Only valid if we are on the 'Main Lane' (Approx Z = -5)
        const onMainLane = Math.abs(currentZ - (-5)) < 1.5;
        let blockedByCar = false;

        if (onMainLane) {
            // Find closest car ahead
            let closestDist = 999;

            vehicles.forEach(other => {
                if (other.id === data.id) return;
                // Only avoid vehicles moving in the SAME direction.
                // Mutex logic handles head-on contention at the gate.
                if (other.isExiting !== data.isExiting) return;

                // Simple state check: only care about moving cars or waiting cars
                if (other.state === 'parked' && !other.isExiting) return;

                // We don't have direct access to other mesh positions here without querying store or scene.
                // Store has 'currentPosition' which is updated every 10 frames.
                // This is slightly laggy but acceptable for avoiding overlap (better than nothing).

                const otherX = other.currentPosition.x;
                const otherZ = other.currentPosition.z;

                // Check if other car is on main lane
                if (Math.abs(otherZ - (-5)) < 1.5) {
                    // Check Directionality
                    if (!data.isExiting) {
                        // Entry: Moving +X (-50 -> -5). Car Ahead is X > My X.
                        if (otherX > currentX && otherX < currentX + 8) { // 8m lookahead
                            const dist = otherX - currentX;
                            if (dist < closestDist) closestDist = dist;
                        }
                    } else {
                        // Exit: Moving -X (-5 -> -50). Car Ahead is X < My X.
                        if (otherX < currentX && otherX > currentX - 8) {
                            const dist = currentX - otherX;
                            if (dist < closestDist) closestDist = dist;
                        }
                    }
                }
            });

            if (closestDist < 6.0) { // Stop Distance
                blockedByCar = true;
            }
        }

        if (blockedByCar) {
            return; // Wait for car ahead to move
        }

        // --- GATE CHECK LOGIC ---
        // Determine if we are approaching gate
        let approachingGate = false;
        let distToGate = 999;

        // Entry moves Left -> Right (X increases). Gate at -14. Before is < -14.
        if (!data.isExiting && !hasPassedGate) {
            if (currentX < GATE_X_POS) {
                distToGate = GATE_X_POS - currentX;
                if (distToGate < GATE_STOP_DISTANCE && distToGate > 0) {
                    approachingGate = true;
                }
            } else {
                // Passed Logic
                if (!hasPassedGate) {
                    setHasPassedGate(true);
                    notifyPassageComplete(data.id);
                }
            }
        }

        // Exit moves Right -> Left (X decreases). Gate at -14. Before is > -14.
        if (data.isExiting && !hasPassedGate) {
            if (currentX > GATE_X_POS) {
                distToGate = currentX - GATE_X_POS;
                if (distToGate < GATE_STOP_DISTANCE && distToGate > 0) {
                    approachingGate = true;
                }
            } else {
                if (!hasPassedGate) {
                    setHasPassedGate(true);
                    notifyPassageComplete(data.id);
                }
            }
        }

        // If Approaching Gate, Handle Access
        if (approachingGate) {
            const myTurn = currentGateVehicleId === data.id;

            if (!myTurn) {
                // Request Access if not already waiting?
                // Or just try every frame (throttled)?
                // requestGateAccess returns boolean.
                const granted = requestGateAccess(data.id);
                if (!granted) {
                    // setIsWaitingForGate(true);
                    return; // STOP Here
                }
            }

            // If we have access, check if Gate Open
            if (gateState !== GateState.OPEN) {
                // setIsWaitingForGate(true);
                return; // STOP Here (Wait for animation)
            }

            // setIsWaitingForGate(false);
            // Proceed!
        }

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
