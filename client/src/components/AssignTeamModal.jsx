import React, { useState } from 'react';
import { Users, Check, X, Shield, Phone } from 'lucide-react';

export function AssignTeamModal({ incident, rescueTeams, onClose, onAssign }) {
  const [selectedTeamId, setSelectedTeamId] = useState(incident?.assigned_team_id || '');
  const [submitting, setSubmitting] = useState(false);

  if (!incident) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) {
      alert('Please select a rescue unit to dispatch.');
      return;
    }

    setSubmitting(true);
    try {
      await onAssign(incident.id, 'In Progress', selectedTeamId);
      onClose();
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-950">Dispatch Tactical Squad</h3>
              <p className="text-[11px] text-slate-500">Target #{incident.id} ({incident.predicted_category})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
            <div className="font-bold text-blue-900 mb-1">Incident Report:</div>
            <p className="italic text-slate-600 line-clamp-2">"{incident.description}"</p>
          </div>

          <div>
            <label className="text-xs font-bold text-blue-900 block mb-2">
              Select Field Rescue Unit:
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {rescueTeams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    Number(selectedTeamId) === Number(team.id)
                      ? 'bg-blue-50 border-blue-500 text-blue-950 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-950">{team.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span>{team.station_base || 'Station Base'}</span>
                        <span>•</span>
                        <span>{team.phone || 'Wireless Channel 1'}</span>
                      </div>
                    </div>
                  </div>
                  {Number(selectedTeamId) === Number(team.id) && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTeamId}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Dispatching Squad...' : 'Deploy Rescue Squad'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
