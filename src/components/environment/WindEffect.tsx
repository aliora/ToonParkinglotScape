import React, { useRef, useMemo, useState, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import * as THREE from 'three';
import { useControls } from 'leva';
import { getRandomWindTarget } from '../../utils/WindTargets';
import { WIND_CONFIG } from '../../config/constants';

interface Props {
    boundMinX: number;
    boundMaxX: number;
    boundMinZ: number;
    boundMaxZ: number;
}

const WindStreak = ({
    startPos,
    speed,
    length,
    width,
    color,
    heightOffset,
    onComplete
}: {
    startPos: THREE.Vector3,
    speed: number,
    length: number,
    width: number,
    color: string,
    heightOffset: number,
    onComplete: () => void
}) => {
    const headRef = useRef<THREE.Group>(null);
    const [progress, setProgress] = useState(0);

    // Config values
    const waveCount = useMemo(() => 1 + Math.random() * 2, []); // 1-3 waves
    const amplitude = useMemo(() => 0.5 + Math.random() * 0.5, []);

    // Path calculation helper
    const getPositionAt = (t: number) => {
        // Linear path direction
        const dirX = 1; // Generally flows +X
        const dirZ = 0.2; // Slight Z drift

        const x = startPos.x + t * length * dirX;
        const zBase = startPos.z + t * length * dirZ;

        // Sine wave for wiggling (Curve)
        const wiggle = Math.sin(t * Math.PI * 2 * waveCount) * amplitude;

        // Apply Curve
        // Y follows arc defined in config + wiggle
        // Midpoint arc
        const arcY = Math.sin(t * Math.PI) * WIND_CONFIG.curve.midPointY;
        const y = startPos.y + heightOffset + arcY + wiggle * 0.3;

        const z = zBase + wiggle;

        return new THREE.Vector3(x, y, z);
    };

    // Initialize position directly to avoid "streak from 0,0,0" artifact
    useLayoutEffect(() => {
        if (headRef.current) {
            const start = getPositionAt(0);
            headRef.current.position.copy(start);
            // Trail might need a frame to catch up or we need to reset it?
            // Usually setting position before render is enough.
        }
    }, []);

    useFrame((_, delta) => {
        const newProgress = progress + delta * speed * 0.5; // Adjust speed for trail feel

        if (newProgress >= 1.2) { // Allow time for trail to fully pass
            onComplete();
        } else {
            setProgress(newProgress);

            // Update head position
            if (headRef.current) {
                // We clamp t for position to 1.0 to stop the head,
                // but actually we want the head to keep moving to drag the trail out?
                // Let's keep moving.
                const pos = getPositionAt(newProgress);
                headRef.current.position.copy(pos);
            }
        }
    });

    // Global fade factor for the whole trail to prevent popping at the end
    // Fade In (0-0.2), Sustain, Fade Out (0.8-1.2)
    const fadeFactor = progress < 0.2
        ? progress / 0.2
        : (progress > 0.8 ? 1 - (progress - 0.8) / 0.4 : 1);

    // Ensure it doesn't go below 0
    const cleanFade = Math.max(0, fadeFactor);

    return (
        <Trail
            width={width * 0.2 * cleanFade} // Pixel to World approximation * Fade
            length={12} // Number of segments in trail
            color={color}
            attenuation={(t) => t * 0.8} // Linear fade: t goes from 0 (tail) to 1 (head). Multiply to soften.
            target={headRef as any}
        >
            <group ref={headRef} />
        </Trail>
    );
};

export const WindEffect: React.FC<Props> = ({ boundMinX, boundMaxX, boundMinZ, boundMaxZ }) => {
    const {
        enabled,
        density,
        speed,
        length,
        width,
        height,
        heightVariation,
        color
    } = useControls('Wind Effect', {
        enabled: { value: WIND_CONFIG.enabled },
        density: { value: WIND_CONFIG.spawnChance, min: 0, max: 2, step: 0.1, label: 'Spawn Chance' },
        speed: { value: WIND_CONFIG.speed, min: 0.1, max: 5, step: 0.1 },
        width: { value: WIND_CONFIG.line.width, min: 1, max: 10, step: 0.5, label: 'Line Width' },
        length: { value: WIND_CONFIG.line.length, min: 5, max: 50, step: 1 },
        height: { value: WIND_CONFIG.line.startHeight, min: 0.5, max: 10, step: 0.5 },
        heightVariation: { value: WIND_CONFIG.line.heightVariation, min: 0, max: 10, step: 0.5, label: 'Y Randomness' },
        color: { value: WIND_CONFIG.line.color }
    });

    const [streaks, setStreaks] = useState<{ id: number, startPos: THREE.Vector3 }[]>([]);
    const streakIdRef = useRef(0);

    useFrame(() => {
        if (!enabled) return;

        // Random spawn chance
        if (Math.random() < density) {
            let startPos: THREE.Vector3;

            // 50% chance to spawn on a tree (if available), 50% chance random in parking lot
            const useTarget = Math.random() > 0.5;
            const target = useTarget ? getRandomWindTarget() : null;

            if (target) {
                startPos = new THREE.Vector3(target.x, target.y, target.z);
            } else {
                // Random spawn in bounds
                // Spawn slightly outside left bound to flow in
                const x = boundMinX + Math.random() * (boundMaxX - boundMinX);
                const z = boundMinZ + Math.random() * (boundMaxZ - boundMinZ);
                startPos = new THREE.Vector3(x, 0, z);
            }

            // Apply random Y offset
            // (Math.random() - 0.5) * heightVariation -> Centers around base height
            startPos.y += (Math.random() - 0.5) * heightVariation;

            setStreaks(prev => [
                ...prev,
                { id: streakIdRef.current++, startPos }
            ]);
        }
    });

    const removeStreak = (id: number) => {
        setStreaks(prev => prev.filter(s => s.id !== id));
    };

    return (
        <group>
            {streaks.map(s => (
                <WindStreak
                    key={s.id}
                    startPos={s.startPos}
                    speed={speed}
                    length={length}
                    width={width}
                    color={color}
                    heightOffset={height}
                    onComplete={() => removeStreak(s.id)}
                />
            ))}
        </group>
    );
};
