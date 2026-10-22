import React from 'react';
import { X, Activity, Award, User, Code2, Cpu, Globe, Heart, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';

export default function AboutModal({ isOpen, onClose, appName = "KinePipe MMA" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-[#0F141C] border border-biomech-border/80 rounded-2xl shadow-2xl overflow-hidden text-biomech-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent Header */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#00FF88] via-[#00E5FF] to-[#7C3AED]" />

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-biomech-border/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00FF88] to-[#00E5FF] p-[2px] flex items-center justify-center shadow-lg shadow-[#00FF88]/20">
              <div className="w-full h-full bg-[#0B0E14] rounded-[10px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-biomech-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>KinePipe <span className="text-biomech-primary">MMA</span></span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-biomech-primary/10 text-biomech-primary border border-biomech-primary/30">
                  v1.5.1
                </span>
              </h2>
              <p className="text-xs text-biomech-secondary font-medium tracking-wide">
                Markless Motion Analyser • Análisis Biomecánico y Cinemática Clínica con IA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-biomech-muted hover:text-white hover:bg-biomech-surface border border-transparent hover:border-biomech-border transition-all"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Author Card (Featured) */}
          <div className="relative p-5 rounded-xl bg-gradient-to-br from-biomech-card via-[#131B26] to-biomech-surface border border-biomech-primary/30 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-biomech-primary/20 via-biomech-secondary/20 to-purple-500/20 border border-biomech-primary/40 flex items-center justify-center text-biomech-primary shadow-inner">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-biomech-primary/20 text-biomech-primary border border-biomech-primary/40">
                      Dirección & Desarrollo
                    </span>
                    <span className="text-xs font-mono font-bold text-biomech-secondary">
                      @kinepipe
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    Klgo. Felipe Vargas Ríos
                  </h3>
                  <p className="text-xs text-biomech-muted mt-0.5">
                    Kinesiólogo • Especialista en Análisis del Movimiento Humano y Biomecánica Clínica
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed border-t border-biomech-border/50 pt-3">
              Desarrollado con el objetivo de dotar a profesionales de la salud, ciencias de la actividad física y biomecánica de una herramienta de alta precisión clínica para la captura, medición cinemática sagital y modelación musculoesquelética sin requerir infraestructura de laboratorio costosa.
            </p>
          </div>

          {/* Core Capabilities Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-biomech-muted mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-biomech-primary" />
              <span>Capacidades Principales de la Suite</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-biomech-card/60 border border-biomech-border/60">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#00FF88]" />
                  <span>Cinemática Angular Sagital</span>
                </div>
                <p className="text-[11px] text-biomech-muted mt-1 leading-normal">
                  Cálculo automático de flexión/extensión de cadera, rodilla, dorsi/plantiflexión de tobillo e inclinación de tronco con filtro Butterworth de fase cero (filtfilt).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-biomech-card/60 border border-biomech-border/60">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>Detección de Fases de Marcha</span>
                </div>
                <p className="text-[11px] text-biomech-muted mt-1 leading-normal">
                  Identificación de Contacto Inicial (Heel Strike) y Despegue (Toe-Off), cálculo de cadencia (pasos/min), tiempo de zancada y soporte monopodal/bipodal.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-biomech-card/60 border border-biomech-border/60">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Centro de Masa (COM) & Talla</span>
                </div>
                <p className="text-[11px] text-biomech-muted mt-1 leading-normal">
                  Estimación multivariante según coeficientes antropométricos de De Leva y Winter, normalizado a porcentaje de estatura (% Talla).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-biomech-card/60 border border-biomech-border/60">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#A855F7]" />
                  <span>Interoperabilidad Ecosistémica</span>
                </div>
                <p className="text-[11px] text-biomech-muted mt-1 leading-normal">
                  Exportación nativa compatible con Kinovea 2025.2 (.KVA v2.1), OpenSim 4.x (.MOT SimTK Storage, .OSIM, .TRC) y CSV tabular.
                </p>
              </div>
            </div>
          </div>

          {/* Compatibility Badges */}
          <div className="p-4 rounded-xl bg-biomech-surface border border-biomech-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-biomech-muted font-medium">Ecosistemas compatibles:</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 font-mono text-[11px] font-semibold">
                Kinovea (.KVA v2.1)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 font-mono text-[11px] font-semibold">
                OpenSim (.MOT / .OSIM)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono text-[11px] font-semibold">
                Sports2D & Pose2Sim
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-biomech-card/40 border-t border-biomech-border/60 flex items-center justify-between text-xs text-biomech-muted">
          <div className="flex items-center gap-1">
            <span>© 2026</span>
            <span className="font-semibold text-white">Klgo. Felipe Vargas Ríos</span>
            <span className="text-biomech-secondary font-mono">(@kinepipe)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-biomech-primary text-biomech-bg font-bold hover:opacity-95 transition-all text-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
