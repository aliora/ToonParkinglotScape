import { createRoot, Root } from 'react-dom/client';
import App from './App';
import type { MountConfig } from './types';

let root: Root | null = null;
let currentConfig: MountConfig | null = null;

/**
 * Mount the 3D Parking Visualization React app
 */
export function mount(container: HTMLElement, config: MountConfig): void {
    // Cleanup existing instance
    if (root) {
        root.unmount();
    }

    currentConfig = config;
    root = createRoot(container);
    root.render(<App config={config} />);

    console.log('[Parking3D] Mounted with config:', {
        parkId: config.parkId,
        capacity: config.capacity,
        vehicleCount: config.initialVehicles?.length ?? 0,
    });
}

/**
 * Unmount and cleanup
 */
export function unmount(): void {
    if (root) {
        root.unmount();
        root = null;
        currentConfig = null;
        console.log('[Parking3D] Unmounted');
    }
}

/**
 * Get current configuration
 */
export function getConfig(): MountConfig | null {
    return currentConfig;
}

// Expose to window for Blade access
declare global {
    interface Window {
        Parking3D: {
            mount: typeof mount;
            unmount: typeof unmount;
            getConfig: typeof getConfig;
        };
    }
}

window.Parking3D = {
    mount,
    unmount,
    getConfig,
};
