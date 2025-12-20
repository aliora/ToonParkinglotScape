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
const GATE_STOP_DISTANCE = 7.5; // Stop this far before

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

    const gateWaitTimer = useRef(0);
    const collisionWaitTimer = useRef(0);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const mesh = meshRef.current;
        const currentPos = mesh.position;

        // ---------------------------------------------------------
        // 1. COLLISION CHECK (Physical Queueing)
        // ---------------------------------------------------------

        let blockedByCar = false;

        const isEntry = !data.isExiting;
        const myLaneZ = isEntry ? ENTRY_LANE_Z : EXIT_LANE_Z;

        const onMainLane = Math.abs(currentPos.z - myLaneZ) < 1.0;

        if (onMainLane) {
            let closestDist = 999;

            vehicles.forEach(other => {
                if (other.id === data.id) return;
                if (other.isExiting !== data.isExiting) return;
                if (other.state === 'parked') return;

                const otherPos = other.currentPosition;

                if (Math.abs(otherPos.z - myLaneZ) > 1.5) return;

                if (isEntry) {
                    if (otherPos.x > currentPos.x && otherPos.x < currentPos.x + 8) {
                        const d = otherPos.x - currentPos.x;
                        if (d < closestDist) closestDist = d;
                    }
                } else {
                    if (otherPos.x < currentPos.x && otherPos.x > currentPos.x - 8) {
                        const d = currentPos.x - otherPos.x;
                        if (d < closestDist) closestDist = d;
                    }
                }
            });

            if (closestDist < 5.5) {
                blockedByCar = true;
            }
        }

        if (blockedByCar) {
            collisionWaitTimer.current += delta;
            if (collisionWaitTimer.current > 25.0) {
                console.warn(`[Vehicle ${data.id}] Blocked > 25s. FORCING MOVE (Ignoring Collision)`);
                collisionWaitTimer.current = 0;
                // Proceed even if blocked to clear jam
            } else {
                return; // Stop moving
            }
        } else {
            collisionWaitTimer.current = 0;
        }

        // ---------------------------------------------------------
        // 2. GATE LOGIC
        // ---------------------------------------------------------

        if (!hasPassedGate) {
            let approaching = false;
            let distToGate = 999;

            if (isEntry) {
                if (currentPos.x < GATE_X_POS) {
                    distToGate = GATE_X_POS - currentPos.x;
                    if (distToGate < GATE_STOP_DISTANCE) approaching = true;
                } else {
                    if (!hasPassedGate) {
                        setHasPassedGate(true);
                        notifyEntryPassageComplete(data.id);
                    }
                }
            } else {
                if (currentPos.x > GATE_X_POS) {
                    distToGate = currentPos.x - GATE_X_POS;
                    if (distToGate < GATE_STOP_DISTANCE) approaching = true;
                } else {
                    if (!hasPassedGate) {
                        setHasPassedGate(true);
                        notifyExitPassageComplete(data.id);
                    }
                }
            }

            if (approaching) {
                let canProceed = false;

                if (isEntry) {
                    const myTurn = currentEntryGateVehicleId === data.id;
                    if (!myTurn) {
                        const granted = requestEntryGateAccess(data.id);
                        if (!granted) {
                            gateWaitTimer.current += delta;
                            if (gateWaitTimer.current > 25.0) {
                                console.warn(`[Vehicle ${data.id}] Stuck requesting ENTRY > 25s. Retrying...`);
                                requestEntryGateAccess(data.id);
                                gateWaitTimer.current = 0;
                            }
                            return;
                        }
                    }
                    if (entryGateState === GateState.OPEN) canProceed = true;
                    else {
                        gateWaitTimer.current += delta;
                        if (gateWaitTimer.current > 25.0) {
                            console.warn(`[Vehicle ${data.id}] Waiting for ENTRY OPEN > 25s. Retrying...`);
                            requestEntryGateAccess(data.id);
                            gateWaitTimer.current = 0;
                        }
                        if (!canProceed) return;
                    }

                } else {
                    const myTurn = currentExitGateVehicleId === data.id;
                    if (!myTurn) {
                        const granted = requestExitGateAccess(data.id);
                        if (!granted) {
                            gateWaitTimer.current += delta;
                            if (gateWaitTimer.current > 25.0) {
                                console.warn(`[Vehicle ${data.id}] Stuck requesting EXIT > 25s. Retrying...`);
                                requestExitGateAccess(data.id);
                                gateWaitTimer.current = 0;
                            }
                            return;
                        }
                    }
                    if (exitGateState === GateState.OPEN) canProceed = true;
                    else {
                        gateWaitTimer.current += delta;
                        if (gateWaitTimer.current > 25.0) {
                            console.warn(`[Vehicle ${data.id}] Waiting for EXIT OPEN > 25s. Retrying...`);
                            requestExitGateAccess(data.id);
                            gateWaitTimer.current = 0;
                        }
                        if (!canProceed) return;
                    }
                }

                gateWaitTimer.current = 0; // Proceeding
            } else {
                gateWaitTimer.current = 0;
            }
        }

        // ---------------------------------------------------------
        // 3. MOVEMENT EXECUTION
        // ---------------------------------------------------------

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

        if (hasParked) return;

        const entryPath = data.waypoints;
        const currentIndex = Math.min(entryWaypointIndex, entryPath.length - 1);
        const target = entryPath[currentIndex];
        const isLastWaypoint = currentIndex >= entryPath.length - 1;

        if (currentIndex < entryPath.length) {
            if (isLastWaypoint) {
                const targetPos = new Vector3(target.x, 0, target.z);
                const distToTarget = new Vector3(mesh.position.x, 0, mesh.position.z).distanceTo(targetPos);

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
