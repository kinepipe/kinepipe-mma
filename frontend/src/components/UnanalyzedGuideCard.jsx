import React from 'react';
import { Play, Sparkles, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function UnanalyzedGuideCard({
  metadata,
  onRunAutoMark,
  onCancelTracking,
  isProcessing,
  roiStartTime = 0,
  roiEndTime = null
}) {
  const duration = metadata?.duration_s || 0;
  const roiStart = roiStartTime || 0;
  const roiEnd = roiEndTime && roiEndTime > 0 ? Math.min(duration, roiEndTime) : duration;
  const roiSpan = Math.max(0, roiEnd - roiStart).toFixed(1);

  return (
    <div className="glass-card rounded-xl p-5 border border-biomech-border bg-gradient-to-br from-biomech-card/90 to-biomech-surface/90">
      <div className="flex items-center space-x-2.5 pb-3 border-b border-biomech-border">
        <div className="w-8 h-8 rounded-lg bg-biomech-primary/10 border border-biomech-primary/30 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-biomech-primary" />
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Flujo de Análisis Biomecánico
          </h2>
          <p className="text-[11px] text-biomech-muted">
            Video cargado y listo para automarcado
          </p>
        </div>
      </div>

      <div className="my-4 space-y-2.5">
        <div className="flex items-center space-x-3 text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#00FF88] flex-shrink-0" />
          <span className="text-white font-medium">
            1. Video: <span className="font-mono text-biomech-secondary">{metadata?.filename || 'Video listo'}</span>
          </span>
        </div>

        {/* ROI Time Duration badge */}
        <div className="flex items-center space-x-3 text-xs">
          <Clock className="w-4 h-4 text-biomech-secondary flex-shrink-0" />
          <span className="text-white font-medium">
            Ventana de análisis: <strong className="text-biomech-primary font-mono">{roiStart.toFixed(1)}s - {roiEnd.toFixed(1)}s</strong> ({roiSpan}s seleccionados)
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="w-4 h-4 rounded-full bg-biomech-primary/20 border border-biomech-primary text-[10px] font-bold text-biomech-primary flex items-center justify-center flex-shrink-0 animate-pulse">
            2
          </div>
          <span className="text-white font-semibold">
            2. Presiona <span className="text-biomech-primary">AUTOMARCAR CON IA</span> para rastrear las articulaciones
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-biomech-muted">
          <div className="w-4 h-4 rounded-full bg-biomech-border border border-biomech-border text-[10px] font-bold text-biomech-muted flex items-center justify-center flex-shrink-0">
            3
          </div>
          <span>3. Selecciona la interpretación (General, Marcha, Salto o Sentadilla)</span>
        </div>
      </div>

      {isProcessing ? (
        <button
          onClick={onCancelTracking}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30 flex items-center justify-center space-x-2 transition-all ring-1 ring-rose-500/50 animate-pulse"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancelar Procesado</span>
        </button>
      ) : (
        <button
          onClick={onRunAutoMark}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-biomech-bg bg-gradient-to-r from-[#00FF88] to-[#00E5FF] hover:opacity-95 shadow-lg shadow-[#00FF88]/20 flex items-center justify-center space-x-2 transition-all ring-1 ring-[#00FF88]/40"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>AUTOMARCAR CON IA AHORA</span>
        </button>
      )}
    </div>
  );
}
