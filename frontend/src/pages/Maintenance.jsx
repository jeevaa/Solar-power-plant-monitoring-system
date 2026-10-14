import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  Check,
  Search
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePlant } from '../context/PlantContext';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Maintenance = () => {
  const { hasRole } = useAuth();
  const { plants, selectedPlantId } = usePlant();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newStatus, setNewStatus] = useState('COMPLETED');
  const [completionNotes, setCompletionNotes] = useState('');

  const [formData, setFormData] = useState({
    plant_id: selectedPlantId,
    title: '',
    equipment: '',
    description: '',
    priority: 'MEDIUM',
    status: 'SCHEDULED',
    technician_name: '',
    technician_email: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: ''
  });
  const [formError, setFormError] = useState('');

  const isOperator = hasRole('ADMIN', 'OPERATOR');
  const isAdmin = hasRole('ADMIN');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let url = `/maintenance?plant_id=${selectedPlantId}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (priorityFilter) url += `&priority=${priorityFilter}`;
      const res = await api.get(url);
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to load maintenance tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedPlantId, statusFilter, priorityFilter]);

  const handleOpenAdd = () => {
    setFormData({
      plant_id: selectedPlantId,
      title: '',
      equipment: 'PV Array Section A',
      description: '',
      priority: 'MEDIUM',
      status: 'SCHEDULED',
      technician_name: '',
      technician_email: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      notes: ''
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/maintenance', formData);
      setIsAddModalOpen(false);
      fetchTasks();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create task');
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      await api.put(`/maintenance/${selectedTask.id}/status`, {
        status: newStatus,
        completion_notes: completionNotes
      });
      setIsStatusModalOpen(false);
      setSelectedTask(null);
      setCompletionNotes('');
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm(`Delete maintenance task #${id}?`)) return;
    try {
      await api.delete(`/maintenance/${id}`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.equipment.toLowerCase().includes(q) ||
      t.technician_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Maintenance & Work Order Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Preventive inspections, module cleaning cycles, and inverter servicing logs
          </p>
        </div>

        {isOperator && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Work Order</span>
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-semibold outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-semibold outline-hidden"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search tasks or technician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-emerald-500 w-56"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading Plant Maintenance Log..." />
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Maintenance Records Found</h3>
          <p className="text-xs text-slate-400 mt-1">There are no work orders matching the active filters.</p>
        </div>
      ) : (
        /* Tasks Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">{t.title}</h3>
                  <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                    <Layers className="w-3 h-3 text-slate-400" />
                    <span>{t.equipment}</span>
                  </p>
                </div>
              </div>

              {t.description && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {t.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Technician Assigned</span>
                  <p className="font-bold text-slate-800 mt-0.5">{t.technician_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Due Date</span>
                  <p className="font-bold text-slate-800 mt-0.5">{t.due_date}</p>
                </div>
              </div>

              {t.notes && (
                <div className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                  {t.notes}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-[10px] text-slate-400">Order #{t.id}</span>
                <div className="flex items-center space-x-2">
                  {isOperator && t.status !== 'COMPLETED' && (
                    <button
                      onClick={() => {
                        setSelectedTask(t);
                        setNewStatus('COMPLETED');
                        setIsStatusModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Update Status
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Maintenance Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule Preventive / Corrective Work Order"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">{formError}</div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Task Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Robot Array Surface Dust Cleaning"
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Equipment / Subsystem</label>
              <input
                type="text"
                required
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                placeholder="e.g. Inverter Block A, PV Strings 1-10"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Technician Name</label>
              <input
                type="text"
                required
                value={formData.technician_name}
                onChange={(e) => setFormData({ ...formData, technician_name: e.target.value })}
                placeholder="e.g. Suresh Kumar"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Due Date</label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Work Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of required physical inspection or maintenance procedure..."
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
            >
              Dispatch Work Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Maintenance Work Order Status"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Completion Notes / Findings
            </label>
            <textarea
              rows={3}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="e.g. All 2,500 panels brushed. Post-cleaning PR verified at 81.2%."
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
            >
              Save Status
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Maintenance;
