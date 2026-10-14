import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SolarPlants from './pages/SolarPlants';
import LiveMonitoring from './pages/LiveMonitoring';
import EnergyAnalytics from './pages/EnergyAnalytics';
import WeatherMonitoring from './pages/WeatherMonitoring';
import PerformanceAnalysis from './pages/PerformanceAnalysis';
import FaultDetection from './pages/FaultDetection';
import AlertsAndNotifications from './pages/AlertsAndNotifications';
import CostSavings from './pages/CostSavings';
import Reports from './pages/Reports';
import Maintenance from './pages/Maintenance';
import Settings from './pages/Settings';
import UserProfile from './pages/UserProfile';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner message="Authenticating SCADA Operator Session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Operations Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="plants" element={<SolarPlants />} />
        <Route path="live" element={<LiveMonitoring />} />
        <Route path="analytics" element={<EnergyAnalytics />} />
        <Route path="weather" element={<WeatherMonitoring />} />
        <Route path="performance" element={<PerformanceAnalysis />} />
        <Route path="faults" element={<FaultDetection />} />
        <Route path="alerts" element={<AlertsAndNotifications />} />
        <Route path="savings" element={<CostSavings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<UserProfile />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
