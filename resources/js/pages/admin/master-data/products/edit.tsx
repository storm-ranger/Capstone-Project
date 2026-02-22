import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useState } from 'react';
import * as productRoutes from '@/routes/admin/master-data/products';

interface Client {
    id: number;
    code: string;
    company_name: string;
}

interface Product {
    id: number;
    part_number: string;
    description: string;
    unit_price: number;
    category: string | null;
    is_active: boolean;
    clients: { id: number }[];
}

interface Props {
    product: Product;
    clients: Client[];
    currentPage: number;
}

export default function ProductsEdit({ product, clients, currentPage }: Props) {
    const [clientSearch, setClientSearch] = useState('');
    
    const { data, setData, put, processing, errors } = useForm({
        part_number: product.part_number,
        description: product.description || '',
        unit_price: product.unit_price.toString(),
        is_active: product.is_active,
        client_ids: product.clients?.map(c => c.id) || [],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`${productRoutes.update.url(product.id)}?page=${currentPage}`);
    };

    const toggleClient = (clientId: number) => {
        const currentIds = data.client_ids;
        if (currentIds.includes(clientId)) {
            setData('client_ids', currentIds.filter(id => id !== clientId));
        } else {
            setData('client_ids', [...currentIds, clientId]);
        }
    };

    const removeClient = (clientId: number) => {
        setData('client_ids', data.client_ids.filter(id => id !== clientId));
    };

    const filteredClients = clients.filter(client => 
        client.code?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        client.company_name?.toLowerCase().includes(clientSearch.toLowerCase())
    );

    const selectedClients = clients.filter(client => data.client_ids.includes(client.id));

    return (
        <AdminLayout>
            <Head title="Edit Product" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={`${productRoutes.index.url()}?page=${currentPage}`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
                        <p className="text-muted-foreground">
                            Update product information
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Product Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="part_number">Part Number *</Label>
                                    <Input
                                        id="part_number"
                                        value={data.part_number}
                                        onChange={(e) => setData('part_number', e.target.value.toUpperCase())}
                                        placeholder="e.g., PROD-001"
                                        maxLength={50}
                                    />
                                    {errors.part_number && (
                                        <p className="text-sm text-destructive">{errors.part_number}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="unit_price">Unit Price (PHP) *</Label>
                                    <Input
                                        id="unit_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.unit_price}
                                        onChange={(e) => setData('unit_price', e.target.value)}
                                        placeholder="0.00"
                                    />
                                    {errors.unit_price && (
                                        <p className="text-sm text-destructive">{errors.unit_price}</p>
                                    )}
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Enter product description (optional)"
                                        rows={3}
                                    />
                                    {errors.description && (
                                        <p className="text-sm text-destructive">{errors.description}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) =>
                                        setData('is_active', checked as boolean)
                                    }
                                />
                                <Label htmlFor="is_active" className="cursor-pointer">
                                    Active
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Client Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Linked Clients</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Selected Clients */}
                            {selectedClients.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Selected Clients ({selectedClients.length})</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedClients.map(client => (
                                            <Badge key={client.id} variant="secondary" className="flex items-center gap-1">
                                                {client.code} - {client.company_name}
                                                <button
                                                    type="button"
                                                    onClick={() => removeClient(client.id)}
                                                    className="ml-1 hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search */}
                            <div className="space-y-2">
                                <Label htmlFor="client_search">Search Clients</Label>
                                <Input
                                    id="client_search"
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    placeholder="Search by code or company name..."
                                />
                            </div>

                            {/* Client List */}
                            <div className="border rounded-md max-h-[300px] overflow-y-auto">
                                {filteredClients.length === 0 ? (
                                    <p className="p-4 text-center text-muted-foreground">No clients found</p>
                                ) : (
                                    <div className="divide-y">
                                        {filteredClients.map(client => (
                                            <label
                                                key={client.id}
                                                className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
                                            >
                                                <Checkbox
                                                    checked={data.client_ids.includes(client.id)}
                                                    onCheckedChange={() => toggleClient(client.id)}
                                                />
                                                <div>
                                                    <span className="font-medium">{client.code}</span>
                                                    <span className="text-muted-foreground ml-2">
                                                        {client.company_name}
                                                    </span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {errors.client_ids && (
                                <p className="text-sm text-destructive">{errors.client_ids}</p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex gap-4">
                        <Button type="submit" disabled={processing}>
                            <Save className="mr-2 h-4 w-4" />
                            {processing ? 'Saving...' : 'Update Product'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={productRoutes.index.url()}>
                                Cancel
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
