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
import { Plus, Pencil, Trash2, Search, MapPin } from 'lucide-react';
import { useState, useCallback } from 'react';
import debounce from 'lodash/debounce';
import * as provinceRoutes from '@/routes/admin/master-data/provinces';

interface Province {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    areas_count: number;
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
    provinces: PaginatedData<Province>;
    filters: {
        search?: string;
        status?: string;
    };
}

export default function ProvincesIndex({ provinces, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [provinceToDelete, setProvinceToDelete] = useState<Province | null>(null);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                provinceRoutes.index.url({ query: { search: value, status: filters.status } }),
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
            provinceRoutes.index.url({ query: { search: filters.search, status: value === 'all' ? undefined : value } }),
            {},
            { preserveState: true, replace: true }
        );
    };

    const handleDelete = (province: Province) => {
        setProvinceToDelete(province);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (provinceToDelete) {
            router.delete(provinceRoutes.destroy.url(provinceToDelete.id), {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setProvinceToDelete(null);
                },
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="Provinces" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Provinces</h1>
                        <p className="text-muted-foreground">
                            Manage provinces for your delivery areas
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={provinceRoutes.create.url()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Province
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
                                    placeholder="Search provinces..."
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
                            <MapPin className="h-5 w-5" />
                            Province List
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Areas</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {provinces.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No provinces found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    provinces.data.map((province) => (
                                        <TableRow key={province.id}>
                                            <TableCell className="font-medium">
                                                {province.name}
                                            </TableCell>
                                            <TableCell>
                                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                                    {province.code}
                                                </code>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {province.areas_count}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={province.is_active ? 'default' : 'secondary'}
                                                >
                                                    {province.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <Link href={`${provinceRoutes.edit.url(province.id)}?page=${provinces.current_page}`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDelete(province)}
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
                                Showing {provinces.data.length} of {provinces.total} results
                            </p>
                            <Pagination links={provinces.links} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Province</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the province "{provinceToDelete?.name}"?
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
