<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\EventService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EventController extends Controller
{
    public function __construct(private EventService $events) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->events->getOrganizerEvents($request->user()->id),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|min:3',
            'event_type' => 'required|string',
            'host_name' => 'required|string',
            'start_date' => 'required|date',
        ]);

        $event = $this->events->create($request->user()->id, $validated);

        return response()->json(['success' => true, 'data' => $event], 201);
    }

    public function show(string $id, Request $request): JsonResponse
    {
        $event = $this->events->findForOrganizer($id, $request->user()->id);
        return response()->json(['success' => true, 'data' => $event]);
    }

    public function update(string $id, Request $request): JsonResponse
    {
        $event = $this->events->update($id, $request->user()->id, $request->all());
        return response()->json(['success' => true, 'data' => $event]);
    }

    public function destroy(string $id, Request $request): JsonResponse
    {
        $this->events->delete($id, $request->user()->id);
        return response()->json(['success' => true]);
    }
}
