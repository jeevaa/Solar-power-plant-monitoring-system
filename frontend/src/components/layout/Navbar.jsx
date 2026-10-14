import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Bell, Shield, ChevronDown, Radio, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlant } from '../../context/PlantContext';
import api from '../../api/client';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { plants, selectedPlantId, selectPlant, currentPlant } = usePlant();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active alerts count periodically
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const res = await api.get('/alerts?status=ACTIVE');
        setActiveAlertsCount(res.data.total_count || 0);
      } catch (err) {
        // silent
      }
    };
    if (user) {
      fetchAlertCount();
      const interval = setInterval(fetchAlertCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
      <div className="px-6 py-2.5 flex items-center justify-between">
        {/* Left: Plant Switcher & Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Plant:</span>
            <div className="relative">
              <select
                value={selectedPlantId}
                onChange={(e) => selectPlant(e.target.value)}
                className="appearance-none bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-sm font-semibold rounded-lg pl-3 pr-8 py-1.5 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors"
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.installed_capacity_kwp} kWp)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Data Source Status Badge */}
          {currentPlant && (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{currentPlant.is_demo_mode ? 'DEMO DATA (SIMULATED)' : 'LIVE SENSOR FEED'}</span>
            </div>
          )}
        </div>

        {/* Right: Clock, Alerts Bell & User Menu */}
        <div className="flex items-center space-x-4">
          {/* Real-time Clock */}
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-700">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          {/* Active Alerts Notification Bell */}
          <Link
            to="/alerts"
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Active System Alerts"
          >
            <Bell className="w-5 h-5" />
            {activeAlertsCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full animate-pulse">
                {activeAlertsCount}
              </span>
            )}
          </Link>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center text-xs font-bold uppercase">
                {user?.name ? user.name.slice(0, 2) : 'SO'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</span>
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">{user?.role}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs"
                onMouseLeave={() => setProfileDropdownOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-semibold text-slate-800 truncate">{user?.name}</p>
                  <p className="text-slate-400 truncate">{user?.email}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>User Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
