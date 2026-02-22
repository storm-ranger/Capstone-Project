<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    protected $fillable = [
        'part_number',
        'description',
        'unit_price',
        'category',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'unit_price' => 'decimal:2',
    ];

    public function clients(): BelongsToMany
    {
        return $this->belongsToMany(Client::class)->withTimestamps();
    }
}
