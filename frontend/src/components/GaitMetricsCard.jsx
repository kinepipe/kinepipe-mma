import React from 'react';
import { Footprints, Activity, Timer, RotateCcw, ArrowRight } from 'lucide-react';

export default function GaitMetricsCard({ gaitAnalysis, onSeekEvent }) {
  if (!gaitAnalysis) return null;

  return (
    <div className="glass-card rounded-xl border border-biomech-border p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-biomech-border/60 pb-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Footprints className="w-4 h-4 text-biomech-secondary" />
          <span>Cinemática de Marcha & Carrera (Gait)</span>
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-biomech-secondary/10 text-biomech-secondary border border-biomech-secondary/20">
          Ciclos Detectados
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Cadence */}
        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-biomech-muted text-[11px]">
            <span>Cadencia</span>
            <Activity className="w-3.5 h-3.5 text-biomech-secondary" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-biomech-secondary">
              {gaitAnalysis.cadence_spm}
            </span>
            <span className="text-[11px] text-biomech-muted ml-1">pasos/min</span>
          </div>
        </div>

        {/* Stride Time */}
        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-biomech-muted text-[11px]">
            <span>Tiempo Zancada</span>
            <Timer className="w-3.5 h-3.5 text-biomech-primary" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-biomech-primary">
              {gaitAnalysis.avg_stride_time_s}
            </span>
            <span className="text-[11px] text-biomech-muted ml-1">s</span>
          </div>
        </div>

        {/* Knee Flexion at Contact */}
        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-biomech-muted text-[11px]">
            <span>Rodilla al Contacto</span>
            <RotateCcw className="w-3.5 h-3.5 text-biomech-accent" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-biomech-accent">
              {gaitAnalysis.knee_flexion_at_contact}°
            </span>
            <span className="text-[11px] text-biomech-muted ml-1">apoyo</span>
          </div>
        </div>

        {/* Max Knee Flexion in Swing */}
        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-biomech-muted text-[11px]">
            <span>Rodilla en Oscilación</span>
            <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-orange-400">
              {gaitAnalysis.max_knee_flexion_swing}°
            </span>
            <span className="text-[11px] text-biomech-muted ml-1">oscilación</span>
          </div>
        </div>
      </div>

      {/* Heel Strike & Toe Off Quick Navigation Buttons */}
      <div className="flex items-center flex-wrap gap-1.5 pt-1 text-[11px]">
        <span className="text-biomech-muted text-[10px] mr-1">Contactos de Talón:</span>
        {gaitAnalysis.heel_strikes && gaitAnalysis.heel_strikes.map((hs, i) => (
          <button
            key={i}
            onClick={() => onSeekEvent(hs)}
            className="px-2 py-0.5 rounded bg-biomech-surface hover:bg-biomech-border border border-biomech-border text-biomech-secondary font-mono transition-all"
          >
            Contacto #{hs}
          </button>
        ))}
        {gaitAnalysis.toe_offs && gaitAnalysis.toe_offs.map((to, i) => (
          <button
            key={`to_${i}`}
            onClick={() => onSeekEvent(to)}
            className="px-2 py-0.5 rounded bg-biomech-surface hover:bg-biomech-border border border-biomech-border text-orange-400 font-mono transition-all"
          >
            Despegue #{to}
          </button>
        ))}
      </div>
    </div>
  );
}
