import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { usePlant } from '../../context/PlantContext';
import { Info } from 'lucide-react';

const Layout = () => {
  const { currentPlant } = usePlant();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />

        {/* Demo Mode Notice Banner */}
        {currentPlant?.is_demo_mode && (
          <div className="bg-amber-500/10 border-b border-amber-200/60 px-6 py-1.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong className="font-semibold text-amber-800">DEMO MODE ACTIVE:</strong> Generating deterministic, physics-based solar generation telemetry for {currentPlant.name}.
              </span>
            </div>
            <span className="hidden md:inline-block text-[11px] font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
              Clear-sky & thermal simulation
            </span>
          </div>
        )}

        {/* Page Views with Scroll */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
