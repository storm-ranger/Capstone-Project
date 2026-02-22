<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RateSetting extends Model
{
    protected $fillable = [
        'name',
        'type',
        'description',
        'rate',
        'province_id',
        'area_ids',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'rate' => 'decimal:2',
        'area_ids' => 'array',
    ];

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }
}
