<?php

namespace App\Console\Commands;

use App\Models\DeliveryOrder;
use App\Models\Notification;
use Illuminate\Console\Command;

class SendDeliveryReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'deliveries:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send reminder notifications for upcoming deliveries';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking for upcoming deliveries...');

        $today = now()->startOfDay();
        $reminderDays = [0, 1, 3]; // Remind on the day, 1 day before, and 3 days before

        $totalReminders = 0;

        foreach ($reminderDays as $days) {
            $targetDate = $today->copy()->addDays($days);

            $orders = DeliveryOrder::with('client')
                ->whereDate('scheduled_date', $targetDate)
                ->where('status', 'pending')
                ->get();

            foreach ($orders as $order) {
                // Check if we already sent a reminder for this order today
                if (Notification::hasReminderToday($order->id)) {
                    continue;
                }

                Notification::upcomingDeliveryReminder($order, $days);
                $totalReminders++;

                $this->line("  - Reminder sent for {$order->do_number} (scheduled in {$days} days)");
            }
        }

        $this->info("Sent {$totalReminders} reminder notifications.");

        return Command::SUCCESS;
    }
}
