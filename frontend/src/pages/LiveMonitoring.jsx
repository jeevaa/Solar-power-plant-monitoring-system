import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Gauge,
  Thermometer,
  Sun,
  Radio,
  Clock,
  RefreshCw,
  Cpu,
  Layers,
  Code2,
  Copy,
  Check,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import api from '../api/client';
import { usePlant } from '../context/PlantContext';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const LiveMonitoring = () => {
  const { currentPlant, selectedPlantId } = usePlant();
  const [telemetry, setTelemetry] = useState(null);
  const [todayCurve, setTodayCurve] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(15); // seconds
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [activeTab, setActiveTab] = useState('telemetry'); // telemetry, gateway_integration

  const fetchLiveTelemetry = async (manual = false) => {
    if (!selectedPlantId) return;
    if (manual) setRefreshing(true);
    try {
      const [statusRes, todayRes] = await Promise.all([
        api.get(`/live/status/${selectedPlantId}`),
        api.get(`/live/today/${selectedPlantId}`),
      ]);
      setTelemetry(statusRes.data.telemetry);
      setTodayCurve(todayRes.data.points || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to poll telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLiveTelemetry();
  }, [selectedPlantId]);

  useEffect(() => {
    if (isPaused || pollingInterval <= 0) return;
    const interval = setInterval(() => {
      fetchLiveTelemetry();
    }, pollingInterval * 1000);
    return () => clearInterval(interval);
  }, [selectedPlantId, pollingInterval, isPaused]);

  if (loading || !currentPlant) {
    return <LoadingSpinner message="Polling Inverter Telemetry Bus..." />;
  }

  const tel = telemetry || {};
  const isSim = tel.is_simulated;

  const sampleCurl = `curl -X POST http://localhost:5001/api/live/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-Plant-Key: ${currentPlant.api_key}" \\
  -d '{
    "dc_voltage": 650.5,
    "dc_current": 1250.2,
    "ac_voltage": 415.0,
    "ac_power_kw": 795.5,
    "solar_irradiance_w_m2": 880.0,
    "panel_temperature_c": 45.2,
    "ambient_temperature_c": 32.5,
    "grid_frequency_hz": 50.02
  }'`;

  return (
    <div className="space-y-6">
      {/* Real-time SCADA Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Real-Time SCADA Telemetry</h2>
            {isSim ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                Mode A: DEMO DATA (SIMULATED)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                Mode B: HARDWARE GATEWAY ONLINE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Plant: <strong className="text-slate-700">{currentPlant.name}</strong> • Frequency: {tel.grid_frequency_hz || 50.0} Hz • Last Packet: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Polling Controls */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`p-1.5 rounded-md font-semibold flex items-center space-x-1 transition-colors ${
                isPaused ? 'bg-amber-500 text-white' : 'bg-white text-slate-700 shadow-2xs'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <select
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              disabled={isPaused}
              className="bg-transparent text-slate-700 font-semibold px-2 py-1 outline-hidden cursor-pointer"
            >
              <option value={10}>10s polling</option>
              <option value={15}>15s polling</option>
              <option value={30}>30s polling</option>
              <option value={60}>60s polling</option>
            </select>
          </div>

          <button
            onClick={() => fetchLiveTelemetry(true)}
            disabled={refreshing}
            className="flex items-center space-x-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Poll Now</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'telemetry'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Telemetry Dashboard
        </button>
        <button
          onClick={() => setActiveTab('gateway_integration')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'gateway_integration'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Device Integration API (Mode B)</span>
        </button>
      </div>

      {activeTab === 'telemetry' ? (
        <div className="space-y-6">
          {/* Telemetry Instruments Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. AC Output Power */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AC Power</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-extrabold text-emerald-600">{tel.ac_power_kw || '0.0'}</span>
                <span className="text-xs text-slate-500 font-medium">kW</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Active Generation</span>
            </div>

            {/* 2. Solar Irradiance */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Solar Irradiance</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-extrabold text-amber-500">{tel.solar_irradiance_w_m2 || '0.0'}</span>
                <span className="text-xs text-slate-500 font-medium">W/m²</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Pyranometer Sensor</span>
            </div>

            {/* 3. Daily Energy */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Energy</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-extrabold text-sky-600">{tel.daily_energy_kwh || '0.0'}</span>
                <span className="text-xs text-slate-500 font-medium">kWh</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Accumulated Today</span>
            </div>

            {/* 4. Inverter Efficiency */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inverter Eff.</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-extrabold text-indigo-600">{tel.inverter_efficiency_pct || '0.0'}</span>
                <span className="text-xs text-slate-500 font-medium">%</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Conversion Ratio</span>
            </div>

            {/* 5. Panel Temperature */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Module Temp</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className={`text-2xl font-extrabold ${tel.panel_temperature_c > 65 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {tel.panel_temperature_c || '0.0'}
                </span>
                <span className="text-xs text-slate-500 font-medium">°C</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Thermistor Sensor</span>
            </div>

            {/* 6. Grid Frequency */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grid Frequency</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-extrabold text-slate-800">{tel.grid_frequency_hz || '50.00'}</span>
                <span className="text-xs text-slate-500 font-medium">Hz</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Grid Sync State</span>
            </div>
          </div>

          {/* Electrical Bus Breakdown (DC Side vs AC Side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* DC Side Bus */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  DC
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Direct Current (DC) Array Input</h3>
                  <p className="text-[11px] text-slate-500">Solar module string collection bus parameters</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">DC Voltage (Vdc)</span>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{tel.dc_voltage} V</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">MPPT Range: 450-850V</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">DC Current (Idc)</span>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{tel.dc_current} A</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">String Summation</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">DC Power (Pdc)</span>
                  <p className="text-xl font-extrabold text-amber-600 mt-1">{tel.dc_power_kw} kW</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Vdc × Idc</span>
                </div>
              </div>
            </div>

            {/* AC Side Bus */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  AC
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Alternating Current (AC) Grid Output</h3>
                  <p className="text-[11px] text-slate-500">Central inverter synchronized 3-phase grid export</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">AC Line Voltage (Vac)</span>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{tel.ac_voltage} V</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Nominal 415V (L-L)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">AC Line Current (Iac)</span>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{tel.ac_current} A</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">3-Phase Injected</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">AC Export (Pac)</span>
                  <p className="text-xl font-extrabold text-emerald-600 mt-1">{tel.ac_power_kw} kW</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Net Grid Injection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Generation Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Today's Generation Curve</h3>
                <p className="text-xs text-slate-500">Continuous sampling of solar power across daylight hours</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Data Points: {todayCurve.length} samples
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={todayCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="liveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} kW`, 'Power Generation']}
                  />
                  <Area type="monotone" dataKey="actual_power_kw" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#liveGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        /* Mode B Hardware Integration Guide */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">External Gateway & Hardware API Interface (Mode B)</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              The monitoring platform includes a secure endpoint for receiving live measurements directly from external hardware—such as Raspberry Pi, ESP32, Modbus RTU-to-TCP gateways, or physical RS-485 solar string monitoring units.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2">Endpoint Specifications</h4>
              <ul className="space-y-1.5 text-slate-600 font-mono">
                <li><strong>Method:</strong> POST</li>
                <li><strong>URL:</strong> /api/live/ingest</li>
                <li><strong>Header:</strong> X-Plant-Key: {currentPlant.api_key}</li>
                <li><strong>Content-Type:</strong> application/json</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2">Payload Validation Rules</h4>
              <ul className="space-y-1 text-slate-600">
                <li>• Rejects negative voltage, current, and irradiance readings.</li>
                <li>• Verifies grid frequency within 40Hz - 70Hz nominal bounds.</li>
                <li>• Automatically flags sensor data as STALE if packet lag &gt; 10 minutes.</li>
                <li>• Evaluates the 8 real-time fault rules synchronously upon receipt.</li>
              </ul>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">Sample Hardware Ingestion Request (cURL)</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sampleCurl);
                  setCopiedCurl(true);
                  setTimeout(() => setCopiedCurl(false), 2000);
                }}
                className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'Copied' : 'Copy cURL Command'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800">
              {sampleCurl}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMonitoring;
