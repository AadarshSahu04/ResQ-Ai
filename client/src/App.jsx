import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { RescueTeamView } from './pages/RescueTeamView';
import { PublicReport } from './pages/PublicReport';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { api } from './services/api';

function AppContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('operations'); // operations, routing, public
  const [authView, setAuthView] = useState('login'); // login, register
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);

  // Set default tab based on user role when logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'Rescue Team') {
        setActiveTab('routing');
      } else if (user.role === 'Public User') {
        setActiveTab('public');
      } else {
        setActiveTab('operations');
      }
    }
  }, [user]);

  // Sync HITL pending verification count for navbar badge
  useEffect(() => {
    if (!isAuthenticated) return;
    api.getIncidents({ requires_manual_verification: 'true', status: 'Reported' })
      .then((incs) => setPendingVerificationCount(incs.length))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return;
    const updateCount = () => {
      api.getIncidents({ requires_manual_verification: 'true', status: 'Reported' })
        .then((incs) => setPendingVerificationCount(incs.length))
        .catch(() => {});
    };
    socket.on('incident:created', updateCount);
    socket.on('incident:verified', updateCount);
    socket.on('incident:updated', updateCount);
    return () => {
      socket.off('incident:created', updateCount);
      socket.off('incident:verified', updateCount);
      socket.off('incident:updated', updateCount);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-bold tracking-wider text-blue-950">Initializing RESQ-AI Emergency Grid...</span>
      </div>
    );
  }

  // If not authenticated, render Login/Register or Public SOS
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 border-b border-blue-900 text-white p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-black text-lg">
            <span className="bg-orange-500 px-2.5 py-0.5 rounded-lg text-white text-sm shadow-sm">RESQ-AI</span>
            <span className="text-sm text-blue-200 font-medium">Disaster Response Grid</span>
          </div>
          <button
            onClick={() => setActiveTab(activeTab === 'public' ? 'login' : 'public')}
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-1.5 rounded-lg font-bold transition shadow-sm cursor-pointer"
          >
            {activeTab === 'public' ? 'Staff Login' : 'Submit Citizen SOS Without Login'}
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          {activeTab === 'public' ? (
            <PublicReport onIncidentCreated={() => {}} />
          ) : authView === 'login' ? (
            <Login onSwitchToRegister={() => setAuthView('register')} />
          ) : (
            <Register onSwitchToLogin={() => setAuthView('login')} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Universal Command Navbar with Linear Gradient */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingVerificationCount={pendingVerificationCount}
      />

      {/* Main Dynamic Workspace */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'operations' && <Dashboard />}
        {activeTab === 'routing' && <RescueTeamView />}
        {activeTab === 'public' && <PublicReport />}
      </main>

      {/* Footer Status Bar with Clean Light Theme */}
      <footer className="bg-white border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-blue-950">RESQ-AI Decision Support System</span>
          <span>•</span>
          <span>Tiles: <strong className="text-emerald-700">OpenStreetMap (Free, No Key)</strong></span>
          <span>•</span>
          <span>NLP: <code className="text-purple-700 font-semibold">bart-large-mnli</code></span>
          <span>•</span>
          <span>Routing: <strong className="text-blue-700">OSRM Engine</strong></span>
        </div>
        <div className="text-slate-600">
          Operator: <strong className="text-blue-950">{user?.name}</strong> [{user?.role}]
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
