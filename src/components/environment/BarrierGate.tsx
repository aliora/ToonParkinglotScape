import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Group, MathUtils } from 'three';
import { useTrafficStore, GateState } from '../../stores/useTrafficStore';

interface BarrierGateProps {
    position?: [number, number, number];
}

export function BarrierGate({ position = [-14, 0, -5] }: BarrierGateProps) {
    const gateState = useTrafficStore((state) => state.gateState);
    const armRef = useRef<Group>(null);

    // Rotation values
    // Open: -PI/2 (Vertical up)
    // Closed: 0 (Horizontal)
    const targetRotationX = (gateState === GateState.OPEN || gateState === GateState.OPENING)
        ? -Math.PI / 2
        : 0; // Closed

    useFrame((_, delta) => {
        if (armRef.current) {
            // Smoothly interpolate rotation
            // Speed depends on state? 
            const speed = 4.0;
            armRef.current.rotation.x = MathUtils.damp(
                armRef.current.rotation.x,
                targetRotationX,
                speed,
                delta
            );

            // Notify store when fully open?
            // The store manages timings via logic, but we could trigger 'notifyGateOpen' here if we wanted physical accuracy.
            // Using the store's simplified logic: Store sets OPENING -> Wait -> OPEN.
            // Actually, correct flow:
            // 1. Vehicle req access -> Gate OPENING.
            // 2. Animation runs.
            // 3. When animation finishes (approx), we should set OPEN?
            // OR: Store sets OPEN immediately?
            // My store logic: `requestGateAccess` -> `OPENING`. `notifyGateOpen` -> `OPEN`.
            // Who calls `notifyGateOpen`? Ideally the gate component when animation finishes!

            if (gateState === GateState.OPENING) {
                if (Math.abs(armRef.current.rotation.x - (-Math.PI / 2)) < 0.1) {
                    useTrafficStore.getState().notifyGateOpen();
                }
            } else if (gateState === GateState.CLOSING) {
                // Check if closed (rotation near 0)
                if (Math.abs(armRef.current.rotation.x) < 0.1) {
                    useTrafficStore.getState().notifyGateClosed();
                }
            }
        }
    });

    // Light color based on state
    const lightColor = (gateState === GateState.OPEN || gateState === GateState.OPENING) ? "#27ae60" : "#e74c3c";

    return (
        <group position={position}>
            {/* Base post */}
            <Box position={[0, 1.5, 0]} args={[1.5, 3, 1.5]} castShadow>
                <meshStandardMaterial color="#2c3e50" />
            </Box>

            {/* Top light */}
            <Box position={[0, 3.2, 0]} args={[1.8, 0.4, 1.8]} castShadow>
                <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={0.5} />
            </Box>

            {/* Barrier arm */}
            <group ref={armRef} position={[0, 2.8, 0.5]} rotation={[0, 0, 0]}>
                {/* Pivot */}
                <Box position={[0, 0, 0]} args={[0.3, 0.3, 0.3]}>
                    <meshStandardMaterial color="#f1c40f" />
                </Box>

                {/* Arm */}
                <Box position={[0, 0, 6]} args={[0.15, 0.15, 12]}>
                    <meshStandardMaterial color="#e74c3c" />
                </Box>

                {/* End cap */}
                <Box position={[0, 0, 12]} args={[0.25, 0.25, 0.5]}>
                    <meshStandardMaterial color="#f39c12" emissive="#f39c12" emissiveIntensity={0.3} />
                </Box>
            </group>

            {/* Support post */}
            <Box position={[0, 0.5, 12]} args={[0.3, 1, 0.3]}>
                <meshStandardMaterial color="#7f8c8d" />
            </Box>
        </group>
    );
}

export default BarrierGate;
