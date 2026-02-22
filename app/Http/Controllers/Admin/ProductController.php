<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Product::query();

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('part_number', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $products = $query->orderBy('part_number')->paginate(10)->withQueryString();

        return Inertia::render('admin/master-data/products/index', [
            'products' => $products,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $clients = Client::where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'company_name']);
        
        return Inertia::render('admin/master-data/products/create', [
            'clients' => $clients,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'part_number' => ['required', 'string', 'max:50', 'unique:products,part_number'],
            'description' => ['nullable', 'string'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
            'client_ids' => ['nullable', 'array'],
            'client_ids.*' => ['exists:clients,id'],
        ]);

        $clientIds = $validated['client_ids'] ?? [];
        unset($validated['client_ids']);

        $product = Product::create($validated);
        
        if (!empty($clientIds)) {
            $product->clients()->attach($clientIds);
        }

        return redirect()->route('admin.master-data.products.index')
            ->with('success', 'Product created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        return Inertia::render('admin/master-data/products/show', [
            'product' => $product,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, Product $product)
    {
        $clients = Client::where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'company_name']);
        
        return Inertia::render('admin/master-data/products/edit', [
            'product' => $product->load('clients:id'),
            'clients' => $clients,
            'currentPage' => $request->query('page', 1),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'part_number' => ['required', 'string', 'max:50', Rule::unique('products')->ignore($product->id)],
            'description' => ['nullable', 'string'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
            'client_ids' => ['nullable', 'array'],
            'client_ids.*' => ['exists:clients,id'],
        ]);

        $clientIds = $validated['client_ids'] ?? [];
        unset($validated['client_ids']);

        $product->update($validated);
        $product->clients()->sync($clientIds);

        $page = $request->query('page', 1);
        return redirect()->route('admin.master-data.products.index', ['page' => $page])
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        $product->delete();

        return redirect()->route('admin.master-data.products.index')
            ->with('success', 'Product deleted successfully.');
    }
}
