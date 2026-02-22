import { Head, Link, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as clientRoutes from '@/routes/admin/master-data/clients';

interface Province {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
    province_id: number;
}

interface Props {
    provinces: Province[];
}

export default function ClientsCreate({ provinces }: Props) {
    const [areas, setAreas] = useState<Area[]>([]);
    const [loadingAreas, setLoadingAreas] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        code: '',
        province_id: '',
        area_id: '',
        cutoff_time: '',
        distance_km: '',
        contact_person: '',
        contact_number: '',
        email: '',
        is_active: true,
    });

    useEffect(() => {
        if (data.province_id) {
            setLoadingAreas(true);
            fetch(`/admin/master-data/provinces/${data.province_id}/areas`)
                .then(res => res.json())
                .then((data: Area[]) => {
                    setAreas(data);
                    setLoadingAreas(false);
                })
                .catch(() => {
                    setAreas([]);
                    setLoadingAreas(false);
                });
        } else {
            setAreas([]);
        }
    }, [data.province_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(clientRoutes.store.url());
    };

    return (
        <AdminLayout>
            <Head title="Create Client" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={clientRoutes.index.url()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Create Client</h1>
                        <p className="text-muted-foreground">
                            Add a new client to the system
                        </p>
                    </div>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Client Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Client Code *</Label>
                                    <Input
                                        id="code"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                        placeholder="e.g., CLIENT001"
                                        maxLength={20}
                                    />
                                    {errors.code && (
                                        <p className="text-sm text-destructive">{errors.code}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="province_id">Province *</Label>
                                    <Select
                                        value={data.province_id}
                                        onValueChange={(value) => {
                                            setData('province_id', value);
                                            setData('area_id', '');
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select province" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {provinces.map((province) => (
                                                <SelectItem key={province.id} value={province.id.toString()}>
                                                    {province.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.province_id && (
                                        <p className="text-sm text-destructive">{errors.province_id}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="area_id">Area</Label>
                                    <Select
                                        value={data.area_id}
                                        onValueChange={(value) => setData('area_id', value)}
                                        disabled={!data.province_id || loadingAreas}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingAreas ? "Loading..." : "Select area"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {areas.map((area) => (
                                                <SelectItem key={area.id} value={area.id.toString()}>
                                                    {area.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.area_id && (
                                        <p className="text-sm text-destructive">{errors.area_id}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cutoff_time">Cut-off Time</Label>
                                    <Input
                                        id="cutoff_time"
                                        type="time"
                                        value={data.cutoff_time}
                                        onChange={(e) => setData('cutoff_time', e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">Delivery cut-off time for this client</p>
                                    {errors.cutoff_time && (
                                        <p className="text-sm text-destructive">{errors.cutoff_time}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="distance_km">Distance (km)</Label>
                                    <Input
                                        id="distance_km"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.distance_km}
                                        onChange={(e) => setData('distance_km', e.target.value)}
                                        placeholder="Distance from warehouse"
                                    />
                                    {errors.distance_km && (
                                        <p className="text-sm text-destructive">{errors.distance_km}</p>
                                    )}
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="border-t pt-6">
                                <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                                <div className="grid gap-6 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="contact_person">Contact Person</Label>
                                        <Input
                                            id="contact_person"
                                            value={data.contact_person}
                                            onChange={(e) => setData('contact_person', e.target.value)}
                                            placeholder="Enter contact name"
                                        />
                                        {errors.contact_person && (
                                            <p className="text-sm text-destructive">{errors.contact_person}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="contact_number">Contact Number</Label>
                                        <Input
                                            id="contact_number"
                                            value={data.contact_number}
                                            onChange={(e) => setData('contact_number', e.target.value)}
                                            placeholder="e.g., +63 917 123 4567"
                                        />
                                        {errors.contact_number && (
                                            <p className="text-sm text-destructive">{errors.contact_number}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="Enter email address"
                                        />
                                        {errors.email && (
                                            <p className="text-sm text-destructive">{errors.email}</p>
                                        )}
                                    </div>
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

                            <div className="flex gap-4">
                                <Button type="submit" disabled={processing}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {processing ? 'Saving...' : 'Save Client'}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={clientRoutes.index.url()}>
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
