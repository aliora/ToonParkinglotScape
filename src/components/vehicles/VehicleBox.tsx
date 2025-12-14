import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Mesh, Vector3 } from 'three';
import type { VehicleInstance } from '../../stores/useTrafficStore';
import { useTrafficStore, QUEUE_POSITIONS, EXIT_QUEUE_POSITIONS } from '../../stores/useTrafficStore';

interface VehicleBoxProps {
    data: VehicleInstance;
}

// Constants
const MOVE_SPEED = 10;
const ROTATION_SPEED = 4;
const ARRIVAL_THRESHOLD = 0.5;
const MOVEMENT_DELAY = 500;
const BARRIER_CENTER_Z = 0;
const BARRIER_X = -14;

// Helper: Move mesh towards target, returns true if arrived
function moveTowardsTarget(
    mesh: Mesh,
    target: Vector3,
    delta: number,
    vehicleHeight: number
): boolean {
    const currentPos = new Vector3(mesh.position.x, 0, mesh.position.z);
    const targetPos = new Vector3(target.x, 0, target.z);
    const direction = new Vector3().subVectors(targetPos, currentPos);
    const distance = direction.length();

    if (distance < ARRIVAL_THRESHOLD) {
        mesh.position.x = target.x;
        mesh.position.z = target.z;
        mesh.position.y = vehicleHeight / 2;
        return true;
    }

    direction.normalize();

    // Rotate towards target
    if (direction.lengthSq() > 0.001) {
        const targetAngle = Math.atan2(direction.x, direction.z);
        let angleDiff = targetAngle - mesh.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        mesh.rotation.y += angleDiff * ROTATION_SPEED * delta;
    }

    // Move towards target
    const moveDistance = Math.min(MOVE_SPEED * delta, distance);
    mesh.position.x += direction.x * moveDistance;
    mesh.position.z += direction.z * moveDistance;
    mesh.position.y = vehicleHeight / 2;

    return false;
}

