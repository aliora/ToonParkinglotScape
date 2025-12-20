<?php

namespace Polat\ParkingVisualization;

use Filament\Support\Assets\Js;
use Filament\Support\Assets\Css;
use Filament\Support\Facades\FilamentAsset;
use Livewire\Livewire;
use Polat\ParkingVisualization\Livewire\ParkingVisualization;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class ParkingVisualizationServiceProvider extends PackageServiceProvider
{
    public static string $name = 'parking-visualization';

    public function configurePackage(Package $package): void
    {
        $package
            ->name(static::$name)
            ->hasViews()
            ->hasAssets()
            ->hasConfigFile();
    }

    public function packageBooted(): void
    {
        parent::packageBooted();

        // Register Livewire component
        Livewire::component('parking-visualization', ParkingVisualization::class);

        // Register Filament assets
        FilamentAsset::register([
            Js::make('parking-lot', __DIR__ . '/../resources/dist/parking-lot.iife.js'),
            Css::make('parking-lot', __DIR__ . '/../resources/dist/parking-lot.css'),
        ], package: 'polat/filament-parking-visualization');
    }
}
