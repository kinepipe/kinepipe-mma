import React, { useState } from 'react';
import { X, Scale, User, Ruler, Check } from 'lucide-react';

export default function CalibrationModal({
  isOpen,
  onClose,
  currentCalibration,
  onSaveCalibration,
  detectedStaturePx = 650
}) {
  const [method, setMethod] = useState('stature'); // 'stature' | 'object'
  
  // Stature mode
  const [statureM, setStatureM] = useState(1.72);
  const [staturePx, setStaturePx] = useState(detectedStaturePx || 650);
  
  // Object mode
  const [realDistance, setRealDistance] = useState(currentCalibration?.real_distance_m || 1.0);
  const [pixelDistance, setPixelDistance] = useState(currentCalibration?.pixel_distance || 240.0);

  React.useEffect(() => {
    if (detectedStaturePx && detectedStaturePx > 0) {
      setStaturePx(detectedStaturePx);
    }
  }, [detectedStaturePx, isOpen]);

  if (!isOpen) return null;

  const calculatedScale = method === 'stature'
    ? (staturePx > 0 ? (statureM / staturePx) : 0.005)
    : (pixelDistance > 0 ? (realDistance / pixelDistance) : 0.005);

  const handleApply = () => {
    if (method === 'stature') {
      onSaveCalibration({
        pixel_distance: staturePx,
        real_distance_m: statureM,
        scale_m_per_px: calculatedScale,
        calibration_mode: 'stature',
        subject_height_m: statureM
      });
    } else {
      onSaveCalibration({
        pixel_distance: pixelDistance,
        real_distance_m: realDistance,
        scale_m_per_px: calculatedScale,
        calibration_mode: 'object'
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-biomech-surface border border-biomech-border rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-biomech-border mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-biomech-secondary/10 border border-biomech-secondary/30 text-biomech-secondary">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Calibración Espacial (Escala)</h3>
              <p className="text-xs text-biomech-muted">Define la relación metros/píxeles para cinemática lineal y COM.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-biomech-muted hover:text-white hover:bg-biomech-card transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-biomech-card border border-biomech-border mb-4">
          <button
            type="button"
            onClick={() => setMethod('stature')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              method === 'stature'
                ? 'bg-biomech-primary text-biomech-bg font-bold shadow'
                : 'text-biomech-muted hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Por Estatura / Talla</span>
          </button>
          <button
            type="button"
            onClick={() => setMethod('object')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              method === 'object'
                ? 'bg-biomech-secondary text-biomech-bg font-bold shadow'
                : 'text-biomech-muted hover:text-white'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Objeto Patrón</span>
          </button>
        </div>

        {/* Form Content */}
        <div className="space-y-4 text-xs">
          {method === 'stature' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-biomech-text font-medium block">
                  Estatura / Talla Conocida del Sujeto (Metros):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="2.5"
                    value={statureM}
                    onChange={(e) => setStatureM(parseFloat(e.target.value) || 1.70)}
                    className="w-full px-3 py-2 rounded-lg bg-biomech-card border border-biomech-border text-white font-mono text-sm focus:border-biomech-primary outline-none"
                  />
                  <span className="absolute right-3 top-2.5 font-mono text-xs text-biomech-muted">m</span>
                </div>
                <span className="text-[11px] text-biomech-muted">Ej: 1.70 m (permite normalizar además la altura del COM a % de estatura).</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-biomech-text font-medium block">
                  Altura de la Persona en Pantalla (Píxeles cabeza a pies):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="50"
                    value={staturePx}
                    onChange={(e) => setStaturePx(parseFloat(e.target.value) || 600)}
                    className="w-full px-3 py-2 rounded-lg bg-biomech-card border border-biomech-border text-white font-mono focus:border-biomech-primary outline-none"
                  />
                  <span className="absolute right-3 top-2.5 font-mono text-xs text-biomech-muted">px</span>
                </div>
                <span className="text-[11px] text-biomech-muted">Estimado a partir del esqueleto detectado (vértice craneal a talones).</span>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-biomech-text font-medium block">
                  Longitud Real de Referencia (Metros):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={realDistance}
                    onChange={(e) => setRealDistance(parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-2 rounded-lg bg-biomech-card border border-biomech-border text-white font-mono focus:border-biomech-secondary outline-none"
                  />
                  <span className="absolute right-3 top-2.5 font-mono text-xs text-biomech-muted">m</span>
                </div>
                <span className="text-[11px] text-biomech-muted">Ej: Vara de calibración de 1.00 m en el plano de movimiento.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-biomech-text font-medium block">
                  Distancia en Píxeles en Pantalla (px):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="10"
                    value={pixelDistance}
                    onChange={(e) => setPixelDistance(parseFloat(e.target.value) || 100.0)}
                    className="w-full px-3 py-2 rounded-lg bg-biomech-card border border-biomech-border text-white font-mono focus:border-biomech-secondary outline-none"
                  />
                  <span className="absolute right-3 top-2.5 font-mono text-xs text-biomech-muted">px</span>
                </div>
                <span className="text-[11px] text-biomech-muted">Medido en pantalla entre los dos extremos del objeto patrón.</span>
              </div>
            </>
          )}

          {/* Calculated Scale Result */}
          <div className="p-3.5 rounded-xl bg-biomech-card/80 border border-biomech-border flex items-center justify-between">
            <span className="text-biomech-muted font-medium">Factor de Escala Calculado:</span>
            <span className="font-mono text-sm text-biomech-primary font-bold">
              {calculatedScale.toFixed(6)} <span className="text-xs text-biomech-muted">m/px</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-biomech-card hover:bg-biomech-border text-xs font-semibold text-biomech-text transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl bg-biomech-primary text-biomech-bg font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-biomech-primary/20"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar Calibración</span>
          </button>
        </div>
      </div>
    </div>
  );
}
