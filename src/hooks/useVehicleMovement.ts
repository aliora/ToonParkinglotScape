import { useState, useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Mesh, Group } from 'three';
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
    meshRef: React.RefObject<Group | Mesh | null>;
}

import { TRAFFIC_CONFIG } from '../config/constants';

// Gate X position is around -14. (Should ideally come from config, but keeping it local for now if matches config)
// Or use TRAFFIC_CONFIG.BARRIER_X if available
const GATE_X_POS = TRAFFIC_CONFIG.BARRIER_X;
const GATE_STOP_DISTANCE = 6; // Stop this far before

// Lane Configuration (Swapped)
const ENTRY_LANE_Z = -TRAFFIC_CONFIG.LANE_OFFSET;
const EXIT_LANE_Z = TRAFFIC_CONFIG.LANE_OFFSET;

export function useVehicleMovement({ data, vehicleHeight, meshRef }: UseVehicleMovementProps) {
    const updateVehicleState = useTrafficStore((s) => s.updateVehicleState);
    const updateVehiclePosition = useTrafficStore((s) => s.updateVehiclePosition);
    const removeVehicle = useTrafficStore((s) => s.removeVehicle);

    // Gate Actions - ENTRY
    const requestEntryGateAccess = useTrafficStore((s) => s.requestEntryGateAccess);
    const notifyEntryPassageComplete = useTrafficStore((s) => s.notifyEntryPassageComplete);
    const entryGateState = useTrafficStore((s) => s.entryGateState);
    const currentEntryGateVehicleId = useTrafficStore((s) => s.currentEntryGateVehicleId);

    // Gate Actions - EXIT
    const requestExitGateAccess = useTrafficStore((s) => s.requestExitGateAccess);
    const notifyExitPassageComplete = useTrafficStore((s) => s.notifyExitPassageComplete);
    const exitGateState = useTrafficStore((s) => s.exitGateState);
    const currentExitGateVehicleId = useTrafficStore((s) => s.currentExitGateVehicleId);

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

    const vehicles = useTrafficStore((s) => s.vehicles);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;
        const currentX = mesh.position.x;
        const currentZ = mesh.position.z;

        // --- COLLISION AVOIDANCE (Natural Queue) ---
        // Determine current lane Z based on direction
        const myLaneZ = data.isExiting ? EXIT_LANE_Z : ENTRY_LANE_Z;
        const onMainLane = Math.abs(currentZ - myLaneZ) < 1.5;
        let blockedByCar = false;

        if (onMainLane) {
            // Find closest car ahead
            let closestDist = 999;

            vehicles.forEach(other => {
                if (other.id === data.id) return;
                // Only avoid vehicles moving in the SAME direction.
                if (other.isExiting !== data.isExiting) return;

                // Simple state check: only care about moving cars or waiting cars
                if (other.state === 'parked' && !other.isExiting) return;

                const otherX = other.currentPosition.x;
                const otherZ = other.currentPosition.z;

                // Check if other car is on SAME lane
                if (Math.abs(otherZ - myLaneZ) < 1.5) {
                    // Check Directionality
                    if (!data.isExiting) {
                        // Entry: Moving +X (-50 -> -5). Car Ahead is X > My X.
                        if (otherX > currentX && otherX < currentX + 8) {
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
                if (!hasPassedGate) {
                    setHasPassedGate(true);
                    notifyEntryPassageComplete(data.id);
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
                    notifyExitPassageComplete(data.id);
                }
            }
        }

        // If Approaching Gate, Handle Access
        if (approachingGate) {
            if (!data.isExiting) {
                // --- ENTRY GATE LOGIC ---
                const myTurn = currentEntryGateVehicleId === data.id;
                if (!myTurn) {
                    const granted = requestEntryGateAccess(data.id);
                    if (!granted) return; // STOP
                }
                if (entryGateState !== GateState.OPEN) return; // STOP

            } else {
                // --- EXIT GATE LOGIC ---
                const myTurn = currentExitGateVehicleId === data.id;
                if (!myTurn) {
                    const granted = requestExitGateAccess(data.id);
                    if (!granted) return; // STOP
                }
                if (exitGateState !== GateState.OPEN) return; // STOP
            }

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
            // Smooth Parking Loigc
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
