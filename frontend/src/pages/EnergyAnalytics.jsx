import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  TrendingUp,
  Zap,
  Clock,
  ArrowUpRight,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import api from '../api/client';
import { usePlant } from '../context/PlantContext';
import StatCard from '../components/ui/StatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const EnergyAnalytics = () => {
  const { currentPlant, selectedPlantId } = usePlant();
  const [range, setRange] = useState('30d'); // today, 7d, 30d, month, year, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!selectedPlantId) return;
    setLoading(true);
    try {
      let url = `/analytics/${selectedPlantId}?range=${range}`;
      if (range === 'custom' && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await api.get(url);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPlantId, range]);

  const handleExportCSV = () => {
    window.open(`/api/analytics/export/${selectedPlantId}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Energy Generation Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Numerically integrated energy metrics and historical trend evaluation for {currentPlant?.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Range Filter Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['today', '7d', '30d', 'month', 'year'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                  range === r ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r}
              </button>
            ))}
          </div>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Numerical Integration Note */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-sky-900">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Engineering Integration Standard:</span> Energy (kWh) is calculated by numerically integrating instantaneous power (kW) using the composite trapezoidal rule: <code className="bg-sky-100 px-1 py-0.5 rounded text-[11px] font-mono">E = ∫ P(t) dt</code> with outlier gap rejection (&gt;30 min), avoiding instantaneous sum inflation.
        </div>
      </div>

      {loading || !analytics ? (
        <LoadingSpinner message="Calculating integrated energy curves..." />
      ) : (
        <div className="space-y-6">
          {/* Analytical KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Integrated Energy"
              value={analytics.total_energy_kwh.toLocaleString()}
              unit="kWh"
              icon={Zap}
              color="emerald"
              subtitle={`Interval: ${analytics.start_date} to ${analytics.end_date}`}
            />
            <StatCard
              title="Daily Average"
              value={analytics.avg_daily_kwh.toLocaleString()}
              unit="kWh/day"
              icon={Calendar}
              color="blue"
              subtitle={`Specific: ${(analytics.avg_daily_kwh / (analytics.installed_capacity_kwp || 1000)).toFixed(2)} kWh/kWp/day`}
            />
            <StatCard
              title="Maximum Recorded Power"
              value={analytics.max_power_kw.toFixed(1)}
              unit="kW"
              icon={BarChart3}
              color="amber"
              subtitle={`Recorded at: ${analytics.peak_generation_time ? new Date(analytics.peak_generation_time).toLocaleTimeString() : 'N/A'}`}
            />
            <StatCard
              title="Day-to-Day Change"
              value={`${analytics.day_to_day_change_pct > 0 ? '+' : ''}${analytics.day_to_day_change_pct}%`}
              unit=""
              icon={TrendingUp}
              color={analytics.day_to_day_change_pct >= 0 ? 'emerald' : 'red'}
              subtitle="Comparison against prior day"
            />
          </div>

          {/* Chart 1: Daily Energy Production Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Daily Energy Generation (kWh)</h3>
                <p className="text-xs text-slate-500">Chronological daily yield across active operating period</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {analytics.daily_chart.length} days analyzed
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.daily_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} kWh`, 'Energy Output']}
                  />
                  <Bar dataKey="energy_kwh" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row: Hourly Time-of-Day Distribution + Monthly vs Target */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2: Time of Day Average Power Curve */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Average Generation by Time of Day</h3>
                  <p className="text-xs text-slate-500">Mean hourly power profile across reporting period</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.time_of_day_profile} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                      formatter={(val) => [`${val} kW`, 'Mean Power Output']}
                    />
                    <Line type="monotone" dataKey="avg_power_kw" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Monthly Generation vs Target */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Annual Actual vs Target Generation</h3>
                  <p className="text-xs text-slate-500">Current calendar year yield compared to planned budget</p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                    <span className="text-slate-600">Actual</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-slate-300"></span>
                    <span className="text-slate-600">Target</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthly_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                      formatter={(val, name) => [`${val} kWh`, name === 'actual_kwh' ? 'Actual Yield' : 'Target Budget']}
                    />
                    <Bar dataKey="actual_kwh" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="target_kwh" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnergyAnalytics;
