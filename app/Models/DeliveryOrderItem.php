<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryOrderItem extends Model
{
    protected $fillable = [
        'delivery_order_id',
        'product_id',
        'part_number',
        'description',
        'unit_price',
        'quantity',
        'total_price',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'quantity' => 'integer',
    ];

    /**
     * Get the order that owns this item.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(DeliveryOrder::class, 'delivery_order_id');
    }

    /**
     * Get the product for this item.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Calculate total price from unit_price and quantity.
     */
    public function calculateTotal(): float
    {
        return $this->unit_price * $this->quantity;
    }

    /**
     * Boot method to auto-calculate total and update parent totals.
     */
    protected static function booted(): void
    {
        static::saving(function (DeliveryOrderItem $item) {
            $item->total_price = $item->unit_price * $item->quantity;
        });

        static::saved(function (DeliveryOrderItem $item) {
            $item->order->recalculateTotals();
        });

        static::deleted(function (DeliveryOrderItem $item) {
            $item->order->recalculateTotals();
        });
    }
}
