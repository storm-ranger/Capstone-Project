<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryMilestoneTemplate extends Model
{
    protected $fillable = [
        'name',
        'code',
        'sequence',
        'standard_duration_days',
        'is_active',
    ];

    protected $casts = [
        'sequence' => 'integer',
        'standard_duration_days' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Get all milestone instances using this template.
     */
    public function milestones(): HasMany
    {
        return $this->hasMany(DeliveryOrderMilestone::class, 'milestone_template_id');
    }

    /**
     * Get active templates ordered by sequence.
     */
    public static function getActiveOrdered()
    {
        return static::where('is_active', true)
            ->orderBy('sequence')
            ->get();
    }
}
