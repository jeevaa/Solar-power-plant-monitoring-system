import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  Play,
  CheckCircle2,
  Clock,
  Zap,
  Thermometer,
  Layers,
  Radio,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePlant } from '../context/PlantContext';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const FaultDetection = () => {
  const { hasRole } = useAuth();
  const { currentPlant, selectedPlantId } = usePlant();
  const [faultData, setFaultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simFeedback, setSimFeedback] = useState(null);

  const isOperator = hasRole('ADMIN', 'OPERATOR');

  const fetchFaults = async () => {
    if (!selectedPlantId) return;
    setLoading(true);
    try {
      const res = await api.get(`/faults/${selectedPlantId}`);
      setFaultData(res.data);
    } catch (err) {
      console.error('Failed to load fault engine status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaults();
  }, [selectedPlantId]);

  const handleTriggerSimulation = async (faultType) => {
    if (!isOperator) {
      alert('Requires Operator or Administrator privileges to inject simulated fault conditions.');
      return;
    }
    setSimulating(true);
    setSimFeedback(null);
    try {
      const res = await api.post('/faults/simulate', {
        plant_id: selectedPlantId,
        fault_type: faultType
      });
      setSimFeedback({
        message: res.data.message,
        alertsCreated: res.data.alerts_created
      });
      fetchFaults();
    } catch (err) {
      alert(err.response?.data?.error || 'Simulation trigger failed');
    } finally {
      setSimulating(false);
    }
  };

  if (loading || !currentPlant) {
    return <LoadingSpinner message="Scanning Automated SCADA Rule Engine..." />;
  }

  const rules = faultData?.rules || [];
  const activeAlerts = faultData?.active_alerts || [];
  const recentResolved = faultData?.recent_resolved || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Automated Fault Detection Engine</h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
              8 Active SCADA Rules
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time rule-based threshold evaluation for {currentPlant.name}
          </p>
        </div>

        <Link
          to="/alerts"
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          <span>View All System Alerts ({activeAlerts.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Engineering Disclaimers Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Academic Integrity Notice:</strong> All detection logic is powered by deterministic physical engineering rules (voltage limits, thermal constraints, irradiance bounds, and communication heartbeats). This is transparent physical SCADA logic, not a black-box AI model. State cooldown prevents alert spamming.
        </div>
      </div>

      {/* Interactive Simulation Sandbox (For Examiners & Demo Evaluation) */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>Fault Engine Evaluation Sandbox</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inject controlled abnormal operational states into {currentPlant.name} to demonstrate immediate rule triggers
            </p>
          </div>
          {isOperator ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              Operator Authorized
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Read-Only Viewer
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleTriggerSimulation('LOW_POWER')}
            disabled={simulating || !isOperator}
            className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-xl text-left transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">Trigger Rule 1</span>
              <Play className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xs font-semibold text-slate-200 mt-1">Low Power Generation Deficit</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Simulate severe string disconnect / dust shadow layer</p>
          </button>

          <button
            onClick={() => handleTriggerSimulation('HIGH_TEMP')}
            disabled={simulating || !isOperator}
            className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-xl text-left transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400">Trigger Rule 3</span>
              <Play className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <p className="text-xs font-semibold text-slate-200 mt-1">High Thermal Anomaly (&gt;65°C)</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Simulate cell hotspot / convective cooling failure</p>
          </button>

          <button
            onClick={() => handleTriggerSimulation('VOLTAGE_FAULT')}
            disabled={simulating || !isOperator}
            className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-xl text-left transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400">Trigger Rule 4</span>
              <Play className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <p className="text-xs font-semibold text-slate-200 mt-1">DC Bus Voltage MPPT Anomaly</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Simulate voltage collapse outside MPPT tracking window</p>
          </button>
        </div>

        {simFeedback && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-center justify-between">
            <span>{simFeedback.message} ({simFeedback.alertsCreated.length} alert(s) dispatched to queue)</span>
            <button onClick={() => setSimFeedback(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* Active Faults Flagged on Current Plant */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Active Fault Violations</h3>
            <p className="text-xs text-slate-500">Currently active alerts requiring operator acknowledgment</p>
          </div>
          <span className="text-xs font-bold text-slate-700">{activeAlerts.length} Unresolved</span>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            All 8 physical operational rules are currently compliant. No active faults.
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((a) => (
              <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={a.severity} />
                    <span className="text-xs font-bold text-slate-900">{a.title}</span>
                    <span className="text-[10px] text-slate-400">• {a.alert_type}</span>
                  </div>
                  <p className="text-xs text-slate-600">{a.description}</p>
                  <div className="flex items-center space-x-4 text-[10px] text-slate-500 pt-1">
                    <span><strong>Measured:</strong> {a.measured_value}</span>
                    <span><strong>Expected:</strong> {a.expected_value}</span>
                    <span><strong>Detected:</strong> {new Date(a.detection_timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <Link
                  to="/alerts"
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 text-center transition-colors shrink-0"
                >
                  Manage Alert
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Catalogue of the 8 Configured Rules */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Industrial Fault Detection Rule Set</h3>
          <p className="text-xs text-slate-500">Configured condition parameters and physical rationale</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <div key={rule.rule_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{rule.rule_id}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">{rule.default_severity}</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">{rule.name}</h4>
              <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200 font-mono text-[11px]">
                {rule.condition}
              </p>
              <p className="text-[11px] text-slate-500 italic">
                {rule.physics_note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FaultDetection;
