import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Database, Download, Trash2, Plus, HardDrive, Clock } from 'lucide-react';
import { useState } from 'react';

interface Backup {
    filename: string;
    size: string;
    size_bytes: number;
    created_at: string;
}

interface Props {
    backups: Backup[];
}

export default function BackupIndex({ backups }: Props) {
    const [creating, setCreating] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [backupToDelete, setBackupToDelete] = useState<Backup | null>(null);

    const handleCreate = () => {
        setCreating(true);
        router.post('/admin/system/backup', {}, {
            onFinish: () => setCreating(false),
        });
    };

    const handleDownload = (filename: string) => {
        window.location.href = `/admin/system/backup/${filename}/download`;
    };

    const handleDelete = (backup: Backup) => {
        setBackupToDelete(backup);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (backupToDelete) {
            router.delete(`/admin/system/backup/${backupToDelete.filename}`, {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setBackupToDelete(null);
                },
            });
        }
    };

    const totalSize = backups.reduce((acc, b) => acc + b.size_bytes, 0);
    const formatTotalSize = (bytes: number) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let pow = Math.floor((bytes ? Math.log(bytes) : 0) / Math.log(1024));
        pow = Math.min(pow, units.length - 1);
        const size = bytes / Math.pow(1024, pow);
        return size.toFixed(2) + ' ' + units[pow];
    };

    return (
        <AdminLayout>
            <Head title="Database Backup" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Database Backup</h1>
                        <p className="text-muted-foreground">
                            Create and manage database backups
                        </p>
                    </div>
                    <Button onClick={handleCreate} disabled={creating}>
                        <Plus className="mr-2 h-4 w-4" />
                        {creating ? 'Creating...' : 'Create Backup'}
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                    <Database className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Backups</p>
                                    <p className="text-2xl font-bold">{backups.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                                    <HardDrive className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Size</p>
                                    <p className="text-2xl font-bold">{formatTotalSize(totalSize)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Last Backup</p>
                                    <p className="text-2xl font-bold">
                                        {backups.length > 0 
                                            ? new Date(backups[0].created_at).toLocaleDateString()
                                            : 'Never'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Backups Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Backup Files
                        </CardTitle>
                        <CardDescription>
                            List of all database backup files
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Filename</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {backups.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No backups found. Create your first backup.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    backups.map((backup) => (
                                        <TableRow key={backup.filename}>
                                            <TableCell className="font-medium">
                                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                                    {backup.filename}
                                                </code>
                                            </TableCell>
                                            <TableCell>{backup.size}</TableCell>
                                            <TableCell>
                                                {new Date(backup.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDownload(backup.filename)}
                                                        title="Download"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDelete(backup)}
                                                        className="text-destructive hover:text-destructive"
                                                        title="Delete"
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
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Backup</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{backupToDelete?.filename}"?
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
