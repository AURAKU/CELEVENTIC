<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\InvitationController;
use App\Http\Controllers\Api\V1\TicketController;
use App\Http\Controllers\Api\V1\QrController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\CampaignController;
use App\Http\Controllers\Api\V1\VendorController;
use App\Http\Controllers\Api\V1\VenueController;
use App\Http\Controllers\Api\V1\WalletController;
use App\Http\Controllers\Api\V1\AiPlannerController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\DiscoveryController;
use App\Http\Controllers\Api\V1\MemoryController;
use App\Http\Controllers\Api\V1\FlyerController;
use App\Http\Controllers\Api\V1\InspirationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public
    Route::get('/discovery', [DiscoveryController::class, 'index']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/payments/webhook/{provider}', [PaymentController::class, 'webhook']);
    Route::post('/rsvp', [InvitationController::class, 'rsvp']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('events', EventController::class);
        Route::apiResource('invitations', InvitationController::class)->only(['index', 'store', 'show']);
        Route::apiResource('tickets', TicketController::class);
        Route::post('/qr/verify', [QrController::class, 'verify']);
        Route::post('/qr/offline/register', [QrController::class, 'registerDevice']);
        Route::get('/qr/offline/sync/{eventId}', [QrController::class, 'syncData']);
        Route::post('/payments/initialize', [PaymentController::class, 'initialize']);
        Route::apiResource('campaigns', CampaignController::class);
        Route::get('/vendors', [VendorController::class, 'index']);
        Route::post('/vendors/book', [VendorController::class, 'book']);
        Route::get('/venues', [VenueController::class, 'index']);
        Route::post('/venues/book', [VenueController::class, 'book']);
        Route::get('/wallet/{eventId}', [WalletController::class, 'show']);
        Route::post('/ai/planner', [AiPlannerController::class, 'generate']);
        Route::apiResource('flyers', FlyerController::class)->only(['index', 'store']);
        Route::apiResource('inspiration', InspirationController::class)->only(['index', 'store']);
        Route::get('/memory/{eventId}', [MemoryController::class, 'index']);
        Route::post('/memory', [MemoryController::class, 'store']);

        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('/stats', [AdminController::class, 'stats']);
            Route::get('/users', [AdminController::class, 'users']);
            Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
            Route::get('/payments', [AdminController::class, 'payments']);
        });
    });
});
