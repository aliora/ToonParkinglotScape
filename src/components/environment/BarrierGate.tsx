import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Group, Vector3 } from 'three';
import { useTrafficStore } from '../../stores/useTrafficStore';

interface BarrierGateProps {
    position?: [number, number, number];
    triggerDistance?: number; // Distance at which barrier opens
    cooldownDuration?: number; // Cooldown before closing (seconds)
}

const ARM_CLOSED_ROTATION = 0;
const ARM_OPEN_ROTATION = -Math.PI / 2; // 90 degrees up
const ROTATION_SPEED = 3;

export function BarrierGate({
    position = [-14, 0, -5],
    triggerDistance = 10,
    cooldownDuration = 3,
}: BarrierGateProps) {
    const armRef = useRef<Group>(null);
    const vehicles = useTrafficStore((state) => state.vehicles);

    const [isOpen, setIsOpen] = useState(false);
    const [currentRotation, setCurrentRotation] = useState(ARM_CLOSED_ROTATION);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const cooldownIntervalRef = useRef<number | null>(null);

    // Reset cooldown timer
    const resetCooldown = useCallback(() => {
        setCooldownRemaining(cooldownDuration);

        // Clear existing interval
        if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
        }

        // Start countdown
        cooldownIntervalRef.current = window.setInterval(() => {
            setCooldownRemaining((prev) => {
                if (prev <= 0.1) {
                    // Countdown finished, close barrier
                    if (cooldownIntervalRef.current) {
                        clearInterval(cooldownIntervalRef.current);
                        cooldownIntervalRef.current = null;
                    }
                    setIsOpen(false);
                    return 0;
                }
                return prev - 0.1; // Decrease by 0.1 second
            });
        }, 100); // Update every 100ms
    }, [cooldownDuration]);

    // Check vehicle proximity
    useEffect(() => {
        const barrierPos = new Vector3(position[0], position[1], position[2]);

        // Check if any moving vehicle is within trigger distance
        const vehicleInTriggerZone = vehicles.some((vehicle) => {
            if (vehicle.state === 'parked') return false;

            const vehiclePos = vehicle.currentPosition;
            if (!vehiclePos) return false;

            const distance = barrierPos.distanceTo(vehiclePos);
            return distance < triggerDistance;
        });

        if (vehicleInTriggerZone) {
            // Open the barrier and reset/start cooldown
            setIsOpen(true);
            resetCooldown();
        }
    }, [vehicles, position, triggerDistance, resetCooldown]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (cooldownIntervalRef.current) {
                clearInterval(cooldownIntervalRef.current);
            }
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
