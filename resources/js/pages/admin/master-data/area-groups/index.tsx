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
import { Pagination } from '@/components/ui/pagination';
import { Plus, Pencil, Trash2, Search, Layers } from 'lucide-react';
import { useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import * as areaGroupRoutes from '@/routes/admin/master-data/area-groups';

interface AreaGroup {
    id: number;
    name: string;
    code: string;
    description: string | null;
    base_rate: string;
    is_active: boolean;
    areas_count: number;
    created_at: string;
}

interface PaginatedData {
    data: AreaGroup[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
}

interface Props {
    areaGroups: PaginatedData;
    filters: {
        search?: string;
        status?: string;
    };
}

export default function AreaGroupsIndex({ areaGroups, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                areaGroupRoutes.index.url(),
                { ...filters, search: value || undefined },
                { preserveState: true, replace: true }
            );
        }, 300),
        [filters]
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);
        debouncedSearch(value);
    };

    const handleStatusChange = (value: string) => {
        router.get(
            areaGroupRoutes.index.url(),
            { ...filters, status: value === 'all' ? undefined : value },
            { preserveState: true, replace: true }
        );
    };

    const handleDelete = (areaGroup: AreaGroup) => {
        if (confirm(`Are you sure you want to delete "${areaGroup.name}"?`)) {
            router.delete(areaGroupRoutes.destroy.url(areaGroup.id));
        }
    };

    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(num);
    };

    return (
        <AdminLayout>
            <Head title="Area Groups" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Area Groups</h1>
                        <p className="text-muted-foreground">
                            Manage area groups and their base rates
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={areaGroupRoutes.create.url()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Area Group
                        </Link>
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search area groups..."
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

                {/* Table */}
                <div className="rounded-lg border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Base Rate</TableHead>
                                <TableHead>Areas</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {areaGroups.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        <Layers className="mx-auto mb-2 h-8 w-8 opacity-50" />
                                        No area groups found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                areaGroups.data.map((areaGroup) => (
                                    <TableRow key={areaGroup.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{areaGroup.name}</p>
                                                {areaGroup.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                                        {areaGroup.description}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                                                {areaGroup.code}
                                            </code>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {formatCurrency(areaGroup.base_rate)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                                                {areaGroup.areas_count}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                    areaGroup.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {areaGroup.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="icon" asChild>
                                                    <Link href={`${areaGroupRoutes.edit.url(areaGroup.id)}?page=${areaGroups.current_page}`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleDelete(areaGroup)}
                                                    disabled={areaGroup.areas_count > 0}
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
                </div>

                {/* Pagination */}
                {areaGroups.last_page > 1 && (
                    <Pagination links={areaGroups.links} />
                )}
            </div>
        </AdminLayout>
    );
}
