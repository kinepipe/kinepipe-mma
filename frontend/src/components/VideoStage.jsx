import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Compass,
  Ruler,
  Timer,
  Play,
  Pause,
  Activity,
  Layers
} from 'lucide-react';

// Chromatically separated bone segments with 180° color wheel opposition
const SEGMENT_BONES = [
  // Head & Neck
  { p1: 'head', p2: 'neck', color: '#FFEB3B', width: 3 },
  // Spine & Torso
  { p1: 'neck', p2: 'right_hip', color: '#00FF88', width: 4 },
  { p1: 'neck', p2: 'left_hip', color: '#00FF88', width: 4 },
  { p1: 'right_hip', p2: 'left_hip', color: '#00FF88', width: 4 },
  // Right Arm (Cyan / Blue palette)
  { p1: 'neck', p2: 'right_shoulder', color: '#00E5FF', width: 4 },
  { p1: 'right_shoulder', p2: 'right_elbow', color: '#00E5FF', width: 4 },
  { p1: 'right_elbow', p2: 'right_wrist', color: '#00B0FF', width: 3.5 },
  // Left Arm (Orange / Red 180° opposite palette)
  { p1: 'neck', p2: 'left_shoulder', color: '#FF6D00', width: 4 },
  { p1: 'left_shoulder', p2: 'left_elbow', color: '#FF6D00', width: 4 },
  { p1: 'left_elbow', p2: 'left_wrist', color: '#FF9100', width: 3.5 },
  // Right Leg (Cyan / Turquoise / Sky palette)
  { p1: 'right_hip', p2: 'right_knee', color: '#00E5FF', width: 5 },
  { p1: 'right_knee', p2: 'right_ankle', color: '#00B0FF', width: 4.5 },
  // Left Leg (Orange / Warm Coral / Deep Orange palette)
  { p1: 'left_hip', p2: 'left_knee', color: '#FF6D00', width: 5 },
  { p1: 'left_knee', p2: 'left_ankle', color: '#FF3D00', width: 4.5 },
];

// Joint node colors
const JOINT_COLORS = {
  // Axial
  head: '#FFEB3B',
  nose: '#FFEB3B',
  neck: '#00FF88',
  // Right Side (Cyan/Electric Blue)
  right_shoulder: '#00E5FF',
  right_elbow: '#00B0FF',
  right_wrist: '#2979FF',
  right_hip: '#00E5FF',
  right_knee: '#00E5FF',
  right_ankle: '#18FFFF',
  // Left Side (Opposite Orange/Amber/Red)
  left_shoulder: '#FF6D00',
  left_elbow: '#FF9100',
  left_wrist: '#FF3D00',
  left_hip: '#FF6D00',
  left_knee: '#FF5722',
  left_ankle: '#FF3D00',
};

