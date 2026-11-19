import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Shield, X, Cpu } from 'lucide-react';

export function IncidentVerificationModal({ incident, onClose, onConfirm }) {
  const [category, setCategory] = useState(incident?.predicted_category || 'Medical');
  const [severity, setSeverity] = useState(incident?.severity_score || 0.70);
  const [submitting, setSubmitting] = useState(false);

  if (!incident) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm(incident.id, category, severity);
      onClose();
    } catch (err) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-amber-300 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2 rounded-xl shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-blue-950">Human-in-the-Loop AI Verification</h3>
              <p className="text-[11px] text-amber-800 font-medium">
                AI Confidence ({Math.round(incident.confidence_score * 100)}%) is below safe 60% threshold
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800">
          {/* Incident SOS Text */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
              Caller SOS Description:
            </span>
            <p className="text-sm text-slate-800 italic font-serif leading-relaxed">
              "{incident.description}"
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-200">
              <span>Reported by: <strong>{incident.reported_by_name || 'Citizen'}</strong></span>
              <span>Coordinates: {incident.location?.coordinates?.map(c => c.toFixed(4)).join(', ')}</span>
            </div>
          </div>

          {/* AI Assessment Breakdown */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-amber-50/50 p-3 rounded-xl border border-amber-200">
            <div>
              <span className="text-slate-500 block text-[11px]">NLP Model:</span>
              <span className="font-mono text-blue-950 font-bold">facebook/bart-large-mnli</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Model Confidence:</span>
              <span className="font-mono font-bold text-amber-700">
                {(incident.confidence_score * 100).toFixed(1)}% (FLAGGED)
              </span>
            </div>
          </div>

          {/* Category Override */}
          <div>
            <label className="text-xs font-bold text-blue-900 block mb-1.5">
              Confirm Disaster Category Classification:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Medical', 'Fire', 'Flood', 'Trapped', 'Blockage', 'General'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    category === cat
                      ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Severity Score Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-blue-900">
                Assign Severity Score:
              </label>
              <span className="text-sm font-bold font-mono text-red-600">
                {Math.round(severity * 100)} / 100
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="1.00"
              step="0.05"
              value={severity}
              onChange={(e) => setSeverity(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-medium">
              <span>Low (10%)</span>
              <span>Medium (50%)</span>
              <span>Critical / Life Threat (100%)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{submitting ? 'Authorizing...' : 'Authorize & Verify Incident'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
