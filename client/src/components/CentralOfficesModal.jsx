import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle2,
  X,
  Edit2,
  Save,
  Users,
  Compass,
  ArrowRight,
  Shield,
  Star
} from 'lucide-react';
import { api } from '../services/api';

export function CentralOfficesModal({
  offices = [],
  activeOffice = null,
  onClose,
  onOfficeChanged,
  onSquadsReset,
  isAdmin = false,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    city: '',
    address: '',
    lon: '',
    lat: '',
  });
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const handleStartEdit = (office) => {
    setEditingId(office.id);
    setEditFormData({
      name: office.name,
      city: office.city,
      address: office.address || '',
      lon: office.location?.coordinates ? office.location.coordinates[0] : '',
      lat: office.location?.coordinates ? office.location.coordinates[1] : '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (officeId) => {
    setSaving(true);
    setActionMessage('');
    try {
      const payload = {
        name: editFormData.name,
        city: editFormData.city,
        address: editFormData.address,
        coordinates: [parseFloat(editFormData.lon), parseFloat(editFormData.lat)],
      };
      const res = await api.updateOffice(officeId, payload);
      setActionMessage(`✅ ${res.office.name} updated successfully.`);
      setEditingId(null);
      if (onOfficeChanged) onOfficeChanged(res.office);
    } catch (err) {
      alert(`Failed to update office: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (officeId) => {
    setSaving(true);
    setActionMessage('');
    try {
      const res = await api.setActiveOffice(officeId);
      setActionMessage(`⭐ Active Central Command switched to: ${res.activeOffice.name}. All 4 squads relocated to resting quarters.`);
      if (onOfficeChanged) onOfficeChanged(res.activeOffice);
      if (onSquadsReset) onSquadsReset(res.updatedSquads);
    } catch (err) {
      alert(`Failed to set active office: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRecallSquads = async () => {
    setSaving(true);
    setActionMessage('');
    try {
      const res = await api.resetSquadsToOffice();
      setActionMessage(`🛡️ All 4 rescue squads successfully recalled to resting quarters at ${res.activeOffice.name}.`);
      if (onSquadsReset) onSquadsReset(res.updatedSquads);
    } catch (err) {
      alert(`Failed to recall squads: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-300 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden text-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-900 text-white p-5 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide">
                National Regional Headquarters & Resting Bases
              </h2>
              <p className="text-xs text-blue-200">
                5 Major Command Facilities across India • Squads rest here before emergency dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Notification Banner */}
        {actionMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-900 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Global Controls for Admin */}
        {isAdmin && (
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Current Operational HQ:</span>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-xs flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                {activeOffice?.name || 'Indore Rau Central Command Hub'}
              </span>
            </div>

            <button
              onClick={handleRecallSquads}
              disabled={saving}
              className="bg-blue-800 hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              title="Reset all 4 squad resting locations to the active Central HQ"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Recall & Rest All Squads at HQ</span>
            </button>
          </div>
        )}

        {/* Offices List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {offices.map((office) => {
            const isActive = activeOffice?.id === office.id || office.is_active;
            const isEditing = editingId === office.id;
            const coords = office.location?.coordinates || [0, 0];

            return (
              <div
                key={office.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-amber-50/50 border-amber-300 shadow-sm ring-1 ring-amber-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {isEditing ? (
                  /* Edit Form */
                  <div className="space-y-3">
                    <div className="font-bold text-sm text-blue-950 flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-orange-600" />
                      <span>Edit Facility: {office.city}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Facility Name
                        </label>
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          City / Region
                        </label>
                        <input
                          type="text"
                          value={editFormData.city}
                          onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Address / Base Landmark
                        </label>
                        <input
                          type="text"
                          value={editFormData.address}
                          onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          GPS Longitude (East)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={editFormData.lon}
                          onChange={(e) => setEditFormData({ ...editFormData, lon: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          GPS Latitude (North)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={editFormData.lat}
                          onChange={(e) => setEditFormData({ ...editFormData, lat: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(office.id)}
                        disabled={saving}
                        className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Card View */
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-blue-950">{office.name}</span>
                        {isActive && (
                          <span className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                            <Star className="w-2.5 h-2.5 fill-white" />
                            <span>Active Central HQ</span>
                          </span>
                        )}
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          {office.region}
                        </span>
                      </div>

                      <p className="text-slate-600 text-[11px]">
                        {office.address || office.description}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono pt-0.5">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-orange-600" />
                          <span>GPS: {coords[1]?.toFixed(4)}° N, {coords[0]?.toFixed(4)}° E</span>
                        </div>
                        <div>City: <strong className="text-slate-700 font-sans">{office.city}</strong></div>
                      </div>
                    </div>

                    {/* Admin Action Controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-2 self-center shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => handleSetActive(office.id)}
                            disabled={saving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition shadow-xs cursor-pointer"
                            title="Set as active Central Command HQ for squads"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Set Active HQ</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleStartEdit(office)}
                          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
                          title="Edit office coordinates and details"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Emergency routes automatically originate from the assigned squad or nearest Central HQ base.
          </span>
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
