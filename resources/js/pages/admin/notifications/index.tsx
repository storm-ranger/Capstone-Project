import AdminLayout from '@/layouts/admin-layout';
import { Head, router } from '@inertiajs/react';
import { Bell, Check, CheckCheck, Trash2, Truck, AlertTriangle, FileText, Clock, CheckCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    icon: string;
    icon_color: string;
    link: string | null;
    read_at: string | null;
    created_at: string;
}

interface PaginatedNotifications {
    data: Notification[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Props {
    notifications: PaginatedNotifications;
    unreadCount: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Truck: Truck,
    AlertTriangle: AlertTriangle,
    FileText: FileText,
    Clock: Clock,
    CheckCircle: CheckCircle,
    Package: Package,
    Bell: Bell,
};

const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
};

export default function NotificationsIndex({ notifications, unreadCount }: Props) {
    const markAsRead = (id: number) => {
        router.post(`/admin/notifications/${id}/read`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                window.dispatchEvent(new CustomEvent('notifications-updated'));
            },
        });
    };

    const markAllAsRead = () => {
        router.post('/admin/notifications/mark-all-read', {}, {
            preserveScroll: true,
            onSuccess: () => {
                window.dispatchEvent(new CustomEvent('notifications-updated'));
            },
        });
    };

    const deleteNotification = (id: number) => {
        if (confirm('Are you sure you want to delete this notification?')) {
            router.delete(`/admin/notifications/${id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    window.dispatchEvent(new CustomEvent('notifications-updated'));
                },
            });
        }
    };

    const deleteReadNotifications = () => {
        if (confirm('Are you sure you want to delete all read notifications?')) {
            router.delete('/admin/notifications/clear-read', {
                preserveScroll: true,
                onSuccess: () => {
                    window.dispatchEvent(new CustomEvent('notifications-updated'));
                },
            });
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        return date.toLocaleDateString();
    };

    const getIcon = (iconName: string) => {
        return iconMap[iconName] || Bell;
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Notifications', href: '/admin/notifications' },
            ]}
            title="Notifications"
        >
            <Head title="Notifications" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                        <p className="text-sm text-gray-500">
                            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={markAllAsRead}>
                                <CheckCheck className="h-4 w-4 mr-2" />
                                Mark All as Read
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={deleteReadNotifications}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Read
                        </Button>
                    </div>
                </div>

                {/* Notifications List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            All Notifications
                        </CardTitle>
                        <CardDescription>
                            {notifications.total} total notification{notifications.total !== 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {notifications.data.length === 0 ? (
                            <div className="text-center py-12">
                                <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {notifications.data.map((notification) => {
                                    const Icon = getIcon(notification.icon);
                                    const isUnread = !notification.read_at;

                                    return (
                                        <div
                                            key={notification.id}
                                            className={`flex items-start gap-4 py-4 ${isUnread ? 'bg-blue-50/50' : ''}`}
                                        >
                                            <div className={`flex-shrink-0 p-2 rounded-full ${colorMap[notification.icon_color] || colorMap.blue}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                                                            {notification.title}
                                                            {isUnread && (
                                                                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                                                                    New
                                                                </Badge>
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {formatTimeAgo(notification.created_at)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {notification.link && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (isUnread) markAsRead(notification.id);
                                                                    router.visit(notification.link!);
                                                                }}
                                                            >
                                                                View
                                                            </Button>
                                                        )}
                                                        {isUnread && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => markAsRead(notification.id)}
                                                                title="Mark as read"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-700"
                                                            onClick={() => deleteNotification(notification.id)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {notifications.last_page > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                                {notifications.links.map((link, index) => (
                                    <Button
                                        key={index}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
