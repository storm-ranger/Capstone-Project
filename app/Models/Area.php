<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Area extends Model
{
    protected $fillable = [
        'province_id',
        'area_group_id',
        'name',
        'code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function areaGroup(): BelongsTo
    {
        return $this->belongsTo(AreaGroup::class);
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }
}
