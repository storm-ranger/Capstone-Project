<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class DeliveryOrder extends Model
{
    protected $fillable = [
        'po_number',
        'po_date',
        'scheduled_date',
        'actual_date',
        'client_id',
        'province_id',
        'batch_id',
        'status',
        'delivery_type',
        'base_rate',
        'additional_rate_type',
        'additional_rate',
        'total_rate',
        'total_items',
        'total_quantity',
        'total_amount',
        'remarks',
        'created_by',
    ];

    protected $casts = [
        'po_date' => 'date',
        'scheduled_date' => 'date',
        'actual_date' => 'date',
        'total_amount' => 'decimal:2',
        'base_rate' => 'decimal:2',
        'additional_rate' => 'decimal:2',
        'total_rate' => 'decimal:2',
        'total_items' => 'integer',
        'total_quantity' => 'integer',
    ];

    protected $appends = [
        'days_variance',
        'critical_path_duration',
        'current_milestone',
    ];

    /**
     * Get the computed drop cost matching allocation planner logic.
     * 
     * First order in batch: base_rate
     * Subsequent same zone: 250
     * Subsequent other zone: 500
     * Advance delivery: base_rate + 300
     * 
     * Old records may have total_rate = base_rate + additional_rate for drops,
     * so this computes the correct value from the rate fields.
     */
    public function getDropCostAttribute(): float
    {
        return match ($this->additional_rate_type) {
            'drop_same_zone', 'drop_other_zone' => (float) $this->additional_rate,
            default => (float) $this->total_rate,
        };
    }

    /**
     * Get the items for this order.
     */
    public function items(): HasMany
    {
        return $this->hasMany(DeliveryOrderItem::class);
    }

    /**
     * Get the milestones for this order.
     */
    public function milestones(): HasMany
    {
        return $this->hasMany(DeliveryOrderMilestone::class)->orderBy('sequence');
    }

    /**
     * Get the delivery batch this order belongs to.
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(DeliveryBatch::class, 'batch_id');
    }

    /**
     * Get the client that owns the order.
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the province for the delivery.
     */
    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    /**
     * Get the user who created the order.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Recalculate totals from items.
     */
    public function recalculateTotals(): void
    {
        $this->total_items = $this->items()->count();
        $this->total_quantity = $this->items()->sum('quantity');
        $this->total_amount = $this->items()->sum('total_price');
        $this->save();
    }

    /**
     * Determine status based on actual vs scheduled date.
     */
    public function determineStatus(): string
    {
        if ($this->status === 'cancelled') {
            return 'cancelled';
        }

        if (!$this->actual_date) {
            return 'pending';
        }

        return $this->actual_date <= $this->scheduled_date ? 'on_time' : 'delayed';
    }

    /**
     * Update status based on dates.
     */
    public function updateStatus(): void
    {
        $this->status = $this->determineStatus();
        $this->save();
    }

    /**
     * Get days difference between actual and scheduled.
     */
    public function getDaysVarianceAttribute(): ?int
    {
        if (!$this->actual_date) {
            return null;
        }

        return $this->scheduled_date->diffInDays($this->actual_date, false);
    }

    /**
     * Check if delivery is on time.
     */
    public function isOnTime(): bool
    {
        return $this->status === 'on_time';
    }

    /**
     * Check if delivery is delayed.
     */
    public function isDelayed(): bool
    {
        return $this->status === 'delayed';
    }

    /**
     * Check if delivery is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Scope for on-time deliveries.
     */
    public function scopeOnTime($query)
    {
        return $query->where('status', 'on_time');
    }

    /**
     * Scope for delayed deliveries.
     */
    public function scopeDelayed($query)
    {
        return $query->where('status', 'delayed');
    }

    /**
     * Scope for pending deliveries.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for filtering by date range (scheduled date).
     */
    public function scopeScheduledBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('scheduled_date', [$startDate, $endDate]);
    }

    /**
     * Scope for filtering by province.
     */
    public function scopeForProvince($query, $provinceId)
    {
        return $query->where('province_id', $provinceId);
    }

    /**
     * Scope for filtering by client.
     */
    public function scopeForClient($query, $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    // ==========================================
    // CRITICAL PATH METHOD (CPM) FUNCTIONALITY
    // ==========================================

    /**
     * Initialize milestones from templates for this order.
     */
    public function initializeMilestones(): void
    {
        $templates = DeliveryMilestoneTemplate::getActiveOrdered();
        $currentDate = $this->po_date ?? now();

        foreach ($templates as $template) {
            $plannedStart = $currentDate->copy();
            $plannedEnd = $plannedStart->copy()->addDays($template->standard_duration_days);

            $this->milestones()->create([
                'milestone_template_id' => $template->id,
                'sequence' => $template->sequence,
                'planned_duration_days' => $template->standard_duration_days,
                'planned_start_date' => $plannedStart,
                'planned_end_date' => $plannedEnd,
                'status' => 'not_started',
                'is_critical' => true, // Initially all are critical (linear path)
            ]);

            $currentDate = $plannedEnd;
        }

        // Recalculate critical path
        $this->calculateCriticalPath();
    }

    /**
     * Calculate Critical Path using CPM algorithm.
     * 
     * For a linear delivery process, all activities are on the critical path.
     * This method calculates Early Start (ES), Early Finish (EF), 
     * Late Start (LS), Late Finish (LF), and Slack.
     */
    public function calculateCriticalPath(): void
    {
        $milestones = $this->milestones()->orderBy('sequence')->get();

        if ($milestones->isEmpty()) {
            return;
        }

        // Forward Pass - Calculate Early Start (ES) and Early Finish (EF)
        $cumulativeDate = $this->po_date ?? now();
        
        foreach ($milestones as $milestone) {
            $es = $cumulativeDate->copy();
            $ef = $es->copy()->addDays($milestone->planned_duration_days);
            
            $milestone->planned_start_date = $es;
            $milestone->planned_end_date = $ef;
            
            $cumulativeDate = $ef;
        }

        // Get project end date (Late Finish of last activity)
        $projectEndDate = $cumulativeDate;

        // Backward Pass - Calculate Late Start (LS), Late Finish (LF), and Slack
        $lateFinish = $projectEndDate->copy();
        
        foreach ($milestones->reverse() as $milestone) {
            $lf = $lateFinish->copy();
            $ls = $lf->copy()->subDays($milestone->planned_duration_days);
            
            // Calculate slack (float) = LS - ES or LF - EF
            $slack = $ls->diffInDays($milestone->planned_start_date, false);
            
            // Activity is critical if slack = 0
            $milestone->slack_days = max(0, $slack);
            $milestone->is_critical = $slack <= 0;
            
            $milestone->save();
            
            $lateFinish = $ls;
        }

        // Update scheduled delivery date based on critical path
        $lastMilestone = $milestones->last();
        if ($lastMilestone && $lastMilestone->planned_end_date) {
            $this->scheduled_date = $lastMilestone->planned_end_date;
            $this->save();
        }
    }

    /**
     * Get total critical path duration in days.
     */
    public function getCriticalPathDurationAttribute(): int
    {
        return $this->milestones()
            ->where('is_critical', true)
            ->sum('planned_duration_days');
    }

    /**
     * Get current active milestone.
     */
    public function getCurrentMilestoneAttribute(): ?array
    {
        $milestone = $this->milestones()
            ->where('status', 'in_progress')
            ->with('template')
            ->first();

        if (!$milestone) {
            $milestone = $this->milestones()
                ->where('status', 'not_started')
                ->with('template')
                ->orderBy('sequence')
                ->first();
        }

        return $milestone ? [
            'id' => $milestone->id,
            'name' => $milestone->template->name ?? 'Unknown',
            'status' => $milestone->status,
            'is_critical' => $milestone->is_critical,
            'planned_end_date' => $milestone->planned_end_date?->format('Y-m-d'),
        ] : null;
    }

    /**
     * Get critical path activities.
     */
    public function getCriticalPathActivities()
    {
        return $this->milestones()
            ->where('is_critical', true)
            ->with('template')
            ->orderBy('sequence')
            ->get();
    }

    /**
     * Get milestones with delay information.
     */
    public function getMilestonesWithStatus()
    {
        return $this->milestones()
            ->with('template')
            ->orderBy('sequence')
            ->get()
            ->map(function ($milestone) {
                return [
                    'id' => $milestone->id,
                    'name' => $milestone->template->name ?? 'Unknown',
                    'code' => $milestone->template->code ?? '',
                    'sequence' => $milestone->sequence,
                    'status' => $milestone->status,
                    'planned_duration_days' => $milestone->planned_duration_days,
                    'actual_duration_days' => $milestone->actual_duration_days,
                    'planned_start_date' => $milestone->planned_start_date?->format('Y-m-d'),
                    'planned_end_date' => $milestone->planned_end_date?->format('Y-m-d'),
                    'actual_start_date' => $milestone->actual_start_date?->format('Y-m-d'),
                    'actual_end_date' => $milestone->actual_end_date?->format('Y-m-d'),
                    'slack_days' => $milestone->slack_days,
                    'is_critical' => $milestone->is_critical,
                    'is_delayed' => $milestone->isDelayed(),
                    'delay_days' => $milestone->delay_days,
                ];
            });
    }

    /**
     * Advance to next milestone.
     */
    public function advanceToNextMilestone(): ?DeliveryOrderMilestone
    {
        // Complete current in-progress milestone
        $current = $this->milestones()->where('status', 'in_progress')->first();
        if ($current) {
            $current->complete();
        }

        // Start next milestone
        $next = $this->milestones()
            ->where('status', 'not_started')
            ->orderBy('sequence')
            ->first();

        if ($next) {
            $next->start();
            return $next;
        }

        // All milestones complete - update order status
        $this->actual_date = now();
        $this->updateStatus();

        return null;
    }

    /**
     * Check if order is on critical path schedule.
     */
    public function isOnCriticalPathSchedule(): bool
    {
        $delayedCritical = $this->milestones()
            ->where('is_critical', true)
            ->get()
            ->filter(fn($m) => $m->isDelayed())
            ->count();

        return $delayedCritical === 0;
    }

    /**
     * Get total delay on critical path.
     */
    public function getCriticalPathDelay(): int
    {
        return $this->milestones()
            ->where('is_critical', true)
            ->get()
            ->sum(fn($m) => max(0, $m->delay_days));
    }
}
