import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Group, Vector3 } from 'three';
import { useTrafficStore } from '../../stores/useTrafficStore';

interface BarrierGateProps {
    position?: [number, number, number];
    triggerDistance?: number; // Distance at which vehicles stop
    waitTime?: number; // Time vehicle waits before barrier opens (seconds)
    passTime?: number; // Time barrier stays open after vehicle passes (seconds)
}

const ARM_CLOSED_ROTATION = 0;
const ARM_OPEN_ROTATION = -Math.PI / 2; // 90 degrees up
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
    const setBarrierBusy = useTrafficStore((state) => state.setBarrierBusy);

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

            // If vehicle is in trigger zone and not already waiting
            if (distance < triggerDistance && !vehicle.isWaitingAtBarrier && !vehicle.canPassBarrier) {
                setVehicleWaiting(vehicle.id, true);
            }
        });
    }, [vehicles, position, triggerDistance, setVehicleWaiting]);

    // Process waiting vehicles queue
    useEffect(() => {
        // If already processing, skip
        if (processingVehicleId || barrierBusy) return;

        // Find first waiting vehicle manually (avoid stale closure)
        const waitingVehicle = vehicles.find((v) => v.isWaitingAtBarrier && !v.canPassBarrier);

        if (waitingVehicle) {
            console.log('Processing vehicle:', waitingVehicle.id);
            setProcessingVehicleId(waitingVehicle.id);
            setBarrierBusy(true);

            // Wait before opening barrier
            waitTimerRef.current = window.setTimeout(() => {
                console.log('Opening barrier for:', waitingVehicle.id);
                // Open barrier and grant pass
                setIsOpen(true);
                grantBarrierPass(waitingVehicle.id);

                // Set timer to close after vehicle passes
                closeTimerRef.current = window.setTimeout(() => {
                    console.log('Closing barrier');
                    setIsOpen(false);
                    setBarrierBusy(false);
                    setProcessingVehicleId(null);
                }, passTime * 1000);
            }, waitTime * 1000);
        }
    }, [vehicles, processingVehicleId, barrierBusy, grantBarrierPass, setBarrierBusy, waitTime, passTime]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    // Animate arm rotation
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
            {/* Barrier Body - Main housing */}
            <Box position={[0, 1.5, 0]} args={[1.5, 3, 1.5]} castShadow>
                <meshStandardMaterial color="#2c3e50" />
            </Box>

            {/* Top cap */}
            <Box position={[0, 3.2, 0]} args={[1.8, 0.4, 1.8]} castShadow>
                <meshStandardMaterial color="#e74c3c" />
            </Box>

            {/* Barrier Arm Pivot Point */}
            <group ref={armRef} position={[0, 2.8, 0.5]}>
                {/* Arm base (pivot) */}
                <Box position={[0, 0, 0]} args={[0.3, 0.3, 0.3]}>
                    <meshStandardMaterial color="#f1c40f" />
                </Box>

                {/* Arm bar - extends in +Z direction (longer arm) */}
                <Box position={[0, 0, 6]} args={[0.15, 0.15, 12]}>
                    <meshStandardMaterial color="#e74c3c" />
                </Box>

                {/* Arm tip (reflector) */}
                <Box position={[0, 0, 12]} args={[0.25, 0.25, 0.5]}>
                    <meshStandardMaterial color="#f39c12" emissive="#f39c12" emissiveIntensity={0.3} />
                </Box>
            </group>

            {/* Side pole at end of arm travel */}
            <Box position={[0, 0.5, 12]} args={[0.3, 1, 0.3]}>
                <meshStandardMaterial color="#7f8c8d" />
            </Box>
        </group>
    );
}

export default BarrierGate;
