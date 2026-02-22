import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Pencil, Building2, MapPin, Phone, Mail, Clock } from 'lucide-react';
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
    province_id: number;
    area_id: number | null;
    cutoff_time: string | null;
    distance_km: number | null;
    contact_person: string | null;
    contact_number: string | null;
    email: string | null;
    is_active: boolean;
    province: Province;
    area: Area | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    client: Client;
}

export default function ClientsShow({ client }: Props) {
    return (
        <AdminLayout>
            <Head title={`Client: ${client.code}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" asChild>
                            <Link href={clientRoutes.index.url()}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{client.code}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant={client.is_active ? 'default' : 'secondary'}>
                                    {client.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <Button asChild>
                        <Link href={clientRoutes.edit.url(client.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Client
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Location Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Location Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Province</p>
                                    <p className="font-medium">{client.province.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Area</p>
                                    <p className="font-medium">{client.area?.name || '-'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Distance</p>
                                    <p className="font-medium">
                                        {client.distance_km ? `${client.distance_km} km` : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Cut-off Time</p>
                                    <p className="font-medium">{client.cutoff_time || '-'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Contact Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Contact Person</p>
                                <p className="font-medium">{client.contact_person || '-'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{client.contact_number || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{client.email || '-'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Metadata */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Record Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Created At</p>
                                    <p className="font-medium">
                                        {new Date(client.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Updated At</p>
                                    <p className="font-medium">
                                        {new Date(client.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
