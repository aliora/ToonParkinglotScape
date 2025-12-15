import * as THREE from 'three';

const targets: THREE.Vector3[] = [];

export const addWindTarget = (pos: THREE.Vector3) => {
    targets.push(pos);
};

export const removeWindTarget = (pos: THREE.Vector3) => {
    const idx = targets.indexOf(pos);
    if (idx > -1) {
        targets.splice(idx, 1);
    }
};

export const getWindTargets = () => targets;

export const getRandomWindTarget = (): THREE.Vector3 | null => {
    if (targets.length === 0) return null;
    return targets[Math.floor(Math.random() * targets.length)];
};
