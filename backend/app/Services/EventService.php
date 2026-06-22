<?php

namespace App\Services;

use App\Models\Event;
use Illuminate\Support\Str;

class EventService
{
    public function create(string $organizerId, array $data): Event
    {
        return Event::create([
            'organizer_id' => $organizerId,
            'slug' => Str::slug($data['title']) . '-' . Str::random(6),
            'title' => $data['title'],
            'event_type' => $data['event_type'],
            'host_name' => $data['host_name'],
            'start_date' => $data['start_date'],
            'status' => 'DRAFT',
        ]);
    }

    public function getOrganizerEvents(string $organizerId)
    {
        return Event::where('organizer_id', $organizerId)
            ->withCount(['guests', 'tickets', 'invitations'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function findForOrganizer(string $id, string $organizerId): ?Event
    {
        return Event::where('id', $id)->where('organizer_id', $organizerId)->firstOrFail();
    }

    public function update(string $id, string $organizerId, array $data): Event
    {
        $event = $this->findForOrganizer($id, $organizerId);
        $event->update($data);
        return $event->fresh();
    }

    public function delete(string $id, string $organizerId): void
    {
        $event = $this->findForOrganizer($id, $organizerId);
        $event->delete();
    }
}
