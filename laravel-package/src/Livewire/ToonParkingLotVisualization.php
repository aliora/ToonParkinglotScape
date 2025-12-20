<?php

namespace Polat\ToonParkingLot\Livewire;

use Livewire\Attributes\On;
use Livewire\Component;

/**
 * ToonParkingLot Visualization Livewire Component
 * 
 * Embeds the 3D parking lot visualization and handles communication
 * between Laravel/Filament and the JavaScript visualization.
 */
class ToonParkingLotVisualization extends Component
{
    /** @var int Parking lot capacity */
    public int $capacity = 20;

    /** @var array Pre-parked vehicles to display on init */
    public array $vehicles = [];

    /** @var string Container height (CSS value) */
    public string $height = '500px';

    /** @var bool Enable automatic day/night based on time */
    public bool $autoTimeOfDay = true;

    /** @var string|null Manual time of day override */
    public ?string $timeOfDay = null;

    /**
     * Mount the component with initial configuration
     */
    public function mount(
        int $capacity = 20,
        array $vehicles = [],
        string $height = '500px',
        bool $autoTimeOfDay = true,
        ?string $timeOfDay = null
    ): void {
        $this->capacity = $capacity;
        $this->vehicles = $vehicles;
        $this->height = $height;
        $this->autoTimeOfDay = $autoTimeOfDay;
        $this->timeOfDay = $timeOfDay;
    }

    /**
     * Add a new vehicle with animated entry
     * 
     * @param array $vehicleData Vehicle data with id, type, plate, entryTime
     */
    public function addVehicle(array $vehicleData): void
    {
        $this->dispatch('parking-add-vehicle', $vehicleData);
    }

    /**
     * Trigger vehicle exit animation
     * 
     * @param string $vehicleId The ID of the vehicle to exit
     */
    public function triggerExit(string $vehicleId): void
    {
        $this->dispatch('parking-trigger-exit', $vehicleId);
    }

    /**
     * Remove a vehicle instantly (no animation)
     * 
     * @param string $vehicleId The ID of the vehicle to remove
     */
    public function removeVehicle(string $vehicleId): void
    {
        $this->dispatch('parking-remove-vehicle', $vehicleId);
    }

    /**
     * Handle vehicle parked event from JavaScript
     */
    #[On('vehicle-parked')]
    public function handleVehicleParked(array $vehicle): void
    {
        // Dispatch to parent components
        $this->dispatch('vehicleParked', vehicle: $vehicle);
    }

    /**
     * Handle vehicle exited event from JavaScript
     */
    #[On('vehicle-exited')]
    public function handleVehicleExited(string $vehicleId): void
    {
        // Dispatch to parent components
        $this->dispatch('vehicleExited', vehicleId: $vehicleId);
    }

    /**
     * Handle parking full event from JavaScript
     */
    #[On('parking-full')]
    public function handleParkingFull(): void
    {
        // Dispatch to parent components
        $this->dispatch('parkingFull');
    }

    /**
     * Get the configuration for JavaScript initialization
     */
    public function getConfigProperty(): array
    {
        return [
            'capacity' => $this->capacity,
            'vehicles' => $this->vehicles,
            'autoTimeOfDay' => $this->autoTimeOfDay,
            'timeOfDay' => $this->timeOfDay,
        ];
    }

    public function render()
    {
        return view('toon-parking-lot::parking-lot', [
            'config' => $this->config,
            'height' => $this->height,
        ]);
    }
}
