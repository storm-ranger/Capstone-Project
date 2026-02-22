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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Save, Shield, User as UserIcon } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'staff';
    permissions: string[] | null;
}

interface Props {
    user: User;
    availablePermissions: Record<string, string>;
}

export default function UsersEdit({ user, availablePermissions }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        role: user.role as 'admin' | 'staff',
        permissions: user.permissions || [] as string[],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/admin/system/users/${user.id}`);
    };

    const togglePermission = (permission: string) => {
        if (data.permissions.includes(permission)) {
            setData('permissions', data.permissions.filter(p => p !== permission));
        } else {
            setData('permissions', [...data.permissions, permission]);
        }
    };

    const selectAllPermissions = () => {
        setData('permissions', Object.keys(availablePermissions));
    };

    const clearAllPermissions = () => {
        setData('permissions', []);
    };

    return (
        <AdminLayout>
            <Head title={`Edit User - ${user.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/admin/system/users">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Edit User</h1>
                        <p className="text-muted-foreground">
                            Update user information for {user.name}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Information</CardTitle>
                            <CardDescription>
                                Update the user's basic information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="John Doe"
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">{errors.name}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="john@example.com"
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-destructive">{errors.email}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Role *</Label>
                                <Select
                                    value={data.role}
                                    onValueChange={(value) => setData('role', value as 'admin' | 'staff')}
                                >
                                    <SelectTrigger className="w-full sm:w-[300px]">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4" />
                                                <span>Admin</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="staff">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="h-4 w-4" />
                                                <span>Staff</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.role && (
                                    <p className="text-sm text-destructive">{errors.role}</p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                    Admin has full access to all pages. Staff access is limited to selected pages below.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Permissions - Only show for staff role */}
                    {data.role === 'staff' && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Page Access</CardTitle>
                                        <CardDescription>
                                            Select which pages this user can access
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions}>
                                            Select All
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={clearAllPermissions}>
                                            Clear All
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {Object.entries(availablePermissions).map(([key, label]) => (
                                        <div key={key} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`perm-${key}`}
                                                checked={data.permissions.includes(key)}
                                                onCheckedChange={() => togglePermission(key)}
                                            />
                                            <Label 
                                                htmlFor={`perm-${key}`} 
                                                className="text-sm font-normal cursor-pointer"
                                            >
                                                {label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                                {errors.permissions && (
                                    <p className="text-sm text-destructive mt-2">{errors.permissions}</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>
                                Leave blank to keep the current password
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                    />
                                    {errors.password && (
                                        <p className="text-sm text-destructive">{errors.password}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={processing}>
                            <Save className="mr-2 h-4 w-4" />
                            Update User
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/admin/system/users">Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
