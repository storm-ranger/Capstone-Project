<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AreaGroup extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'base_rate',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'base_rate' => 'decimal:2',
    ];

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }
}