export function VehicleBox({ data }: VehicleBoxProps) {
    const meshRef = useRef<Mesh>(null);

    // Store actions
    const updateVehicleState = useTrafficStore((s) => s.updateVehicleState);
    const updateVehiclePosition = useTrafficStore((s) => s.updateVehiclePosition);
    const setVehicleWaiting = useTrafficStore((s) => s.setVehicleWaiting);
    const notifyVehicleArrivedAtQueuePosition = useTrafficStore((s) => s.notifyVehicleArrivedAtQueuePosition);
    const removeVehicle = useTrafficStore((s) => s.removeVehicle);
    const setVehicleExitWaiting = useTrafficStore((s) => s.setVehicleExitWaiting);
    const notifyVehicleArrivedAtExitQueuePosition = useTrafficStore((s) => s.notifyVehicleArrivedAtExitQueuePosition);

    // Vehicle dimensions
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

    // Paths - Use waypoints directly
    // Waypoints structure: [0]=ENTRY_POINT, [1]=junction(z=-5), [2]=junction(laneZ), [3]=laneApproach, [4]=spotApproach, [5]=spot
    // After passing barrier and reaching center (z=0), we skip waypoints 0 and 1
    const entryPath = useMemo(() => {
        return data.waypoints;
    }, [data.waypoints]);

    const exitPath = useMemo(() => {
        if (!data.isExiting || data.exitWaypoints.length === 0) return [];
        return [...data.exitWaypoints];
    }, [data.isExiting, data.exitWaypoints]);

    // State - entryWaypointIndex starts at 2 (skip ENTRY_POINT and first junction - we're at center z=0)
    const [entryWaypointIndex, setEntryWaypointIndex] = useState(2);
    const [exitWaypointIndex, setExitWaypointIndex] = useState(0);
    const [hasParked, setHasParked] = useState(false);
    const [hasExited, setHasExited] = useState(false);

    // Barrier pass delays
    const [entryDelayDone, setEntryDelayDone] = useState(false);
    const [exitDelayDone, setExitDelayDone] = useState(false);

    // Center alignment for barrier crossing
    const [entryAtCenter, setEntryAtCenter] = useState(false);
    const [exitAtCenter, setExitAtCenter] = useState(false);

    // Arrival notification tracking
    const hasNotifiedEntryArrival = useRef(false);
    const hasNotifiedExitArrival = useRef(false);
    const prevEntryQueuePos = useRef(data.queuePosition);
    const prevExitQueuePos = useRef(data.exitQueuePosition);
    const frameCount = useRef(0);

    // Reset arrival notification when queue position changes
    useEffect(() => {
        if (data.queuePosition !== prevEntryQueuePos.current) {
            hasNotifiedEntryArrival.current = false;
            prevEntryQueuePos.current = data.queuePosition;
        }
    }, [data.queuePosition]);

    useEffect(() => {
        if (data.exitQueuePosition !== prevExitQueuePos.current) {
            hasNotifiedExitArrival.current = false;
            prevExitQueuePos.current = data.exitQueuePosition;
        }
    }, [data.exitQueuePosition]);

    // Initialize position at spawn point
    useEffect(() => {
        if (meshRef.current && !data.isExiting) {
            meshRef.current.position.copy(data.startPosition);
            meshRef.current.position.y = vehicleHeight / 2;
        }
    }, [data.startPosition, vehicleHeight, data.isExiting]);

    // Entry barrier delay
    useEffect(() => {
        if (data.canPassBarrier && !entryDelayDone) {
            const timer = setTimeout(() => setEntryDelayDone(true), MOVEMENT_DELAY);
            return () => clearTimeout(timer);
        }
    }, [data.canPassBarrier, entryDelayDone]);

    // Exit barrier delay
    useEffect(() => {
        if (data.canPassExitBarrier && !exitDelayDone) {
            const timer = setTimeout(() => setExitDelayDone(true), MOVEMENT_DELAY);
            return () => clearTimeout(timer);
        }
    }, [data.canPassExitBarrier, exitDelayDone]);

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
            const queuePos = data.exitQueuePosition;
            const queueTarget = queuePos >= 1 && queuePos <= 3 ? EXIT_QUEUE_POSITIONS[queuePos - 1] : null;

            // Phase 1: Navigate through exit waypoints to reach exit lane
            if (exitWaypointIndex < exitPath.length - 1 && !data.canPassExitBarrier) {
                const target = exitPath[exitWaypointIndex];
                const arrived = moveTowardsTarget(mesh, target, delta, vehicleHeight);
                if (arrived) {
                    setExitWaypointIndex((i) => i + 1);
                }
                updatePosition();
                return;
            }

            // Phase 2: Move to queue position on exit lane
            if (queueTarget && !data.canPassExitBarrier) {
                const arrived = moveTowardsTarget(mesh, queueTarget, delta, vehicleHeight);
                if (arrived) {
                    // At queue position
                    if (queuePos === 1 && !data.isWaitingAtExitBarrier) {
                        setVehicleExitWaiting(data.id, true);
                    }
                    if (data.isExitTransitioning && !hasNotifiedExitArrival.current) {
                        hasNotifiedExitArrival.current = true;
                        notifyVehicleArrivedAtExitQueuePosition(data.id);
                    }
                }
                updatePosition();
                return;
            }

            // Phase 3: Wait for barrier delay
            if (data.canPassExitBarrier && !exitDelayDone) {
                updatePosition();
                return;
            }

            // Phase 4: Move to center (z=0) before exiting
            if (data.canPassExitBarrier && exitDelayDone && !exitAtCenter) {
                const centerTarget = new Vector3(BARRIER_X, 0, BARRIER_CENTER_Z);
                const arrived = moveTowardsTarget(mesh, centerTarget, delta, vehicleHeight);
                if (arrived) {
                    setExitAtCenter(true);
                }
                updatePosition();
                return;
            }

            // Phase 5: Move to exit point
            if (exitAtCenter) {
                const exitTarget = exitPath[exitPath.length - 1];
                if (exitTarget) {
                    const arrived = moveTowardsTarget(mesh, exitTarget, delta, vehicleHeight);
                    if (arrived) {
                        setHasExited(true);
                        removeVehicle(data.id);
                        return;
                    }
                }
                updatePosition();
            }
            return;
        }

        // ==================== ENTERING VEHICLE ====================
        if (hasParked) return;

        const queuePos = data.queuePosition;
        const queueTarget = queuePos >= 1 && queuePos <= 3 ? QUEUE_POSITIONS[queuePos - 1] : null;

        // Phase 1: Move to queue position
        if (queueTarget && !data.canPassBarrier) {
            const arrived = moveTowardsTarget(mesh, queueTarget, delta, vehicleHeight);
            if (arrived) {
                // At queue position
                if (queuePos === 1 && !data.isWaitingAtBarrier) {
                    setVehicleWaiting(data.id, true);
                }
                if (data.isTransitioning && !hasNotifiedEntryArrival.current) {
                    hasNotifiedEntryArrival.current = true;
                    notifyVehicleArrivedAtQueuePosition(data.id);
                }
            }
            updatePosition();
            return;
        }

        // Phase 2: Wait for barrier delay
        if (data.canPassBarrier && !entryDelayDone) {
            updatePosition();
            return;
        }

        // Phase 3: Move to center (z=0) before entering parking
        if (data.canPassBarrier && entryDelayDone && !entryAtCenter) {
            const centerTarget = new Vector3(BARRIER_X, 0, BARRIER_CENTER_Z);
            const arrived = moveTowardsTarget(mesh, centerTarget, delta, vehicleHeight);
            if (arrived) {
                setEntryAtCenter(true);
            }
            updatePosition();
            return;
        }

        // Phase 4: Navigate through entry waypoints to parking spot
        if (entryAtCenter && entryWaypointIndex < entryPath.length) {
            const target = entryPath[entryWaypointIndex];
            const arrived = moveTowardsTarget(mesh, target, delta, vehicleHeight);
            if (arrived) {
                if (entryWaypointIndex >= entryPath.length - 1) {
                    // Arrived at parking spot
                    setHasParked(true);
                    updateVehicleState(data.id, 'parked');
                } else {
                    setEntryWaypointIndex((i) => i + 1);
                }
            }
            updatePosition();
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
