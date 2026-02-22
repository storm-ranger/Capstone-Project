import { Head, Link, useForm } from '@inertiajs/react';
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

interface Props {
    provinces: Province[];
    areaGroups: AreaGroup[];
}

export default function AreasCreate({ provinces, areaGroups }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        province_id: '',
        area_group_id: '',
        name: '',
        code: '',
        is_active: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(areaRoutes.store.url());
    };

    return (
        <AdminLayout>
            <Head title="Create Area" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={areaRoutes.index.url()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Create Area</h1>
                        <p className="text-muted-foreground">
                            Add a new delivery area
                        </p>
                    </div>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Area Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="province_id">Province *</Label>
                                    <Select
                                        value={data.province_id}
                                        onValueChange={(value) => setData('province_id', value)}
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
                                    <Label htmlFor="code">Area Code *</Label>
                                    <Input
                                        id="code"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                        placeholder="e.g., CAL, SPC, STA"
                                        maxLength={10}
                                    />
                                    {errors.code && (
                                        <p className="text-sm text-destructive">{errors.code}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="area_group_id">Area Group (Rate)</Label>
                                    <Select
                                        value={data.area_group_id || 'none'}
                                        onValueChange={(value) => setData('area_group_id', value === 'none' ? '' : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select area group" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Group</SelectItem>
                                            {areaGroups.map((group) => (
                                                <SelectItem key={group.id} value={group.id.toString()}>
                                                    {group.name} (₱{parseFloat(group.base_rate).toLocaleString()})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.area_group_id && (
                                        <p className="text-sm text-destructive">{errors.area_group_id}</p>
                                    )}
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="name">Area Name *</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Enter area name"
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">{errors.name}</p>
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

                            <div className="flex gap-4">
                                <Button type="submit" disabled={processing}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {processing ? 'Saving...' : 'Save Area'}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={areaRoutes.index.url()}>
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
