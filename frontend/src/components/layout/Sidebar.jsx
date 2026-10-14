import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sun,
  Activity,
  BarChart3,
  CloudSun,
  Gauge,
  AlertTriangle,
  Bell,
  FileText,
  Wrench,
  Settings,
  User,
  LogOut,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Solar Plants', path: '/plants', icon: Sun },
  { name: 'Live Monitoring', path: '/live', icon: Activity },
  { name: 'Energy Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Weather Monitoring', path: '/weather', icon: CloudSun },
  { name: 'Performance Analysis', path: '/performance', icon: Gauge },
  { name: 'Fault Detection', path: '/faults', icon: AlertTriangle },
  { name: 'Alerts & Notifications', path: '/alerts', icon: Bell },
  { name: 'Cost Savings', path: '/savings', icon: Zap },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Maintenance', path: '/maintenance', icon: Wrench },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'User Profile', path: '/profile', icon: User },
];

const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-[#0B132B] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3 bg-[#080E21]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
          <Sun className="w-6 h-6 fill-current text-white" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-white tracking-wide leading-tight">SOLAR MONITOR</h1>
          <p className="text-[10px] font-medium text-emerald-400 tracking-wider uppercase">Industrial SCADA</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Core Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-[#080E21]">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="min-w-0 truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
