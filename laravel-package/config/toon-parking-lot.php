<?php

return [
    /*
    |--------------------------------------------------------------------------
    | ToonParkingLot Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration options for the 3D parking lot visualization.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Default Capacity
    |--------------------------------------------------------------------------
    |
    | The default number of parking spots to display if not specified.
    |
    */
    'default_capacity' => 20,

    /*
    |--------------------------------------------------------------------------
    | Automatic Time of Day
    |--------------------------------------------------------------------------
    |
    | When enabled, the visualization will automatically switch between
    | day and night mode based on the current time.
    | Day: 06:00 - 18:00
    | Night: 18:00 - 06:00
    |
    */
    'auto_time_of_day' => true,

    /*
    |--------------------------------------------------------------------------
    | Default Height
    |--------------------------------------------------------------------------
    |
    | The default height of the visualization container.
    |
    */
    'default_height' => '500px',

    /*
    |--------------------------------------------------------------------------
    | Asset Base URL
    |--------------------------------------------------------------------------
    |
    | If you're hosting 3D assets (FBX files, textures) on a CDN,
    | specify the base URL here. Leave null to use local assets.
    |
    */
    'asset_base_url' => null,
];
