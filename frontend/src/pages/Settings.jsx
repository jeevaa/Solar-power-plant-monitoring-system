import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Shield,
  Gauge,
  Thermometer,
  Zap,
  Info,
  CheckCircle2
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Settings = () => {
  const { hasRole } = useAuth();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isAdmin = hasRole('ADMIN');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      setSettings(res.data.settings || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, val) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: val } : s))
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.put('/settings', { settings });
      setFeedback({ type: 'success', message: res.data.message || 'System settings updated successfully.' });
      fetchSettings();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving System Parameters..." />;
  }

  const thresholdKeys = ['low_power_threshold_pct', 'max_panel_temp_c', 'voltage_mppt_min_v', 'voltage_mppt_max_v'];
  const generalKeys = ['heartbeat_timeout_seconds', 'default_currency_symbol', 'weather_cache_minutes'];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System & SCADA Parameter Configurations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Set global fault engine evaluation thresholds, polling intervals, and currency parameters
          </p>
        </div>

        {isAdmin ? (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Admin Privileges Active
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Read-Only (Admin Required)
          </span>
        )}
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Info className="w-4 h-4 text-rose-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Fault Rule Thresholds */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Gauge className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">SCADA Rule Engine Thresholds</h3>
              <p className="text-xs text-slate-500">Configurable boundaries evaluated across incoming telemetry packets</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {settings.filter(s => thresholdKeys.includes(s.key)).map((s) => (
              <div key={s.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  {s.key.replace(/_/g, ' ')}
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={s.value}
                  onChange={(e) => handleChange(s.key, e.target.value)}
                  className="mt-1.5 w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold disabled:bg-slate-100 disabled:text-slate-500 outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* General System & Currency Parameters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <SettingsIcon className="w-5 h-5 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">General Platform & Currency Settings</h3>
              <p className="text-xs text-slate-500">Gateway communication timeouts and display currencies</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {settings.filter(s => generalKeys.includes(s.key)).map((s) => (
              <div key={s.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  {s.key.replace(/_/g, ' ')}
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={s.value}
                  onChange={(e) => handleChange(s.key, e.target.value)}
                  className="mt-1.5 w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold disabled:bg-slate-100 disabled:text-slate-500 outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        {isAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Updating Parameters...' : 'Save System Settings'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Settings;
