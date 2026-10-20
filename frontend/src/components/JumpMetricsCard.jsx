import React from 'react';
import { ArrowUpRight, Gauge, Timer, TrendingDown, Target } from 'lucide-react';

export default function JumpMetricsCard({ jumpAnalysis, onSeekEvent }) {
  if (!jumpAnalysis) return null;

  return (
    <div className="glass-card rounded-xl border border-biomech-border p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-biomech-border/60 pb-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-4 h-4 text-biomech-primary" />
          <span>Cinemática de Salto ({jumpAnalysis.jump_type})</span>
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-biomech-primary/10 text-biomech-primary border border-biomech-primary/20">
          Auto-Detección
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Jump Height */}
        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-biomech-muted text-[11px]">
            <span>Altura Vuelo</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-biomech-primary" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-biomech-primary">
              {jumpAnalysis.flight_height_cm}
            </span>
            <span className="text-[11px] text-biomech-muted ml-1">cm</span>
          </div>
        </div>

        {/* Flight Time */}
        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-biomech-muted text-[11px]">
            <span>Tiempo Vuelo</span>
            <Timer className="w-3.5 h-3.5 text-biomech-secondary" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-biomech-secondary">
              {jumpAnalysis.flight_time_s}
            </span>
            <span className="text-[11px] text-biomech-muted ml-1">s</span>
          </div>
        </div>

        {/* Takeoff Velocity */}
        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-biomech-muted text-[11px]">
            <span>Vel. Despegue</span>
            <Gauge className="w-3.5 h-3.5 text-biomech-accent" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-biomech-accent">
              {jumpAnalysis.takeoff_velocity_m_s}
            </span>
            <span className="text-[11px] text-biomech-muted ml-1">m/s</span>
          </div>
        </div>

        {/* Countermovement Depth */}
        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-biomech-muted text-[11px]">
            <span>Profundidad Dip</span>
            <TrendingDown className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-orange-400">
              {jumpAnalysis.countermovement_depth_cm}
            </span>
            <span className="text-[11px] text-biomech-muted ml-1">cm</span>
          </div>
        </div>
      </div>

      {/* Quick Jump Phase Shortcut Buttons */}
      <div className="flex items-center space-x-1.5 pt-1 text-[11px]">
        <span className="text-biomech-muted text-[10px] mr-1">Ir a fase:</span>
        {jumpAnalysis.lowest_frame > 0 && (
          <button
            onClick={() => onSeekEvent(jumpAnalysis.lowest_frame)}
            className="px-2 py-0.5 rounded bg-biomech-surface hover:bg-biomech-border border border-biomech-border text-yellow-400 font-mono transition-all"
          >
            Dip #{jumpAnalysis.lowest_frame}
          </button>
        )}
        {jumpAnalysis.takeoff_frame > 0 && (
          <button
            onClick={() => onSeekEvent(jumpAnalysis.takeoff_frame)}
            className="px-2 py-0.5 rounded bg-biomech-surface hover:bg-biomech-border border border-biomech-border text-orange-400 font-mono transition-all"
          >
            Despegue #{jumpAnalysis.takeoff_frame}
          </button>
        )}
        {jumpAnalysis.apex_frame > 0 && (
          <button
            onClick={() => onSeekEvent(jumpAnalysis.apex_frame)}
            className="px-2 py-0.5 rounded bg-biomech-surface hover:bg-biomech-border border border-biomech-border text-sky-400 font-mono transition-all"
          >
            Vértice #{jumpAnalysis.apex_frame}
          </button>
        )}
        {jumpAnalysis.landing_frame > 0 && (
          <button
            onClick={() => onSeekEvent(jumpAnalysis.landing_frame)}
            className="px-2 py-0.5 rounded bg-biomech-surface hover:bg-biomech-border border border-biomech-border text-emerald-400 font-mono transition-all"
          >
            Aterrizaje #{jumpAnalysis.landing_frame}
          </button>
        )}
      </div>
    </div>
  );
}
