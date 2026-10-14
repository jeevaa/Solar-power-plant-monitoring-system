import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Zap,
  IndianRupee,
  RefreshCw,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import api from '../api/client';
import { usePlant } from '../context/PlantContext';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const reportTypes = [
  { id: 'monthly', name: 'Monthly Energy & Performance' },
  { id: 'weekly', name: 'Weekly Generation Summary' },
  { id: 'daily', name: 'Daily Solar Production' },
  { id: 'annual', name: 'Annual Solar Yield & PR' },
  { id: 'custom', name: 'Custom Interval Audit' },
];

const Reports = () => {
  const { currentPlant, selectedPlantId } = usePlant();
  const [reportType, setReportType] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchPreview = async () => {
    if (!selectedPlantId) return;
    setLoading(true);
    try {
      const res = await api.post('/reports/preview', {
        plant_id: selectedPlantId,
        report_type: reportType,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setPreviewData(res.data);
    } catch (err) {
      console.error('Failed to preview report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [selectedPlantId, reportType]);

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      let url = `/api/reports/download/pdf?plant_id=${selectedPlantId}&report_type=${reportType}`;
      if (startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open(`/api/analytics/export/${selectedPlantId}`, '_blank');
  };

  if (!currentPlant) {
    return <LoadingSpinner message="Loading Plant Audit Context..." />;
  }

  const p = previewData || {};
  const metrics = p.summary_metrics || {};
  const alerts = p.alert_summary || {};
  const maint = p.maintenance_summary || {};
  const savings = p.savings_summary || {};

  return (
    <div className="space-y-6">
      {/* Header & Generation Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Engineering Report Generation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Export comprehensive PDF audit reports and raw CSV telemetry for academic and industrial verification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{generatingPdf ? 'Rendering PDF...' : 'Download PDF Report'}</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Raw CSV</span>
          </button>
        </div>
      </div>

      {/* Filters & Type Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Report Type:</span>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {reportTypes.map((rt) => (
              <button
                key={rt.id}
                onClick={() => setReportType(rt.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  reportType === rt.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {rt.name}
              </button>
            ))}
          </div>
        </div>

        {reportType === 'custom' && (
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg outline-hidden text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg outline-hidden text-xs"
            />
            <button
              onClick={fetchPreview}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Aggregating Report Telemetry & Calculations..." />
      ) : (
        /* Document Preview Container */
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 max-w-4xl mx-auto space-y-6">
          {/* Document Header Banner */}
          <div className="border-b-2 border-slate-900 pb-5 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                Official Engineering Document Preview
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-1 uppercase">
                SOLAR POWER PLANT MONITORING & PERFORMANCE AUDIT REPORT
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                <strong>Facility:</strong> {currentPlant.name} ({currentPlant.id}) • {currentPlant.location}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                {currentPlant.is_demo_mode ? 'Simulated Telemetry' : 'Physical Sensor Feed'}
              </span>
              <p className="mt-2 text-[10px]">Generated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Section 1: Facility Specifications */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <span>1. Facility Technical Specifications & Boundary Conditions</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Installed DC Capacity</span>
                <p className="font-extrabold text-slate-800 mt-0.5">{currentPlant.installed_capacity_kwp} kWp</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">PV Modules</span>
                <p className="font-extrabold text-slate-800 mt-0.5">{currentPlant.panel_count} × {currentPlant.rated_panel_power_wp} Wp</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Inverter Capacity</span>
                <p className="font-extrabold text-slate-800 mt-0.5">{currentPlant.inverter_capacity_kw} kW AC</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Retail Tariff</span>
                <p className="font-extrabold text-slate-800 mt-0.5">₹{currentPlant.electricity_tariff} / kWh</p>
              </div>
            </div>
          </div>

          {/* Section 2: Generation & Performance Indicators */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Energy Yield & Standard Indices (IEC 61724)
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Metric Description</th>
                    <th className="py-2.5 px-3">Value</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Standard Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold">Total Energy Generated</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">{metrics.total_energy_kwh?.toLocaleString()}</td>
                    <td className="py-2.5 px-3">kWh</td>
                    <td className="py-2.5 px-3 text-slate-500">Numerically integrated AC power</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold">Specific Yield (Yf)</td>
                    <td className="py-2.5 px-3 font-bold">{metrics.specific_yield_kwh_kwp}</td>
                    <td className="py-2.5 px-3">kWh/kWp</td>
                    <td className="py-2.5 px-3 text-slate-500">Benchmark: &gt;= 3.8/day</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold">Performance Ratio (PR)</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-600">{metrics.performance_ratio_pct ? `${metrics.performance_ratio_pct}%` : 'N/A'}</td>
                    <td className="py-2.5 px-3">%</td>
                    <td className="py-2.5 px-3 text-slate-500">Plant Target: {currentPlant.expected_pr}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold">Peak Recorded Generation</td>
                    <td className="py-2.5 px-3 font-bold">{metrics.peak_power_kw?.toFixed(1)}</td>
                    <td className="py-2.5 px-3">kW</td>
                    <td className="py-2.5 px-3 text-slate-500">Installed: {currentPlant.installed_capacity_kwp} kWp</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold">Plant Availability</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">{metrics.plant_availability_pct}%</td>
                    <td className="py-2.5 px-3">%</td>
                    <td className="py-2.5 px-3 text-slate-500">Daylight uptime</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Financial & Economic Valuation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              3. Economic Benefit & Cost Savings
            </h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Self-Consumption Value</span>
                <p className="text-base font-extrabold text-emerald-800 mt-1">₹{(savings.self_consumption_savings || 0).toLocaleString()}</p>
                <span className="text-[10px] text-emerald-600">On-site offset ({savings.self_consumption_pct}%)</span>
              </div>
              <div className="p-3 bg-sky-50 rounded-lg border border-sky-100">
                <span className="text-[10px] font-bold text-sky-700 uppercase">Feed-in Export Credit</span>
                <p className="text-base font-extrabold text-sky-800 mt-1">₹{(savings.export_credit || 0).toLocaleString()}</p>
                <span className="text-[10px] text-sky-600">Grid injected</span>
              </div>
              <div className="p-3 bg-slate-900 text-white rounded-lg">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Net Economic Benefit</span>
                <p className="text-base font-extrabold text-white mt-1">₹{(savings.total_estimated_benefit || 0).toLocaleString()}</p>
                <span className="text-[10px] text-slate-400">Total financial valuation</span>
              </div>
            </div>
          </div>

          {/* Section 4: Operational Faults & Maintenance Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              4. SCADA Alarms & Corrective Maintenance Status
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Active SCADA Alarms</span>
                <p className="text-base font-bold text-slate-800 mt-0.5">{alerts.active_count || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Critical Faults</span>
                <p className="text-base font-bold text-rose-600 mt-0.5">{alerts.critical_count || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Completed Work Orders</span>
                <p className="text-base font-bold text-emerald-600 mt-0.5">{maint.completed_count || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Pending Work Orders</span>
                <p className="text-base font-bold text-amber-600 mt-0.5">{maint.pending_count || 0}</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 italic">
            * Generated automatically by the Solar Power Plant Monitoring and Performance Analysis System. Certified for final-year EEE engineering project submission.
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