export default function VideoStage({
  videoUrl,
  framesData,
  currentFrameIndex,
  onFrameChange,
  calibration,
  videoRef,
  isPlaying,
  playbackSpeed,
  interpretation = 'general',
  sessionData = null,
  visibleAngles = {
    knee_r: true,
    knee_l: true,
    hip_r: true,
    hip_l: false,
    ankle_r: true,
    elbow_r: false,
    trunk: true
  }
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Viewport Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Display toggles
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showCOM, setShowCOM] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showTelemetryHUD, setShowTelemetryHUD] = useState(true);

  // On-screen Stopwatch / Timer
  const [showTimer, setShowTimer] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStartFrame, setTimerStartFrame] = useState(0);
  const [timerManualMs, setTimerManualMs] = useState(0);

  // Manual interactive tools: 'none' | 'angle' | 'ruler'
  const [activeTool, setActiveTool] = useState('none');
  const [toolPoints, setToolPoints] = useState([]);
  const [manualMeasureResult, setManualMeasureResult] = useState(null);

  // COM trajectory trail
  const trajectoryRef = useRef([]);

  // Mouse wheel zoom centered on cursor
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prevZoom) => {
      const nextZoom = Math.min(5, Math.max(0.5, prevZoom * zoomFactor));
      return parseFloat(nextZoom.toFixed(2));
    });
  };

  // Mouse Down for Pan and Manual Tools
  const handleMouseDown = (e) => {
    if (activeTool !== 'none') {
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const ptX = (e.clientX - rect.left) * scaleX;
      const ptY = (e.clientY - rect.top) * scaleY;

      const newPts = [...toolPoints, { x: ptX, y: ptY }];
      if (activeTool === 'angle' && newPts.length === 3) {
        const v1 = { x: newPts[0].x - newPts[1].x, y: newPts[0].y - newPts[1].y };
        const v2 = { x: newPts[2].x - newPts[1].x, y: newPts[2].y - newPts[1].y };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        const deg = Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * (180 / Math.PI);
        setManualMeasureResult({ type: 'angle', val: deg.toFixed(1) + '°' });
        setToolPoints(newPts);
      } else if (activeTool === 'ruler' && newPts.length === 2) {
        const dx = newPts[1].x - newPts[0].x;
        const dy = newPts[1].y - newPts[0].y;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const scale = calibration?.scale_m_per_px || 0.005;
        const distM = (distPx * scale).toFixed(2);
        setManualMeasureResult({ type: 'dist', val: `${distM} m (${distPx.toFixed(0)} px)` });
        setToolPoints(newPts);
      } else if ((activeTool === 'angle' && newPts.length > 3) || (activeTool === 'ruler' && newPts.length > 2)) {
        setToolPoints([{ x: ptX, y: ptY }]);
        setManualMeasureResult(null);
      } else {
        setToolPoints(newPts);
      }
      return;
    }

    if (e.button === 0 && zoom > 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setToolPoints([]);
    setManualMeasureResult(null);
  };

  // Canvas Overlay Renderer with sub-millisecond sync
  const renderCanvasWithTime = useCallback((mediaTime = null) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!framesData || framesData.length === 0) return;

    let targetIdx = currentFrameIndex;
    if (!video.paused) {
      const t = mediaTime !== null ? mediaTime : video.currentTime;
      const fps = (framesData.length > 1 && framesData[1].time_s > framesData[0].time_s)
        ? Math.round(1.0 / (framesData[1].time_s - framesData[0].time_s))
        : 30.0;
      targetIdx = Math.max(0, Math.min(framesData.length - 1, Math.round(t * fps)));
    }

    const currentFrameData = framesData[targetIdx];
    if (!currentFrameData) return;

    const kps = currentFrameData.keypoints || {};

    // 1. Center of Mass (COM) Trajectory Trail & Marker
    if (showCOM && currentFrameData.com?.x && currentFrameData.com?.y) {
      const comPt = { x: currentFrameData.com.x, y: currentFrameData.com.y };
      trajectoryRef.current.push(comPt);
      if (trajectoryRef.current.length > 40) {
        trajectoryRef.current.shift();
      }

      if (showTrajectory && trajectoryRef.current.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 3;
        for (let i = 0; i < trajectoryRef.current.length; i++) {
          const pt = trajectoryRef.current[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // COM Marker (Quartered Circle with Stature Percentage)
      ctx.beginPath();
      ctx.arc(comPt.x, comPt.y, 11, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 145, 0, 0.85)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Crosshair
      ctx.beginPath();
      ctx.moveTo(comPt.x - 16, comPt.y);
      ctx.lineTo(comPt.x + 16, comPt.y);
      ctx.moveTo(comPt.x, comPt.y - 16);
      ctx.lineTo(comPt.x, comPt.y + 16);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Stature % label if available
      if (currentFrameData.com?.height_percent) {
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        const comText = `${currentFrameData.com.height_percent}% Talla`;
        ctx.fillStyle = 'rgba(18, 23, 34, 0.85)';
        ctx.fillRect(comPt.x + 14, comPt.y - 8, ctx.measureText(comText).width + 8, 16);
        ctx.fillStyle = '#FF9100';
        ctx.fillText(comText, comPt.x + 18, comPt.y + 4);
      }
    }

    // 2. Chromatically Differentiated Skeleton Bones (Left vs Right Opposites)
    if (showSkeleton) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      SEGMENT_BONES.forEach(({ p1: p1Name, p2: p2Name, color, width }) => {
        const p1 = kps[p1Name];
        const p2 = kps[p2Name];
        if (p1 && p2 && p1.confidence > 0.35 && p2.confidence > 0.35) {
          ctx.beginPath();
          ctx.lineWidth = width;
          ctx.strokeStyle = color;
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });

      // Joint Nodes with individual chromatic colors
      Object.entries(kps).forEach(([name, kp]) => {
        if (kp.confidence > 0.35) {
          const col = JOINT_COLORS[name] || '#00E5FF';
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#0B0E14';
          ctx.stroke();
        }
      });
    }

    // 3. Dynamic Goniometer Arcs & Labels on Joints (Respecting visibleAngles)
    if (showAngles && currentFrameData.angles) {
      const angles = currentFrameData.angles;

      const drawAngleArc = (vertexKp, p1Kp, p2Kp, angleVal, label, color = '#00FF88') => {
        if (!vertexKp || !p1Kp || !p2Kp) return;
        const vx = vertexKp.x;
        const vy = vertexKp.y;

        // Angle Pill
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        const text = `${label}: ${angleVal.toFixed(1)}°`;
        const textWidth = ctx.measureText(text).width;

        ctx.fillStyle = 'rgba(18, 23, 34, 0.85)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(vx + 14, vy - 14, textWidth + 14, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, vx + 21, vy + 2);
      };

      if (visibleAngles.knee_r && angles.knee_flexion_r !== undefined && kps.right_knee && kps.right_hip && kps.right_ankle) {
        drawAngleArc(kps.right_knee, kps.right_hip, kps.right_ankle, angles.knee_flexion_r, 'Rodilla R', '#00E5FF');
      }
      if (visibleAngles.knee_l && angles.knee_flexion_l !== undefined && kps.left_knee && kps.left_hip && kps.left_ankle) {
        drawAngleArc(kps.left_knee, kps.left_hip, kps.left_ankle, angles.knee_flexion_l, 'Rodilla L', '#FF5722');
      }
      if (visibleAngles.hip_r && angles.hip_flexion_r !== undefined && kps.right_hip && kps.right_shoulder && kps.right_knee) {
        drawAngleArc(kps.right_hip, kps.right_shoulder, kps.right_knee, angles.hip_flexion_r, 'Cadera R', '#00B0FF');
      }
      if (visibleAngles.hip_l && angles.hip_flexion_l !== undefined && kps.left_hip && kps.left_shoulder && kps.left_knee) {
        drawAngleArc(kps.left_hip, kps.left_shoulder, kps.left_knee, angles.hip_flexion_l, 'Cadera L', '#FF9100');
      }
      if (visibleAngles.elbow_r && angles.elbow_angle_r !== undefined && kps.right_elbow && kps.right_shoulder && kps.right_wrist) {
        drawAngleArc(kps.right_elbow, kps.right_shoulder, kps.right_wrist, angles.elbow_angle_r, 'Codo R', '#2979FF');
      }
      if (visibleAngles.trunk && angles.trunk_inclination !== undefined && kps.right_hip && kps.neck) {
        drawAngleArc(kps.right_hip, { x: kps.right_hip.x, y: kps.right_hip.y - 100 }, kps.neck, angles.trunk_inclination, 'Tronco', '#00FF88');
      }
    }

    // 4. Manual Tool Overlays (Angle & Ruler)
    if (toolPoints.length > 0) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFD600';
      ctx.fillStyle = '#FFD600';

      toolPoints.forEach((pt, i) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = '12px "JetBrains Mono"';
        ctx.fillText(`P${i + 1}`, pt.x + 8, pt.y - 8);
      });

      if (toolPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(toolPoints[0].x, toolPoints[0].y);
        for (let i = 1; i < toolPoints.length; i++) {
          ctx.lineTo(toolPoints[i].x, toolPoints[i].y);
        }
        ctx.stroke();
      }

      if (manualMeasureResult) {
        const lastPt = toolPoints[toolPoints.length - 1];
        ctx.fillStyle = 'rgba(255, 214, 0, 0.9)';
        ctx.beginPath();
        ctx.roundRect(lastPt.x + 10, lastPt.y + 10, 140, 26, 6);
        ctx.fill();
        ctx.fillStyle = '#0B0E14';
        ctx.font = 'bold 13px "JetBrains Mono"';
        ctx.fillText(manualMeasureResult.val, lastPt.x + 18, lastPt.y + 28);
      }
    }
  }, [framesData, currentFrameIndex, showSkeleton, showAngles, showCOM, showTrajectory, toolPoints, manualMeasureResult, calibration, videoRef, visibleAngles]);

  // RequestVideoFrameCallback + rAF loop for 60fps presentation
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rVFC_id = null;
    let rAF_id = null;
    let isRunning = true;

    const frameStep = (now, metadata) => {
      if (!isRunning) return;
      const mediaTime = metadata ? metadata.mediaTime : video.currentTime;
      renderCanvasWithTime(mediaTime);

      if ('requestVideoFrameCallback' in video) {
        rVFC_id = video.requestVideoFrameCallback(frameStep);
      } else {
        rAF_id = requestAnimationFrame((n) => frameStep(n, null));
      }
    };

    if ('requestVideoFrameCallback' in video) {
      rVFC_id = video.requestVideoFrameCallback(frameStep);
    } else {
      rAF_id = requestAnimationFrame((n) => frameStep(n, null));
    }

    return () => {
      isRunning = false;
      if (rVFC_id && 'cancelVideoFrameCallback' in video) {
        video.cancelVideoFrameCallback(rVFC_id);
      }
      if (rAF_id) {
        cancelAnimationFrame(rAF_id);
      }
    };
  }, [renderCanvasWithTime]);

  // Redraw immediately when paused, scrubbing, or when tools change
  useEffect(() => {
    const video = videoRef.current;
    renderCanvasWithTime(video ? video.currentTime : null);
  }, [currentFrameIndex, renderCanvasWithTime]);

  // Format stopwatch time
  const fps = sessionData?.metadata?.fps || 30.0;
  const currentFrameData = framesData && framesData[currentFrameIndex];
  const timerCurrentSeconds = Math.max(0, (currentFrameIndex - timerStartFrame) / fps);
  const timerMins = Math.floor(timerCurrentSeconds / 60);
  const timerSecs = Math.floor(timerCurrentSeconds % 60);
  const timerMs = Math.floor((timerCurrentSeconds % 1) * 1000);
  const timerFormatted = `${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}.${String(timerMs).padStart(3, '0')}`;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none cursor-crosshair"
    >
      {/* Video & Canvas Stage Container with Zoom & Pan */}
      <div
        className="relative transition-transform duration-75"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: 'center center',
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          className="max-h-[68vh] max-w-full rounded-lg shadow-2xl block"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-auto"
        />
      </div>

      {/* Floating Toolbar: Zoom, Visibility, Timer and Manual Tools */}
      <div className="absolute top-4 left-4 flex items-center space-x-1.5 p-1.5 rounded-xl glass-panel shadow-xl z-20">
        {/* Dedicated Zoom Controls */}
        <button
          onClick={() => setZoom((z) => Math.min(5, parseFloat((z + 0.25).toFixed(2))))}
          className="p-1.5 rounded-lg text-biomech-text hover:text-white hover:bg-biomech-card transition-all"
          title="Zoom Acercar (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))}
          className="p-1.5 rounded-lg text-biomech-text hover:text-white hover:bg-biomech-card transition-all"
          title="Zoom Alejar (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="px-2 py-1 rounded-lg text-xs font-mono text-biomech-text hover:text-white hover:bg-biomech-card transition-all"
          title="Restablecer Vista (100% / Ajustar)"
        >
          1:1
        </button>

        <div className="w-[1px] h-5 bg-biomech-border mx-1" />

        {/* Skeleton Toggle */}
        <button
          onClick={() => setShowSkeleton(!showSkeleton)}
          className={`p-1.5 rounded-lg transition-all ${
            showSkeleton ? 'text-biomech-primary bg-biomech-primary/10' : 'text-biomech-muted hover:text-white'
          }`}
          title="Mostrar/Ocultar Esqueleto Bilateral L/R"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Angles Toggle */}
        <button
          onClick={() => setShowAngles(!showAngles)}
          className={`p-1.5 rounded-lg transition-all ${
            showAngles ? 'text-biomech-secondary bg-biomech-secondary/10' : 'text-biomech-muted hover:text-white'
          }`}
          title="Mostrar/Ocultar Arcos de Ángulos"
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Telemetry HUD Toggle */}
        <button
          onClick={() => setShowTelemetryHUD(!showTelemetryHUD)}
          className={`p-1.5 rounded-lg transition-all ${
            showTelemetryHUD ? 'text-biomech-accent bg-biomech-accent/10' : 'text-biomech-muted hover:text-white'
          }`}
          title="Mostrar/Ocultar Telemetría de Movimiento"
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Stopwatch / Timer Toggle */}
        <button
          onClick={() => setShowTimer(!showTimer)}
          className={`p-1.5 rounded-lg transition-all ${
            showTimer ? 'text-yellow-400 bg-yellow-400/10' : 'text-biomech-muted hover:text-white'
          }`}
          title="Cronómetro / Temporizador en Pantalla"
        >
          <Timer className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-biomech-border mx-1" />

        {/* Manual Goniometer Tool */}
        <button
          onClick={() => {
            setActiveTool(activeTool === 'angle' ? 'none' : 'angle');
            setToolPoints([]);
            setManualMeasureResult(null);
          }}
          className={`px-2 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
            activeTool === 'angle'
              ? 'bg-biomech-accent text-biomech-bg font-bold'
              : 'text-biomech-text hover:bg-biomech-card'
          }`}
          title="Goniómetro Manual (Haz clic en 3 puntos)"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Ángulo</span>
        </button>

        {/* Manual Ruler Tool */}
        <button
          onClick={() => {
            setActiveTool(activeTool === 'ruler' ? 'none' : 'ruler');
            setToolPoints([]);
            setManualMeasureResult(null);
          }}
          className={`px-2 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
            activeTool === 'ruler'
              ? 'bg-biomech-accent text-biomech-bg font-bold'
              : 'text-biomech-text hover:bg-biomech-card'
          }`}
          title="Regla de Distancia (Haz clic en 2 puntos)"
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Regla</span>
        </button>
      </div>

      {/* Floating Interactive Stopwatch Widget */}
      {showTimer && (
        <div className="absolute top-16 left-4 p-3 rounded-2xl glass-panel border border-yellow-400/40 shadow-2xl z-20 flex flex-col space-y-2 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between space-x-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-yellow-400 font-bold flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              <span>Cronómetro</span>
            </span>
            <button
              onClick={() => setShowTimer(false)}
              className="text-biomech-muted hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="font-mono text-xl font-bold text-white tracking-widest text-center px-3 py-1 rounded-lg bg-black/60 border border-biomech-border">
            {timerFormatted}
          </div>

          <div className="flex items-center space-x-1.5 pt-1">
            <button
              onClick={() => setTimerStartFrame(currentFrameIndex)}
              className="flex-1 py-1 rounded bg-biomech-card hover:bg-biomech-border text-[10px] font-mono text-biomech-secondary"
              title="Fijar punto cero en el fotograma actual"
            >
              T=0 Aquí
            </button>
            <button
              onClick={() => setTimerStartFrame(0)}
              className="p-1 rounded bg-biomech-card hover:bg-biomech-border text-[10px] text-biomech-muted hover:text-white"
              title="Reiniciar a fotograma 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Movement Telemetry HUD (Gait, Jump, Squat) */}
      {showTelemetryHUD && sessionData && (
        <div className="absolute bottom-4 left-4 p-3 rounded-xl glass-panel border border-biomech-border shadow-2xl z-20 max-w-sm pointer-events-auto">
          {interpretation === 'gait' && sessionData.gait_analysis && (
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px] font-bold text-biomech-primary border-b border-biomech-border/50 pb-1">
                <span>ANÁLISIS DE MARCHA</span>
                <span>SAGITAL</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Cadencia: <strong className="text-white">{sessionData.gait_analysis.cadence_spm}</strong> spm</div>
                <div>Zancada: <strong className="text-white">{sessionData.gait_analysis.avg_stride_time_s}s</strong></div>
                <div>Apoyo: <strong className="text-biomech-secondary">{sessionData.gait_analysis.stance_phase_percent}%</strong></div>
                <div>Oscilación: <strong className="text-biomech-accent">{sessionData.gait_analysis.swing_phase_percent}%</strong></div>
              </div>
              {/* Sagittal live angles summary */}
              {currentFrameData?.angles && (
                <div className="pt-1.5 border-t border-biomech-border/40 flex items-center justify-between text-[10px]">
                  <span className="text-[#00E5FF]">Rodilla: {currentFrameData.angles.knee_flexion_r?.toFixed(1) || '-'}°</span>
                  <span className="text-[#00B0FF]">Cadera: {currentFrameData.angles.hip_flexion_r?.toFixed(1) || '-'}°</span>
                  <span className="text-[#00FF88]">Tronco: {currentFrameData.angles.trunk_inclination?.toFixed(1) || '-'}°</span>
                </div>
              )}
            </div>
          )}

          {interpretation === 'jump' && sessionData.jump_analysis && (
            <div className="space-y-1.5 text-xs font-mono">
              <div className="text-[11px] font-bold text-biomech-accent border-b border-biomech-border/50 pb-1">
                SALTO VERTICAL (CMJ)
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Altura: <strong className="text-white">{sessionData.jump_analysis.flight_height_cm} cm</strong></div>
                <div>Vuelo: <strong className="text-white">{sessionData.jump_analysis.flight_time_s}s</strong></div>
                <div>Vel. Despegue: <strong className="text-biomech-primary">{sessionData.jump_analysis.takeoff_velocity_m_s} m/s</strong></div>
                <div>Flexión Máx: <strong className="text-biomech-secondary">{sessionData.jump_analysis.max_knee_flexion_deg}°</strong></div>
              </div>
            </div>
          )}

          {interpretation === 'squat' && sessionData.squat_analysis && (
            <div className="space-y-1.5 text-xs font-mono">
              <div className="text-[11px] font-bold text-biomech-secondary border-b border-biomech-border/50 pb-1">
                ANÁLISIS DE SENTADILLA
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Profundidad: <strong className="text-biomech-primary">{sessionData.squat_analysis.squat_depth_category}</strong></div>
                <div>Ángulo Mín: <strong className="text-white">{sessionData.squat_analysis.min_knee_angle_deg}°</strong></div>
                <div>Tronco: <strong className="text-white">{sessionData.squat_analysis.max_trunk_lean_deg}°</strong></div>
                <div>Excéntrico: <strong className="text-white">{sessionData.squat_analysis.eccentric_duration_s}s</strong></div>
              </div>
            </div>
          )}

          {interpretation === 'general' && (
            <div className="space-y-1 text-xs font-mono">
              <div className="text-[10px] text-biomech-muted uppercase">Telemetría en Vivo</div>
              <div className="flex items-center space-x-3 text-[11px]">
                <div>COM y: <strong className="text-biomech-primary">{currentFrameData?.com?.height_percent || '-'}% Talla</strong></div>
                <div>Vel COM: <strong className="text-biomech-secondary">{currentFrameData?.velocities?.com_vel_m_s || '-'} m/s</strong></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Zoom & Tool indicator banner */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
        {activeTool !== 'none' && (
          <span className="px-2.5 py-1 rounded-lg bg-biomech-accent/20 border border-biomech-accent/40 text-biomech-accent text-xs font-mono animate-pulse">
            {activeTool === 'angle' ? 'Modo Goniómetro: Marca 3 puntos' : 'Modo Regla: Marca 2 puntos'}
          </span>
        )}
        <span className="px-2.5 py-1 rounded-lg glass-panel text-[11px] font-mono text-biomech-muted">
          {(zoom * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
