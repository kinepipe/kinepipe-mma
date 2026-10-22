import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import VideoStage from './components/VideoStage';
import Timeline from './components/Timeline';
import KinematicsDashboard from './components/KinematicsDashboard';
import JumpMetricsCard from './components/JumpMetricsCard';
import GaitMetricsCard from './components/GaitMetricsCard';
import SquatMetricsCard from './components/SquatMetricsCard';
import GeneralMetricsCard from './components/GeneralMetricsCard';
import UnanalyzedGuideCard from './components/UnanalyzedGuideCard';
import KeyframeNotesPanel from './components/KeyframeNotesPanel';
import ModelWizardModal from './components/ModelWizardModal';
import CalibrationModal from './components/CalibrationModal';
import ExportModal from './components/ExportModal';
import ReportModal from './components/ReportModal';
import AboutModal from './components/AboutModal';

import {
  getAvailableModels,
  getVideoList,
  uploadVideo,
  loadSampleVideo,
  runTracking,
  cancelTracking,
  embedAnalysisVideo,
  changeMovementInterpretation,
  recalculateKinematics,
  addKeyframe,
  deleteKeyframe,
  updateSessionNotes,
  getVideoStreamUrl
} from './services/api';

export default function App() {
  const videoRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Core application state
  const [models, setModels] = useState([]);
  const [videoList, setVideoList] = useState([]);
  const [currentModel, setCurrentModel] = useState('sports2d');
  const [metadata, setMetadata] = useState(null);
  const [session, setSession] = useState(null);
  const [interpretation, setInterpretation] = useState('general'); // Default to neutral General Kinematics

  // Analysis Time Window (ROI in seconds)
  const [roiStartTime, setRoiStartTime] = useState(0);
  const [roiEndTime, setRoiEndTime] = useState(10.0); // Default to first 10s or total duration

  // Playback & Frame sync
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(true);

  // Kinematics & Filters
  const [cutoffHz, setCutoffHz] = useState(6.0);
  const [subjectHeight, setSubjectHeight] = useState(1.75);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  // Modals & Popouts
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Kinovea-style Working Zone Loop [In / Out]
  const [isLoopingRoi, setIsLoopingRoi] = useState(false);

  // Joint angle visibility filter
  const [visibleAngles, setVisibleAngles] = useState({
    knee_r: true,
    knee_l: true,
    hip_r: true,
    hip_l: false,
    elbow_r: false,
    trunk: true,
  });

  // 1. Initial Load: Fetch models catalog and list videos
  useEffect(() => {
    getAvailableModels()
      .then((mods) => setModels(mods))
      .catch((err) => console.error('Error fetching models:', err));

    getVideoList()
      .then((videos) => {
        setVideoList(videos);
        if (videos && videos.length > 0) {
          // Prefer Valeria or Treadmill if available, else first
          const defaultVid = videos.find((v) => v.filename.toLowerCase().includes('valeria')) || videos[0];
          setMetadata(defaultVid);
        }
      })
      .catch((err) => console.error('Error listing videos:', err));
  }, []);

  // 2. Select video from dropdown
  const handleSelectVideo = (videoId) => {
    const selected = videoList.find((v) => v.video_id === videoId);
    if (selected) {
      setMetadata(selected);
      setSession(null);
      setIsAnalyzed(false);
      setCurrentFrame(0);
      setRoiStartTime(0);
      setRoiEndTime(Math.min(10.0, selected.duration_s || 10.0));
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }
  };

  // 2b. Auto-initialize ROI when metadata loads
  useEffect(() => {
    if (metadata) {
      setRoiStartTime(0);
      setRoiEndTime(Math.min(10.0, metadata.duration_s || 10.0));
    }
  }, [metadata?.video_id]);

  // 3. Ultra-smooth 60fps Playback Sync (rAF loop while playing)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !metadata || !isPlaying) return;

    let rAF_id;
    const tick = () => {
      const fps = metadata.fps || 30.0;
      const t = video.currentTime;

      // Kinovea-style Working Zone Loop [In / Out]
      if (isLoopingRoi && roiEndTime && roiEndTime > roiStartTime) {
        if (t >= roiEndTime) {
          video.currentTime = roiStartTime;
        } else if (t < roiStartTime) {
          video.currentTime = roiStartTime;
        }
      }

      const f = Math.round(video.currentTime * fps);
      setCurrentFrame(Math.min(metadata.total_frames - 1, Math.max(0, f)));
      rAF_id = requestAnimationFrame(tick);
    };
    rAF_id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rAF_id);
  }, [isPlaying, metadata, isLoopingRoi, roiStartTime, roiEndTime]);

  // 3b. Video Ended & Scrubbing Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !metadata) return;

    const handleEnded = () => {
      if (isLoopingRoi && roiEndTime && roiEndTime > roiStartTime) {
        video.currentTime = roiStartTime;
        video.play();
      } else if (isLooping) {
        video.currentTime = 0;
        video.play();
      } else {
        setIsPlaying(false);
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [metadata, isLooping, isLoopingRoi, roiStartTime, roiEndTime]);

  // 4. Play / Pause Control
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (isLoopingRoi && roiEndTime && roiEndTime > roiStartTime) {
        if (video.currentTime < roiStartTime || video.currentTime >= roiEndTime) {
          video.currentTime = roiStartTime;
        }
      }
      video.playbackRate = playbackSpeed;
      video.play().then(() => setIsPlaying(true)).catch((e) => console.log('Autoplay blocked:', e));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [playbackSpeed, isLoopingRoi, roiStartTime, roiEndTime]);

  // 5. Seek to specific frame
  const handleSeekFrame = useCallback((frameIdx) => {
    const video = videoRef.current;
    if (!video || !metadata) return;

    const fps = metadata.fps || 30.0;
    const clampedFrame = Math.max(0, Math.min(metadata.total_frames - 1, frameIdx));
    video.currentTime = clampedFrame / fps;
    setCurrentFrame(clampedFrame);
  }, [metadata]);

  // 6. Change Playback Speed
  const handleChangeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // 7. Keyboard Shortcuts (Space: Play/Pause, Left/Right: Step frames, K: Keyframe)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeekFrame(currentFrame - 1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeekFrame(currentFrame + 1);
      } else if (e.code === 'KeyK') {
        e.preventDefault();
        handleAddCurrentFrame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleSeekFrame, currentFrame]);

  // 8. Video Upload Handler
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const meta = await uploadVideo(file);
      setMetadata(meta);
      setSession(null);
      setIsAnalyzed(false);
      setCurrentFrame(0);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
      // Refresh video list
      const list = await getVideoList();
      setVideoList(list);
    } catch (err) {
      alert('Error al subir video: ' + err.message);
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // 9. EXECUTE AUTOMARKING WITH AI (Prominent Action!)
  const handleRunAutoMark = async () => {
    if (!metadata) return;
    setIsProcessing(true);
    abortControllerRef.current = new AbortController();
    try {
      const sess = await runTracking(
        metadata.video_id,
        currentModel,
        session?.calibration,
        cutoffHz,
        null,
        interpretation,
        roiStartTime,
        roiEndTime,
        abortControllerRef.current.signal
      );
      setSession(sess);
      setIsAnalyzed(true);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Automarcado cancelado por el usuario');
      } else {
        alert('Error ejecutando automarcado de IA: ' + err.message);
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  // 9b. CANCEL ACTIVE TRACKING IMMEDIATELY
  const handleCancelTracking = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (metadata) {
      try {
        await cancelTracking(metadata.video_id);
      } catch (e) {
        console.log('Error notifying backend cancellation:', e);
      }
    }
    setIsProcessing(false);
  };

  // 9c. EMBED ANALYSIS PERMANENTLY INTO A NEW VIDEO COPY
  const handleEmbedVideo = async (layout = 'bottom_bar') => {
    if (!metadata || !session) return;
    setIsEmbedding(true);
    try {
      const result = await embedAnalysisVideo(metadata.video_id, layout);
      // Refresh video list so the new copy appears in the dropdown selector
      const list = await getVideoList();
      setVideoList(list);

      // Trigger automatic file download
      if (result.download_url) {
        const link = document.createElement('a');
        link.href = result.download_url;
        link.download = result.copy_filename || `${metadata.video_id}_con_analisis.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      alert(`¡Copia generada exitosamente!\n\nArchivo: ${result.copy_filename}\nSe ha guardado en la lista de videos del sistema y descargado en tu equipo.`);
    } catch (err) {
      alert('Error al embeber análisis en video: ' + err.message);
    } finally {
      setIsEmbedding(false);
    }
  };

  // 10. Change Movement Interpretation (Gait / Jump / Squat / General)
  const handleChangeInterpretation = async (newInterp) => {
    setInterpretation(newInterp);
    if (session && metadata) {
      setIsRecalculating(true);
      try {
        const updatedSess = await changeMovementInterpretation(metadata.video_id, newInterp);
        setSession(updatedSess);
      } catch (err) {
        console.error('Error changing interpretation:', err);
      } finally {
        setIsRecalculating(false);
      }
    }
  };

  // 11. Run Model from Wizard (Does NOT auto-run unless runNow is explicitly true)
  const handleSelectAndRun = async (modelId, dlcConfig, runNow = false) => {
    if (!metadata) return;
    setCurrentModel(modelId);
    if (!runNow) {
      // Just select model without triggering analysis immediately
      return;
    }
    setIsProcessing(true);
    abortControllerRef.current = new AbortController();
    try {
      const sess = await runTracking(
        metadata.video_id,
        modelId,
        session?.calibration,
        cutoffHz,
        dlcConfig,
        interpretation,
        roiStartTime,
        roiEndTime,
        abortControllerRef.current.signal
      );
      setSession(sess);
      setIsAnalyzed(true);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Automarcado cancelado por el usuario');
      } else {
        alert('Error ejecutando modelo: ' + err.message);
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  // 12. Recalculate Butterworth Filter Live
  const handleRecalculateFilter = async (newCutoff) => {
    if (!metadata) return;
    setCutoffHz(newCutoff);
    setIsRecalculating(true);
    try {
      const updatedSess = await recalculateKinematics(
        metadata.video_id,
        newCutoff,
        session?.calibration,
        4
      );
      setSession(updatedSess);
    } catch (err) {
      alert('Error recalculando filtro: ' + err.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  // 13. Spatial Calibration Save
  const handleSaveCalibration = async (calibData) => {
    if (!metadata) return;
    setIsRecalculating(true);
    try {
      const updatedSess = await recalculateKinematics(
        metadata.video_id,
        cutoffHz,
        calibData,
        4
      );
      setSession(updatedSess);
    } catch (err) {
      alert('Error actualizando calibración: ' + err.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  // 13b. Capture video snapshot as base64 thumbnail for Keyframe
  const captureVideoSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(640, video.videoWidth);
      canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      console.warn('Could not capture frame snapshot:', e);
      return null;
    }
  };

  // 14. Add Keyframe with snapshot and angles
  const handleAddCurrentFrame = async () => {
    if (!metadata) return;
    const title = prompt('Título para este fotograma clave:', `Fotograma #${currentFrame}`);
    if (!title) return;
    const notes = prompt('Observación / Nota técnica (opcional):', '') || '';
    const thumbnail = captureVideoSnapshot();

    try {
      const newKf = await addKeyframe(metadata.video_id, currentFrame, title, notes);
      const enrichedKf = {
        ...newKf,
        thumbnail: thumbnail || null,
      };
      setSession((prev) => ({
        ...prev,
        keyframes: [...(prev?.keyframes || []), enrichedKf].sort((a, b) => a.frame_index - b.frame_index),
      }));
    } catch (err) {
      alert('Error al agregar fotograma clave: ' + err.message);
    }
  };

  // 14b. Update Keyframe Notes In-place
  const handleUpdateKeyframeNotes = (kfId, newNotes) => {
    setSession((prev) => {
      if (!prev || !prev.keyframes) return prev;
      return {
        ...prev,
        keyframes: prev.keyframes.map((k) => (k.id === kfId ? { ...k, notes: newNotes } : k)),
      };
    });
  };

  // 15. Delete Keyframe
  const handleDeleteKeyframe = async (keyframeId) => {
    if (!metadata) return;
    try {
      await deleteKeyframe(metadata.video_id, keyframeId);
      setSession((prev) => ({
        ...prev,
        keyframes: prev.keyframes.filter((k) => k.id !== keyframeId),
      }));
    } catch (err) {
      alert('Error eliminando fotograma clave: ' + err.message);
    }
  };

  // 16. Save Session Notes
  const handleUpdateNotes = async (newNotes) => {
    if (!metadata) return;
    try {
      await updateSessionNotes(metadata.video_id, newNotes);
      setSession((prev) => ({ ...prev, notes: newNotes }));
    } catch (err) {
      console.error('Error guardando notas:', err);
    }
  };

  const videoStreamUrl = metadata ? getVideoStreamUrl(metadata.video_id) : '';

  return (
    <div className="flex flex-col h-screen w-screen bg-biomech-bg text-biomech-text overflow-hidden">
      {/* 1. Header Bar with Automark button, Cancel button, Embed button, and Interpretation selector */}
      <Header
        metadata={metadata}
        onUploadClick={handleUpload}
        onOpenWizard={() => setIsWizardOpen(true)}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        isProcessing={isProcessing}
        currentModel={currentModel}
        onRunAutoMark={handleRunAutoMark}
        onCancelTracking={handleCancelTracking}
        isAnalyzed={isAnalyzed}
        interpretation={interpretation}
        onChangeInterpretation={handleChangeInterpretation}
        videoList={videoList}
        onSelectVideo={handleSelectVideo}
        onEmbedVideo={handleEmbedVideo}
        isEmbedding={isEmbedding}
      />

      {/* 2. Main Studio Workspace: 2 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Video Stage + Precision Timeline */}
        <div className="flex-[6] flex flex-col border-r border-biomech-border overflow-hidden bg-black/40">
          <VideoStage
            videoUrl={videoStreamUrl}
            framesData={session?.frames}
            currentFrameIndex={currentFrame}
            onFrameChange={handleSeekFrame}
            calibration={session?.calibration}
            videoRef={videoRef}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            interpretation={interpretation}
            sessionData={session}
            visibleAngles={visibleAngles}
          />

          <Timeline
            currentFrame={currentFrame}
            totalFrames={metadata?.total_frames || 0}
            fps={metadata?.fps || 30.0}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onSeekFrame={handleSeekFrame}
            keyframes={session?.keyframes}
            onAddKeyframeClick={handleAddCurrentFrame}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={handleChangeSpeed}
            isLooping={isLooping}
            onToggleLoop={() => setIsLooping(!isLooping)}
            isLoopingRoi={isLoopingRoi}
            onToggleLoopRoi={() => setIsLoopingRoi(!isLoopingRoi)}
            roiStartTime={roiStartTime}
            roiEndTime={roiEndTime}
            onChangeRoi={(start, end) => {
              setRoiStartTime(start);
              setRoiEndTime(end);
            }}
          />
        </div>

        {/* Right Column: Telemetry, Synced Charts & Keyframes */}
        <div className="flex-[4] flex flex-col p-3 space-y-3 overflow-y-auto bg-biomech-surface/50">
          {/* Guide Card when not yet analyzed */}
          {!session && (
            <UnanalyzedGuideCard
              metadata={metadata}
              onRunAutoMark={handleRunAutoMark}
              onCancelTracking={handleCancelTracking}
              isProcessing={isProcessing}
              roiStartTime={roiStartTime}
              roiEndTime={roiEndTime}
            />
          )}

          {/* Movement Interpretation Metrics Cards (once analyzed) */}
          {session && interpretation === 'general' && (
            <GeneralMetricsCard
              framesData={session.frames}
              currentFrameIndex={currentFrame}
              onChangeInterpretation={handleChangeInterpretation}
            />
          )}

          {session && interpretation === 'gait' && session.gait_analysis && (
            <GaitMetricsCard
              gaitAnalysis={session.gait_analysis}
              onSeekEvent={handleSeekFrame}
            />
          )}

          {session && interpretation === 'jump' && session.jump_analysis && (
            <JumpMetricsCard
              jumpAnalysis={session.jump_analysis}
              onSeekEvent={handleSeekFrame}
            />
          )}

          {session && interpretation === 'squat' && session.squat_analysis && (
            <SquatMetricsCard
              squatAnalysis={session.squat_analysis}
              onSeekEvent={handleSeekFrame}
            />
          )}

          {/* Synchronized Kinematic Curves & Filter Slider */}
          <div className="flex-1 min-h-[280px]">
            <KinematicsDashboard
              framesData={session?.frames}
              currentFrame={currentFrame}
              onSeekFrame={handleSeekFrame}
              cutoffHz={cutoffHz}
              onRecalculateFilter={handleRecalculateFilter}
              isRecalculating={isRecalculating}
              visibleAnglesConfig={visibleAngles}
              onChangeVisibleAngles={(updated) => setVisibleAngles(updated)}
            />
          </div>

          {/* Keyframes & Clinical Notes Panel */}
          <div className="flex-1 min-h-[220px]">
            <KeyframeNotesPanel
              keyframes={session?.keyframes}
              onSeekFrame={handleSeekFrame}
              onDeleteKeyframe={handleDeleteKeyframe}
              onUpdateKeyframeNotes={handleUpdateKeyframeNotes}
              notes={session?.notes}
              onUpdateNotes={handleUpdateNotes}
              currentFrame={currentFrame}
              onAddCurrentFrame={handleAddCurrentFrame}
              onOpenReport={() => setIsReportOpen(true)}
              videoId={metadata?.video_id}
            />
          </div>
        </div>
      </div>

      {/* 3. Interactive Modals */}
      <ModelWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        models={models}
        currentModelId={currentModel}
        onSelectAndRun={handleSelectAndRun}
        cutoffHz={cutoffHz}
        setCutoffHz={setCutoffHz}
        subjectHeight={subjectHeight}
        setSubjectHeight={setSubjectHeight}
        isProcessing={isProcessing}
      />

      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentCalibration={session?.calibration}
        onSaveCalibration={handleSaveCalibration}
        detectedStaturePx={Math.round(session?.frames?.[currentFrame]?.com?.stature_px || session?.frames?.find(f => f.com?.stature_px > 100)?.com?.stature_px || 650)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        videoId={metadata?.video_id}
        videoFilename={metadata?.filename}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        session={session}
        keyframes={session?.keyframes}
        metadata={metadata}
        calibration={session?.calibration}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        appName="KinePipe MMA"
      />
    </div>
  );
}
