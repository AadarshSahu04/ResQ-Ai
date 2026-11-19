import React, { useState, useEffect } from 'react';
import {
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  X,
  ArrowRight,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Plane,
  Truck,
  Car
} from 'lucide-react';

export function RouteViewerModal({ routeData, onClose, onClearRoute, onSelectRouteVariant }) {
  if (!routeData) return null;

  const hasMultimodal = routeData.multimodal && routeData.multimodal.isMultimodal;
  const initialVariant = routeData.selectedMode || (routeData.alternativeRoute ? 'safe' : (hasMultimodal ? 'multimodal' : 'safe'));
  const [viewVariant, setViewVariant] = useState(initialVariant);

  useEffect(() => {
    const nextVariant = routeData.selectedMode || (routeData.alternativeRoute ? 'safe' : (hasMultimodal ? 'multimodal' : 'safe'));
    setViewVariant(nextVariant);
  }, [routeData]);

  const activeDisplayRoute =
    viewVariant === 'blocked' && routeData.blockedRoute
      ? routeData.blockedRoute
      : viewVariant === 'safe' && routeData.alternativeRoute
      ? routeData.alternativeRoute
      : routeData.route;

  const isBlocked = viewVariant === 'blocked' || (!hasMultimodal && activeDisplayRoute?.intersectsHazard);
  const distanceKm = activeDisplayRoute ? (activeDisplayRoute.distance / 1000).toFixed(2) : '0.00';
  const durationMin = activeDisplayRoute ? Math.round(activeDisplayRoute.duration / 60) : 0;

  const steps =
    activeDisplayRoute?.legs && activeDisplayRoute.legs[0] && activeDisplayRoute.legs[0].steps
      ? activeDisplayRoute.legs[0].steps
      : [];

  const multimodal = routeData.multimodal;

  const formatDuration = (totalSeconds) => {
    const s = Math.round(totalSeconds || 0);
    if (s <= 0) return '0 mins';
    const m = Math.round(s / 60);
    if (m < 1) return `${s}s`;
    if (m >= 60) {
      const hrs = Math.floor(m / 60);
      const remM = m % 60;
      return `${hrs}h ${remM}m`;
    }
    return `${m} mins`;
  };

  const getStepIcon = (iconType) => {
    switch (iconType) {
      case 'right':
      case 'slight-right':
        return <CornerUpRight className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />;
      case 'left':
      case 'slight-left':
        return <CornerUpLeft className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />;
      case 'u-turn':
        return <RotateCcw className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />;
      case 'arrive':
        return <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />;
      default:
        return <ArrowUp className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[1000] max-w-md w-full bg-white/95 border border-slate-300 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-800 animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div
        className={`p-3.5 flex items-center justify-between border-b ${
          viewVariant === 'blocked'
            ? 'bg-red-50 border-red-200 text-red-900'
            : viewVariant === 'multimodal'
            ? 'bg-blue-50 border-blue-200 text-blue-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-center gap-2">
          {viewVariant === 'blocked' ? (
            <AlertTriangle className="w-5 h-5 text-red-600 animate-bounce" />
          ) : viewVariant === 'multimodal' ? (
            <Navigation className="w-5 h-5 text-blue-600" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          )}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">
              {viewVariant === 'blocked'
                ? 'Direct Path (Hazard Collision)'
                : viewVariant === 'multimodal'
                ? 'Multimodal Tactical Route'
                : 'Safe Road Detour Active'}
            </h4>
            <span className="text-[11px] text-slate-600 font-medium">
              Indore Tactical Emergency Routing
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
        {/* Route Variant Selector Pills */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-[11px]">
          {routeData.alternativeRoute && (
            <button
              onClick={() => {
                setViewVariant('safe');
                if (onSelectRouteVariant) onSelectRouteVariant(routeData.alternativeRoute, 'safe');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                viewVariant === 'safe'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Safe Road Detour</span>
            </button>
          )}

          {hasMultimodal && (
            <button
              onClick={() => {
                setViewVariant('multimodal');
                if (onSelectRouteVariant) onSelectRouteVariant(routeData.route, 'multimodal');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                viewVariant === 'multimodal'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🚦 Multimodal</span>
            </button>
          )}

          {routeData.blockedRoute && (
            <button
              onClick={() => {
                setViewVariant('blocked');
                if (onSelectRouteVariant) onSelectRouteVariant(routeData.blockedRoute, 'blocked');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                viewVariant === 'blocked'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Blocked Path</span>
            </button>
          )}
        </div>

        {/* MULTIMODAL SEGMENTED PLAN */}
        {viewVariant === 'multimodal' && multimodal && multimodal.isMultimodal && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-blue-950 uppercase tracking-wider">
              Segmented Multimodal Deployment Plan:
            </div>

            {/* 1. Leg 1: Pre-Hazard Roadway (Ground Convoy) */}
            {(multimodal.road1 || multimodal.greenRoad) && (
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                    <span>1. Clear Roadway (Ground Convoy)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 text-xs">
                    {((multimodal.road1?.distance || multimodal.greenRoad?.distance || 0) / 1000).toFixed(1)} km • {formatDuration(multimodal.road1?.duration || multimodal.greenRoad?.duration || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  <strong>Transport:</strong> 🚗 Rapid Response Convoy (Ground Vehicle)
                </p>
                <div className="text-[10px] text-emerald-700">
                  Standard roadway transit up to tactical hazard staging boundary.
                </div>
              </div>
            )}

            {/* 2. Leg 2: Hazard Crossing Section (Boat if Flood, Helicopter if Blockage) */}
            {multimodal.hazardTransit && (
              <div
                className={`p-2.5 rounded-xl space-y-1 border ${
                  multimodal.hazardTransit.type === 'boat'
                    ? 'bg-sky-50 border-sky-300 text-sky-950'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span
                      className={`w-3 h-3 rounded-full inline-block animate-pulse ${
                        multimodal.hazardTransit.type === 'boat' ? 'bg-sky-500' : 'bg-indigo-600'
                      }`}
                    ></span>
                    <span>
                      2. {multimodal.hazardTransit.type === 'boat' ? 'Flooded Sector Navigation (Boat)' : 'Aerial Bypass (Helicopter)'}
                    </span>
                  </div>
                  <span
                    className={`font-mono font-bold text-xs ${
                      multimodal.hazardTransit.type === 'boat' ? 'text-sky-700' : 'text-indigo-700'
                    }`}
                  >
                    {(multimodal.hazardTransit.distance / 1000).toFixed(1)} km • {formatDuration(multimodal.hazardTransit.duration)}
                  </span>
                </div>
                <p className="text-[11px] font-medium">
                  <strong>Transport:</strong> {multimodal.hazardTransit.type === 'boat' ? '🚤 Tactical Rescue Boat / Amphibious Craft' : '🚁 Mi-17 / ALH Dhruv Air Rescue Helicopter'}
                </p>
                <div className="text-[10px] text-slate-600">
                  {multimodal.hazardTransit.description}
                </div>
              </div>
            )}

            {/* 3. Leg 3: Resumed Roadway (Ground Convoy) after Hazard is over */}
            {multimodal.road2 && (
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                    <span>3. Resumed Roadway (Ground Convoy)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 text-xs">
                    {(multimodal.road2.distance / 1000).toFixed(1)} km • {formatDuration(multimodal.road2.duration)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  <strong>Transport:</strong> 🚗 Rapid Response Convoy (Ground Vehicle)
                </p>
                <div className="text-[10px] text-emerald-700">
                  Hazard zone cleared: resumed ground vehicle driving to destination.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hazard Alert Notice */}
        {viewVariant === 'blocked' ? (
          <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-xs text-red-900 space-y-1">
            <div className="font-bold flex items-center gap-1 text-red-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Active Hazard Collision Warning:</span>
            </div>
            <p className="text-[11px] text-red-800 leading-snug">
              This straight line path cuts directly through active flood / road blockage zones.
              Switch to <strong>Safe Road Detour</strong> or <strong>Multimodal Route</strong> to navigate safely.
            </p>
          </div>
        ) : viewVariant === 'safe' ? (
          <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-medium">
              100% roadway corridor routed around all active hazard boundaries in Indore.
            </span>
          </div>
        ) : null}

        {/* Route Metrics */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Total Distance</span>
            <div className="text-base font-black text-blue-950 mt-0.5">
              {viewVariant === 'multimodal' && multimodal
                ? (multimodal.totalDistance / 1000).toFixed(2)
                : distanceKm}{' '}
              km
            </div>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Est. Transit Time</span>
            <div className="text-base font-black text-orange-600 mt-0.5">
              {viewVariant === 'multimodal' && multimodal
                ? formatDuration(multimodal.totalDuration)
                : formatDuration(activeDisplayRoute?.duration || durationMin * 60)}
            </div>
          </div>
        </div>

        {/* Turn-by-Turn Driving Guidance */}
        {steps.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-blue-950 uppercase mb-1.5 flex items-center justify-between">
              <span>Turn-by-Turn Driving Guidance:</span>
              <span className="text-[10px] font-normal text-slate-500">{steps.length} waypoints</span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-800 flex items-start gap-2 shadow-2xs"
                >
                  {getStepIcon(step.directionIcon)}
                  <div className="flex-1">
                    <span className="font-semibold text-[11px] block text-slate-800">
                      {idx + 1}. {step.formattedInstruction || step.instruction || 'Proceed on roadway'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {step.distanceMeters || Math.round(step.distance || 0)}m
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClearRoute}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-xs border border-slate-200 cursor-pointer"
        >
          Dismiss Route View
        </button>
      </div>
    </div>
  );
}
