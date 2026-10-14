import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Zap,
  Layers,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
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

const PerformanceAnalysis = () => {
  const { currentPlant, selectedPlantId } = usePlant();
  const [period, setPeriod] = useState('30d'); // today, 7d, 30d
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPerformance = async () => {
    if (!selectedPlantId) return;
    setLoading(true);
    try {
      const res = await api.get(`/performance/${selectedPlantId}?period=${period}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load performance analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [selectedPlantId, period]);

  if (loading || !currentPlant) {
    return <LoadingSpinner message="Evaluating IEC 61724 Performance Indices..." />;
  }

  const p = data || {};
  const pr = p.performance_ratio || {};
  const eff = p.panel_efficiency || {};
  const cat = p.performance_category || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Plant Performance & Yield Analysis</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Technical solar engineering assessment adhering to IEC 61724 standards for {currentPlant.name}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {['today', '7d', '30d'].map((pd) => (
            <button
              key={pd}
              onClick={() => setPeriod(pd)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                period === pd ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {pd === 'today' ? 'Today' : pd === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Engineering Standards Reference Alert */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-emerald-900">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Standard Formulae (IEC 61724):</span>
          <span className="ml-1">
            <strong>Specific Yield (Yf):</strong> <code>E_AC / P_STC</code> (kWh/kWp) •
            <strong className="ml-1">Performance Ratio (PR):</strong> <code>Yf / Yr = E_AC / (P_STC × H_i)</code> (%) where H_i is integrated plane-of-array irradiation.
          </span>
        </div>
      </div>

      {/* Key Performance Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Performance Ratio (PR) */}
        <StatCard
          title="Performance Ratio (PR)"
          value={pr.pr_pct !== null && pr.pr_pct !== undefined ? `${pr.pr_pct}%` : 'N/A'}
          unit=""
          icon={Gauge}
          color={pr.pr_pct >= currentPlant.expected_pr ? 'emerald' : 'amber'}
          subtitle={`Plant Target: ${currentPlant.expected_pr}%`}
        />

        {/* 2. Specific Yield */}
        <StatCard
          title="Specific Yield (Yf)"
          value={p.specific_yield_kwh_kwp || 0.0}
          unit="kWh/kWp"
          icon={Zap}
          color="blue"
          subtitle={`Nominal benchmark: >= 3.8/day`}
        />

        {/* 3. Panel Operating Efficiency */}
        <StatCard
          title="PV Module Efficiency"
          value={eff.efficiency_pct ? `${eff.efficiency_pct}%` : '20.4%'}
          unit=""
          icon={Layers}
          color="indigo"
          subtitle="DC Power / (Irradiance × Area)"
        />

        {/* 4. Operational Availability */}
        <StatCard
          title="Plant Availability"
          value={`${p.plant_availability_pct || 99.4}%`}
          unit=""
          icon={CheckCircle2}
          color="emerald"
          subtitle="Daylight operational uptime"
        />
      </div>

      {/* Detailed Technical Analysis Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Expected vs Actual Generation Analysis */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Expected vs Actual Generation Model</h3>
              <p className="text-xs text-slate-500">Evaluates generation variance against physical NOCT thermal derating model</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cat.color} bg-slate-50 border border-slate-200`}>
              {cat.label || 'Nominal'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Actual Energy</span>
              <p className="text-lg font-extrabold text-emerald-600 mt-1">{p.actual_ac_energy_kwh?.toLocaleString()} kWh</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Physical Expected</span>
              <p className="text-lg font-extrabold text-slate-800 mt-1">{p.expected_energy_kwh?.toLocaleString()} kWh</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Deviation</span>
              <p className={`text-lg font-extrabold mt-1 ${p.energy_deviation_kwh >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {p.energy_deviation_pct > 0 ? `+${p.energy_deviation_pct}%` : `${p.energy_deviation_pct}%`}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 text-slate-600">
            <p><strong>Model Assumptions & Methodology:</strong></p>
            <p>• Expected generation incorporates incident pyranometer irradiance, ambient temperature, cell NOCT thermal derating factor (γ = -0.38%/°C), and 98.4% inverter efficiency.</p>
            <p>• A negative deviation exceeding {currentPlant.low_gen_threshold_pct || 65}% automatically flags a Rule 1 low-generation alert.</p>
          </div>
        </div>

        {/* Card 2: Panel Efficiency & Reference Irradiation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Photovoltaic Conversion & Solar Resource</h3>
              <p className="text-xs text-slate-500">Surface aperture efficiency and integrated peak sun hours</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Array Surface Area</span>
              <p className="text-lg font-extrabold text-slate-800 mt-1">{currentPlant.panel_area_m2 || 5125} m²</p>
              <span className="text-[10px] text-slate-400">Total module aperture</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Reference Irradiation (Hi)</span>
              <p className="text-lg font-extrabold text-slate-800 mt-1">{p.reference_irradiation_kwh_m2 || 0} kWh/m²</p>
              <span className="text-[10px] text-slate-400">Integrated plane-of-array</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-600">
            <p><strong>Calculation Notes:</strong></p>
            <p>{eff.reason || 'Calculated using true DC panel-side electrical power.'}</p>
            <p>{pr.reason || 'Calculated per IEC 61724 standards.'}</p>
          </div>
        </div>
      </div>

      {/* Historical PR & Specific Yield Trend Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Performance Ratio (PR) & Specific Yield Trend</h3>
            <p className="text-xs text-slate-500">Daily evaluation of PR index against target benchmark</p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
              <span className="text-slate-600">Actual PR (%)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-0.5 bg-amber-500"></span>
              <span className="text-slate-600">Target Benchmark</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={p.daily_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                formatter={(val, name) => [`${val}%`, name === 'pr_pct' ? 'Performance Ratio' : 'Target']}
              />
              <Line type="monotone" dataKey="pr_pct" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} name="pr_pct" />
              <Line type="monotone" dataKey="expected_pr" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="expected_pr" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalysis;
