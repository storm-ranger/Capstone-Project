import { type BreadcrumbItem, type SharedData } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import {
    Menu,
    Bell,
    ChevronRight,
    User,
    LogOut,
    Settings,
    Truck,
    AlertTriangle,
    FileText,
    Clock,
    CheckCircle,
    Package,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    icon: string;
    icon_color: string;
    link: string | null;
    read_at: string | null;
    time_ago: string;
}

interface AdminHeaderProps {
    onToggleSidebar: () => void;
    onMobileMenuToggle: () => void;
    breadcrumbs?: BreadcrumbItem[];
    title?: string;
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

export function AdminHeader({ onToggleSidebar, onMobileMenuToggle, breadcrumbs, title }: AdminHeaderProps) {
    const { auth } = usePage<SharedData>().props;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        
        // Listen for notification updates from other components
        const handleNotificationsUpdated = () => {
            fetchNotifications();
        };
        window.addEventListener('notifications-updated', handleNotificationsUpdated);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('notifications-updated', handleNotificationsUpdated);
        };
    }, []);

    const getCSRFToken = () => {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    };

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/admin/notifications/recent', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch('/admin/notifications/mark-all-read', { 
                method: 'POST', 
                headers: { 
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            if (response.ok) {
                setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to mark notifications as read:', error);
        }
    };

    const getIcon = (iconName: string) => {
        return iconMap[iconName] || Bell;
    };

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
            {/* Left Side */}
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMobileMenuToggle}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Desktop Sidebar Toggle */}
                <button
                    onClick={onToggleSidebar}
                    className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:block"
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Breadcrumbs */}
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="hidden items-center gap-2 text-sm md:flex">
                        <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700">
                            Home
                        </Link>
                        {breadcrumbs.map((item, index) => (
                            <span key={index} className="flex items-center gap-2">
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                {index === breadcrumbs.length - 1 ? (
                                    <span className="font-medium text-gray-900">{item.title}</span>
                                ) : (
                                    <Link href={item.href} className="text-gray-500 hover:text-gray-700">
                                        {item.title}
                                    </Link>
                                )}
                            </span>
                        ))}
                    </nav>
                )}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <span className="font-semibold">Notifications</span>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    Loading...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    No notifications
                                </div>
                            ) : (
                                notifications.map((notification) => {
                                    const Icon = getIcon(notification.icon);
                                    return (
                                        <DropdownMenuItem 
                                            key={notification.id}
                                            className={`flex items-start gap-3 p-4 cursor-pointer ${!notification.read_at ? 'bg-blue-50' : ''}`}
                                            onClick={() => notification.link && router.visit(notification.link)}
                                        >
                                            <div className={`flex-shrink-0 p-1.5 rounded-full ${colorMap[notification.icon_color] || colorMap.blue}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-sm ${!notification.read_at ? 'font-semibold' : 'font-medium'} block truncate`}>
                                                    {notification.title}
                                                </span>
                                                <span className="text-xs text-gray-500">{notification.time_ago}</span>
                                            </div>
                                        </DropdownMenuItem>
                                    );
                                })
                            )}
                        </div>
                        <div className="border-t p-2">
                            <Link
                                href="/admin/notifications"
                                className="block w-full rounded-lg bg-gray-100 py-2 text-center text-sm font-medium hover:bg-gray-200"
                            >
                                View All Notifications
                            </Link>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 rounded-lg p-2 hover:bg-gray-100">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                                {auth.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden flex-col items-start md:flex">
                                <span className="text-sm font-medium text-gray-700">{auth.user.name}</span>
                                <span className="text-xs capitalize text-gray-500">{auth.user.role}</span>
                            </div>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <div className="border-b px-4 py-3">
                            <p className="text-sm font-medium">{auth.user.name}</p>
                            <p className="text-xs text-gray-500">{auth.user.email}</p>
                        </div>
                        <DropdownMenuItem asChild>
                            <Link href="/logout" method="post" as="button" className="flex w-full items-center gap-2 text-red-600">
                                <LogOut className="h-4 w-4" />
                                Logout
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
