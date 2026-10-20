import React, { useState } from 'react';
import { Bookmark, Trash2, Edit3, MessageSquare, Plus, Check, FileText, Image as ImageIcon } from 'lucide-react';

export default function KeyframeNotesPanel({
  keyframes = [],
  onSeekFrame,
  onDeleteKeyframe,
  onUpdateKeyframeNotes,
  notes,
  onUpdateNotes,
  currentFrame,
  onAddCurrentFrame,
  onOpenReport,
  videoId
}) {
  const [activeTab, setActiveTab] = useState('keyframes'); // 'keyframes' | 'notes'
  const [localNotes, setLocalNotes] = useState(notes || '');
  const [editingKfId, setEditingKfId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSessionNotes = () => {
    onUpdateNotes(localNotes);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleStartEditKeyframe = (kf) => {
    setEditingKfId(kf.id);
    setEditingText(kf.notes || '');
  };

  const handleSaveKeyframeNote = (kfId) => {
    if (onUpdateKeyframeNotes) {
      onUpdateKeyframeNotes(kfId, editingText);
    }
    setEditingKfId(null);
  };

  return (
    <div className="h-full flex flex-col glass-card rounded-xl border border-biomech-border overflow-hidden">
      {/* Top Header & Tab Switcher */}
      <div className="p-3 border-b border-biomech-border flex items-center justify-between bg-biomech-surface/80">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('keyframes')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'keyframes'
                ? 'bg-biomech-card border border-biomech-border text-white'
                : 'text-biomech-muted hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-biomech-accent" />
            <span>Fotogramas Clave ({keyframes ? keyframes.length : 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'bg-biomech-card border border-biomech-border text-white'
                : 'text-biomech-muted hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-biomech-secondary" />
            <span>Notas Globales</span>
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          {onOpenReport && (
            <button
              onClick={onOpenReport}
              className="px-2 py-1 rounded bg-biomech-card hover:bg-biomech-border border border-biomech-border text-biomech-primary text-xs font-semibold flex items-center gap-1 transition-all"
              title="Abrir Tabla Resumen Clínica e Imprimir"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tabla Reporte</span>
            </button>
          )}

          {activeTab === 'keyframes' && (
            <button
              onClick={onAddCurrentFrame}
              className="p-1.5 rounded bg-biomech-card hover:bg-biomech-border border border-biomech-border text-biomech-accent transition-all"
              title="Guardar fotograma actual como clave"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Content: Keyframes List */}
      {activeTab === 'keyframes' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {(!keyframes || keyframes.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-biomech-muted">
              <Bookmark className="w-8 h-8 mb-2 opacity-30 text-biomech-accent" />
              <p className="text-xs">No hay fotogramas clave registrados aún. Usa "+ Fotograma Clave" en la línea de tiempo.</p>
            </div>
          ) : (
            keyframes.map((kf) => {
              const isEditing = editingKfId === kf.id;
              return (
                <div
                  key={kf.id}
                  className="p-3 rounded-xl bg-biomech-surface border border-biomech-border hover:border-biomech-primary/50 transition-all group flex flex-col space-y-2.5"
                >
                  <div className="flex items-start space-x-3">
                    {/* Visual Frame Thumbnail */}
                    <div
                      onClick={() => onSeekFrame(kf.frame_index)}
                      className="cursor-pointer relative w-24 h-16 rounded-lg overflow-hidden bg-black/60 border border-biomech-border flex-shrink-0 group-hover:border-biomech-primary/60 transition-colors shadow-sm flex items-center justify-center"
                      title="Haz clic para saltar a este fotograma"
                    >
                      {(kf.thumbnail || kf.thumbnail_url || (videoId ? `/api/video/${videoId}/frame/${kf.frame_index}` : null)) ? (
                        <img
                          src={kf.thumbnail || kf.thumbnail_url || `/api/video/${videoId}/frame/${kf.frame_index}`}
                          alt={kf.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-biomech-muted">
                          <ImageIcon className="w-5 h-5 mb-0.5 opacity-40 text-biomech-secondary" />
                          <span className="text-[9px] font-mono font-bold text-biomech-text">
                            #{kf.frame_index}
                          </span>
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 text-[8px] font-mono px-1 py-0.2 rounded bg-black/80 text-white font-bold">
                        {kf.time_s?.toFixed(2)}s
                      </span>
                    </div>

                    {/* Metadata & Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          onClick={() => onSeekFrame(kf.frame_index)}
                          className="text-xs font-bold text-white group-hover:text-biomech-primary cursor-pointer truncate"
                        >
                          {kf.title}
                        </span>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEditKeyframe(kf)}
                            className="p-1 rounded text-biomech-muted hover:text-biomech-primary"
                            title="Editar anotación"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteKeyframe && (
                            <button
                              onClick={() => onDeleteKeyframe(kf.id)}
                              className="p-1 rounded text-biomech-muted hover:text-red-400"
                              title="Eliminar fotograma"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* In-place Notes Editor or Display */}
                      {isEditing ? (
                        <div className="mt-1.5 space-y-1">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            placeholder="Escribe la observación clínica aquí..."
                            className="w-full text-xs p-1.5 rounded-lg bg-biomech-card border border-biomech-primary text-white outline-none resize-none h-14 font-sans"
                            autoFocus
                          />
                          <div className="flex justify-end space-x-1">
                            <button
                              onClick={() => setEditingKfId(null)}
                              className="px-2 py-0.5 rounded text-[10px] text-biomech-muted hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveKeyframeNote(kf.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-biomech-primary text-biomech-bg"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          onClick={() => handleStartEditKeyframe(kf)}
                          className="text-xs text-biomech-muted mt-1 leading-relaxed cursor-text hover:text-biomech-text line-clamp-2"
                          title="Haz clic para editar la anotación"
                        >
                          {kf.notes || <span className="italic opacity-50">Haz clic para agregar notas clínicas...</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Angles Snapshot Badges */}
                  {kf.angles_snapshot && (
                    <div className="pt-1.5 border-t border-biomech-border/40 flex flex-wrap gap-1 text-[10px] font-mono">
                      {Object.entries(kf.angles_snapshot).map(([k, v]) => (
                        <span
                          key={k}
                          className="px-1.5 py-0.5 rounded bg-biomech-card border border-biomech-border/70 text-biomech-secondary"
                        >
                          {k.replace('_', ' ').replace('flexion', '').replace('angle', '').trim().toUpperCase()}: {v.toFixed(1)}°
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Content: Global Case Notes */}
      {activeTab === 'notes' && (
        <div className="flex-1 flex flex-col p-3 space-y-3">
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Registro clínico general del paciente, hipótesis biomecánica, anamnesis y objetivos terapéuticos..."
            className="flex-1 w-full p-3 rounded-xl bg-biomech-surface border border-biomech-border text-white text-xs leading-relaxed outline-none focus:border-biomech-secondary resize-none font-sans"
          />
          <button
            onClick={handleSaveSessionNotes}
            className="py-2 rounded-xl bg-biomech-secondary text-biomech-bg font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center space-x-1.5"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Notas Guardadas!</span>
              </>
            ) : (
              <span>Guardar Notas Globales</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
