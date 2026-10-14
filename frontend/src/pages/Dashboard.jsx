import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Sun,
  Calendar,
  Gauge,
  IndianRupee,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Radio,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Dashboard = () => {
  const { currentPlant, selectedPlantId } = usePlant();
  const [liveData, setLiveData] = useState(null);
  const [todayCurve, setTodayCurve] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [savings, setSavings] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (isManual = false) => {
    if (!selectedPlantId) return;
    if (isManual) setRefreshing(true);

    try {
      const [liveRes, todayRes, analyticsRes, perfRes, savingsRes, alertsRes] = await Promise.all([
        api.get(`/live/status/${selectedPlantId}`),
        api.get(`/live/today/${selectedPlantId}`),
        api.get(`/analytics/${selectedPlantId}?range=30d`),
        api.get(`/performance/${selectedPlantId}?period=30d`),
        api.get(`/savings/${selectedPlantId}`),
        api.get(`/alerts?plant_id=${selectedPlantId}`),
      ]);

      setLiveData(liveRes.data);
      setTodayCurve(todayRes.data.points || []);
      setAnalytics(analyticsRes.data);
      setPerformance(perfRes.data);
      setSavings(savingsRes.data);
      setRecentAlerts((alertsRes.data.alerts || []).slice(0, 5));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboardData();

    // Auto-refresh every 20 seconds for real-time monitoring
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 20000);

    return () => clearInterval(interval);
  }, [selectedPlantId]);

  if (loading || !currentPlant) {
    return <LoadingSpinner message="Connecting to SCADA Telemetry Stream..." />;
  }

  const tel = liveData?.telemetry || {};
  const status = liveData?.overall_status || 'ONLINE';
  const prVal = performance?.performance_ratio?.pr_pct || currentPlant.expected_pr;
  const todayEnergy = tel.daily_energy_kwh || 0.0;
  const monthEnergy = analytics?.total_energy_kwh || 0.0;
  const savingsToday = savings?.today?.total_estimated_benefit || 0.0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Plant Identification & Real-time State */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-inner">
            <Sun className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{currentPlant.name}</h2>
              <StatusBadge status={status} />
              {currentPlant.is_demo_mode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 border border-amber-300">
                  Demo Data
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentPlant.location} &nbsp;•&nbsp; Lat: {currentPlant.latitude}°, Lon: {currentPlant.longitude}°
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </button>
          <Link
            to="/live"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors shadow-xs"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Open SCADA Feed</span>
          </Link>
        </div>
      </div>

      {/* 8 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Current Power Output */}
        <StatCard
          title="Current Power Output"
          value={tel.ac_power_kw ? tel.ac_power_kw.toFixed(1) : '0.0'}
          unit="kW"
          icon={Zap}
          color="emerald"
          subtitle={`Irradiance: ${tel.solar_irradiance_w_m2 || 0} W/m²`}
          trend={tel.expected_power_kw > 0 ? Math.round(((tel.ac_power_kw - tel.expected_power_kw) / tel.expected_power_kw) * 100) : 0}
          trendLabel="vs clear-sky model"
        />

        {/* 2. Energy Generated Today */}
        <StatCard
          title="Energy Today"
          value={todayEnergy.toFixed(1)}
          unit="kWh"
          icon={Sun}
          color="blue"
          subtitle={`Specific Yield: ${(todayEnergy / currentPlant.installed_capacity_kwp).toFixed(2)} kWh/kWp`}
        />

        {/* 3. Total Energy This Month */}
        <StatCard
          title="Energy Generated (30 Days)"
          value={monthEnergy ? monthEnergy.toLocaleString() : '0'}
          unit="kWh"
          icon={Calendar}
          color="indigo"
          subtitle={`Daily Avg: ${analytics?.avg_daily_kwh || 0} kWh/day`}
        />

        {/* 4. Installed Capacity */}
        <StatCard
          title="Installed Capacity"
          value={currentPlant.installed_capacity_kwp}
          unit="kWp"
          icon={Activity}
          color="blue"
          subtitle={`${currentPlant.panel_count} modules × ${currentPlant.rated_panel_power_wp} Wp`}
        />

        {/* 5. Performance Ratio */}
        <StatCard
          title="Performance Ratio (PR)"
          value={prVal ? `${prVal}%` : 'N/A'}
          unit=""
          icon={Gauge}
          color={prVal >= currentPlant.expected_pr ? 'emerald' : 'amber'}
          subtitle={`Target: ${currentPlant.expected_pr}% (IEC 61724)`}
        />

        {/* 6. Estimated Cost Savings */}
        <StatCard
          title="Cost Savings (Today)"
          value={`₹${savingsToday.toLocaleString()}`}
          unit=""
          icon={IndianRupee}
          color="emerald"
          subtitle={`Month: ₹${(savings?.past_30_days?.total_estimated_benefit || 0).toLocaleString()}`}
        />

        {/* 7. Plant Availability */}
        <StatCard
          title="Plant Availability"
          value={`${performance?.plant_availability_pct || 99.4}%`}
          unit=""
          icon={CheckCircle2}
          color="emerald"
          subtitle="Daylight operational uptime"
        />

        {/* 8. Active Alerts */}
        <StatCard
          title="Active Alerts"
          value={liveData?.active_alerts_count || 0}
          unit="faults"
          icon={AlertTriangle}
          color={(liveData?.active_alerts_count || 0) > 0 ? 'red' : 'emerald'}
          subtitle="Real-time automated rule triggers"
        />
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart A: Today's Power Generation (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Today's Diurnal Power Curve (kW)</h3>
              <p className="text-xs text-slate-500">Instantaneous AC generation vs theoretical clear-sky expected curve</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 font-medium">Actual Generation</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-3 h-1 bg-amber-400"></span>
                <span className="text-slate-600 font-medium">Expected (Physics)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={todayCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val, name) => [`${val} kW`, name === 'actual_power_kw' ? 'Actual Power' : 'Expected Power']}
                />
                <Area type="monotone" dataKey="actual_power_kw" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#powerGradient)" name="actual_power_kw" />
                <Line type="monotone" dataKey="expected_power_kw" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} name="expected_power_kw" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart D: Performance Ratio Gauge & Trend (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Plant Performance Index</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {performance?.performance_category?.label || 'Optimal'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Evaluated against IEC 61724 standard standards</p>

            <div className="my-6 text-center">
              <div className="inline-flex items-baseline space-x-1">
                <span className="text-5xl font-extrabold text-slate-900 tracking-tight">{prVal}</span>
                <span className="text-2xl font-bold text-emerald-600">%</span>
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
                Operational Performance Ratio (30 Days)
              </p>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Target Benchmark:</span>
                <span className="font-semibold text-slate-800">{currentPlant.expected_pr}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Specific Yield (Yf):</span>
                <span className="font-semibold text-slate-800">
                  {performance?.specific_yield_kwh_kwp ? `${performance.specific_yield_kwh_kwp} kWh/kWp` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Panel Efficiency:</span>
                <span className="font-semibold text-emerald-600">
                  {performance?.panel_efficiency?.efficiency_pct ? `${performance.panel_efficiency.efficiency_pct}%` : '20.4%'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to="/performance"
              className="w-full flex items-center justify-center space-x-1 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
            >
              <span>Detailed Engineering Analysis</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Secondary Charts & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart B: Daily Energy Production (Past 30 Days Bar Chart) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Daily Energy Production (Past 30 Days)</h3>
              <p className="text-xs text-slate-500">Integrated AC energy (kWh) per operating calendar day</p>
            </div>
            <Link to="/analytics" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1">
              <span>View Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.daily_chart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => val.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val) => [`${val} kWh`, 'Energy Generated']}
                />
                <Bar dataKey="energy_kwh" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Alerts Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent SCADA Alerts</h3>
              <Link to="/alerts" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                View All
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-3">Live automated threshold violations</p>

            <div className="space-y-2.5">
              {recentAlerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                  No active system faults detected.
                </div>
              ) : (
                recentAlerts.map((alert) => (
                  <div key={alert.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate" title={alert.title}>
                        {alert.title}
                      </span>
                      <StatusBadge status={alert.severity} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{alert.description}</p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{alert.device_id || 'System'}</span>
                      <span>{new Date(alert.detection_timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to="/faults"
              className="w-full flex items-center justify-center space-x-1 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Fault Engine Diagnostics</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
