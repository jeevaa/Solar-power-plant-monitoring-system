import React, { useState, useEffect } from 'react';
import {
  Sun,
  Plus,
  Edit2,
  Trash2,
  Key,
  Copy,
  Check,
  AlertTriangle,
  MapPin,
  Calendar,
  Layers,
  Cpu,
  Coins,
  Radio,
  ExternalLink
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePlant } from '../context/PlantContext';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const SolarPlants = () => {
  const { hasRole } = useAuth();
  const { plants, selectedPlantId, selectPlant, refreshPlants } = usePlant();
  const [loading, setLoading] = useState(false);
  const [selectedPlantDetail, setSelectedPlantDetail] = useState(null);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    location: '',
    latitude: 15.6815,
    longitude: 78.2778,
    installed_capacity_kwp: 1000.0,
    panel_count: 2500,
    rated_panel_power_wp: 400.0,
    inverter_capacity_kw: 950.0,
    panel_area_m2: 5125.0,
    installation_date: '2023-01-15',
    electricity_tariff: 7.50,
    export_tariff: 3.50,
    self_consumption_pct: 75.0,
    expected_pr: 80.0,
    low_gen_threshold_pct: 65.0,
    status: 'ONLINE',
    is_demo_mode: true
  });
  const [formError, setFormError] = useState('');

  const isAdmin = hasRole('ADMIN');

  const fetchDetail = async (id) => {
    try {
      const res = await api.get(`/plants/${id}`);
      setSelectedPlantDetail(res.data.plant);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedPlantId) {
      fetchDetail(selectedPlantId);
    }
  }, [selectedPlantId]);

  const handleOpenAdd = () => {
    setFormData({
      id: `PLANT-00${plants.length + 1}`,
      name: '',
      description: '',
      location: '',
      latitude: 19.0760,
      longitude: 72.8777,
      installed_capacity_kwp: 500.0,
      panel_count: 1250,
      rated_panel_power_wp: 400.0,
      inverter_capacity_kw: 480.0,
      panel_area_m2: 2560.0,
      installation_date: new Date().toISOString().split('T')[0],
      electricity_tariff: 7.50,
      export_tariff: 3.50,
      self_consumption_pct: 70.0,
      expected_pr: 80.0,
      low_gen_threshold_pct: 65.0,
      status: 'ONLINE',
      is_demo_mode: true
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (plant) => {
    setFormData({ ...plant });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleSavePlant = async (isEditing = false) => {
    setFormError('');
    try {
      if (isEditing) {
        await api.put(`/plants/${formData.id}`, formData);
      } else {
        await api.post('/plants', formData);
      }
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      refreshPlants();
      fetchDetail(formData.id);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save solar plant');
    }
  };

  const handleDeletePlant = async (id) => {
    if (!window.confirm(`Are you sure you want to delete solar plant ${id}? This will remove all associated telemetry.`)) {
      return;
    }
    try {
      await api.delete(`/plants/${id}`);
      refreshPlants();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete plant');
    }
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const calculatedKwp = ((formData.panel_count * formData.rated_panel_power_wp) / 1000.0).toFixed(2);
  const discrepancy = Math.abs(parseFloat(calculatedKwp) - parseFloat(formData.installed_capacity_kwp));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Solar Power Plant Assets</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure utility-scale and commercial photovoltaic generating stations
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Solar Plant</span>
          </button>
        )}
      </div>

      {/* Grid of Solar Plants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {plants.map((plant) => {
          const isSelected = plant.id === selectedPlantId;
          const isCalcDiff = plant.capacity_discrepancy?.has_discrepancy;

          return (
            <div
              key={plant.id}
              onClick={() => selectPlant(plant.id)}
              className={`bg-white rounded-2xl border p-5 transition-all cursor-pointer relative overflow-hidden shadow-xs hover:shadow-md ${
                isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
                  Active in SCADA
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{plant.name}</h3>
                    <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[200px]">{plant.location}</span>
                    </p>
                  </div>
                </div>
                <StatusBadge status={plant.status} />
              </div>

              {/* Plant Specs Grid */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">DC Capacity</span>
                  <p className="font-bold text-slate-800">{plant.installed_capacity_kwp} kWp</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Inverter</span>
                  <p className="font-bold text-slate-800">{plant.inverter_capacity_kw} kW</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Expected PR</span>
                  <p className="font-bold text-emerald-600">{plant.expected_pr}%</p>
                </div>
              </div>

              {/* Capacity Discrepancy Alert */}
              {isCalcDiff && (
                <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200 flex items-start space-x-2 text-[11px] text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Specification Discrepancy: Modules yield {plant.capacity_discrepancy.calculated_kwp} kWp vs entered {plant.installed_capacity_kwp} kWp.
                  </span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{plant.panel_count} Panels ({plant.rated_panel_power_wp} Wp)</span>
                </div>

                {isAdmin && (
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenEdit(plant)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Plant"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {plants.length > 1 && (
                      <button
                        onClick={() => handleDeletePlant(plant.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Plant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Plant In-Depth Configuration & Inverters */}
      {selectedPlantDetail && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Selected Facility Details</span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{selectedPlantDetail.name} ({selectedPlantDetail.id})</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">{selectedPlantDetail.description || 'Utility-grade solar power installation.'}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500">Operational Mode:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                {selectedPlantDetail.is_demo_mode ? 'Deterministic Simulation' : 'Direct Sensor Interface'}
              </span>
            </div>
          </div>

          {/* Technical Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Location Coordinates</span>
              <p className="font-bold text-slate-800 mt-1">{selectedPlantDetail.latitude}°, {selectedPlantDetail.longitude}°</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Installation Date</span>
              <p className="font-bold text-slate-800 mt-1">{selectedPlantDetail.installation_date || 'N/A'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Retail Tariff</span>
              <p className="font-bold text-slate-800 mt-1">₹{selectedPlantDetail.electricity_tariff} / kWh</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Feed-in Export Tariff</span>
              <p className="font-bold text-slate-800 mt-1">₹{selectedPlantDetail.export_tariff} / kWh</p>
            </div>
          </div>

          {/* External Hardware Device Integration Secret Key (Mode B) */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Mode B Hardware Ingestion API Key
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Pass this key via header <code className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded font-mono">X-Plant-Key</code> when publishing Modbus telemetry from physical monitoring gateways.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs text-emerald-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                {selectedPlantDetail.api_key}
              </span>
              <button
                onClick={() => handleCopyKey(selectedPlantDetail.api_key)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                title="Copy API Key"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Associated Inverters List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Associated Inverters & Power Blocks
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(selectedPlantDetail.inverters || []).map((inv) => (
                <div key={inv.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{inv.name}</p>
                      <p className="text-[10px] text-slate-500">{inv.model} • {inv.rated_ac_power_kw} kW AC</p>
                    </div>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Plant Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isEditModalOpen ? 'Edit Solar Plant Configuration' : 'Add New Solar Power Plant'}
        maxWidth="max-w-3xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSavePlant(isEditModalOpen);
          }}
          className="space-y-4 text-xs"
        >
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Plant ID</label>
              <input
                type="text"
                required
                disabled={isEditModalOpen}
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Plant Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Helios Solar Park III"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Location</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Pavagada Solar Park, Karnataka, India"
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Latitude (°N)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Longitude (°E)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Equipment Specifications & Calculation Validation */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Module Capacity & Rating Verification
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-medium">Panel Count</label>
                <input
                  type="number"
                  required
                  value={formData.panel_count}
                  onChange={(e) => setFormData({ ...formData, panel_count: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium">Panel Rating (Wp)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.rated_panel_power_wp}
                  onChange={(e) => setFormData({ ...formData, rated_panel_power_wp: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium">Entered Installed Capacity (kWp)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.installed_capacity_kwp}
                  onChange={(e) => setFormData({ ...formData, installed_capacity_kwp: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Validation Notice */}
            <div className={`p-2.5 rounded-lg flex items-center justify-between text-[11px] ${
              discrepancy > 0.05 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}>
              <span>
                Calculated DC Capacity ({formData.panel_count} × {formData.rated_panel_power_wp} Wp) = <strong>{calculatedKwp} kWp</strong>
              </span>
              {discrepancy > 0.05 ? (
                <span className="font-semibold text-amber-800">⚠️ Discrepancy: {discrepancy.toFixed(2)} kWp</span>
              ) : (
                <span className="font-semibold text-emerald-800">✓ Consistent</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Inverter Capacity (kW)</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.inverter_capacity_kw}
                onChange={(e) => setFormData({ ...formData, inverter_capacity_kw: parseFloat(e.target.value) })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Retail Tariff (₹/kWh)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.electricity_tariff}
                onChange={(e) => setFormData({ ...formData, electricity_tariff: parseFloat(e.target.value) })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Export Tariff (₹/kWh)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.export_tariff}
                onChange={(e) => setFormData({ ...formData, export_tariff: parseFloat(e.target.value) })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Expected PR (%)</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.expected_pr}
                onChange={(e) => setFormData({ ...formData, expected_pr: parseFloat(e.target.value) })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Low-Gen Threshold (%)</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.low_gen_threshold_pct}
                onChange={(e) => setFormData({ ...formData, low_gen_threshold_pct: parseFloat(e.target.value) })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">Self Consumption (%)</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.self_consumption_pct}
                onChange={(e) => setFormData({ ...formData, self_consumption_pct: parseFloat(e.target.value) })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="is_demo_mode"
              checked={formData.is_demo_mode}
              onChange={(e) => setFormData({ ...formData, is_demo_mode: e.target.checked })}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <label htmlFor="is_demo_mode" className="text-xs text-slate-700 font-semibold cursor-pointer">
              Enable Demo Mode (Generate realistic deterministic solar telemetry)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
            >
              {isEditModalOpen ? 'Save Changes' : 'Create Solar Plant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SolarPlants;
