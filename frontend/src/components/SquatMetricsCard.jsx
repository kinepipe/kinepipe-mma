import React from 'react';
import { Dumbbell, ArrowDown, Timer, Compass } from 'lucide-react';

export default function SquatMetricsCard({ squatAnalysis, onSeekEvent }) {
  if (!squatAnalysis) return null;

  return (
    <div className="glass-card rounded-xl border border-biomech-border p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-biomech-border/60 pb-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Dumbbell className="w-4 h-4 text-purple-400" />
          <span>Cinemática de Sentadilla (Squat)</span>
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
          {squatAnalysis.squat_depth_category}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <span className="text-biomech-muted text-[11px]">Ángulo Mínimo Rodilla</span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-purple-400">
              {squatAnalysis.min_knee_angle_deg}°
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <span className="text-biomech-muted text-[11px]">Inclinación Tronco</span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-biomech-accent">
              {squatAnalysis.max_trunk_lean_deg}°
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <span className="text-biomech-muted text-[11px]">Fase Excéntrica</span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-biomech-secondary">
              {squatAnalysis.eccentric_duration_s}
            </span>
            <span className="text-[11px] text-biomech-muted ml-1">s</span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <span className="text-biomech-muted text-[11px]">Fase Concéntrica</span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-biomech-primary">
              {squatAnalysis.concentric_duration_s}
            </span>
            <span className="text-[11px] text-biomech-muted ml-1">s</span>
          </div>
        </div>
      </div>

      {squatAnalysis.max_depth_frame > 0 && (
        <div className="pt-1">
          <button
            onClick={() => onSeekEvent(squatAnalysis.max_depth_frame)}
            className="px-2.5 py-1 rounded bg-biomech-surface hover:bg-biomech-border border border-biomech-border text-purple-400 font-mono text-xs transition-all"
          >
            Ir a Punto Más Profundo (#{squatAnalysis.max_depth_frame})
          </button>
        </div>
      )}
    </div>
  );
}
