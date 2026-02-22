<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AreaGroup;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AreaGroupController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = AreaGroup::withCount('areas');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $areaGroups = $query->orderBy('name')->paginate(10)->withQueryString();

        return Inertia::render('admin/master-data/area-groups/index', [
            'areaGroups' => $areaGroups,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('admin/master-data/area-groups/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:area_groups,code',
            'description' => 'nullable|string',
            'base_rate' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        AreaGroup::create($validated);

        return redirect()->route('admin.master-data.area-groups.index')
            ->with('success', 'Area group created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, AreaGroup $areaGroup)
    {
        return Inertia::render('admin/master-data/area-groups/edit', [
            'areaGroup' => $areaGroup,
            'currentPage' => $request->query('page', 1),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AreaGroup $areaGroup)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:area_groups,code,' . $areaGroup->id,
            'description' => 'nullable|string',
            'base_rate' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $areaGroup->update($validated);

        $page = $request->query('page', 1);
        return redirect()->route('admin.master-data.area-groups.index', ['page' => $page])
            ->with('success', 'Area group updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AreaGroup $areaGroup)
    {
        if ($areaGroup->areas()->count() > 0) {
            return back()->with('error', 'Cannot delete area group with associated areas.');
        }

        $areaGroup->delete();

        return redirect()->route('admin.master-data.area-groups.index')
            ->with('success', 'Area group deleted successfully.');
    }
}
