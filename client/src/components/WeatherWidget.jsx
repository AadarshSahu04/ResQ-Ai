import React, { useState, useEffect } from 'react';
import { CloudRain, Wind, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export function WeatherWidget({ latitude = 22.7196, longitude = 75.8577 }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeather();
  }, [latitude, longitude]);

  async function loadWeather() {
    setLoading(true);
    try {
      const data = await api.getWeather(latitude, longitude);
      setWeather(data);
    } catch (err) {
      console.warn('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex items-center justify-center text-xs text-slate-500 shadow-sm">
        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2 text-blue-600" />
        <span>Polling Open-Meteo precipitation metrics...</span>
      </div>
    );
  }

  if (!weather) return null;

  const isExtreme = weather.floodRisk?.includes('Extreme') || weather.floodRisk?.includes('High');

  return (
    <div
      className={`p-4 rounded-xl border text-xs transition-all shadow-sm ${
        isExtreme
          ? 'bg-sky-50 border-sky-300 text-sky-950'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <CloudRain className="w-4 h-4" />
          </div>
          <span className="font-bold text-blue-900 text-[11px] uppercase tracking-wider">
            Open-Meteo Flood Risk Radar
          </span>
        </div>
        <button
          onClick={loadWeather}
          title="Refresh weather"
          className="text-slate-400 hover:text-blue-700 p-1 rounded cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 text-center my-2.5">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 font-medium block">Precipitation</span>
          <span className="font-bold text-blue-950 font-mono text-sm">{weather.currentPrecipitationMm} mm/h</span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 font-medium block">6h Forecast</span>
          <span className="font-bold text-sky-600 font-mono text-sm">{weather.forecast6hPrecipitationMm} mm</span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 font-medium block">Wind Speed</span>
          <span className="font-bold text-slate-700 font-mono text-sm">{weather.windSpeedKmH} km/h</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-1 text-[11px] border-t border-slate-200/80">
        <AlertCircle className={`w-3.5 h-3.5 ${isExtreme ? 'text-sky-600' : 'text-slate-400'}`} />
        <span className="font-semibold text-slate-600">Alert Status:</span>
        <span
          className={`font-bold ${
            isExtreme ? 'text-sky-700 underline' : 'text-emerald-700'
          }`}
        >
          {weather.floodRisk}
        </span>
      </div>
    </div>
  );
}
