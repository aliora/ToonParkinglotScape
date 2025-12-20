/**
 * ToonParkingLot Library Entry Point
 * Exports the ToonParkingLot API for external use (Laravel/Filament)
 */

import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import App from './App';
import { useTrafficStore } from './stores/useTrafficStore';
import { getAutoTimeOfDay, getTimeUntilNextTransition } from './utils/TimeOfDayHelper';
import type { ToonParkingLotAPI, InitConfig, EventCallbacks } from './api/ToonParkingLotApi';
import type { ExternalVehicleData } from './types/VehicleTypes';

// Re-export types
export type { ToonParkingLotAPI, InitConfig, ExternalVehicleData };

// Module state
let root: Root | null = null;
let timeTransitionTimeout: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

const callbacks: EventCallbacks = {
    onVehicleParked: [],
    onVehicleExited: [],
    onParkingFull: [],
};

/**
 * Schedule automatic day/night transition based on current time
 */
function scheduleTimeTransition() {
    if (timeTransitionTimeout) {
        clearTimeout(timeTransitionTimeout);
    }

    const msUntilTransition = getTimeUntilNextTransition();
    console.log(`[ToonParkingLot] Next day/night transition in ${Math.round(msUntilTransition / 60000)} minutes`);

    timeTransitionTimeout = setTimeout(() => {
        const newTimeOfDay = getAutoTimeOfDay();
        console.log(`[ToonParkingLot] Auto-switching to ${newTimeOfDay}`);
        useTrafficStore.getState().setWorldConfig({ timeOfDay: newTimeOfDay });
        scheduleTimeTransition(); // Schedule next transition
    }, msUntilTransition);
}

/**
 * Wait for parking spots to be initialized
 */
function waitForSpots(callback: () => void, maxWait = 5000) {
    const startTime = Date.now();
    const check = () => {
        const spots = useTrafficStore.getState().parkingSpots;
        if (spots.length > 0) {
            callback();
        } else if (Date.now() - startTime < maxWait) {
            setTimeout(check, 100);
        } else {
            console.warn('[ToonParkingLot] Timeout waiting for parking spots');
            callback();
        }
    };
    check();
}

/**
 * The ToonParkingLot API object
 * Exposed as window.ToonParkingLot
 */
const ToonParkingLot: ToonParkingLotAPI = {
    init(container: HTMLElement, config: InitConfig) {
        if (isInitialized) {
            console.warn('[ToonParkingLot] Already initialized. Call destroy() first.');
            return;
        }

        const {
            capacity,
            preParkedVehicles = [],
            autoTimeOfDay = true,
            timeOfDay,
            showControls = false
        } = config;

        console.log(`[ToonParkingLot] Initializing with capacity: ${capacity}, preParked: ${preParkedVehicles.length}`);

        // Set initial time of day
        const initialTimeOfDay = autoTimeOfDay ? getAutoTimeOfDay() : (timeOfDay ?? 'Day');
        useTrafficStore.getState().setWorldConfig({
            capacity,
            timeOfDay: initialTimeOfDay,
        });

        // Schedule automatic transitions if enabled
        if (autoTimeOfDay) {
            scheduleTimeTransition();
        }

        // Render the React application
        root = createRoot(container);
        root.render(<App isEmbedded={true} showControls={showControls} />);

        // Wait for spots to be initialized, then load pre-parked vehicles
        if (preParkedVehicles.length > 0) {
            waitForSpots(() => {
                useTrafficStore.getState().initPreParkedVehicles(preParkedVehicles);
            });
        }

        // Register internal event emitters
        useTrafficStore.getState().registerCallback('onVehicleParked', (data: ExternalVehicleData) => {
            callbacks.onVehicleParked.forEach(cb => cb(data));
        });
        useTrafficStore.getState().registerCallback('onVehicleExited', (vehicleId: string) => {
            callbacks.onVehicleExited.forEach(cb => cb(vehicleId));
        });
        useTrafficStore.getState().registerCallback('onParkingFull', () => {
            callbacks.onParkingFull.forEach(cb => cb());
        });

        isInitialized = true;
    },

    destroy() {
        if (timeTransitionTimeout) {
            clearTimeout(timeTransitionTimeout);
            timeTransitionTimeout = null;
        }
        if (root) {
            root.unmount();
            root = null;
        }
        callbacks.onVehicleParked = [];
        callbacks.onVehicleExited = [];
        callbacks.onParkingFull = [];
        isInitialized = false;
        console.log('[ToonParkingLot] Destroyed');
    },

    addVehicle(data: ExternalVehicleData) {
        if (!isInitialized) {
            console.warn('[ToonParkingLot] Not initialized');
            return;
        }
        useTrafficStore.getState().addExternalVehicle(data);
    },

    triggerExit(vehicleId: string) {
        if (!isInitialized) {
            console.warn('[ToonParkingLot] Not initialized');
            return;
        }
        useTrafficStore.getState().triggerVehicleExit(vehicleId);
    },

    removeVehicle(vehicleId: string) {
        if (!isInitialized) {
            console.warn('[ToonParkingLot] Not initialized');
            return;
        }
        useTrafficStore.getState().removeVehicle(vehicleId);
    },

    getParkedVehicles(): ExternalVehicleData[] {
        const vehicles = useTrafficStore.getState().vehicles;
        return vehicles
            .filter(v => v.state === 'parked')
            .map(v => ({
                id: v.id,
                type: v.type,
                plate: v.plate,
                image: v.image,
                entryTime: v.entryTime,
            }));
    },

    getAvailableSpots(): number {
        return useTrafficStore.getState().getAvailableSpotCount();
    },

    isFull(): boolean {
        return this.getAvailableSpots() === 0;
    },

    onVehicleParked(callback) {
        callbacks.onVehicleParked.push(callback);
        return () => {
            const index = callbacks.onVehicleParked.indexOf(callback);
            if (index > -1) callbacks.onVehicleParked.splice(index, 1);
        };
    },

    onVehicleExited(callback) {
        callbacks.onVehicleExited.push(callback);
        return () => {
            const index = callbacks.onVehicleExited.indexOf(callback);
            if (index > -1) callbacks.onVehicleExited.splice(index, 1);
        };
    },

    onParkingFull(callback) {
        callbacks.onParkingFull.push(callback);
        return () => {
            const index = callbacks.onParkingFull.indexOf(callback);
            if (index > -1) callbacks.onParkingFull.splice(index, 1);
        };
    },

    setTimeOfDay(time: 'Day' | 'Night') {
        useTrafficStore.getState().setWorldConfig({ timeOfDay: time });
    },

    getTimeOfDay(): 'Day' | 'Night' {
        return useTrafficStore.getState().worldConfig.timeOfDay;
    },
};

// Expose to window for global access
declare global {
    interface Window {
        ToonParkingLot: ToonParkingLotAPI;
    }
}

window.ToonParkingLot = ToonParkingLot;

export { ToonParkingLot };

