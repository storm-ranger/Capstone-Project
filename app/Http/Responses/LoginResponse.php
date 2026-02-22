<?php

namespace App\Http\Responses;

use App\Models\User;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        /** @var User $user */
        $user = auth()->user();

        // Admins always go to dashboard
        if ($user->isAdmin()) {
            $redirectTo = '/admin/dashboard';
        } else {
            // For staff, redirect to their first permitted page
            $redirectTo = $this->getFirstPermittedRoute($user);
        }

        return $request->wantsJson()
            ? response()->json(['two_factor' => false])
            : redirect()->intended($redirectTo);
    }

    /**
     * Get the first route the user has permission to access.
     */
    protected function getFirstPermittedRoute(User $user): string
    {
        $permissions = $user->permissions ?? [];

        // Define the route priority order
        $routeMap = [
            'dashboard' => '/admin/dashboard',
            'delivery-orders' => '/admin/delivery-orders',
            'route-planner' => '/admin/route-planner',
            'allocation-planner' => '/admin/allocation-planner',
            'sales-tracking' => '/admin/sales-tracking',
            'master-data.provinces' => '/admin/master-data/provinces',
            'master-data.area-groups' => '/admin/master-data/area-groups',
            'master-data.areas' => '/admin/master-data/areas',
            'master-data.clients' => '/admin/master-data/clients',
            'master-data.products' => '/admin/master-data/products',
            'system.users' => '/admin/system/users',
        ];

        // Find the first permitted route
        foreach ($routeMap as $permission => $route) {
            if (in_array($permission, $permissions)) {
                return $route;
            }
        }

        // Fallback - if no permissions, redirect to a "no access" page or logout
        // For now, just redirect to home which will show access denied
        return '/';
    }
}
