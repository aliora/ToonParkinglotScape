<x-filament-panels::page>
    {{-- 3D Visualization Container - wire:ignore prevents Livewire from interfering --}}
    <div 
        wire:ignore 
        id="parking-3d-root"
        class="w-full h-[700px] bg-slate-900 rounded-xl overflow-hidden shadow-2xl"
    >
        {{-- Loading State --}}
        <div id="parking-3d-loading" class="flex items-center justify-center h-full">
            <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p class="text-slate-400 text-lg">3D Görselleştirme Yükleniyor...</p>
            </div>
        </div>
    </div>

    {{-- Stats Bar --}}
    <div class="mt-4 grid grid-cols-3 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div class="text-sm text-gray-500 dark:text-gray-400">Kapasite</div>
            <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ $capacity }}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div class="text-sm text-gray-500 dark:text-gray-400">İçerideki Araçlar</div>
            <div class="text-2xl font-bold text-primary-600" id="parking-3d-vehicle-count">{{ count($initialVehicles) }}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div class="text-sm text-gray-500 dark:text-gray-400">Boş Yer</div>
            <div class="text-2xl font-bold text-green-600" id="parking-3d-free-spots">{{ $capacity - count($initialVehicles) }}</div>
        </div>
    </div>

    @push('scripts')
        {{-- Vite React Refresh for HMR --}}
        @viteReactRefresh
        
        {{-- Main React Bundle (compiled by host app) --}}
        @vite('vendor/zone/parking-3d/resources/js/parking-visualization/main.tsx')
        
        <script type="module">
            document.addEventListener('DOMContentLoaded', () => {
                const container = document.getElementById('parking-3d-root');
                const loadingEl = document.getElementById('parking-3d-loading');
                
                if (container && window.Parking3D) {
                    // Hide loading state
                    if (loadingEl) loadingEl.style.display = 'none';
                    
                    // Mount React app with configuration
                    window.Parking3D.mount(container, {
                        parkId: @json($parkId),
                        capacity: @json($capacity),
                        initialVehicles: @json($initialVehicles),
                        reverbConfig: @json($reverbConfig),
                        
                        // Callback for vehicle count updates
                        onVehicleCountChange: (count) => {
                            const countEl = document.getElementById('parking-3d-vehicle-count');
                            const freeEl = document.getElementById('parking-3d-free-spots');
                            const capacity = @json($capacity);
                            
                            if (countEl) countEl.textContent = count;
                            if (freeEl) freeEl.textContent = capacity - count;
                        }
                    });
                } else {
                    // Retry after a short delay (bundle might still be loading)
                    setTimeout(() => {
                        if (window.Parking3D) {
                            if (loadingEl) loadingEl.style.display = 'none';
                            window.Parking3D.mount(container, {
                                parkId: @json($parkId),
                                capacity: @json($capacity),
                                initialVehicles: @json($initialVehicles),
                                reverbConfig: @json($reverbConfig),
                            });
                        } else {
                            console.error('Parking3D module not loaded');
                            if (loadingEl) {
                                loadingEl.innerHTML = '<p class="text-red-400">3D modülü yüklenemedi</p>';
                            }
                        }
                    }, 1000);
                }
            });

            // Cleanup on Livewire navigation (SPA mode)
            document.addEventListener('livewire:navigating', () => {
                if (window.Parking3D) {
                    window.Parking3D.unmount();
                }
            });
        </script>
    @endpush
</x-filament-panels::page>
