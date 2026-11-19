import React, { useState } from 'react';
import {
  ShieldAlert,
  MapPin,
  Send,
  CheckCircle,
  AlertTriangle,
  LocateFixed,
  CloudRain,
  Cpu,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function PublicReport({ onIncidentCreated }) {
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  // Default to Indore Rau Active HQ coordinates
  const [latitude, setLatitude] = useState(22.6288);
  const [longitude, setLongitude] = useState(75.8118);
  const [reportedByName, setReportedByName] = useState(user?.name || 'Udit Maheshwari');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState(null);

  // Quick emergency preset templates localized to Indore
  const presets = [
    {
      label: '🌊 Kanh River Flash Flood (Rajwada)',
      text: 'Monsoon flash flood water rapidly inundated residential ground floors near Kanh River embankment at Krishnapura Chhatri, 5 family members trapped on terrace.',
      lat: 22.7180,
      lon: 75.8560,
    },
    {
      label: '🔥 Commercial Complex Fire (Vijay Nagar)',
      text: 'Thick black smoke and flames coming from commercial warehouse near AB Road Vijay Nagar, transformer lines crackling.',
      lat: 22.7533,
      lon: 75.8940,
    },
    {
      label: '🚧 AB Road Inundation & Blockage (Palasia)',
      text: 'Uprooted banyan tree and deep waterlogging completely blocking arterial road lanes near Palasia Square.',
      lat: 22.7210,
      lon: 75.8820,
    },
    {
      label: '🚑 Urgent Cardiac Evacuation (Bhawarkua)',
      text: 'Elderly cardiac patient in critical condition requiring rapid hospital transport, residential access street flooded near Bhawarkua Hub.',
      lat: 22.6950,
      lon: 75.8650,
    },
  ];

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
        setLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLatitude(22.6288);
        setLongitude(75.8118);
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please describe the emergency incident.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createIncident({
        description: description.trim(),
        latitude,
        longitude,
        reported_by_name: reportedByName.trim() || 'Citizen',
      });

      setResult(res);
      if (onIncidentCreated) {
        onIncidentCreated(res.incident);
      }
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setDescription('');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header Banner with Linear Gradient */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-xl shadow-md">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wide">
              RESQ-AI Emergency SOS Portal
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 mt-1">
              AI-driven rapid response triage. Indian disaster authority squads are on 24/7 standby.
            </p>
          </div>
        </div>
      </div>

      {result ? (
        /* Confirmation & AI Triage Results Card */
        <div className="bg-white border border-emerald-300 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-sm">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-blue-950">Emergency Alert Dispatched</h2>
                <span className="text-xs text-slate-500">Incident Ticket #{result.incident.id}</span>
              </div>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full font-mono font-bold uppercase">
              {result.incident.status}
            </span>
          </div>

          {/* AI Zero-Shot Classification Results */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-orange-600" />
              <span>Hugging Face Zero-Shot NLP Triage Analysis</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block">Category</span>
                <span className="text-base font-extrabold text-blue-950">
                  {result.incident.predicted_category}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block">AI Confidence Score</span>
                <span
                  className={`text-base font-extrabold font-mono ${
                    result.incident.confidence_score < 0.60
                      ? 'text-amber-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {Math.round(result.incident.confidence_score * 100)}%
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block">Assessed Severity</span>
                <span className="text-base font-extrabold font-mono text-red-600">
                  {Math.round(result.incident.severity_score * 100)} / 100
                </span>
              </div>
            </div>

            {/* Human-in-the-Loop Feedback Notice */}
            {result.incident.requires_manual_verification ? (
              <div className="bg-amber-50 border border-amber-300 p-3 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Human-in-the-Loop Flagged:</span> AI model confidence is below the safe 60% threshold. This ticket has been prioritized on Director Vigya Gupta's dashboard for verification!
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">AI High-Confidence Verification:</span> Incident verified automatically by BART-Large-MNLI model. Response squad notified.
                </div>
              </div>
            )}

            {/* Weather / Flood Risk Summary */}
            {result.weatherAnalysis && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5 shadow-2xs">
                <CloudRain className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-950">Local Atmospheric Radar (Open-Meteo): </span>
                  {result.weatherAnalysis.summary}
                </div>
              </div>
            )}
          </div>

          {/* Citizen Instructions */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-950 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <Info className="w-4 h-4 text-blue-700" />
              <span>Critical Citizen Safety Guidelines:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Stay calm and remain in your current safe elevated zone unless active fire mandates immediate movement.</li>
              <li>Keep your mobile battery conserved and line open for tactical squad communication.</li>
              <li>Rescue units are utilizing OSRM hazard-avoidance corridors to arrive without road obstruction delays.</li>
            </ul>
          </div>

          <button
            onClick={handleReset}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs transition border border-slate-300 cursor-pointer"
          >
            Submit Another Emergency Report
          </button>
        </div>
      ) : (
        /* Report Form */
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Quick Scenario Pills */}
          <div>
            <label className="text-xs font-bold text-blue-950 uppercase tracking-wider block mb-2">
              Common Emergency Scenarios (Click to auto-populate):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setDescription(preset.text);
                    if (preset.lat && preset.lon) {
                      setLatitude(preset.lat);
                      setLongitude(preset.lon);
                    }
                  }}
                  className="bg-slate-50 hover:bg-orange-50/50 border border-slate-200 hover:border-orange-300 p-2.5 rounded-xl text-left text-xs text-slate-700 hover:text-slate-900 transition flex items-center justify-between cursor-pointer"
                >
                  <span className="font-bold text-xs">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-blue-950 block mb-1.5">
              Describe Emergency Situation <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide exact details: nature of danger, number of persons trapped or injured, road conditions..."
              className="w-full bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none transition resize-none focus:bg-white"
              required
            />
          </div>

          {/* Coordinates & GPS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-600" />
                <span>Geographic Incident Coordinates</span>
              </label>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="bg-white hover:bg-slate-100 text-xs text-blue-900 border border-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition shadow-2xs cursor-pointer"
              >
                <LocateFixed className={`w-3.5 h-3.5 text-orange-500 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Detecting GPS...' : 'Use My Live GPS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block mb-1">Latitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block mb-1">Longitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reporter Name */}
          <div>
            <label className="text-xs font-bold text-blue-950 block mb-1">
              Your Name / Contact Reference
            </label>
            <input
              type="text"
              value={reportedByName}
              onChange={(e) => setReportedByName(e.target.value)}
              placeholder="e.g. Udit Maheshwari, +91 98765-43210"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          {/* Submit Button in vibrant Orange */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3.5 px-4 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Transmitting SOS to RESQ-AI Mesh...' : 'TRANSMIT SOS REPORT IMMEDIATELY'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
