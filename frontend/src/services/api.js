const API_BASE = '/api';

export async function getAvailableModels() {
  const res = await fetch(`${API_BASE}/tracking/models`);
  if (!res.ok) throw new Error('Error al obtener catálogo de modelos');
  return res.json();
}

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/video/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Error al subir video');
  return res.json();
}

export async function loadSampleVideo() {
  const res = await fetch(`${API_BASE}/video/sample`);
  if (!res.ok) throw new Error('Error al cargar video de muestra');
  return res.json();
}

export async function getVideoList() {
  const res = await fetch(`${API_BASE}/video/list`);
  if (!res.ok) throw new Error('Error al listar videos');
  return res.json();
}

export async function runTracking(
  videoId,
  modelId = 'sports2d',
  calibration = null,
  cutoffHz = 6.0,
  dlcConfig = null,
  interpretation = 'general',
  roiStartTime = null,
  roiEndTime = null,
  abortSignal = null
) {
  const bodyData = {
    video_id: videoId,
    model_id: modelId,
    calibration: calibration,
    butterworth_cutoff_hz: cutoffHz,
    dlc_config_path: dlcConfig,
    interpretation: interpretation,
  };
  if (roiStartTime !== null && roiStartTime !== undefined) {
    bodyData.roi_start_time_s = parseFloat(roiStartTime);
  }
  if (roiEndTime !== null && roiEndTime !== undefined && parseFloat(roiEndTime) > 0) {
    bodyData.roi_end_time_s = parseFloat(roiEndTime);
  }

  const res = await fetch(`${API_BASE}/tracking/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData),
    signal: abortSignal,
  });
  if (!res.ok) throw new Error('Error al ejecutar automarcado de IA');
  return res.json();
}

export async function cancelTracking(videoId) {
  const res = await fetch(`${API_BASE}/tracking/cancel/${videoId}`, {
    method: 'POST',
  });
  return res.json();
}

export async function changeMovementInterpretation(videoId, interpretation = 'general') {
  const res = await fetch(`${API_BASE}/tracking/interpret/${videoId}?interpretation=${interpretation}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Error al cambiar interpretación');
  return res.json();
}

export async function recalculateKinematics(videoId, cutoffHz = 6.0, calibration = null, order = 4) {
  const res = await fetch(`${API_BASE}/kinematics/recalculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_id: videoId,
      butterworth_cutoff_hz: cutoffHz,
      butterworth_order: order,
      calibration: calibration,
    }),
  });
  if (!res.ok) throw new Error('Error al recalcular cinemática');
  return res.json();
}

export async function addKeyframe(videoId, frameIndex, title, notes = '', eventType = 'custom') {
  const params = new URLSearchParams({
    video_id: videoId,
    frame_index: frameIndex,
    title: title,
    notes: notes,
    event_type: eventType,
  });
  const res = await fetch(`${API_BASE}/kinematics/keyframe/add?${params.toString()}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Error al guardar fotograma clave');
  return res.json();
}

export async function deleteKeyframe(videoId, keyframeId) {
  const res = await fetch(`${API_BASE}/kinematics/keyframe/${videoId}/${keyframeId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al eliminar fotograma clave');
  return res.json();
}

export async function updateSessionNotes(videoId, notes) {
  const res = await fetch(`${API_BASE}/kinematics/notes/${videoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error('Error al actualizar notas');
  return res.json();
}

export async function requestAnnotatedVideo(videoId, layout = 'bottom_bar') {
  const res = await fetch(`${API_BASE}/export/video/${videoId}?layout=${layout}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Error al solicitar render de video');
  return res.json();
}

export async function embedAnalysisVideo(videoId, layout = 'bottom_bar') {
  const res = await fetch(`${API_BASE}/export/video/${videoId}?layout=${layout}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Error al embeber análisis en copia de video');
  return res.json();
}

export function getVideoStreamUrl(videoId) {
  return `${API_BASE}/video/${videoId}/stream`;
}

export function getKvaExportUrl(videoId) {
  return `${API_BASE}/kinovea/export/${videoId}`;
}

export function getCsvExportUrl(videoId) {
  return `${API_BASE}/export/csv/${videoId}`;
}

export function getTrcExportUrl(videoId) {
  return `${API_BASE}/export/trc/${videoId}`;
}

export function getMotExportUrl(videoId) {
  return `${API_BASE}/export/mot/${videoId}`;
}

export function getOsimExportUrl(videoId) {
  return `${API_BASE}/export/osim/${videoId}`;
}

export function getReportUrl(videoId) {
  return `${API_BASE}/export/report/${videoId}`;
}
