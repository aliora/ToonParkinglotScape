{{-- Parking Lot 3D Visualization Component --}}
<div
    x-data="parkingVisualization(@js($config))"
    x-init="init()"
    wire:ignore
    class="parking-visualization-container"
    style="width: 100%; height: {{ $height }}; background: #1a1a2e; border-radius: 8px; overflow: hidden; position: relative;"
>
    <div x-ref="container" style="width: 100%; height: 100%;"></div>
    
    {{-- Loading indicator --}}
    <div 
        x-show="!initialized" 
        x-transition
        style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(26, 26, 46, 0.9);"
    >
        <div style="text-align: center; color: #fff;">
            <svg style="width: 48px; height: 48px; animation: spin 1s linear infinite; margin: 0 auto 16px;" fill="none" viewBox="0 0 24 24">
                <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Otopark yükleniyor...</p>
        </div>
    </div>
</div>

@push('styles')
<style>
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
</style>
@endpush

@push('scripts')
<script>
document.addEventListener('alpine:init', () => {
    Alpine.data('parkingVisualization', (config) => ({
        initialized: false,
        
        init() {
            // Wait for ParkingLot script to load
            const checkParkingLot = () => {
                if (typeof window.ParkingLot !== 'undefined') {
                    this.initParkingLot(config);
                } else {
                    setTimeout(checkParkingLot, 100);
                }
            };
            checkParkingLot();
        },
        
        initParkingLot(config) {
            const container = this.$refs.container;
            
            // Initialize the 3D visualization
            window.ParkingLot.init(container, {
                capacity: config.capacity,
                preParkedVehicles: config.vehicles || [],
                autoTimeOfDay: config.autoTimeOfDay ?? true,
                timeOfDay: config.timeOfDay,
            });
            
            // Listen for Livewire events
            Livewire.on('parking-add-vehicle', (data) => {
                window.ParkingLot.addVehicle(data[0]);
            });
            
            Livewire.on('parking-trigger-exit', (vehicleId) => {
                window.ParkingLot.triggerExit(vehicleId[0]);
            });
            
            Livewire.on('parking-remove-vehicle', (vehicleId) => {
                window.ParkingLot.removeVehicle(vehicleId[0]);
            });
            
            // Register callbacks to notify Livewire
            window.ParkingLot.onVehicleParked((data) => {
                @this.dispatch('vehicle-parked', { vehicle: data });
            });
            
            window.ParkingLot.onVehicleExited((vehicleId) => {
                @this.dispatch('vehicle-exited', { vehicleId: vehicleId });
            });
            
            window.ParkingLot.onParkingFull(() => {
                @this.dispatch('parking-full');
            });
            
            this.initialized = true;
        },
        
        destroy() {
            if (window.ParkingLot) {
                window.ParkingLot.destroy();
            }
        }
    }));
});
</script>
@endpush
