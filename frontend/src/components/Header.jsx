import React from 'react';
import { Activity, Upload, Sparkles, Scale, Download, Play, Loader2, Footprints, ArrowUpRight, Dumbbell, Compass, Video, XCircle, Film, User, Info } from 'lucide-react';

export default function Header({
  metadata,
  onUploadClick,
  onOpenWizard,
  onOpenCalibration,
  onOpenExport,
  onOpenAbout,
  appName = "KinePipe MMA",
  isProcessing,
  currentModel,
  onRunAutoMark,
  onCancelTracking,
  isAnalyzed,
  interpretation,
  onChangeInterpretation,
  videoList,
  onSelectVideo,
  onEmbedVideo,
  isEmbedding
}) {
  return (
    <header className="h-16 px-5 glass-panel border-b border-biomech-border flex items-center justify-between z-20">
      {/* Brand & Active Video Selector */}
      <div className="flex items-center space-x-3">
        <div 
          onClick={onOpenAbout}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00FF88] to-[#00E5FF] p-[2px] flex items-center justify-center shadow-lg shadow-[#00FF88]/20 cursor-pointer hover:scale-105 transition-transform"
          title="Acerca de KinePipe MMA - Markless Motion Analyser (@kinepipe)"
        >
          <div className="w-full h-full bg-biomech-bg rounded-[10px] flex items-center justify-center">
            <Activity className="w-4 h-4 text-biomech-primary animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 
              onClick={onOpenAbout}
              className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 cursor-pointer group"
              title="KinePipe MMA (Markless Motion Analyser) • Klgo. Felipe Vargas Ríos (@kinepipe)"
            >
              <span>KINEPIPE</span>
              <span className="text-biomech-primary font-black">MMA</span>
              <span className="text-[9px] text-biomech-secondary font-mono tracking-widest px-1.5 py-0.5 rounded bg-biomech-card border border-biomech-border group-hover:border-biomech-primary/50 transition-colors">
                STUDIO
              </span>
            </h1>

            {/* Author Attribution Quick Chip */}
            <button
              onClick={onOpenAbout}
              className="hidden lg:flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-biomech-card/80 hover:bg-biomech-card border border-biomech-border hover:border-biomech-primary/40 text-[10px] text-biomech-muted hover:text-white transition-all shadow-sm"
              title="Dirección y Desarrollo: Klgo. Felipe Vargas Ríos (@kinepipe)"
            >
              <User className="w-3 h-3 text-biomech-primary" />
              <span className="font-semibold text-slate-200">Klgo. Felipe Vargas</span>
              <span className="text-biomech-secondary font-mono font-bold">@kinepipe</span>
            </button>

            {/* Quick Video Selector Dropdown */}
            {videoList && videoList.length > 0 && (
              <select
                value={metadata?.video_id || ''}
                onChange={(e) => onSelectVideo(e.target.value)}
                className="bg-biomech-card border border-biomech-border text-[11px] font-mono text-biomech-secondary rounded-lg px-2 py-0.5 outline-none max-w-[190px] truncate cursor-pointer hover:border-biomech-primary"
              >
                {videoList.map((v) => (
                  <option key={v.video_id} value={v.video_id}>
                    {v.filename}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-[11px] text-biomech-muted flex items-center gap-1.5 mt-0.5">
            {metadata && (
              <>
                <span className="font-mono text-[10px] text-biomech-secondary">{metadata.fps} FPS</span>
                <span>•</span>
                <span className="font-mono text-[10px]">{metadata.width}x{metadata.height}</span>
                <span>•</span>
                <span className="font-mono text-[10px]">{metadata.duration_s}s</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* CENTER: BIG "AUTOMARCAR CON IA" ACTION, CANCEL BUTTON & INTERPRETATION SELECTOR */}
      <div className="flex items-center space-x-3">
        {/* 1. Main Action Button: Runs Automark OR Cancels Processing */}
        {isProcessing ? (
          <button
            onClick={onCancelTracking}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 ring-2 ring-rose-500/50 animate-pulse transition-all"
            title="Cancelar el análisis actual inmediatamente"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancelar Procesado</span>
          </button>
        ) : (
          <button
            onClick={onRunAutoMark}
            disabled={!metadata}
            className={`flex items-center space-x-2 px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all ${
              isAnalyzed
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                : 'bg-gradient-to-r from-[#00FF88] to-[#00E5FF] hover:opacity-95 text-biomech-bg shadow-[#00FF88]/30 ring-2 ring-[#00FF88]/50 animate-pulse'
            }`}
            title="Detecta automáticamente las articulaciones anatómicas de la persona con IA"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isAnalyzed ? 'Re-Analizar con IA' : 'AUTOMARCAR CON IA'}</span>
          </button>
        )}

        {/* 2. Movement Interpretation Selector Dropdown */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-biomech-card border border-biomech-border">
          <span className="text-[10px] uppercase font-semibold text-biomech-muted px-2">
            Interpretar como:
          </span>
          <select
            value={interpretation}
            onChange={(e) => onChangeInterpretation(e.target.value)}
            disabled={isProcessing}
            className="bg-biomech-surface border border-biomech-border/60 text-xs font-semibold text-white rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:border-biomech-secondary"
          >
            <option value="general">📊 General (Cinemática Libre)</option>
            <option value="gait">🚶 Marcha y Carrera (Gait)</option>
            <option value="jump">🦘 Salto Vertical (CMJ / SJ)</option>
            <option value="squat">🏋️ Sentadilla (Squat)</option>
          </select>
        </div>

        {/* 3. Button to Embed / Burn Analysis permanently into a new video copy */}
        {isAnalyzed && (
          <button
            onClick={onEmbedVideo}
            disabled={isEmbedding || isProcessing}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/50 text-xs font-bold text-amber-300 transition-all shadow-md shadow-amber-900/20"
            title="Genera una copia en MP4 con el esqueleto, ángulos y telemetría quemados permanentemente"
          >
            {isEmbedding ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Quemando en copia...</span>
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5 text-amber-400" />
                <span>Embeber en Copia de Video</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* RIGHT: Tools, Model & Upload */}
      <div className="flex items-center space-x-2.5">
        {/* Model Wizard */}
        <button
          onClick={onOpenWizard}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-biomech-card hover:bg-biomech-border text-xs font-medium border border-biomech-border transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-biomech-accent" />
          <span>{currentModel.toUpperCase()}</span>
        </button>

        {/* Spatial Calibration */}
        <button
          onClick={onOpenCalibration}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-biomech-card hover:bg-biomech-border text-xs text-biomech-text border border-biomech-border transition-all"
          title="Calibrar escala espacial (metros/píxel)"
        >
          <Scale className="w-3.5 h-3.5 text-biomech-secondary" />
          <span>Calibrar</span>
        </button>

        {/* Upload Video Button */}
        <label className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-biomech-card hover:bg-biomech-border border border-biomech-border text-xs text-white font-semibold cursor-pointer transition-all">
          <Upload className="w-3.5 h-3.5 text-biomech-secondary" />
          <span>Cargar Video</span>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={onUploadClick}
            disabled={isProcessing}
          />
        </label>

        {/* Export Menu */}
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-biomech-card hover:bg-biomech-border text-xs text-white font-semibold border border-biomech-primary/30 transition-all"
        >
          <Download className="w-3.5 h-3.5 text-biomech-primary" />
          <span>Exportar</span>
        </button>

        {/* About / Author Info */}
        <button
          onClick={onOpenAbout}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-biomech-card hover:bg-biomech-border text-xs text-biomech-text hover:text-white border border-biomech-border transition-all"
          title="Acerca de KineBiomech AI Studio y Autoría (@kinepipe)"
        >
          <Info className="w-3.5 h-3.5 text-biomech-secondary" />
          <span className="hidden sm:inline">Acerca de</span>
        </button>
      </div>
    </header>
  );
}
