import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Plus, Library, Sun, Moon, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick?: () => void }> = ({
  to, icon, label, onClick
}) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'
      }`
    }
    style={({ isActive }) => ({
      backgroundColor: isActive ? 'var(--paper-line)' : 'transparent',
      color: 'var(--ink)',
    })}
  >
    {icon}
    <span className="worksheet-font">{label}</span>
  </NavLink>
);

const Layout: React.FC = () => {
  const { logout, user } = useAuth();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/new', icon: <Plus size={18} />, label: 'New Worksheet' },
    { to: '/library', icon: <Library size={18} />, label: 'Library' },
  ];

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? 'p-4' : 'p-4'}`}
      style={{ backgroundColor: theme === 'light' ? '#f5f4f0' : '#16213e' }}>
      
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-3 mb-6">
        <BookOpen size={22} style={{ color: 'var(--accent-blue)' }} />
        <span className="handwritten text-2xl font-bold" style={{ color: 'var(--ink)' }}>Zheet</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="space-y-1 border-t pt-3" style={{ borderColor: 'var(--paper-line)' }}>
        <p className="text-xs px-4 truncate mb-2" style={{ color: 'var(--ink-secondary)' }}>
          {user?.email}
        </p>
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm w-full opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--ink)' }}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          <span className="worksheet-font">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm w-full opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--ink)' }}
        >
          <LogOut size={18} />
          <span className="worksheet-font">Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--paper-bg)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 border-r"
        style={{ borderColor: 'var(--paper-line)' }}>
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-56 flex flex-col border-r shadow-xl"
            style={{ borderColor: 'var(--paper-line)' }}>
            <Sidebar mobile />
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex md:hidden items-center justify-between px-4 py-3 border-b"
          style={{
            backgroundColor: 'var(--paper-bg)',
            borderColor: 'var(--paper-line)',
          }}>
          <button onClick={() => setMobileOpen(true)}>
            <Menu size={22} style={{ color: 'var(--ink)' }} />
          </button>
          <span className="handwritten text-xl font-bold" style={{ color: 'var(--ink)' }}>Zheet</span>
          <button onClick={toggle}>
            {theme === 'light' ? <Moon size={18} style={{ color: 'var(--ink-secondary)' }} /> : <Sun size={18} style={{ color: 'var(--ink-secondary)' }} />}
          </button>
        </div>

        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
