import React, { useState } from 'react';
import { X, Sparkles, Video, Camera, Scale, CheckCircle2, ChevronRight, Cpu, Layers, Activity, Zap, GitFork } from 'lucide-react';

const ICON_MAP = {
  Activity: Activity,
  GitFork: GitFork,
  Layers: Layers,
  Zap: Zap,
};

export default function ModelWizardModal({
  isOpen,
  onClose,
  models,
  currentModelId,
  onSelectAndRun,
  cutoffHz,
  setCutoffHz,
  subjectHeight,
  setSubjectHeight,
  isProcessing
}) {
  const [selectedId, setSelectedId] = useState(currentModelId || 'sports2d');
  const [dlcConfigPath, setDlcConfigPath] = useState('');

  if (!isOpen) return null;

  const currentSelected = models.find((m) => m.id === selectedId) || models[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-biomech-surface border border-biomech-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-biomech-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-biomech-accent/10 border border-biomech-accent/30 text-biomech-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Catálogo & Asistente de Modelos de IA</h2>
              <p className="text-xs text-biomech-muted">
                Selecciona el protocolo según número de cámaras, tipo de calibración y análisis requerido.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-biomech-muted hover:text-white hover:bg-biomech-card transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: Model Cards List */}
          <div className="md:col-span-5 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-biomech-muted block mb-2">
              Modelos Disponibles
            </label>
            {models.map((model) => {
              const isSelected = model.id === selectedId;
              const IconComp = ICON_MAP[model.icon] || Activity;
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedId(model.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-biomech-card border-biomech-primary shadow-lg shadow-biomech-primary/10'
                      : 'bg-biomech-surface/60 border-biomech-border/60 hover:border-biomech-border hover:bg-biomech-card/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? 'bg-biomech-primary/20 text-biomech-primary' : 'bg-biomech-card text-biomech-muted'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{model.name}</h3>
                        <p className="text-[11px] text-biomech-muted">{model.author}</p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-biomech-primary mt-1" />}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-biomech-bg border border-biomech-border text-biomech-secondary font-mono">
                      {model.cameras_required.split(' ')[0]} Cám
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-biomech-bg border border-biomech-border text-biomech-accent font-mono">
                      GPU OK
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Detailed Specification & Requirements */}
          <div className="md:col-span-7 bg-biomech-card/60 border border-biomech-border rounded-xl p-5 flex flex-col justify-between">
            {currentSelected && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {currentSelected.name}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Activo / Listo
                    </span>
                  </div>
                  <p className="text-xs text-biomech-muted mt-1 leading-relaxed">
                    {currentSelected.description}
                  </p>
                </div>

                {/* Specs Matrix */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-biomech-surface border border-biomech-border/60">
                    <div className="flex items-center space-x-1.5 text-biomech-secondary font-medium mb-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Cámaras Requeridas</span>
                    </div>
                    <p className="text-white font-medium">{currentSelected.cameras_required}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-biomech-surface border border-biomech-border/60">
                    <div className="flex items-center space-x-1.5 text-biomech-accent font-medium mb-1">
                      <Scale className="w-3.5 h-3.5" />
                      <span>Tipo de Calibración</span>
                    </div>
                    <p className="text-white font-medium">{currentSelected.calibration_type}</p>
                  </div>
                </div>

                {/* Outputs Generated */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-biomech-muted block mb-1.5">
                    Métricas & Archivos Generados
                  </label>
                  <ul className="space-y-1.5 text-xs text-biomech-text">
                    {currentSelected.outputs.map((out, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-biomech-primary" />
                        <span>{out}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Use Case */}
                <div className="p-3 rounded-lg bg-biomech-surface/80 border border-biomech-border/60">
                  <span className="text-[11px] font-semibold text-biomech-secondary block mb-0.5">
                    Aplicación Recomendada:
                  </span>
                  <p className="text-xs text-white/90">{currentSelected.recommended_for}</p>
                </div>

                {/* Custom DeepLabCut Config if applicable */}
                {currentSelected.id === 'deeplabcut' && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-biomech-muted">Ruta de config.yaml personalizado (Opcional):</label>
                    <input
                      type="text"
                      placeholder="C:/proyectos/dlc/config.yaml"
                      value={dlcConfigPath}
                      onChange={(e) => setDlcConfigPath(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-biomech-surface border border-biomech-border text-xs text-white placeholder-biomech-muted/50 focus:outline-none focus:border-biomech-primary"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Execution parameters */}
            <div className="pt-4 border-t border-biomech-border/60 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white flex items-center gap-1.5">
                    Frecuencia de Corte Butterworth (Fc)
                    <span className="text-biomech-primary font-mono">{cutoffHz} Hz</span>
                  </label>
                  <p className="text-[11px] text-biomech-muted">4-8 Hz recomendado para marcha, carrera y saltos.</p>
                </div>
                <input
                  type="range"
                  min="2"
                  max="15"
                  step="0.5"
                  value={cutoffHz}
                  onChange={(e) => setCutoffHz(parseFloat(e.target.value))}
                  className="w-36 accent-biomech-primary cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onSelectAndRun(selectedId, dlcConfigPath, false);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-biomech-card border border-biomech-border hover:bg-biomech-surface text-white font-semibold text-xs tracking-wider transition-all"
                  title="Establece este modelo como el seleccionado sin ejecutar inmediatamente"
                >
                  Seleccionar Modelo
                </button>
                <button
                  onClick={() => {
                    onSelectAndRun(selectedId, dlcConfigPath, true);
                    onClose();
                  }}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00E5FF] hover:opacity-95 text-biomech-bg font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1 shadow-lg shadow-[#00FF88]/20 transition-all"
                >
                  <span>{isProcessing ? 'Procesando...' : 'Re-analizar Ahora'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
