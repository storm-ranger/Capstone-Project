<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Province extends Model
{
    protected $fillable = [
        'name',
        'code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function rateSettings(): HasMany
    {
        return $this->hasMany(RateSetting::class);
    }
}
