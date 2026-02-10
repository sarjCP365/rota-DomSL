/**
 * SideNav Component
 * Left navigation panel with collapsible sections
 * Design aligned with cp365-complex-ld (dark slate sidebar with emerald accents)
 */

import { Link, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  Calendar,
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  Clock,
  Users,
  UserCog,
  Building2,
  X,
  Home,
  Menu,
  Layers,
  Settings,
  BarChart2,
  MapPin,
  ArrowLeftRight,
  ClipboardList,
  Sliders,
  Scale,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useUserDisplayName } from '@/hooks/useAuth';

/**
 * Navigation item interface
 */
interface NavItem {
  name: string;
  type: 'heading' | 'childlink';
  disabled: boolean;
  route?: string;
  action?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
}

/**
 * Navigation items matching cp365-complex-ld structure
 */
const navigationItems: NavItem[] = [
  { name: 'Dashboard', type: 'childlink', disabled: false, route: '/', icon: Home },
  { name: 'Rota Management', type: 'heading', disabled: false },
  { name: 'Daily', type: 'childlink', disabled: false, route: '/daily', icon: CalendarCheck },
  { name: 'Weekly', type: 'childlink', disabled: false, route: '/rota/7', icon: Calendar },
  { name: 'Monthly', type: 'childlink', disabled: false, route: '/rota/28', icon: CalendarDays },
  {
    name: 'Shift Patterns',
    type: 'childlink',
    disabled: false,
    route: '/patterns',
    icon: CalendarClock,
  },
  { name: 'Domiciliary', type: 'heading', disabled: false },
  {
    name: 'Service User Rota',
    type: 'childlink',
    disabled: false,
    route: '/domiciliary',
    icon: UserCog,
  },
  {
    name: 'Staff Availability',
    type: 'childlink',
    disabled: false,
    route: '/staff-availability',
    icon: CalendarClock,
  },
  {
    name: 'Round Planning',
    type: 'childlink',
    disabled: false,
    route: '/round-planning',
    icon: MapPin,
  },
  {
    name: 'Staff Schedule',
    type: 'childlink',
    disabled: false,
    route: '/staff-schedule',
    icon: Clock,
  },
  { name: 'Shift Management', type: 'heading', disabled: false },
  {
    name: 'Swap Requests',
    type: 'childlink',
    disabled: false,
    route: '/requests',
    icon: ArrowLeftRight,
  },
  {
    name: 'Open Shifts',
    type: 'childlink',
    disabled: false,
    route: '/open-shifts',
    icon: ClipboardList,
  },
  {
    name: 'Swap History',
    type: 'childlink',
    disabled: false,
    route: '/reports/swap-history',
    icon: BarChart2,
  },
  { name: 'Administration', type: 'heading', disabled: false },
  {
    name: 'Employee details',
    type: 'childlink',
    disabled: false,
    route: '/staff-capabilities',
    icon: Users,
  },
  {
    name: 'Service user details',
    type: 'childlink',
    disabled: false,
    route: '/service-users',
    icon: UserCog,
  },
  {
    name: 'Agency Workers',
    type: 'childlink',
    disabled: false,
    route: '/admin/agency-workers',
    icon: Building2,
  },
  { name: 'Units', type: 'childlink', disabled: false, route: '/admin/units', icon: Layers },
  { name: 'Reports', type: 'childlink', disabled: false, route: '/reports', icon: BarChart2 },
  { name: 'Settings', type: 'childlink', disabled: false, route: '/settings', icon: Settings },
  { name: 'Configuration', type: 'heading', disabled: false },
  {
    name: 'Swap Rules',
    type: 'childlink',
    disabled: false,
    route: '/admin/swap-configuration',
    icon: Sliders,
  },
  {
    name: 'Matching Weights',
    type: 'childlink',
    disabled: false,
    route: '/admin/matching-configuration',
    icon: Scale,
  },
];

interface SideNavProps {
  /** Whether the navigation is open (always true on desktop) */
  isOpen: boolean;
  /** Callback to close the navigation (mobile only) */
  onClose?: () => void;
}

export function SideNav({ isOpen, onClose }: SideNavProps) {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const displayName = useUserDisplayName();

  // Close nav on route change (mobile)
  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle escape key to close nav
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when nav is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Navigation panel - Dark slate design matching cp365-complex-ld */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-800 text-white
          transition-all duration-300 ease-in-out
          lg:static lg:z-0 lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarCollapsed ? 'lg:w-16' : 'w-56'}
        `}
        aria-label="Main navigation"
      >
        {/* Header - Logo */}
        <div
          className={`flex h-16 items-center border-b border-slate-700 ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}
        >
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-lg font-bold">
                CarePoint<span className="text-emerald-400">365</span>
              </h1>
              <p className="text-xs text-slate-400">Rota Management</p>
            </div>
          )}
          <button
            onClick={sidebarCollapsed ? toggleSidebarCollapsed : onClose}
            className="rounded-lg p-1.5 hover:bg-slate-700 lg:hidden"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
          {/* Desktop toggle */}
          <button
            onClick={toggleSidebarCollapsed}
            className="hidden rounded-lg p-1.5 hover:bg-slate-700 lg:block"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation content */}
        <nav className="flex-1 overflow-y-auto p-2">
          {navigationItems.map((item, index) => {
            if (item.type === 'heading') {
              // Hide headings when collapsed, show divider instead
              if (sidebarCollapsed) {
                return (
                  <div key={index} className="my-2">
                    <div className="mx-auto h-px w-8 bg-slate-600" />
                  </div>
                );
              }
              return (
                <div key={index} className="mt-4 first:mt-0">
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {item.name}
                  </h3>
                </div>
              );
            }

            const isActive =
              item.route === location.pathname ||
              (item.route && item.route !== '/' && location.pathname.startsWith(item.route));
            const Icon = item.icon;

            return (
              <Link
                key={index}
                to={item.route || '#'}
                title={sidebarCollapsed ? item.name : undefined}
                className={`
                  mb-1 flex w-full items-center gap-3 rounded-lg text-sm transition-colors
                  ${sidebarCollapsed ? 'justify-center px-3 py-2.5' : 'px-3 py-2.5'}
                  ${isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'}
                  ${item.disabled ? 'pointer-events-none opacity-50' : ''}
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {Icon && <Icon size={20} />}
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className={`border-t border-slate-700 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-medium">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-slate-400">Shift Supervisor</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/**
 * Hook to manage side navigation state
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSideNav() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((prev) => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return { isOpen, toggle, open, close };
}
