import React, { useState } from 'react';
import { ShieldAlert, UserPlus, Lock, Mail, User, Phone, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiBase, setCustomApiUrl } from '../services/api';

export function Register({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Public User');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(getApiBase().replace(/\/api$/, ''));

  const handleSaveUrl = (e) => {
    e.preventDefault();
    setCustomApiUrl(customUrl);
    window.location.reload();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(name, email, password, role, phone);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 sm:p-8 shadow-md space-y-5">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-blue-950">Join RESQ-AI Emergency Grid</h2>
          <p className="text-xs text-slate-500">
            Register an operational dispatch role or citizen SOS profile
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-blue-950 block mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aadarsh Sahu"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-blue-950 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aadarsh@resq.ai"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-blue-950 block mb-1">Operational Role</label>
            <div className="relative">
              <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 cursor-pointer focus:bg-white"
              >
                <option value="Public User">Public User (Citizen SOS)</option>
                <option value="Rescue Team">Rescue Team (Garuda / Tactical Squad)</option>
                <option value="Disaster Authority">Disaster Authority (Command Director)</option>
                <option value="Admin">Admin (Full System Operations)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-blue-950 block mb-1">Mobile / Radio Contact</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765-01234"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-blue-950 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 mt-2 cursor-pointer"
          >
            <span>{loading ? 'Creating Account...' : 'Register Profile'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <button onClick={onSwitchToLogin} className="text-orange-600 hover:underline font-bold cursor-pointer">
            Sign In here
          </button>
        </div>

        {/* Backend Connection Indicator / Live Switcher */}
        <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>API Server:</span>
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700 font-mono max-w-[200px] truncate">
              {getApiBase()}
            </code>
            <button
              type="button"
              onClick={() => setShowConfig((prev) => !prev)}
              className="text-orange-600 hover:underline font-bold ml-1 cursor-pointer"
            >
              {showConfig ? 'Close' : 'Configure'}
            </button>
          </div>
          {showConfig && (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-2 text-xs">
              <label className="text-[11px] font-bold text-slate-700 block">
                Render Backend Server URL:
              </label>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  placeholder="https://resq-ai-server-xxx.onrender.com"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleSaveUrl}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1 rounded-lg text-xs"
                >
                  Save
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Tip: Enter your live Render URL here to connect immediately without waiting for Vercel redeployment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
