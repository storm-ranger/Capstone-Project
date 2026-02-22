import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
import { useState, useCallback } from 'react';
import debounce from 'lodash/debounce';
import * as productRoutes from '@/routes/admin/master-data/products';

interface Product {
    id: number;
    part_number: string;
    description: string;
    unit_price: number;
    is_active: boolean;
}

interface PaginatedData<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Props {
    products: PaginatedData<Product>;
    filters: {
        search?: string;
        status?: string;
    };
}

export default function ProductsIndex({ products, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(value);
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                productRoutes.index.url({ query: { search: value, status: filters.status } }),
                {},
                { preserveState: true, replace: true }
            );
        }, 300),
        [filters.status]
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);
        debouncedSearch(value);
    };

    const handleStatusChange = (value: string) => {
        router.get(
            productRoutes.index.url({ query: { search: filters.search, status: value === 'all' ? undefined : value } }),
            {},
            { preserveState: true, replace: true }
        );
    };

    const handleDelete = (product: Product) => {
        setProductToDelete(product);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (productToDelete) {
            router.delete(productRoutes.destroy.url(productToDelete.id), {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setProductToDelete(null);
                },
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="Products" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
                        <p className="text-muted-foreground">
                            Manage product catalog and pricing
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={productRoutes.create.url()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                        </Link>
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search products..."
                                    value={search}
                                    onChange={handleSearchChange}
                                    className="pl-9"
                                />
                            </div>
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={handleStatusChange}
                            >
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Product List
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Part Number</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No products found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    products.data.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                                    {product.part_number}
                                                </code>
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[300px] truncate">
                                                {product.description}
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                {formatCurrency(product.unit_price)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={product.is_active ? 'default' : 'secondary'}
                                                >
                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <Link href={`${productRoutes.edit.url(product.id)}?page=${products.current_page}`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDelete(product)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {products.data.length} of {products.total} results
                            </p>
                            <Pagination links={products.links} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Product</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the product "{productToDelete?.part_number}"?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
