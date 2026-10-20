import React from 'react';
import { Activity, Footprints, ArrowUpRight, Dumbbell, Compass } from 'lucide-react';

export default function GeneralMetricsCard({ framesData, currentFrameIndex, onChangeInterpretation }) {
  if (!framesData || framesData.length === 0) return null;

  const currentFrame = framesData[currentFrameIndex] || framesData[0];
  const angles = currentFrame?.angles || {};
  const kneeR = angles.knee_flexion_r !== undefined ? angles.knee_flexion_r : null;
  const hipR = angles.hip_flexion_r !== undefined ? angles.hip_flexion_r : null;
  const trunk = angles.trunk_inclination !== undefined ? angles.trunk_inclination : null;

  // Calculate ROM (Range of Motion) over all frames
  let minKnee = 999, maxKnee = -999;
  let minHip = 999, maxHip = -999;
  let maxVel = 0;

  framesData.forEach((f) => {
    if (f.angles?.knee_flexion_r !== undefined) {
      if (f.angles.knee_flexion_r < minKnee) minKnee = f.angles.knee_flexion_r;
      if (f.angles.knee_flexion_r > maxKnee) maxKnee = f.angles.knee_flexion_r;
    }
    if (f.angles?.hip_flexion_r !== undefined) {
      if (f.angles.hip_flexion_r < minHip) minHip = f.angles.hip_flexion_r;
      if (f.angles.hip_flexion_r > maxHip) maxHip = f.angles.hip_flexion_r;
    }
    if (f.velocities?.knee_r_vel_m_s !== undefined) {
      const v = Math.abs(f.velocities.knee_r_vel_m_s);
      if (v > maxVel) maxVel = v;
    }
  });

  const romKnee = maxKnee > -900 ? (maxKnee - minKnee).toFixed(1) : '--';
  const romHip = maxHip > -900 ? (maxHip - minHip).toFixed(1) : '--';

  return (
    <div className="glass-card rounded-xl p-4 border border-biomech-border bg-biomech-card/80">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-biomech-border">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-biomech-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Cinemática General (Automarcado Activo)
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-biomech-primary/10 text-biomech-primary border border-biomech-primary/30">
          Modo Libre
        </span>
      </div>

      {/* Primary Telemetry Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/50 text-center">
          <p className="text-[10px] uppercase font-semibold text-biomech-muted">Rodilla Der. (θ)</p>
          <p className="text-lg font-bold font-mono text-biomech-primary">
            {kneeR !== null ? `${kneeR}°` : '--'}
          </p>
          <p className="text-[9px] text-biomech-muted mt-0.5">ROM: {romKnee}°</p>
        </div>

        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/50 text-center">
          <p className="text-[10px] uppercase font-semibold text-biomech-muted">Cadera Der. (θ)</p>
          <p className="text-lg font-bold font-mono text-biomech-secondary">
            {hipR !== null ? `${hipR}°` : '--'}
          </p>
          <p className="text-[9px] text-biomech-muted mt-0.5">ROM: {romHip}°</p>
        </div>

        <div className="p-2.5 rounded-lg bg-biomech-surface border border-biomech-border/50 text-center">
          <p className="text-[10px] uppercase font-semibold text-biomech-muted">Tronco (θ)</p>
          <p className="text-lg font-bold font-mono text-biomech-accent">
            {trunk !== null ? `${trunk}°` : '--'}
          </p>
          <p className="text-[9px] text-biomech-muted mt-0.5">Vel. máx: {maxVel.toFixed(2)} m/s</p>
        </div>
      </div>

      {/* Movement Interpretation Switcher Bar */}
      <div className="pt-2 border-t border-biomech-border/50">
        <p className="text-[10px] text-biomech-muted mb-2 font-medium">
          ¿Deseas interpretar estos datos según un protocolo biomecánico específico?
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onChangeInterpretation('gait')}
            className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-biomech-surface hover:bg-biomech-border text-[11px] font-semibold text-white border border-biomech-border transition-all hover:border-biomech-primary"
          >
            <Footprints className="w-3.5 h-3.5 text-biomech-primary" />
            <span>Marcha</span>
          </button>
          <button
            onClick={() => onChangeInterpretation('jump')}
            className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-biomech-surface hover:bg-biomech-border text-[11px] font-semibold text-white border border-biomech-border transition-all hover:border-biomech-secondary"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-biomech-secondary" />
            <span>Salto CMJ</span>
          </button>
          <button
            onClick={() => onChangeInterpretation('squat')}
            className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-biomech-surface hover:bg-biomech-border text-[11px] font-semibold text-white border border-biomech-border transition-all hover:border-biomech-accent"
          >
            <Dumbbell className="w-3.5 h-3.5 text-biomech-accent" />
            <span>Sentadilla</span>
          </button>
        </div>
      </div>
    </div>
  );
}
