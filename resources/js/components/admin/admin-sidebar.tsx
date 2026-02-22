import { NavUser } from '@/components/nav-user';
import { type SharedData, type NavItem, type NavGroup } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Truck,
    Package,
    MapPin,
    Users,
    Building2,
    Database,
    FileText,
    BarChart3,
    ChevronDown,
    X,
    Layers,
    Route,
} from 'lucide-react';
import { useState, useMemo } from 'react';

interface AdminSidebarProps {
    isOpen: boolean;
    isCollapsed: boolean;
    onClose: () => void;
}

// Map routes to permission keys
const routePermissionMap: Record<string, string> = {
    '/admin/dashboard': 'dashboard',
    '/admin/delivery-orders': 'delivery-orders',
    '/admin/route-planner': 'route-planner',
    '/admin/allocation-planner': 'allocation-planner',
    '/admin/sales-tracking': 'sales-tracking',
    '/admin/master-data/provinces': 'master-data.provinces',
    '/admin/master-data/area-groups': 'master-data.area-groups',
    '/admin/master-data/areas': 'master-data.areas',
    '/admin/master-data/clients': 'master-data.clients',
    '/admin/master-data/products': 'master-data.products',
    '/admin/system/users': 'system.users',
    '/admin/system/backup': 'admin-only', // Admin only
};

const navigationGroups: NavGroup[] = [
    {
        title: 'Main',
        items: [
            { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        ],
    },
    {
        title: 'Master Data',
        items: [
            { title: 'Provinces', href: '/admin/master-data/provinces', icon: MapPin },
            { title: 'Area Groups', href: '/admin/master-data/area-groups', icon: Layers },
            { title: 'Areas/Zones', href: '/admin/master-data/areas', icon: Building2 },
            { title: 'Clients', href: '/admin/master-data/clients', icon: Users },
            { title: 'Products', href: '/admin/master-data/products', icon: Package },
        ],
    },
    {
        title: 'Operations',
        items: [
            { title: 'Delivery Monitoring', href: '/admin/delivery-orders', icon: Truck },
            { title: 'Route Planner', href: '/admin/route-planner', icon: Route },
            { title: 'Allocation Planner', href: '/admin/allocation-planner', icon: Truck },
            { title: 'Sales Tracking', href: '/admin/sales-tracking', icon: BarChart3 },
        ],
    },
    {
        title: 'System',
        items: [
            { title: 'Users', href: '/admin/system/users', icon: Users },
            { title: 'Backup Database', href: '/admin/system/backup', icon: Database },
        ],
    },
];

export function AdminSidebar({ isOpen, isCollapsed, onClose }: AdminSidebarProps) {
    const { auth } = usePage<SharedData>().props;
    const currentPath = window.location.pathname;
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['Main', 'Master Data', 'Operations']);

    const userPermissions = (auth as any).permissions || [];
    const isAdmin = (auth as any).isAdmin || false;

    // Filter navigation groups based on user permissions
    const filteredNavigationGroups = useMemo(() => {
        return navigationGroups
            .map(group => ({
                ...group,
                items: group.items.filter(item => {
                    const permission = routePermissionMap[item.href as string];
                    // If no permission mapping, allow access
                    if (!permission) return true;
                    // Admin-only pages
                    if (permission === 'admin-only') return isAdmin;
                    // Admins see everything
                    if (isAdmin) return true;
                    // Check if user has permission
                    return userPermissions.includes(permission);
                }),
            }))
            .filter(group => group.items.length > 0); // Remove empty groups
    }, [userPermissions, isAdmin]);

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev =>
            prev.includes(title)
                ? prev.filter(g => g !== title)
                : [...prev, title]
        );
    };

    const isActiveLink = (href: string) => currentPath === href || currentPath.startsWith(href + '/');

    return (
        <aside
            className={`fixed top-0 left-0 z-30 h-full bg-[#343a40] text-white transition-all duration-300 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
        >
            {/* Brand/Logo */}
            <div className="flex h-16 items-center justify-between border-b border-gray-700 px-4">
                {!isCollapsed && (
                    <Link href="/admin/dashboard" className="flex items-center gap-2">
                        <img src="/images/logo.png" alt="DSS Logo" className="h-10 w-auto" />
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-white">DSS</span>
                            <span className="text-[10px] text-gray-400">Logistics System</span>
                        </div>
                    </Link>
                )}
                {isCollapsed && (
                    <Link href="/admin/dashboard" className="mx-auto">
                        <img src="/images/logo.png" alt="DSS Logo" className="h-9 w-auto" />
                    </Link>
                )}
                <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* User Info */}
            <div className="border-b border-gray-700 p-4">
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-medium">
                        {auth.user.name.charAt(0).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">{auth.user.name}</span>
                            <span className="text-xs text-gray-400 capitalize">{auth.user.role}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="h-[calc(100vh-180px)] overflow-y-auto p-2">
                {filteredNavigationGroups.map((group) => (
                    <div key={group.title} className="mb-2">
                        {!isCollapsed && (
                            <button
                                onClick={() => toggleGroup(group.title)}
                                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white"
                            >
                                {group.title}
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform ${
                                        expandedGroups.includes(group.title) ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>
                        )}

                        {(isCollapsed || expandedGroups.includes(group.title)) && (
                            <ul className="space-y-1">
                                {group.items.map((item) => (
                                    <li key={item.title}>
                                        <Link
                                            href={item.href}
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                                isActiveLink(item.href as string)
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                            } ${isCollapsed ? 'justify-center' : ''}`}
                                            title={isCollapsed ? item.title : undefined}
                                        >
                                            {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
                                            {!isCollapsed && <span>{item.title}</span>}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </nav>
        </aside>
    );
}
