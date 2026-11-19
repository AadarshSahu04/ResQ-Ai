import React, { useState } from 'react';
import { Pencil, Check, X, Undo, ShieldAlert, Droplets } from 'lucide-react';

export function HazardDrawer({
  isDrawing,
  setIsDrawing,
  drawingPoints,
  setDrawingPoints,
  onSaveHazard,
}) {
  const [hazardType, setHazardType] = useState('Blockage');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setDrawingPoints([]);
  };

  const handleCancel = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    setNotes('');
  };

  const handleUndo = () => {
    setDrawingPoints((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (drawingPoints.length < 3) {
      alert('A hazard zone polygon requires at least 3 boundary coordinates.');
      return;
    }

    setSaving(true);
    try {
      const geoCoordinates = drawingPoints.map(([lat, lon]) => [lon, lat]);
      // Close outer ring
      geoCoordinates.push([...geoCoordinates[0]]);

      await onSaveHazard({
        type: hazardType,
        coordinates: geoCoordinates,
        notes: notes.trim(),
      });

      setIsDrawing(false);
      setDrawingPoints([]);
      setNotes('');
    } catch (err) {
      alert(`Error saving hazard: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isDrawing) {
    return (
      <button
        onClick={handleStartDrawing}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
      >
        <Pencil className="w-4 h-4" />
        <span>Declare Hazard Zone (Draw Polygon)</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-orange-300 p-4 rounded-xl shadow-lg space-y-3 w-full max-w-md text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
          <h3 className="text-sm font-bold text-blue-900">Hazard Boundary Tool</h3>
        </div>
        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold border border-slate-200">
          {drawingPoints.length} Points
        </span>
      </div>

      <p className="text-xs text-slate-600">
        Click on the interactive map to establish perimeter vertices around the danger area.
      </p>

      {/* Hazard Type Selector */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setHazardType('Blockage')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
            hazardType === 'Blockage'
              ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
          }`}
        >
          <span>🚧 Road Blockage</span>
        </button>

        <button
          type="button"
          onClick={() => setHazardType('Flood')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
            hazardType === 'Flood'
              ? 'bg-sky-50 border-sky-500 text-sky-800 shadow-sm'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
          }`}
        >
          <span>🌊 Flood Inundation</span>
        </button>
      </div>

      {/* Notes / Description */}
      <div>
        <label className="text-[11px] font-bold text-slate-700 block mb-1">
          Hazard Details / Location Notes:
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Ring Road overpass debris, submerged underpass"
          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleUndo}
          disabled={drawingPoints.length === 0}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200 cursor-pointer"
        >
          <Undo className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={drawingPoints.length < 3 || saving}
          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Commit Hazard Zone'}</span>
        </button>
      </div>
    </div>
  );
}
