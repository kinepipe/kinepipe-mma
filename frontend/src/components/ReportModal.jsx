import React, { useState } from 'react';
import { X, Printer, FileText, Check, Palette, Eye } from 'lucide-react';

export default function ReportModal({
  isOpen,
  onClose,
  session,
  keyframes = [],
  metadata,
  calibration
}) {
  const [printMode, setPrintMode] = useState('color'); // 'color' | 'grayscale'
  const [selectedAngles, setSelectedAngles] = useState({
    knee_r: true,
    hip_r: true,
    ankle_r: true,
    trunk: true,
  });

  if (!isOpen) return null;

  const toggleAngle = (k) => {
    setSelectedAngles((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const isGrayscale = printMode === 'grayscale';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      {/* Modal Container */}
      <div
        className={`w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] border transition-colors ${
          isGrayscale
            ? 'bg-white text-black border-gray-400 print:border-none print:shadow-none'
            : 'bg-biomech-surface text-biomech-text border-biomech-border'
        }`}
      >
        {/* Header (Hidden when printing) */}
        <div
          className={`p-4 border-b flex items-center justify-between print:hidden ${
            isGrayscale ? 'bg-gray-100 border-gray-300' : 'bg-biomech-surface border-biomech-border'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-xl ${
                isGrayscale
                  ? 'bg-gray-200 text-black'
                  : 'bg-biomech-primary/10 text-biomech-primary border border-biomech-primary/30'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Reporte Clínico & Resumen de Fotogramas Clave</h2>
              <p className="text-xs opacity-70">
                Resumen de fases, ángulos seleccionados y anotaciones listo para impresión o exportación PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Color vs Grayscale Mode Switcher */}
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-biomech-card/80 border border-biomech-border">
              <button
                onClick={() => setPrintMode('color')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  printMode === 'color'
                    ? 'bg-biomech-primary text-black font-bold shadow'
                    : 'text-biomech-muted hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Color</span>
              </button>
              <button
                onClick={() => setPrintMode('grayscale')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  printMode === 'grayscale'
                    ? 'bg-white text-black font-bold shadow'
                    : 'text-biomech-muted hover:text-white'
                }`}
              >
                <span>Escala de Grises</span>
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition-all ${
                isGrayscale
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-biomech-accent text-biomech-bg hover:opacity-90'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-biomech-muted hover:text-white hover:bg-biomech-card transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0 print:overflow-visible font-sans">
          {/* Header Metadata */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isGrayscale
                ? 'bg-gray-50 border-gray-300'
                : 'bg-biomech-card/60 border-biomech-border'
            }`}
          >
            <div>
              <h1 className="text-lg font-black tracking-tight">
                INFORME DE EVALUACIÓN CINEMÁTICA Y BIOMECÁNICA
              </h1>
              <p className="text-xs opacity-75 mt-0.5">
                KinePipe MMA (Markless Motion Analyser) | Dirección & Desarrollo: Klgo. Felipe Vargas Ríos (@kinepipe) | Protocolo: {session?.model_used || 'Sports2D'} | Modo: {session?.movement_interpretation || 'General'}
              </p>
            </div>
            <div className="text-right text-xs font-mono space-y-0.5">
              <div>Archivo: <strong>{metadata?.filename || 'Valeria camina .mov'}</strong></div>
              <div>FPS: <strong>{metadata?.fps?.toFixed(1) || '30.0'}</strong> | Resolución: <strong>{metadata?.width}x{metadata?.height}</strong></div>
              <div>Escala: <strong>{calibration?.scale_m_per_px?.toFixed(5) || '0.00500'} m/px</strong></div>
            </div>
          </div>

          {/* Angle Columns Visibility Selector (Hidden in print) */}
          <div
            className={`p-3 rounded-xl border print:hidden flex items-center justify-between text-xs ${
              isGrayscale ? 'bg-gray-100 border-gray-300' : 'bg-biomech-surface border-biomech-border'
            }`}
          >
            <span className="font-semibold flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-biomech-secondary" />
              <span>Seleccionar ángulos visibles en tabla:</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'knee_r', label: 'Rodilla R' },
                { id: 'knee_l', label: 'Rodilla L' },
                { id: 'hip_r', label: 'Cadera R' },
                { id: 'ankle_r', label: 'Tobillo R' },
                { id: 'elbow_r', label: 'Codo R' },
                { id: 'trunk', label: 'Tronco' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => toggleAngle(id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                    selectedAngles[id]
                      ? isGrayscale
                        ? 'bg-black text-white border-black font-bold'
                        : 'bg-biomech-primary/20 text-biomech-primary border-biomech-primary/50 font-bold'
                      : isGrayscale
                      ? 'bg-white text-gray-500 border-gray-300'
                      : 'bg-biomech-card text-biomech-muted border-biomech-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Keyframes Summary Table */}
          <div className="overflow-x-auto">
            <table
              className={`w-full text-left text-xs border-collapse rounded-xl overflow-hidden border ${
                isGrayscale ? 'border-gray-400' : 'border-biomech-border'
              }`}
            >
              <thead>
                <tr
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isGrayscale
                      ? 'bg-gray-200 text-black border-b border-gray-400'
                      : 'bg-biomech-card text-biomech-muted border-b border-biomech-border'
                  }`}
                >
                  <th className="p-3 w-16 text-center">Frame</th>
                  <th className="p-3 w-20">Tiempo</th>
                  <th className="p-3 w-28 text-center">Fotograma</th>
                  <th className="p-3">Evento / Fase</th>
                  {selectedAngles.knee_r && <th className="p-3 text-center">Rodilla R (°)</th>}
                  {selectedAngles.knee_l && <th className="p-3 text-center">Rodilla L (°)</th>}
                  {selectedAngles.hip_r && <th className="p-3 text-center">Cadera R (°)</th>}
                  {selectedAngles.ankle_r && <th className="p-3 text-center">Tobillo R (°)</th>}
                  {selectedAngles.elbow_r && <th className="p-3 text-center">Codo R (°)</th>}
                  {selectedAngles.trunk && <th className="p-3 text-center">Tronco (°)</th>}
                  <th className="p-3">Anotación / Observación Clínica</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  isGrayscale ? 'divide-gray-300 bg-white' : 'divide-biomech-border/50 bg-biomech-card/30'
                }`}
              >
                {(!keyframes || keyframes.length === 0) ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center opacity-60">
                      No hay fotogramas clave registrados en la sesión actual.
                    </td>
                  </tr>
                ) : (
                  keyframes.map((kf, i) => {
                    const angles = kf.angles_snapshot || {};
                    return (
                      <tr
                        key={kf.id || i}
                        className={`transition-colors ${
                          isGrayscale
                            ? i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            : i % 2 === 0 ? 'bg-biomech-surface/40' : 'bg-biomech-surface/80'
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-center">
                          #{kf.frame_index}
                        </td>
                        <td className="p-3 font-mono">
                          {kf.time_s?.toFixed(3) || '0.000'} s
                        </td>
                        <td className="p-2 text-center">
                          {/* Miniature Frame snapshot */}
                          {(kf.thumbnail || kf.thumbnail_url || (metadata?.video_id ? `/api/video/${metadata.video_id}/frame/${kf.frame_index}` : null)) ? (
                            <img
                              src={kf.thumbnail || kf.thumbnail_url || `/api/video/${metadata?.video_id}/frame/${kf.frame_index}`}
                              alt={kf.title}
                              className={`w-20 h-12 object-cover rounded border mx-auto shadow-sm ${
                                isGrayscale ? 'border-gray-400 grayscale' : 'border-biomech-border'
                              }`}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              className={`w-20 h-12 rounded border mx-auto flex items-center justify-center font-mono text-[9px] ${
                                isGrayscale
                                  ? 'bg-gray-200 text-gray-700 border-gray-300'
                                  : 'bg-biomech-card text-biomech-muted border-biomech-border'
                              }`}
                            >
                              Frame {kf.frame_index}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              isGrayscale
                                ? 'bg-gray-200 text-black font-bold'
                                : 'bg-biomech-accent/15 text-biomech-accent font-bold'
                            }`}
                          >
                            {kf.title}
                          </span>
                        </td>
                        {selectedAngles.knee_r && (
                          <td className="p-3 font-mono text-center font-bold">
                            {angles.knee_flexion_r !== undefined ? `${angles.knee_flexion_r}°` : '-'}
                          </td>
                        )}
                        {selectedAngles.knee_l && (
                          <td className="p-3 font-mono text-center font-bold">
                            {angles.knee_flexion_l !== undefined ? `${angles.knee_flexion_l}°` : '-'}
                          </td>
                        )}
                        {selectedAngles.hip_r && (
                          <td className="p-3 font-mono text-center font-bold">
                            {angles.hip_flexion_r !== undefined ? `${angles.hip_flexion_r}°` : '-'}
                          </td>
                        )}
                        {selectedAngles.ankle_r && (
                          <td className="p-3 font-mono text-center font-bold">
                            {angles.ankle_flexion_r !== undefined ? `${angles.ankle_flexion_r}°` : '-'}
                          </td>
                        )}
                        {selectedAngles.elbow_r && (
                          <td className="p-3 font-mono text-center font-bold">
                            {angles.elbow_angle_r !== undefined ? `${angles.elbow_angle_r}°` : '-'}
                          </td>
                        )}
                        {selectedAngles.trunk && (
                          <td className="p-3 font-mono text-center font-bold">
                            {angles.trunk_inclination !== undefined ? `${angles.trunk_inclination}°` : '-'}
                          </td>
                        )}
                        <td className="p-3 text-xs leading-relaxed max-w-xs">
                          {kf.notes || <span className="opacity-40 italic">Sin notas</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Sign-off (for clinical documentation) */}
          <div className="pt-6 border-t border-dashed border-gray-400 flex justify-between items-end text-xs">
            <div className="space-y-1">
              <div>Evaluador / Kinesiólogo: ____________________________________</div>
              <div className="opacity-70 text-[10px]">Firma y Timbre Profesional • Klgo. Felipe Vargas Ríos (@kinepipe)</div>
            </div>
            <div className="text-right text-[10px] opacity-70">
              Fecha de emisión: {new Date().toLocaleDateString()} | Generado con KinePipe MMA (Markless Motion Analyser) • @kinepipe
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
