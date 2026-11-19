import React from 'react';
import { ShieldAlert, AlertTriangle, AlertOctagon, Activity } from 'lucide-react';

export function StatsOverview({ incidents = [], hazards = [] }) {
  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved');
  const activeIncidentsCount = activeIncidents.length;
  const pendingVerification = activeIncidents.filter((i) => i.requires_manual_verification).length;
  const activeHazards = hazards.filter((h) => h.is_active).length;
  const inProgress = activeIncidents.filter((i) => i.status === 'In Progress').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {/* Active Incidents Counter */}
      <div className={`p-4 rounded-xl border shadow-sm hover:shadow transition ${
        activeIncidentsCount === 0 ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Active Incidents
          </span>
          <div className={`p-1.5 rounded-lg ${
            activeIncidentsCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-blue-950 mt-1">{activeIncidentsCount}</div>
        <span className={`text-[11px] font-medium ${activeIncidentsCount === 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
          {activeIncidentsCount === 0 ? 'All emergency calls resolved' : 'Unresolved emergency calls'}
        </span>
      </div>

      {/* Human-in-the-Loop Verification Queue */}
      <div className={`p-4 rounded-xl border shadow-sm hover:shadow transition ${
        pendingVerification > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            AI HITL Queue
          </span>
          <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
          </div>
        </div>
        <div className="text-2xl font-black text-amber-900 mt-1">{pendingVerification}</div>
        <span className="text-[11px] text-amber-700 font-medium">Confidence &lt; 60% (Pending Sign-off)</span>
      </div>

      {/* Active Hazards */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Active Hazards
          </span>
          <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-blue-950 mt-1">{activeHazards}</div>
        <span className="text-[11px] text-slate-400 font-medium">PostGIS Blockages & Flood Zones</span>
      </div>

      {/* Dispatched Missions */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Squads In-Field
          </span>
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-blue-950 mt-1">{inProgress}</div>
        <span className="text-[11px] text-slate-400 font-medium">Active Rescue Units Deployed</span>
      </div>
    </div>
  );
}
