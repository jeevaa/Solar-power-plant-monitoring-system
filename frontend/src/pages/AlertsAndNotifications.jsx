import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Check,
  FileCheck,
  Layers,
  ChevronRight
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePlant } from '../context/PlantContext';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AlertsAndNotifications = () => {
  const { hasRole, user } = useAuth();
  const { plants, selectedPlantId } = usePlant();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isOperator = hasRole('ADMIN', 'OPERATOR');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let url = `/alerts?plant_id=${selectedPlantId}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (severityFilter) url += `&severity=${severityFilter}`;
      const res = await api.get(url);
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedPlantId, statusFilter, severityFilter]);

  const handleAcknowledge = async (alertId) => {
    setActionLoading(true);
    try {
      await api.post(`/alerts/${alertId}/acknowledge`);
      fetchAlerts();
      if (selectedAlert?.id === alertId) {
        setSelectedAlert({ ...selectedAlert, status: 'ACKNOWLEDGED', acknowledged_by: user.email });
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to acknowledge alert');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!selectedAlert || !resolutionNotes.trim()) return;

    setActionLoading(true);
    try {
      await api.post(`/alerts/${selectedAlert.id}/resolve`, {
        resolution_notes: resolutionNotes
      });
      setIsResolveModalOpen(false);
      setResolutionNotes('');
      setSelectedAlert(null);
      fetchAlerts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve alert');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.alert_type.toLowerCase().includes(q) ||
      (a.device_id && a.device_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Alerts & Notification Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational anomalies, grid transient events, and automated rule triggers
          </p>
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-semibold outline-hidden cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-semibold outline-hidden cursor-pointer"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-emerald-500 w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Retrieving System Alert Registry..." />
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Matching Alerts Found</h3>
          <p className="text-xs text-slate-400 mt-1">There are no threshold violations matching the selected filters.</p>
        </div>
      ) : (
        /* Alerts Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Alert Event</th>
                  <th className="py-3 px-4">Equipment / Subsystem</th>
                  <th className="py-3 px-4">Measured vs Expected</th>
                  <th className="py-3 px-4">Detected Timestamp</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAlerts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <StatusBadge status={a.severity} />
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{a.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{a.description}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {a.device_id || 'CENTRAL-ARRAY'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <span>{a.measured_value || 'N/A'}</span>
                      <span className="text-slate-400"> (exp: {a.expected_value || 'Nominal'})</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(a.detection_timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedAlert(a)}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alert Detail Inspection Modal */}
      <Modal
        isOpen={!!selectedAlert && !isResolveModalOpen}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert?.title || 'Alert Specification'}
        maxWidth="max-w-xl"
      >
        {selectedAlert && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <StatusBadge status={selectedAlert.severity} />
                <StatusBadge status={selectedAlert.status} />
              </div>
              <span className="font-mono text-slate-400">ID #{selectedAlert.id}</span>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Anomaly Narrative</h4>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                {selectedAlert.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Measured Value</span>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{selectedAlert.measured_value || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Expected Physical Value</span>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{selectedAlert.expected_value || 'Nominal'}</p>
              </div>
            </div>

            <div className="space-y-1 text-slate-500 pt-2 border-t border-slate-100 text-[11px]">
              <p>• <strong>Detected At:</strong> {new Date(selectedAlert.detection_timestamp).toLocaleString()}</p>
              {selectedAlert.acknowledged_by && (
                <p>• <strong>Acknowledged By:</strong> {selectedAlert.acknowledged_by} ({new Date(selectedAlert.acknowledged_at).toLocaleString()})</p>
              )}
              {selectedAlert.resolved_by && (
                <p>• <strong>Resolved By:</strong> {selectedAlert.resolved_by} ({new Date(selectedAlert.resolved_at).toLocaleString()})</p>
              )}
              {selectedAlert.resolution_notes && (
                <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800">
                  <strong>Resolution Engineering Log:</strong> {selectedAlert.resolution_notes}
                </div>
              )}
            </div>

            {/* Operator Actions */}
            {isOperator && selectedAlert.status !== 'RESOLVED' && (
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                {selectedAlert.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleAcknowledge(selectedAlert.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    Acknowledge Alert
                  </button>
                )}
                <button
                  onClick={() => setIsResolveModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Resolve Alert
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Resolve Alert Notes Modal */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Resolve SCADA Anomaly Work Log"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResolve} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Please log the physical cause and corrective action taken before closing alert #{selectedAlert?.id}.
          </p>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
              Resolution Notes (Required)
            </label>
            <textarea
              required
              rows={4}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. String combiner box fuse replaced. Array soiling cleared by robotic brush."
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsResolveModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
            >
              {actionLoading ? 'Recording...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AlertsAndNotifications;
