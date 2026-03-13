import { Link, NavLink, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../lib/permissions';

type NavItem = {
  label: string;
  to: string;
  icon: string;
  permission?: string | string[];
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: 'bi bi-speedometer2', permission: 'dashboard:view' },
  { label: 'Users', to: '/users', icon: 'bi bi-people', permission: 'users:view' },
  { label: 'Pooling', to: '/pooling', icon: 'bi bi-car-front', permission: 'offers:view' },
  { label: 'Rental', to: '/rental', icon: 'bi bi-key', permission: 'offers:view' },
  { label: 'Bookings', to: '/bookings', icon: 'bi bi-clock-history', permission: 'bookings:view' },
  { label: 'Promos', to: '/promos', icon: 'bi bi-lightbulb', permission: 'promos:review' },
  { label: 'Feedback', to: '/feedback', icon: 'bi bi-chat-square-text', permission: 'feedback:view' },
  { label: 'Analytics', to: '/analytics', icon: 'bi bi-graph-up-arrow', permission: 'analytics:view' },
  { label: 'Withdrawals', to: '/withdrawals', icon: 'bi bi-cash-stack', permission: 'withdrawals:view' },
  { label: 'Content', to: '/content', icon: 'bi bi-journal-text', permission: 'content:view' },
  { label: 'Master Data', to: '/master-data', icon: 'bi bi-sliders', permission: 'master_data:view' },
  { label: 'Fuel Rates', to: '/fuel-rates', icon: 'bi bi-fuel-pump', permission: 'settings:view' },
  { label: 'Vehicle Pricing Control', to: '/pricing-control', icon: 'bi bi-sliders2', permission: 'settings:view' },
  { label: 'Settings', to: '/settings', icon: 'bi bi-gear', permission: 'settings:view' },
  { label: 'Roles', to: '/roles', icon: 'bi bi-shield-lock', permission: 'roles:view' },
  { label: 'Admin Users', to: '/admin-users', icon: 'bi bi-person-badge', permission: 'admins:view' },
  { label: 'Permission Matrix', to: '/permission-matrix', icon: 'bi bi-table', permission: 'roles:view' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAuth();
  const [open, setOpen] = useState(window.innerWidth < 992 ? false : true);
  const location = useLocation();

  const allowedItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (!item.permission) return true;
        return hasPermission(admin?.role, admin?.permissions, item.permission);
      }),
    [admin?.permissions, admin?.role]
  );

  return (
    <div className={`admin-app ${open ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <aside className="sidebar sidebar-theme">
        <div className="navbar-brand px-4 py-3 border-bottom border-secondary-subtle">
          <img className="sidebar-brand-logo" src="/forlok_admin_sidebar_logo.png" alt="Forlok logo" />
        </div>
        <nav className="navbar-nav w-100">
          {allowedItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item nav-link px-4 py-2 ${isActive || location.pathname.startsWith(`${item.to}/`) ? 'active' : ''}`
              }
            >
              <i className={`${item.icon} me-2 nav-icon`}></i>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <nav className="navbar navbar-expand top-nav sticky-top px-4 py-0">
          <button className="btn btn-sm btn-primary" onClick={() => setOpen((prev) => !prev)}>
            <i className="bi bi-list"></i>
          </button>
          <div className="ms-auto d-flex align-items-center gap-3 py-3">
            <span className="small text-body-secondary text-capitalize fw-semibold">{admin?.role || 'admin'}</span>
            <Link className="btn btn-warning btn-sm text-white" to="/settings">
              Settings
            </Link>
            <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        <div className="container-fluid pt-4 px-4">{children}</div>
        <div className="container-fluid pt-4 px-4">
          <div className="footer-panel rounded-top p-4 text-center">
            <span className="small text-muted">ForLok Admin Panel</span>
          </div>
        </div>
      </main>
    </div>
  );
}
