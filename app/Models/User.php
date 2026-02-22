<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Available page permissions
     */
    public const AVAILABLE_PERMISSIONS = [
        'dashboard' => 'Dashboard',
        'delivery-orders' => 'Delivery Monitoring',
        'route-planner' => 'Route Planner',
        'allocation-planner' => 'Allocation Planner',
        'sales-tracking' => 'Sales Tracking',
        'master-data.provinces' => 'Master Data - Provinces',
        'master-data.area-groups' => 'Master Data - Area Groups',
        'master-data.areas' => 'Master Data - Areas',
        'master-data.clients' => 'Master Data - Clients',
        'master-data.products' => 'Master Data - Products',
        'system.users' => 'System - Users',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'permissions',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
        ];
    }

    /**
     * Check if user is admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user is staff.
     */
    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    /**
     * Check if user has permission to access a page.
     * Admins have access to all pages.
     */
    public function hasPermission(string $permission): bool
    {
        // Admins have full access
        if ($this->isAdmin()) {
            return true;
        }

        // Staff must have the specific permission
        $permissions = $this->permissions ?? [];
        return in_array($permission, $permissions);
    }

    /**
     * Check if user can access a route based on the path.
     */
    public function canAccessRoute(string $path): bool
    {
        // Admins have full access
        if ($this->isAdmin()) {
            return true;
        }

        // Map route paths to permissions
        $routePermissions = [
            'dashboard' => 'dashboard',
            'delivery-orders' => 'delivery-orders',
            'route-planner' => 'route-planner',
            'allocation-planner' => 'allocation-planner',
            'sales-tracking' => 'sales-tracking',
            'master-data/provinces' => 'master-data.provinces',
            'master-data/area-groups' => 'master-data.area-groups',
            'master-data/areas' => 'master-data.areas',
            'master-data/clients' => 'master-data.clients',
            'master-data/products' => 'master-data.products',
            'system/users' => 'system.users',
        ];

        foreach ($routePermissions as $routePrefix => $permission) {
            if (str_starts_with($path, $routePrefix)) {
                return $this->hasPermission($permission);
            }
        }

        // Allow access to other routes by default (notifications, settings, etc.)
        return true;
    }

    /**
     * Get all available permissions with labels.
     */
    public static function getAvailablePermissions(): array
    {
        return self::AVAILABLE_PERMISSIONS;
    }
}
