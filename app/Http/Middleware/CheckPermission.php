<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ?string $permission = null): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('home');
        }

        // Admins have full access
        if ($user->isAdmin()) {
            return $next($request);
        }

        // If a specific permission is passed, check it
        if ($permission && !$user->hasPermission($permission)) {
            abort(403, 'You do not have permission to access this page.');
        }

        // If no specific permission, check based on the route path
        if (!$permission) {
            $path = str_replace('/admin/', '', $request->path());
            if (!$user->canAccessRoute($path)) {
                abort(403, 'You do not have permission to access this page.');
            }
        }

        return $next($request);
    }
}
