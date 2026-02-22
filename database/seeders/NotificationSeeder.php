<?php

namespace Database\Seeders;

use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $notifications = [
            [
                'user_id' => null, // Global notification
                'type' => 'delivery_scheduled',
                'title' => 'New Delivery Scheduled',
                'message' => 'Delivery DO-2026-001 has been scheduled for Jan 28, 2026',
                'icon' => 'Truck',
                'icon_color' => 'blue',
                'link' => '/admin/delivery-orders/1',
                'created_at' => Carbon::now()->subMinutes(5),
            ],
            [
                'user_id' => null,
                'type' => 'kpi_alert',
                'title' => 'KPI Threshold Exceeded',
                'message' => 'Cavite KPI is at 2.34% (exceeds 2% limit)',
                'icon' => 'AlertTriangle',
                'icon_color' => 'red',
                'link' => '/admin/sales-tracking',
                'created_at' => Carbon::now()->subHours(1),
            ],
            [
                'user_id' => null,
                'type' => 'delivery_completed',
                'title' => 'Delivery Completed',
                'message' => 'Delivery DO-2026-003 has been completed successfully',
                'icon' => 'CheckCircle',
                'icon_color' => 'green',
                'link' => '/admin/delivery-orders/3',
                'created_at' => Carbon::now()->subHours(2),
            ],
            [
                'user_id' => null,
                'type' => 'report_ready',
                'title' => 'Monthly Report Ready',
                'message' => 'January 2026 Sales Report is now available for download',
                'icon' => 'FileText',
                'icon_color' => 'green',
                'link' => '/admin/sales-tracking',
                'created_at' => Carbon::now()->subHours(3),
            ],
            [
                'user_id' => null,
                'type' => 'delivery_delayed',
                'title' => 'Delivery Delayed',
                'message' => 'Delivery DO-2026-005 is running behind schedule',
                'icon' => 'Clock',
                'icon_color' => 'yellow',
                'link' => '/admin/delivery-orders/5',
                'created_at' => Carbon::now()->subHours(5),
            ],
            [
                'user_id' => null,
                'type' => 'delivery_scheduled',
                'title' => 'Bulk Delivery Scheduled',
                'message' => '15 new deliveries have been scheduled for this week',
                'icon' => 'Package',
                'icon_color' => 'blue',
                'link' => '/admin/delivery-orders',
                'created_at' => Carbon::now()->subDays(1),
            ],
            [
                'user_id' => null,
                'type' => 'kpi_alert',
                'title' => 'KPI Improvement',
                'message' => 'Laguna KPI improved to 1.76% (below 2% target)',
                'icon' => 'CheckCircle',
                'icon_color' => 'green',
                'link' => '/admin/sales-tracking',
                'read_at' => Carbon::now()->subHours(1),
                'created_at' => Carbon::now()->subDays(2),
            ],
        ];

        foreach ($notifications as $notification) {
            Notification::create($notification);
        }
    }
}
