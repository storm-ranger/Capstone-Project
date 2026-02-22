<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryOrderMilestone extends Model
{
    protected $fillable = [
        'delivery_order_id',
        'milestone_template_id',
        'sequence',
        'planned_duration_days',
        'actual_duration_days',
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'status',
        'slack_days',
        'is_critical',
        'notes',
    ];

    protected $casts = [
        'sequence' => 'integer',
        'planned_duration_days' => 'integer',
        'actual_duration_days' => 'integer',
        'planned_start_date' => 'date',
        'planned_end_date' => 'date',
        'actual_start_date' => 'date',
        'actual_end_date' => 'date',
        'slack_days' => 'integer',
        'is_critical' => 'boolean',
    ];

    /**
     * Get the delivery order.
     */
    public function deliveryOrder(): BelongsTo
    {
        return $this->belongsTo(DeliveryOrder::class);
    }

    /**
     * Get the milestone template.
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(DeliveryMilestoneTemplate::class, 'milestone_template_id');
    }

    /**
     * Check if milestone is delayed.
     */
    public function isDelayed(): bool
    {
        if ($this->status === 'completed' && $this->actual_end_date && $this->planned_end_date) {
            return $this->actual_end_date > $this->planned_end_date;
        }

        if ($this->status === 'in_progress' && $this->planned_end_date) {
            return now()->greaterThan($this->planned_end_date);
        }

        return false;
    }

    /**
     * Get delay in days (positive = late, negative = early).
     */
    public function getDelayDaysAttribute(): int
    {
        if ($this->status === 'completed' && $this->actual_end_date && $this->planned_end_date) {
            return $this->actual_end_date->diffInDays($this->planned_end_date, false);
        }

        return 0;
    }

    /**
     * Mark milestone as started.
     */
    public function start(): void
    {
        $this->update([
            'status' => 'in_progress',
            'actual_start_date' => now(),
        ]);
    }

    /**
     * Mark milestone as completed.
     */
    public function complete(): void
    {
        $actualEnd = now();
        $actualDuration = $this->actual_start_date 
            ? $this->actual_start_date->diffInDays($actualEnd) 
            : 0;

        $this->update([
            'status' => 'completed',
            'actual_end_date' => $actualEnd,
            'actual_duration_days' => $actualDuration,
        ]);

        // Trigger critical path recalculation
        $this->deliveryOrder->calculateCriticalPath();
    }
}
