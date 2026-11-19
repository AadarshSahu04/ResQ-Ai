import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  ShieldAlert,
  Radio,
  Users,
  AlertTriangle,
  LogOut,
  Navigation,
  FileText,
  UserCheck
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, pendingVerificationCount = 0 }) {
  const { user, logout, switchDemoRole } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 border-b border-blue-900/60 text-white px-4 lg:px-7 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-md">
      {/* Brand & Connection Status */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-xl text-white shadow-md shadow-orange-900/30 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black tracking-wide text-lg text-white">RESQ-AI</span>
            <span className="text-[10px] bg-blue-800/80 text-blue-200 font-semibold px-2 py-0.5 rounded-full border border-blue-600 uppercase tracking-wider">
              Disaster Decision Mesh
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-200">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-400 animate-ping-slow' : 'bg-red-400'
              }`}
            />
            <span className="text-[11px] font-medium">
              {connected ? 'Live Mesh Synchronized' : 'Connecting to Mesh...'}
            </span>
          </div>
        </div>
      </div>

      {/* Role Navigation View Selector */}
      <nav className="flex items-center gap-1.5 bg-blue-950/60 p-1 rounded-xl border border-blue-800/50">
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'operations'
              ? 'bg-orange-500 text-white shadow'
              : 'text-blue-200 hover:text-white hover:bg-blue-900/60'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Operations Center</span>
          {pendingVerificationCount > 0 && (
            <span className="ml-1 bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px] animate-pulse">
              {pendingVerificationCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('routing')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'routing'
              ? 'bg-orange-500 text-white shadow'
              : 'text-blue-200 hover:text-white hover:bg-blue-900/60'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Rescue Routing</span>
        </button>

        <button
          onClick={() => setActiveTab('public')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'public'
              ? 'bg-orange-500 text-white shadow'
              : 'text-blue-200 hover:text-white hover:bg-blue-900/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Public SOS Portal</span>
        </button>
      </nav>

      {/* Demo Role Switcher & User Profile with Indian Personnel */}
      <div className="flex items-center gap-3">
        {/* Quick Indian Personnel Switcher */}
        <div className="hidden sm:flex items-center gap-2 bg-blue-900/50 px-3 py-1 rounded-xl border border-blue-700/60 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-blue-200 text-[11px] font-medium">Switch Operator:</span>
          <select
            value={
              user?.email === 'admin@resq.ai'
                ? 'admin'
                : user?.email === 'authority@resq.ai'
                ? 'authority'
                : user?.email === 'rescue1@resq.ai'
                ? 'rescue1'
                : user?.email === 'rescue2@resq.ai'
                ? 'rescue2'
                : user?.email === 'rescue3@resq.ai'
                ? 'rescue3'
                : user?.email === 'rescue4@resq.ai'
                ? 'rescue4'
                : user?.email === 'shreyas@resq.ai'
                ? 'shreyas'
                : user?.email === 'ankitesh@resq.ai'
                ? 'ankitesh'
                : 'public'
            }
            onChange={(e) => switchDemoRole(e.target.value)}
            className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer text-xs"
          >
            <option value="admin" className="bg-slate-900 text-white">Admin (Aadarsh Sahu)</option>
            <option value="authority" className="bg-slate-900 text-white">Disaster Authority (Vigya Gupta)</option>
            <option value="rescue1" className="bg-slate-900 text-white">Squad 1: Garuda Unit (Yatharth Gupta)</option>
            <option value="rescue2" className="bg-slate-900 text-white">Squad 2: Kavach Flood Unit (Rohan Singhania)</option>
            <option value="rescue3" className="bg-slate-900 text-white">Squad 3: Chetak Unit (Aarav Mukati)</option>
            <option value="rescue4" className="bg-slate-900 text-white">Squad 4: Trishul Unit (Pooja Rathore)</option>
            <option value="public" className="bg-slate-900 text-white">Citizen (Udit Maheshwari)</option>
            <option value="shreyas" className="bg-slate-900 text-white">Citizen (Shreyas Joshi)</option>
            <option value="ankitesh" className="bg-slate-900 text-white">Citizen (Ankitesh Das)</option>
          </select>
        </div>

        {/* User Card */}
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-white">{user.name}</div>
              <div className="text-[10px] text-orange-300 font-semibold">{user.role}</div>
            </div>
            <button
              onClick={() => logout()}
              title="Logout / Switch Account"
              className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-800/60 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
