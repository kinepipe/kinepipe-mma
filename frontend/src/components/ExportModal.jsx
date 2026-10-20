import React, { useState } from 'react';
import { X, Download, FileText, Video, Table, FileCode, Check, Loader2 } from 'lucide-react';
import {
  getKvaExportUrl,
  getCsvExportUrl,
  getTrcExportUrl,
  getMotExportUrl,
  getOsimExportUrl,
  getReportUrl,
  requestAnnotatedVideo
} from '../services/api';

export default function ExportModal({ isOpen, onClose, videoId, videoFilename }) {
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderedDownloadUrl, setRenderedDownloadUrl] = useState(null);
  const [videoLayout, setVideoLayout] = useState('bottom_bar');

  if (!isOpen || !videoId) return null;

  const handleRenderVideo = async () => {
    setIsRenderingVideo(true);
    try {
      const res = await requestAnnotatedVideo(videoId, videoLayout);
      setRenderedDownloadUrl(res.download_url);
    } catch (e) {
      alert('Error al renderizar el video: ' + e.message);
    } finally {
      setIsRenderingVideo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-biomech-surface border border-biomech-border rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-biomech-border mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-biomech-primary/10 border border-biomech-primary/30 text-biomech-primary">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Centro de Exportación Biomecánica</h3>
              <p className="text-xs text-biomech-muted">Formatos compatibles con Kinovea, OpenSim, Excel y video con HUD.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-biomech-muted hover:text-white hover:bg-biomech-card transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* 1. Kinovea .kva XML */}
          <a
            href={getKvaExportUrl(videoId)}
            download
            className="p-3.5 rounded-xl bg-biomech-card hover:bg-biomech-border border border-biomech-border flex items-center justify-between group transition-all block"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-biomech-primary transition-colors">
                  Archivo Kinovea (.KVA)
                </h4>
                <p className="text-[11px] text-biomech-muted">
                  Guarda anotaciones, fotogramas clave y trayectorias. Se abre nativamente en Kinovea.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-biomech-muted group-hover:text-white transition-colors" />
          </a>

          {/* 2. OpenSim .TRC */}
          <a
            href={getTrcExportUrl(videoId)}
            download
            className="p-3.5 rounded-xl bg-biomech-card hover:bg-biomech-border border border-biomech-border flex items-center justify-between group transition-all block"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-biomech-secondary transition-colors">
                  Archivo OpenSim (.TRC)
                </h4>
                <p className="text-[11px] text-biomech-muted">
                  Trayectorias de marcadores en metros para cinemática inversa y escalado de modelos.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-biomech-muted group-hover:text-white transition-colors" />
          </a>

          {/* 2b. OpenSim .MOT (Motion Coordinates) */}
          <a
            href={getMotExportUrl(videoId)}
            download
            className="p-3.5 rounded-xl bg-biomech-card hover:bg-biomech-border border border-biomech-border flex items-center justify-between group transition-all block"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  Coordenadas OpenSim (.MOT)
                </h4>
                <p className="text-[11px] text-biomech-muted">
                  Ángulos articulares listos para cargar sobre modelos musculoesqueléticos (.osim) en OpenSim.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-biomech-muted group-hover:text-white transition-colors" />
          </a>

          {/* 2c. OpenSim .OSIM (Musculoskeletal Model) */}
          <a
            href={getOsimExportUrl(videoId)}
            download
            className="p-3.5 rounded-xl bg-biomech-card hover:bg-biomech-border border border-biomech-border flex items-center justify-between group transition-all block"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  Exportar Modelo Esquelético (.OSIM)
                </h4>
                <p className="text-[11px] text-biomech-muted">
                  Modelo anatómico musculoesquelético para OpenSim compatible con los archivos .MOT y .TRC.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-biomech-muted group-hover:text-white transition-colors" />
          </a>

          {/* 3. CSV Kinematics Table */}
          <a
            href={getCsvExportUrl(videoId)}
            download
            className="p-3.5 rounded-xl bg-biomech-card hover:bg-biomech-border border border-biomech-border flex items-center justify-between group transition-all block"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-biomech-accent transition-colors">
                  Tabla de Datos (.CSV)
                </h4>
                <p className="text-[11px] text-biomech-muted">
                  Coordenadas (px y m), ángulos articulares y velocidades para Excel, Python o R.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-biomech-muted group-hover:text-white transition-colors" />
          </a>

          {/* 4. Full HTML Biomechanical Report */}
          <a
            href={getReportUrl(videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-biomech-card hover:bg-biomech-border border border-biomech-border flex items-center justify-between group transition-all block"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                  Informe Biomecánico Oficial (HTML / PDF)
                </h4>
                <p className="text-[11px] text-biomech-muted">
                  Reporte profesional con resumen de saltos, rangos de movimiento (ROM), eventos y notas.
                </p>
              </div>
            </div>
            <FileText className="w-4 h-4 text-biomech-muted group-hover:text-white transition-colors" />
          </a>

          {/* 5. Rendered MP4 Video with HUD */}
          <div className="p-3.5 rounded-xl bg-biomech-card border border-biomech-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Video Anotado con Telemetría (.MP4)</h4>
                  <p className="text-[11px] text-biomech-muted">
                    Renderiza el esqueleto, trayectorias y panel de telemetría articular.
                  </p>
                </div>
              </div>

              {renderedDownloadUrl ? (
                <a
                  href={renderedDownloadUrl}
                  download
                  className="px-3 py-1.5 rounded-lg bg-biomech-primary text-biomech-bg font-bold text-xs flex items-center gap-1 hover:opacity-90 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </a>
              ) : (
                <button
                  onClick={handleRenderVideo}
                  disabled={isRenderingVideo}
                  className="px-3 py-1.5 rounded-lg bg-biomech-border hover:bg-biomech-card border border-biomech-border text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {isRenderingVideo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-biomech-primary" />
                      <span>Renderizando...</span>
                    </>
                  ) : (
                    <span>Renderizar</span>
                  )}
                </button>
              )}
            </div>

            {/* Layout Options Selector */}
            <div className="pt-2 border-t border-biomech-border/50 flex items-center justify-between">
              <span className="text-[11px] font-medium text-biomech-muted">Formato de Visualización:</span>
              <div className="flex items-center gap-1 bg-biomech-surface p-1 rounded-lg border border-biomech-border/60">
                <button
                  type="button"
                  onClick={() => setVideoLayout('bottom_bar')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    videoLayout === 'bottom_bar'
                      ? 'bg-biomech-primary text-biomech-bg shadow-sm'
                      : 'text-biomech-muted hover:text-white'
                  }`}
                  title="Panel de telemetría bajo el video. El video del atleta queda 100% libre sin tapar."
                >
                  Bajo el Video (Limpio)
                </button>
                <button
                  type="button"
                  onClick={() => setVideoLayout('transparent_overlay')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    videoLayout === 'transparent_overlay'
                      ? 'bg-biomech-primary text-biomech-bg shadow-sm'
                      : 'text-biomech-muted hover:text-white'
                  }`}
                  title="Superposición flotante semi-transparente en la esquina superior"
                >
                  Flotante Translúcido
                </button>
                <button
                  type="button"
                  onClick={() => setVideoLayout('clean')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    videoLayout === 'clean'
                      ? 'bg-biomech-primary text-biomech-bg shadow-sm'
                      : 'text-biomech-muted hover:text-white'
                  }`}
                  title="Solo esqueleto y trayectorias, sin cuadro de datos"
                >
                  Solo Esqueleto
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-biomech-card hover:bg-biomech-border text-xs font-semibold text-biomech-text transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
