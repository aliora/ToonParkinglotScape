<?php

namespace Zone\Parking3D\Filament\Pages;

use App\Models\Park;
use App\Models\ParkSession;
use BezhanSalleh\FilamentShield\Traits\HasPageShield;
use Filament\Facades\Filament;
use Filament\Pages\Page;

class ParkingVisualization extends Page
{
    use HasPageShield;

    protected static ?string $navigationIcon = 'heroicon-o-cube-transparent';

    protected static ?string $navigationGroup = 'Görselleştirme';

    protected static ?string $navigationLabel = '3D Otopark';

    protected static ?string $title = '3D Otopark Görselleştirme';

    protected static string $view = 'parking-3d::pages.parking-visualization';

    protected static ?int $navigationSort = 100;

    public int $parkId;

    public int $capacity;

    public array $initialVehicles = [];

    public array $reverbConfig = [];

    public function mount(): void
    {
        /** @var Park $tenant */
        $tenant = Filament::getTenant();

        $this->parkId = $tenant->id;
        $this->capacity = $tenant->capacity_total ?? 50;

        // Cold start: Load active vehicles
        $this->initialVehicles = $this->getActiveVehicles();

        // Reverb configuration for realtime updates
        $this->reverbConfig = $this->getReverbConfig();
    }

    /**
     * Get active vehicles for cold start initialization
     */
    protected function getActiveVehicles(): array
    {
        return ParkSession::query()
            ->where('park_id', $this->parkId)
            ->whereNull('exit_at')
            ->with('entryRecord:id,photo_vehicle')
            ->get()
            ->map(fn (ParkSession $session) => [
                'id' => $session->session_uid ?? (string) $session->id,
                'plateNumber' => $session->plate_txt,
                'photoUrl' => $session->entryRecord?->photo_vehicle,
                'entryAt' => $session->entry_at?->toISOString(),
                'vehicleClass' => $session->vehicle_class_id?->value ?? 1,
            ])
            ->toArray();
    }

    /**
     * Get Reverb/Echo configuration for frontend
     */
    protected function getReverbConfig(): array
    {
        return [
            'key' => config('broadcasting.connections.reverb.key'),
            'host' => config('broadcasting.connections.reverb.options.host'),
            'port' => config('broadcasting.connections.reverb.options.port'),
            'scheme' => config('broadcasting.connections.reverb.options.scheme', 'https'),
        ];
    }

    /**
     * Check if user can access this page
     */
    public static function canAccess(): bool
    {
        return true;
    }
}
