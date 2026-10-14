import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  Coins,
  TrendingUp,
  Zap,
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import api from '../api/client';
import { usePlant } from '../context/PlantContext';
import StatCard from '../components/ui/StatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const CostSavings = () => {
  const { currentPlant, selectedPlantId } = usePlant();
  const [savings, setSavings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSavings = async () => {
    if (!selectedPlantId) return;
    setLoading(true);
    try {
      const res = await api.get(`/savings/${selectedPlantId}`);
      setSavings(res.data);
    } catch (err) {
      console.error('Failed to load savings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavings();
  }, [selectedPlantId]);

  if (loading || !currentPlant) {
    return <LoadingSpinner message="Calculating Economic Valuation & Tariff Schedules..." />;
  }

  const s = savings || {};
  const today = s.today || {};
  const month = s.past_30_days || {};
  const annual = s.annualized_estimate || {};
  const historical = s.historical_total || {};
  const tariffs = s.tariffs || {};
  const baseline = s.baseline_comparison || {};

  // Data for Breakdown Pie Chart
  const pieData = [
    { name: 'Self-Consumption Savings', value: month.self_consumption_savings || 100, color: '#10b981' },
    { name: 'Grid Export Credit', value: month.export_credit || 20, color: '#0284c7' },
  ];

  // Comparison Bar Data
  const compData = [
    { period: 'Today', SolarNetBenefit: today.total_estimated_benefit || 0, GrossEquivalent: today.gross_reference_value || 0 },
    { period: '30 Days', SolarNetBenefit: month.total_estimated_benefit || 0, GrossEquivalent: month.gross_reference_value || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Solar Economic Valuation & Cost Savings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Electricity bill offset calculations and grid feed-in revenue for {currentPlant.name}
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
          <span className="font-semibold text-slate-500">Retail Tariff:</span>
          <span className="font-bold text-slate-800">₹{tariffs.retail_tariff?.toFixed(2)}/kWh</span>
          <span className="text-slate-300">|</span>
          <span className="font-semibold text-slate-500">Export:</span>
          <span className="font-bold text-emerald-600">₹{tariffs.export_tariff?.toFixed(2)}/kWh</span>
        </div>
      </div>

      {/* Mandatory Engineering Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Financial Disclaimer & Methodology:</strong> {today.disclaimer}
          <div className="mt-1 text-[11px] text-amber-800">
            • <strong>Self-Consumption Savings:</strong> Value of solar energy directly utilized on-site, displacing purchases at the retail electricity tariff rate.
            <br />
            • <strong>Grid Export Credit:</strong> Value of excess energy fed into the utility distribution network at the wholesale feed-in tariff rate.
          </div>
        </div>
      </div>

      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Savings Today"
          value={`₹${(today.total_estimated_benefit || 0).toLocaleString()}`}
          unit=""
          icon={IndianRupee}
          color="emerald"
          subtitle={`${today.energy_generated_kwh || 0} kWh produced today`}
        />
        <StatCard
          title="Past 30 Days Benefit"
          value={`₹${(month.total_estimated_benefit || 0).toLocaleString()}`}
          unit=""
          icon={Calendar}
          color="blue"
          subtitle={`${month.energy_generated_kwh || 0} kWh produced`}
        />
        <StatCard
          title="Annualized Projection"
          value={`₹${(annual.total_estimated_benefit || 0).toLocaleString()}`}
          unit=""
          icon={TrendingUp}
          color="indigo"
          subtitle="Extrapolated from 365-day mean"
        />
        <StatCard
          title="Historical Cumulative Value"
          value={`₹${(historical.total_estimated_benefit || 0).toLocaleString()}`}
          unit=""
          icon={Coins}
          color="emerald"
          subtitle="All recorded operational generation"
        />
      </div>

      {/* Dual Breakdown Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown Pie Chart (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Economic Benefit Breakdown (30 Days)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Self-consumption displacement vs feed-in revenue</p>

            <div className="h-56 w-full my-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`₹${val.toLocaleString()}`, 'Benefit']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 font-medium">Self-Consumption ({tariffs.self_consumption_pct}%):</span>
                </div>
                <span className="font-bold text-slate-900">₹{(month.self_consumption_savings || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <span className="text-slate-600 font-medium">Export Credit ({(100 - tariffs.self_consumption_pct).toFixed(0)}%):</span>
                </div>
                <span className="font-bold text-slate-900">₹{(month.export_credit || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Financial Comparison Table & Bar Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Utility Grid Baseline Comparison</h3>
              <p className="text-xs text-slate-500">{baseline.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Grid Baseline Expense Without Solar</span>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">₹{(baseline.grid_baseline_cost || 0).toLocaleString()}</p>
              <span className="text-[11px] text-slate-500 block mt-1">Total kWh purchased at retail rate (₹{tariffs.retail_tariff})</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Actual Economic Benefit Realized</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">₹{(baseline.net_savings_realized || 0).toLocaleString()}</p>
              <span className="text-[11px] text-emerald-800 block mt-1">On-site offset + utility grid feed-in credits</span>
            </div>
          </div>

          {/* Mathematical Formulations Documentation */}
          <div className="p-4 bg-slate-900 text-slate-300 rounded-xl space-y-2 text-xs font-mono">
            <p className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] font-sans">
              Configured Tariff Formulations
            </p>
            <p>1. Self-Consumed Energy = Total Solar Energy × {tariffs.self_consumption_pct}%</p>
            <p>2. Self-Consumption Savings = Self-Consumed Energy × ₹{tariffs.retail_tariff} / kWh</p>
            <p>3. Exported Energy = Total Solar Energy × {(100 - tariffs.self_consumption_pct).toFixed(0)}%</p>
            <p>4. Export Credit = Exported Energy × ₹{tariffs.export_tariff} / kWh</p>
            <p className="text-white font-bold">5. Total Net Benefit = Self-Consumption Savings + Export Credit</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostSavings;
