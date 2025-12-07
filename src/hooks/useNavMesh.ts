import { useEffect, useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pathfinding } from 'three-pathfinding';

const NAVMESH_PATH = '/navmesh.glb';
const ZONE_ID = 'parking-lot';

interface UseNavMeshResult {
    findPath: (start: Vector3, end: Vector3) => Vector3[];
    isReady: boolean;
    hasNavMesh: boolean;
}

export function useNavMesh(): UseNavMeshResult {
    const pathfindingRef = useRef<Pathfinding | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [hasNavMesh, setHasNavMesh] = useState(false);

    // Try to load navmesh - handle gracefully if not found
    useEffect(() => {
        const loader = new GLTFLoader();

        loader.load(
            NAVMESH_PATH,
            (gltf) => {
                const navMesh = gltf.scene.children[0];
                if (navMesh && 'geometry' in navMesh) {
                    const pathfinding = new Pathfinding();
                    const zone = Pathfinding.createZone((navMesh as THREE.Mesh).geometry);
                    pathfinding.setZoneData(ZONE_ID, zone);
                    pathfindingRef.current = pathfinding;
                    setHasNavMesh(true);
                    console.log('NavMesh loaded successfully');
                }
                setIsReady(true);
            },
            undefined,
            (error) => {
                console.warn('NavMesh not found, using direct pathfinding:', error);
                setIsReady(true);
                setHasNavMesh(false);
            }
        );
    }, []);

    const findPath = useCallback(
        (start: Vector3, end: Vector3): Vector3[] => {
            // If no navmesh, return direct path
            if (!pathfindingRef.current || !hasNavMesh) {
                return [start.clone(), end.clone()];
            }

            try {
                const pathfinding = pathfindingRef.current;
                const groupID = pathfinding.getGroup(ZONE_ID, start);
                const closestStart = pathfinding.getClosestNode(start, ZONE_ID, groupID);
                const closestEnd = pathfinding.getClosestNode(end, ZONE_ID, groupID);

                if (!closestStart || !closestEnd) {
                    console.warn('Could not find path nodes, using direct path');
                    return [start.clone(), end.clone()];
                }

                const path = pathfinding.findPath(closestStart.centroid, closestEnd.centroid, ZONE_ID, groupID);

                if (path && path.length > 0) {
                    return [start.clone(), ...path.map((p: Vector3) => p.clone()), end.clone()];
                }

                return [start.clone(), end.clone()];
            } catch (error) {
                console.warn('Pathfinding error, using direct path:', error);
                return [start.clone(), end.clone()];
            }
        },
        [hasNavMesh]
    );

    return { findPath, isReady, hasNavMesh };
}

export default useNavMesh;
