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
import { Plus, Pencil, Trash2, Search, Map } from 'lucide-react';
import { useState, useCallback } from 'react';
import debounce from 'lodash/debounce';
import * as areaRoutes from '@/routes/admin/master-data/areas';

interface Province {
    id: number;
    name: string;
}

interface AreaGroup {
    id: number;
    name: string;
    base_rate: string;
}

interface Area {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    clients_count: number;
    province: Province;
    area_group: AreaGroup | null;
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
    areas: PaginatedData<Area>;
    provinces: Province[];
    areaGroups: AreaGroup[];
    filters: {
        search?: string;
        province_id?: string;
        area_group_id?: string;
        status?: string;
    };
}

export default function AreasIndex({ areas, provinces, areaGroups, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                areaRoutes.index.url({ query: { search: value, province_id: filters.province_id, area_group_id: filters.area_group_id, status: filters.status } }),
                {},
                { preserveState: true, replace: true }
            );
        }, 300),
        [filters.province_id, filters.area_group_id, filters.status]
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);
        debouncedSearch(value);
    };

    const handleProvinceChange = (value: string) => {
        router.get(
            areaRoutes.index.url({ query: { search: filters.search, province_id: value === 'all' ? undefined : value, area_group_id: filters.area_group_id, status: filters.status } }),
            {},
            { preserveState: true, replace: true }
        );
    };

    const handleAreaGroupChange = (value: string) => {
        router.get(
            areaRoutes.index.url({ query: { search: filters.search, province_id: filters.province_id, area_group_id: value === 'all' ? undefined : value, status: filters.status } }),
            {},
            { preserveState: true, replace: true }
        );
    };

    const handleStatusChange = (value: string) => {
        router.get(
            areaRoutes.index.url({ query: { search: filters.search, province_id: filters.province_id, area_group_id: filters.area_group_id, status: value === 'all' ? undefined : value } }),
            {},
            { preserveState: true, replace: true }
        );
    };

    const handleDelete = (area: Area) => {
        setAreaToDelete(area);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (areaToDelete) {
            router.delete(areaRoutes.destroy.url(areaToDelete.id), {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setAreaToDelete(null);
                },
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="Areas" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Areas</h1>
                        <p className="text-muted-foreground">
                            Manage delivery areas within provinces
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={areaRoutes.create.url()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Area
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
                                    placeholder="Search areas..."
                                    value={search}
                                    onChange={handleSearchChange}
                                    className="pl-9"
                                />
                            </div>
                            <Select
                                value={filters.province_id || 'all'}
                                onValueChange={handleProvinceChange}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Province" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Provinces</SelectItem>
                                    {provinces.map((province) => (
                                        <SelectItem key={province.id} value={province.id.toString()}>
                                            {province.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.area_group_id || 'all'}
                                onValueChange={handleAreaGroupChange}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Area Group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Area Groups</SelectItem>
                                    {areaGroups.map((group) => (
                                        <SelectItem key={group.id} value={group.id.toString()}>
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                            <Map className="h-5 w-5" />
                            Area List
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Province</TableHead>
                                    <TableHead>Area Group</TableHead>
                                    <TableHead>Clients</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {areas.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No areas found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    areas.data.map((area) => (
                                        <TableRow key={area.id}>
                                            <TableCell className="font-medium">
                                                {area.name}
                                            </TableCell>
                                            <TableCell>
                                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                                    {area.code}
                                                </code>
                                            </TableCell>
                                            <TableCell>{area.province.name}</TableCell>
                                            <TableCell>
                                                {area.area_group ? (
                                                    <span className="text-sm">
                                                        {area.area_group.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {area.clients_count}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={area.is_active ? 'default' : 'secondary'}
                                                >
                                                    {area.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <Link href={`${areaRoutes.edit.url(area.id)}?page=${areas.current_page}`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDelete(area)}
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
                                Showing {areas.data.length} of {areas.total} results
                            </p>
                            <Pagination links={areas.links} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Area</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the area "{areaToDelete?.name}"?
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
