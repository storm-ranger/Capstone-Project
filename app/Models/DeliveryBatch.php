<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class DeliveryBatch extends Model
{
    protected $fillable = [
        'batch_number',
        'planned_date',
        'actual_date',
        'area_group_id',
        'vehicle_id',
        'vehicle_type',
        'order_count',
        'total_items',
        'total_value',
        'total_rate',
        'total_distance_km',
        'status',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'planned_date' => 'date',
        'actual_date' => 'date',
        'total_value' => 'decimal:2',
        'total_rate' => 'decimal:2',
        'total_distance_km' => 'decimal:2',
    ];

    /**
     * Get the area group for this batch.
     */
    public function areaGroup(): BelongsTo
    {
        return $this->belongsTo(AreaGroup::class);
    }

    /**
     * Get the vehicle assigned to this batch.
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * Get the user who created this batch.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the delivery orders in this batch.
     */
    public function orders(): HasMany
    {
        return $this->hasMany(DeliveryOrder::class, 'batch_id');
    }

    /**
     * Generate a unique batch number.
     */
    public static function generateBatchNumber(string $date, string $areaCode): string
    {
        $prefix = 'BTH';
        $dateStr = Carbon::parse($date)->format('ymd');
        
        // Get the latest batch for this date
        $latestBatch = static::whereDate('planned_date', $date)
            ->where('batch_number', 'like', "{$prefix}-{$dateStr}-%")
            ->orderBy('batch_number', 'desc')
            ->first();
        
        if ($latestBatch) {
            $lastNumber = (int) substr($latestBatch->batch_number, -3);
            $nextNumber = str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);
        } else {
            $nextNumber = '001';
        }
        
        return "{$prefix}-{$dateStr}-{$nextNumber}";
    }

    /**
     * Determine vehicle type based on total value.
     * L300 for values <= 150,000, Truck for > 150,000
     */
    public static function determineVehicleType(float $totalValue): string
    {
        return $totalValue <= 150000 ? 'l300' : 'truck';
    }

    /**
     * Get the vehicle type label.
     */
    public function getVehicleTypeLabelAttribute(): string
    {
        return match($this->vehicle_type) {
            'l300' => 'L300 Van',
            'truck' => 'Truck',
            default => ucfirst($this->vehicle_type),
        };
    }

    /**
     * Get the status badge color.
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'planned' => 'blue',
            'in_transit' => 'yellow',
            'completed' => 'green',
            'cancelled' => 'red',
            default => 'gray',
        };
    }
}
