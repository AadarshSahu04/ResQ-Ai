import React, { useState } from 'react';
import { ShieldAlert, LogIn, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@resq.ai');
  const [password, setPassword] = useState('ResqSecure2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-blue-950">RESQ-AI Command Access</h2>
          <p className="text-xs text-slate-500">
            Emergency decision-support & disaster response coordination platform
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-blue-950 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-blue-950 block mb-1">
              Password
            </label>
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
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In to Command Center'}</span>
          </button>
        </form>

        {/* Indian Personnel Accounts Reference */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
          <div className="font-bold text-blue-950">Pre-seeded Accounts (Password: ResqSecure2026!):</div>
          <div>• Admin: <code className="text-blue-700 font-semibold">admin@resq.ai</code> (Aadarsh Sahu)</div>
          <div>• Authority: <code className="text-amber-700 font-semibold">authority@resq.ai</code> (Vigya Gupta)</div>
          <div>• Rescue Squad: <code className="text-emerald-700 font-semibold">rescue1@resq.ai</code> (Yatharth Gupta)</div>
          <div>• Citizen: <code className="text-slate-700 font-semibold">public@resq.ai</code> (Udit Maheshwari)</div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Need a new operator account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-orange-600 hover:underline font-bold cursor-pointer"
          >
            Register profile
          </button>
        </div>
      </div>
    </div>
  );
}
