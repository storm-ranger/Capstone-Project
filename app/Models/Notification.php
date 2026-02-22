<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'icon',
        'icon_color',
        'link',
        'data',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    public function markAsRead(): void
    {
        if (!$this->isRead()) {
            $this->update(['read_at' => now()]);
        }
    }

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('user_id', $userId)
              ->orWhereNull('user_id'); // Global notifications
        });
    }

    /**
     * Create a delivery scheduled notification
     */
    public static function deliveryScheduled(DeliveryOrder $order, ?int $userId = null): self
    {
        return self::create([
            'user_id' => $userId,
            'type' => 'delivery_scheduled',
            'title' => 'New Delivery Scheduled',
            'message' => "Delivery {$order->do_number} has been scheduled for " . ($order->scheduled_date?->format('M d, Y') ?? 'TBD'),
            'icon' => 'Truck',
            'icon_color' => 'blue',
            'link' => "/admin/delivery-orders/{$order->id}",
            'data' => ['delivery_order_id' => $order->id],
        ]);
    }

    /**
     * Create a delivery completed notification
     */
    public static function deliveryCompleted(DeliveryOrder $order, ?int $userId = null): self
    {
        return self::create([
            'user_id' => $userId,
            'type' => 'delivery_completed',
            'title' => 'Delivery Completed',
            'message' => "Delivery {$order->do_number} has been completed successfully",
            'icon' => 'CheckCircle',
            'icon_color' => 'green',
            'link' => "/admin/delivery-orders/{$order->id}",
            'data' => ['delivery_order_id' => $order->id],
        ]);
    }

    /**
     * Create a KPI alert notification
     */
    public static function kpiAlert(string $province, float $percentage, ?int $userId = null): self
    {
        return self::create([
            'user_id' => $userId,
            'type' => 'kpi_alert',
            'title' => 'KPI Threshold Exceeded',
            'message' => "{$province} KPI is at " . number_format($percentage, 2) . "% (exceeds 2% limit)",
            'icon' => 'AlertTriangle',
            'icon_color' => 'red',
            'link' => '/admin/sales-tracking',
            'data' => ['province' => $province, 'percentage' => $percentage],
        ]);
    }

    /**
     * Create a report ready notification
     */
    public static function reportReady(string $reportName, string $link, ?int $userId = null): self
    {
        return self::create([
            'user_id' => $userId,
            'type' => 'report_ready',
            'title' => 'Report Ready',
            'message' => "{$reportName} is now available for download",
            'icon' => 'FileText',
            'icon_color' => 'green',
            'link' => $link,
            'data' => ['report_name' => $reportName],
        ]);
    }

    /**
     * Create a delivery delayed notification
     */
    public static function deliveryDelayed(DeliveryOrder $order, ?int $userId = null): self
    {
        return self::create([
            'user_id' => $userId,
            'type' => 'delivery_delayed',
            'title' => 'Delivery Delayed',
            'message' => "Delivery {$order->do_number} is running behind schedule",
            'icon' => 'Clock',
            'icon_color' => 'yellow',
            'link' => "/admin/delivery-orders/{$order->id}",
            'data' => ['delivery_order_id' => $order->id],
        ]);
    }

    /**
     * Create an upcoming delivery reminder notification
     */
    public static function upcomingDeliveryReminder(DeliveryOrder $order, int $daysUntil, ?int $userId = null): self
    {
        $dayText = $daysUntil === 0 ? 'today' : ($daysUntil === 1 ? 'tomorrow' : "in {$daysUntil} days");
        
        return self::create([
            'user_id' => $userId,
            'type' => 'upcoming_delivery',
            'title' => 'Upcoming Delivery Reminder',
            'message' => "Delivery {$order->do_number} to {$order->client->code} is scheduled {$dayText}",
            'icon' => 'Clock',
            'icon_color' => $daysUntil === 0 ? 'red' : ($daysUntil === 1 ? 'yellow' : 'blue'),
            'link' => "/admin/delivery-orders/{$order->id}",
            'data' => ['delivery_order_id' => $order->id, 'days_until' => $daysUntil],
        ]);
    }

    /**
     * Check if a reminder notification already exists for this order today
     */
    public static function hasReminderToday(int $orderId): bool
    {
        return self::where('type', 'upcoming_delivery')
            ->whereDate('created_at', now()->toDateString())
            ->whereJsonContains('data->delivery_order_id', $orderId)
            ->exists();
    }
}
