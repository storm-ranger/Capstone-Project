<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\DeliveryOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class NotificationController extends Controller
{
    /**
     * Display a listing of notifications.
     */
    public function index(Request $request)
    {
        $notifications = Notification::forUser(auth()->id())
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('admin/notifications/index', [
            'notifications' => $notifications,
            'unreadCount' => Notification::forUser(auth()->id())->unread()->count(),
        ]);
    }

    /**
     * Get recent notifications for the header dropdown.
     * Also checks for urgent orders and creates notifications in real-time.
     */
    public function recent()
    {
        // Check for urgent orders and create notifications if needed
        $this->checkUrgentOrders();

        $notifications = Notification::forUser(auth()->id())
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'message' => $n->message,
                'icon' => $n->icon,
                'icon_color' => $n->icon_color,
                'link' => $n->link,
                'read_at' => $n->read_at,
                'created_at' => $n->created_at,
                'time_ago' => $n->created_at->diffForHumans(),
            ]);

        $unreadCount = Notification::forUser(auth()->id())->unread()->count();

        return response()->json([
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
        ]);
    }

    /**
     * Check for urgent orders and create notifications.
     * This runs on every poll to provide real-time alerts.
     */
    private function checkUrgentOrders()
    {
        $today = Carbon::today();
        
        // Check for overdue orders (past scheduled date, still pending)
        $overdueOrders = DeliveryOrder::with('client')
            ->where('status', 'pending')
            ->whereDate('scheduled_date', '<', $today)
            ->get();

        foreach ($overdueOrders as $order) {
            // Check if we already created an overdue notification for this order today
            $exists = Notification::where('type', 'overdue_delivery')
                ->whereDate('created_at', $today)
                ->whereJsonContains('data->delivery_order_id', $order->id)
                ->exists();

            if (!$exists) {
                Notification::create([
                    'user_id' => null, // Global notification
                    'type' => 'overdue_delivery',
                    'title' => 'Overdue Delivery Alert',
                    'message' => "Delivery {$order->do_number} to {$order->client->code} is overdue!",
                    'icon' => 'AlertTriangle',
                    'icon_color' => 'red',
                    'link' => "/admin/delivery-orders/{$order->id}",
                    'data' => ['delivery_order_id' => $order->id],
                ]);
            }
        }

        // Check for orders due today
        $dueTodayOrders = DeliveryOrder::with('client')
            ->where('status', 'pending')
            ->whereDate('scheduled_date', $today)
            ->get();

        foreach ($dueTodayOrders as $order) {
            // Check if we already created a due today notification
            $exists = Notification::where('type', 'due_today')
                ->whereDate('created_at', $today)
                ->whereJsonContains('data->delivery_order_id', $order->id)
                ->exists();

            if (!$exists) {
                Notification::create([
                    'user_id' => null, // Global notification
                    'type' => 'due_today',
                    'title' => 'Delivery Due Today',
                    'message' => "Delivery {$order->do_number} to {$order->client->code} is due today!",
                    'icon' => 'Clock',
                    'icon_color' => 'yellow',
                    'link' => "/admin/delivery-orders/{$order->id}",
                    'data' => ['delivery_order_id' => $order->id],
                ]);
            }
        }

        // Check for orders due tomorrow
        $dueTomorrowOrders = DeliveryOrder::with('client')
            ->where('status', 'pending')
            ->whereDate('scheduled_date', $today->copy()->addDay())
            ->get();

        foreach ($dueTomorrowOrders as $order) {
            // Check if we already created a due tomorrow notification
            $exists = Notification::where('type', 'due_tomorrow')
                ->whereDate('created_at', $today)
                ->whereJsonContains('data->delivery_order_id', $order->id)
                ->exists();

            if (!$exists) {
                Notification::create([
                    'user_id' => null, // Global notification
                    'type' => 'due_tomorrow',
                    'title' => 'Delivery Due Tomorrow',
                    'message' => "Delivery {$order->do_number} to {$order->client->code} is due tomorrow",
                    'icon' => 'Clock',
                    'icon_color' => 'blue',
                    'link' => "/admin/delivery-orders/{$order->id}",
                    'data' => ['delivery_order_id' => $order->id],
                ]);
            }
        }
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead(Notification $notification)
    {
        // Verify user can access this notification
        if ($notification->user_id !== null && $notification->user_id !== auth()->id()) {
            abort(403);
        }

        $notification->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request)
    {
        Notification::forUser(auth()->id())
            ->unread()
            ->update(['read_at' => now()]);

        // Return Inertia redirect for Inertia requests (check X-Inertia header)
        if ($request->header('X-Inertia')) {
            return back()->with('success', 'All notifications marked as read.');
        }

        // Return JSON for plain AJAX/fetch requests (from header dropdown)
        return response()->json(['success' => true]);
    }

    /**
     * Delete a notification.
     */
    public function destroy(Notification $notification)
    {
        // Verify user can access this notification
        if ($notification->user_id !== null && $notification->user_id !== auth()->id()) {
            abort(403);
        }

        $notification->delete();

        return back()->with('success', 'Notification deleted.');
    }

    /**
     * Delete all read notifications.
     */
    public function destroyRead()
    {
        Notification::forUser(auth()->id())
            ->whereNotNull('read_at')
            ->delete();

        return back()->with('success', 'Read notifications deleted.');
    }
}
