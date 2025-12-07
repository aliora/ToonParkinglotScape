import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Group, Vector3 } from 'three';
import { useTrafficStore } from '../../stores/useTrafficStore';

interface BarrierGateProps {
    position?: [number, number, number];
    triggerDistance?: number;
    waitTime?: number;
    passTime?: number;
}

const ARM_CLOSED_ROTATION = 0;
const ARM_OPEN_ROTATION = -Math.PI / 2;
const ROTATION_SPEED = 3;

export function BarrierGate({
    position = [-14, 0, -5],
    triggerDistance = 12,
    waitTime = 1.5,
    passTime = 2,
}: BarrierGateProps) {
    const armRef = useRef<Group>(null);
    const vehicles = useTrafficStore((state) => state.vehicles);
    const barrierBusy = useTrafficStore((state) => state.barrierBusy);
    const setVehicleWaiting = useTrafficStore((state) => state.setVehicleWaiting);
    const grantBarrierPass = useTrafficStore((state) => state.grantBarrierPass);
    const grantExitPass = useTrafficStore((state) => state.grantExitPass);
    const releaseExitGate = useTrafficStore((state) => state.releaseExitGate);
    const setBarrierBusy = useTrafficStore((state) => state.setBarrierBusy);
    const hasEntryVehicles = useTrafficStore((state) => state.hasEntryVehicles);
    const advanceExitQueue = useTrafficStore((state) => state.advanceExitQueue);

    const [isOpen, setIsOpen] = useState(false);
    const [currentRotation, setCurrentRotation] = useState(ARM_CLOSED_ROTATION);
    const [processingVehicleId, setProcessingVehicleId] = useState<string | null>(null);

    const waitTimerRef = useRef<number | null>(null);
    const closeTimerRef = useRef<number | null>(null);

    // Detect vehicles in waiting zone and mark them as waiting
    useEffect(() => {
        const barrierPos = new Vector3(position[0], position[1], position[2]);

        vehicles.forEach((vehicle) => {
            if (vehicle.state === 'parked' || vehicle.canPassBarrier) return;

            const vehiclePos = vehicle.currentPosition;
            if (!vehiclePos) return;

            const distance = barrierPos.distanceTo(vehiclePos);

            if (distance < triggerDistance && !vehicle.isWaitingAtBarrier && !vehicle.canPassBarrier) {
                setVehicleWaiting(vehicle.id, true);
            }
        });
    }, [vehicles, position, triggerDistance, setVehicleWaiting]);

    // Process entry and exit queues
    useEffect(() => {
        if (processingVehicleId || barrierBusy) return;

        // Priority: Entry vehicles first
        const entryWaiting = vehicles.find(
            (v) => v.queuePosition === 1 && v.isWaitingAtBarrier && !v.canPassBarrier && !v.isExiting
        );

        if (entryWaiting) {
            setProcessingVehicleId(entryWaiting.id);

            waitTimerRef.current = window.setTimeout(() => {
                setIsOpen(true);
                grantBarrierPass(entryWaiting.id);

                closeTimerRef.current = window.setTimeout(() => {
                    setIsOpen(false);
                    setBarrierBusy(false);
                    setProcessingVehicleId(null);
                }, passTime * 1000);
            }, waitTime * 1000);
            return;
        }

        // No entry vehicles - process exit from position 5 only
        if (!hasEntryVehicles()) {
            // Only process exit from position 5 (center)
            const exitWaiting = vehicles.find(
                (v) =>
                    v.isExiting &&
                    v.exitQueuePosition === 5 &&
                    !v.canPassBarrier // Removed isWaitingAtBarrier check to allow non-stop flow
            );

            if (exitWaiting) {
                setProcessingVehicleId(exitWaiting.id);

                // Immediate open for continuous flow
                setIsOpen(true);
                grantExitPass(exitWaiting.id);

                closeTimerRef.current = window.setTimeout(() => {
                    setIsOpen(false);
                    setBarrierBusy(false);
                    // Free position 5 only after barrier closes/vehicle exits
                    releaseExitGate(exitWaiting.id);
                    setProcessingVehicleId(null);
                    // attempt to advance next vehicle
                    advanceExitQueue();
                }, passTime * 1000);
            }
        }
    }, [vehicles, processingVehicleId, barrierBusy, grantBarrierPass, grantExitPass, setBarrierBusy, hasEntryVehicles, advanceExitQueue, waitTime, passTime]);

    // Separate interval for advancing exit queue to center
    useEffect(() => {
        const intervalId = setInterval(() => {
            // advanceExitQueue handles its own condition checks
            advanceExitQueue();
        }, 1000);

        return () => clearInterval(intervalId);
    }, [advanceExitQueue]);

    useEffect(() => {
        return () => {
            if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    useFrame((_, delta) => {
        if (!armRef.current) return;

        const targetRotation = isOpen ? ARM_OPEN_ROTATION : ARM_CLOSED_ROTATION;
        const rotationDiff = targetRotation - currentRotation;

        if (Math.abs(rotationDiff) > 0.01) {
            const newRotation = currentRotation + Math.sign(rotationDiff) * ROTATION_SPEED * delta;
            setCurrentRotation(newRotation);
            armRef.current.rotation.x = newRotation;
        } else {
            armRef.current.rotation.x = targetRotation;
        }
    });

    return (
        <group position={position}>
            <Box position={[0, 1.5, 0]} args={[1.5, 3, 1.5]} castShadow>
                <meshStandardMaterial color="#2c3e50" />
            </Box>

            <Box position={[0, 3.2, 0]} args={[1.8, 0.4, 1.8]} castShadow>
                <meshStandardMaterial color="#e74c3c" />
            </Box>

            <group ref={armRef} position={[0, 2.8, 0.5]}>
                <Box position={[0, 0, 0]} args={[0.3, 0.3, 0.3]}>
                    <meshStandardMaterial color="#f1c40f" />
                </Box>

                <Box position={[0, 0, 6]} args={[0.15, 0.15, 12]}>
                    <meshStandardMaterial color="#e74c3c" />
                </Box>

                <Box position={[0, 0, 12]} args={[0.25, 0.25, 0.5]}>
                    <meshStandardMaterial color="#f39c12" emissive="#f39c12" emissiveIntensity={0.3} />
                </Box>
            </group>

            <Box position={[0, 0.5, 12]} args={[0.3, 1, 0.3]}>
                <meshStandardMaterial color="#7f8c8d" />
            </Box>
        </group>
    );
}

export default BarrierGate;
