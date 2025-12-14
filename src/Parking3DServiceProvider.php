<?php

namespace Zone\Parking3D;

use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\ServiceProvider;

class Parking3DServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Load views with namespace 'parking-3d'
        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'parking-3d');

        // Publish views (optional)
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../resources/views' => resource_path('views/vendor/parking-3d'),
            ], 'parking-3d-views');
        }

        // Register Filament assets (the JS is compiled by host app's Vite)
        FilamentAsset::register([
            Js::make('parking-3d', __DIR__ . '/../resources/dist/parking-visualization.js')
                ->loadedOnRequest(),
        ], 'zone/parking-3d');
    }
}
