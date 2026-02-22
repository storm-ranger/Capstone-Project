<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    protected $fillable = [
        'code',
        'name',
        'type',
        'plate_number',
        'max_value',
        'max_weight_kg',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'max_value' => 'decimal:2',
        'max_weight_kg' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Get the delivery batches assigned to this vehicle.
     */
    public function batches(): HasMany
    {
        return $this->hasMany(DeliveryBatch::class);
    }

    /**
     * Scope for active vehicles.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for L300 vehicles.
     */
    public function scopeL300($query)
    {
        return $query->where('type', 'l300');
    }

    /**
     * Scope for Truck vehicles.
     */
    public function scopeTruck($query)
    {
        return $query->where('type', 'truck');
    }

    /**
     * Get the type label.
     */
    public function getTypeLabelAttribute(): string
    {
        return match($this->type) {
            'l300' => 'L300 Van',
            'truck' => 'Truck',
            default => ucfirst($this->type),
        };
    }
}
