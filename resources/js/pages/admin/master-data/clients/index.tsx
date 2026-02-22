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
import { Plus, Pencil, Trash2, Search, Building2, Eye } from 'lucide-react';
import { useState, useCallback } from 'react';
import debounce from 'lodash/debounce';
import * as clientRoutes from '@/routes/admin/master-data/clients';

interface Province {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
}

interface Client {
    id: number;
    code: string;
    cutoff_time: string | null;
    distance_km: number | null;
    contact_person: string | null;
    contact_number: string | null;
    email: string | null;
    is_active: boolean;
    province: Province;
    area: Area | null;
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
    clients: PaginatedData<Client>;
    provinces: Province[];
    areas: Area[];
    filters: {
        search?: string;
        province_id?: string;
        area_id?: string;
        status?: string;
    };
}

export default function ClientsIndex({ clients, provinces, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                clientRoutes.index.url({ query: { search: value, province_id: filters.province_id, area_id: filters.area_id, status: filters.status } }),
                {},
                { preserveState: true, replace: true }
            );
        }, 300),
        [filters.province_id, filters.area_id, filters.status]
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);
        debouncedSearch(value);
    };

    const handleProvinceChange = (value: string) => {
        router.get(
            clientRoutes.index.url({ query: { search: filters.search, province_id: value === 'all' ? undefined : value, area_id: filters.area_id, status: filters.status } }),
            {},
            { preserveState: true, replace: true }
        );
    };

    const handleStatusChange = (value: string) => {
        router.get(
            clientRoutes.index.url({ query: { search: filters.search, province_id: filters.province_id, area_id: filters.area_id, status: value === 'all' ? undefined : value } }),
            {},
            { preserveState: true, replace: true }
        );
    };

    const handleDelete = (client: Client) => {
        setClientToDelete(client);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (clientToDelete) {
            router.delete(clientRoutes.destroy.url(clientToDelete.id), {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setClientToDelete(null);
                },
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="Clients" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
                        <p className="text-muted-foreground">
                            Manage client information and delivery locations
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={clientRoutes.create.url()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Client
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
                                    placeholder="Search clients..."
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
                            <Building2 className="h-5 w-5" />
                            Client List
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Province</TableHead>
                                    <TableHead>Area</TableHead>
                                    <TableHead>Contact Person</TableHead>
                                    <TableHead>Distance (km)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clients.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No clients found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    clients.data.map((client) => (
                                        <TableRow key={client.id}>
                                            <TableCell>
                                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                                    {client.code}
                                                </code>
                                            </TableCell>
                                            <TableCell>{client.province.name}</TableCell>
                                            <TableCell>{client.area?.name || '-'}</TableCell>
                                            <TableCell>{client.contact_person || '-'}</TableCell>
                                            <TableCell>
                                                {client.distance_km ? `${client.distance_km}` : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={client.is_active ? 'default' : 'secondary'}
                                                >
                                                    {client.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <Link href={clientRoutes.show.url(client.id)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <Link href={`${clientRoutes.edit.url(client.id)}?page=${clients.current_page}`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDelete(client)}
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
                                Showing {clients.data.length} of {clients.total} results
                            </p>
                            <Pagination links={clients.links} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Client</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the client "{clientToDelete?.code}"?
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
