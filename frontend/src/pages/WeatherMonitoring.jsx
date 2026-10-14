import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Sunrise,
  Sunset,
  CloudRain,
  Cloud,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

const WeatherMonitoring = () => {
  const { currentPlant, selectedPlantId } = usePlant();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWeather = async (manual = false) => {
    if (!selectedPlantId) return;
    if (manual) setRefreshing(true);
    try {
      const res = await api.get(`/weather/${selectedPlantId}`);
      setWeather(res.data);
    } catch (err) {
      console.error('Failed to load weather:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchWeather();
  }, [selectedPlantId]);

  if (loading || !currentPlant) {
    return <LoadingSpinner message="Querying Open-Meteo Meteorological Service..." />;
  }

  const w = weather || {};
  const isFallback = w.is_fallback;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Weather & Solar Radiation Monitoring</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              isFallback ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-sky-100 text-sky-800 border border-sky-300'
            }`}>
              {isFallback ? 'Simulated Clear-Sky Model' : 'Open-Meteo API Online'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Station Coordinates: {currentPlant.latitude}° N, {currentPlant.longitude}° E ({currentPlant.location})
          </p>
        </div>

        <button
          onClick={() => fetchWeather(true)}
          disabled={refreshing}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Weather</span>
        </button>
      </div>

      {/* Meteorological Observations Notice */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-slate-700">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Meteorological Distinctions:</strong> Global Horizontal Irradiance (GHI) and Direct Normal Irradiance (DNI) represent modeled solar radiation from meteorological satellite assimilation. Operational panel temperature is influenced by ambient temperature and incident irradiance per the NOCT thermal formula.
        </div>
      </div>

      {/* Atmospheric Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Ambient Temp"
          value={`${w.temperature_c || 28}°C`}
          unit=""
          icon={Thermometer}
          color="amber"
          subtitle="2m surface air"
        />
        <StatCard
          title="GHI Irradiance"
          value={w.global_horizontal_irradiance || 0}
          unit="W/m²"
          icon={Sun}
          color="emerald"
          subtitle="Horizontal Plane"
        />
        <StatCard
          title="Relative Humidity"
          value={`${w.relative_humidity_pct || 45}%`}
          unit=""
          icon={Droplets}
          color="blue"
          subtitle="Dewpoint saturation"
        />
        <StatCard
          title="Cloud Cover"
          value={`${w.cloud_cover_pct || 10}%`}
          unit=""
          icon={Cloud}
          color="blue"
          subtitle="Total Sky Coverage"
        />
        <StatCard
          title="Wind Velocity"
          value={`${w.wind_speed_ms || 3.2} m/s`}
          unit=""
          icon={Wind}
          color="indigo"
          subtitle="Convective cooling"
        />
        <StatCard
          title="Precipitation"
          value={`${w.precipitation_mm || 0.0} mm`}
          unit=""
          icon={CloudRain}
          color="blue"
          subtitle="Liquid rate"
        />
      </div>

      {/* Sun Ephemeris & Radiation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Sunrise className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Astronomical Sunrise</span>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{w.sunrise || '06:15'}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400">Dawn Horizon</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Sunset className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Astronomical Sunset</span>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{w.sunset || '18:30'}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400">Dusk Horizon</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direct Normal (DNI)</span>
              <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{w.direct_normal_irradiance || 0} W/m²</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400">Direct Beam</span>
        </div>
      </div>

      {/* Hourly 24-hr Forecast Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Hourly Forecast: Solar Irradiance & Ambient Temperature</h3>
            <p className="text-xs text-slate-500">24-hour meteorological outlook for generation scheduling</p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
              <span className="text-slate-600">GHI Irradiance (W/m²)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-sky-500"></span>
              <span className="text-slate-600">Temperature (°C)</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={w.forecast_hourly || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weatherGhi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(t) => t.slice(11, 16) || t} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                formatter={(val, name) => [name === 'ghi_w_m2' ? `${val} W/m²` : `${val} °C`, name === 'ghi_w_m2' ? 'Irradiance (GHI)' : 'Temperature']}
              />
              <Area yAxisId="left" type="monotone" dataKey="ghi_w_m2" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#weatherGhi)" name="ghi_w_m2" />
              <Line yAxisId="right" type="monotone" dataKey="temperature_c" stroke="#0284c7" strokeWidth={2} dot={false} name="temperature_c" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WeatherMonitoring;
