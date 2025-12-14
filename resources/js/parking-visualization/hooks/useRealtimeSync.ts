import { useEffect, useRef } from 'react';
import { useTrafficStore } from '../stores/useTrafficStore';
import type { ReverbConfig, VehicleEnteredEvent, VehicleExitedEvent } from '../types';

// Import Echo dynamically to avoid SSR issues
declare global {
    interface Window {
        Echo: any;
        Pusher: any;
    }
}

/**
 * Hook to sync with Laravel Reverb for realtime vehicle updates
 */
export function useRealtimeSync(parkId: number, reverbConfig: ReverbConfig) {
    const addVehicle = useTrafficStore((state) => state.addVehicle);
    const removeVehicle = useTrafficStore((state) => state.removeVehicle);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        // Check if Echo is available (loaded by host app)
        if (!window.Echo) {
            console.warn('[Parking3D] Laravel Echo not found. Realtime updates disabled.');
            return;
        }

        const channelName = `park.${parkId}`;
        console.log('[Parking3D] Subscribing to channel:', channelName);

        try {
            // Subscribe to the park channel
            channelRef.current = window.Echo.channel(channelName);

            // Listen for vehicle entry events
            channelRef.current.listen('.VehicleEntered', (event: VehicleEnteredEvent) => {
                console.log('[Parking3D] VehicleEntered event:', event);
                addVehicle(event);
            });

            // Listen for vehicle exit events
            channelRef.current.listen('.VehicleExited', (event: VehicleExitedEvent) => {
                console.log('[Parking3D] VehicleExited event:', event);
                removeVehicle(event.sessionUid);
            });

            console.log('[Parking3D] Subscribed to realtime events');
        } catch (error) {
            console.error('[Parking3D] Error subscribing to channel:', error);
        }

        // Cleanup on unmount
        return () => {
            if (channelRef.current) {
                console.log('[Parking3D] Leaving channel:', channelName);
                window.Echo.leave(channelName);
                channelRef.current = null;
            }
        };
    }, [parkId, reverbConfig, addVehicle, removeVehicle]);
}
