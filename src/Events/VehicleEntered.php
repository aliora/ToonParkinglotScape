<?php

namespace Zone\Parking3D\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VehicleEntered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $parkId,
        public string $sessionUid,
        public string $plateNumber,
        public ?string $photoUrl = null,
        public int $vehicleClass = 1
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel("park.{$this->parkId}"),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'VehicleEntered';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'sessionUid' => $this->sessionUid,
            'plateNumber' => $this->plateNumber,
            'photoUrl' => $this->photoUrl,
            'vehicleClass' => $this->vehicleClass,
        ];
    }
}
