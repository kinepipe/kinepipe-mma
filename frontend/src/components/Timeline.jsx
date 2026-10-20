import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  Repeat
} from 'lucide-react';

export default function Timeline({
  currentFrame,
  totalFrames,
  fps,
  isPlaying,
  onPlayPause,
  onSeekFrame,
  keyframes,
  onAddKeyframeClick,
  playbackSpeed,
  onChangeSpeed,
  isLooping,
  onToggleLoop,
  isLoopingRoi = true,
  onToggleLoopRoi = () => {},
  roiStartTime = 0,
  roiEndTime = null,
  onChangeRoi = () => {}
}) {
  const currentSeconds = totalFrames > 0 && fps > 0 ? currentFrame / fps : 0;
  const totalSeconds = totalFrames > 0 && fps > 0 ? totalFrames / fps : 0;

  const roiStart = roiStartTime !== null && roiStartTime !== undefined ? roiStartTime : 0;
  const roiEnd = roiEndTime !== null && roiEndTime !== undefined && roiEndTime > 0 ? Math.min(totalSeconds, roiEndTime) : totalSeconds;

  const roiStartPercent = totalSeconds > 0 ? (roiStart / totalSeconds) * 100 : 0;
  const roiWidthPercent = totalSeconds > 0 ? Math.max(0, ((roiEnd - roiStart) / totalSeconds) * 100) : 100;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 1000);
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };

  const handleSliderChange = (e) => {
    const frame = parseInt(e.target.value, 10);
    onSeekFrame(frame);
  };

  return (
    <div className="h-24 px-6 glass-panel border-t border-biomech-border flex flex-col justify-between py-2.5 z-20">
      {/* 1. Scrubber Track & Keyframe Pins */}
      <div className="relative w-full flex items-center">
        {/* Visual ROI Range Highlight */}
        <div
          style={{ left: `${roiStartPercent}%`, width: `${roiWidthPercent}%` }}
          className="absolute h-3 bg-gradient-to-r from-[#00FF88]/25 via-[#00E5FF]/25 to-[#00FF88]/25 border-x-2 border-[#00FF88] rounded pointer-events-none z-10 shadow-sm"
          title={`Rango de análisis activo: ${roiStart.toFixed(1)}s - ${roiEnd.toFixed(1)}s`}
        />

        {/* Keyframe Badges / Pins on Timeline */}
        {keyframes && keyframes.map((kf) => {
          const leftPercent = totalFrames > 1 ? (kf.frame_index / (totalFrames - 1)) * 100 : 0;
          let pinColor = 'bg-yellow-400';
          if (kf.event_type === 'takeoff') pinColor = 'bg-orange-500';
          if (kf.event_type === 'apex') pinColor = 'bg-sky-400';
          if (kf.event_type === 'landing') pinColor = 'bg-emerald-400';

          return (
            <div
              key={kf.id}
              onClick={() => onSeekFrame(kf.frame_index)}
              style={{ left: `${leftPercent}%` }}
              className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center cursor-pointer group z-30"
              title={`#${kf.frame_index} - ${kf.title}: ${kf.notes}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${pinColor} ring-2 ring-black group-hover:scale-125 transition-transform`} />
              <div className="hidden group-hover:block absolute bottom-4 bg-biomech-card border border-biomech-border text-[10px] px-2 py-0.5 rounded text-white whitespace-nowrap shadow-xl">
                {kf.title} (#{kf.frame_index})
              </div>
            </div>
          );
        })}

        {/* Range Slider */}
        <input
          type="range"
          min="0"
          max={Math.max(0, totalFrames - 1)}
          value={currentFrame}
          onChange={handleSliderChange}
          className="w-full h-2 bg-biomech-card rounded-lg appearance-none cursor-pointer accent-biomech-primary relative z-20"
        />
      </div>

      {/* 2. Controls & Counters */}
      <div className="flex items-center justify-between mt-1">
        {/* Frame, Time Telemetry & ROI Selector */}
        <div className="flex items-center space-x-2.5 text-xs font-mono">
          <div className="px-2 py-0.5 rounded bg-biomech-card border border-biomech-border text-biomech-secondary text-[11px]">
            Frame: <strong className="text-white">{String(currentFrame).padStart(4, '0')}</strong> / {String(totalFrames).padStart(4, '0')}
          </div>
          <div className="text-biomech-text text-[11px]">
            {formatTime(currentSeconds)} <span className="text-biomech-muted">/ {formatTime(totalSeconds)}</span>
          </div>

          {/* ROI Time Range Selector */}
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-biomech-surface border border-biomech-border text-[11px] font-sans">
            <span className="text-biomech-muted font-mono text-[10px] uppercase font-semibold">Rango:</span>
            <input
              type="number"
              min="0"
              max={roiEnd}
              step="0.5"
              value={roiStart}
              onChange={(e) => onChangeRoi(parseFloat(e.target.value) || 0, roiEnd)}
              className="w-11 bg-biomech-card border border-biomech-border rounded px-1 text-center text-white text-[10px] font-mono outline-none"
              title="Segundo inicial para análisis"
            />
            <span className="text-biomech-muted text-[10px]">-</span>
            <input
              type="number"
              min={roiStart}
              max={Math.ceil(totalSeconds) || 60}
              step="0.5"
              value={roiEnd}
              onChange={(e) => onChangeRoi(roiStart, parseFloat(e.target.value) || totalSeconds)}
              className="w-11 bg-biomech-card border border-biomech-border rounded px-1 text-center text-white text-[10px] font-mono outline-none"
              title="Segundo final para análisis"
            />
            <span className="text-biomech-muted font-mono text-[10px]">s</span>

            {/* Quick Range Presets */}
            <div className="flex items-center space-x-1 ml-1 border-l border-biomech-border pl-1.5">
              <button
                onClick={() => onChangeRoi(0, Math.min(totalSeconds, 5))}
                className="px-1.5 py-0.5 rounded bg-biomech-card hover:bg-biomech-border text-[10px] text-biomech-secondary font-semibold"
                title="Analizar primeros 5 segundos"
              >
                5s
              </button>
              <button
                onClick={() => onChangeRoi(0, Math.min(totalSeconds, 10))}
                className="px-1.5 py-0.5 rounded bg-biomech-card hover:bg-biomech-border text-[10px] text-biomech-primary font-bold"
                title="Analizar primeros 10 segundos"
              >
                10s
              </button>
              <button
                onClick={() => onChangeRoi(0, totalSeconds)}
                className="px-1.5 py-0.5 rounded bg-biomech-card hover:bg-biomech-border text-[10px] text-biomech-text"
                title="Analizar todo el video"
              >
                Todo
              </button>
              <button
                onClick={() => onChangeRoi(parseFloat(currentSeconds.toFixed(1)), roiEnd)}
                className="px-1 py-0.5 rounded bg-biomech-card hover:text-[#00FF88] text-[9px] font-mono"
                title="Fijar Inicio [In] en fotograma actual"
              >
                [In
              </button>
              <button
                onClick={() => onChangeRoi(roiStart, parseFloat(currentSeconds.toFixed(1)))}
                className="px-1 py-0.5 rounded bg-biomech-card hover:text-[#00FF88] text-[9px] font-mono"
                title="Fijar Fin [Out] en fotograma actual"
              >
                Out]
              </button>
            </div>
          </div>
        </div>

        {/* Stepper & Playback Buttons */}
        <div className="flex items-center space-x-1.5">
          {/* -5 Frames */}
          <button
            onClick={() => onSeekFrame(Math.max(0, currentFrame - 5))}
            className="p-1.5 rounded-lg text-biomech-muted hover:text-white hover:bg-biomech-card transition-all"
            title="-5 Fotogramas"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* -1 Frame */}
          <button
            onClick={() => onSeekFrame(Math.max(0, currentFrame - 1))}
            className="p-1.5 rounded-lg text-biomech-muted hover:text-white hover:bg-biomech-card transition-all"
            title="-1 Fotograma"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={onPlayPause}
            className="p-2.5 rounded-xl bg-biomech-primary text-biomech-bg hover:opacity-90 transition-all shadow-md shadow-biomech-primary/20"
            title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* +1 Frame */}
          <button
            onClick={() => onSeekFrame(Math.min(totalFrames - 1, currentFrame + 1))}
            className="p-1.5 rounded-lg text-biomech-muted hover:text-white hover:bg-biomech-card transition-all"
            title="+1 Fotograma"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* +5 Frames */}
          <button
            onClick={() => onSeekFrame(Math.min(totalFrames - 1, currentFrame + 5))}
            className="p-1.5 rounded-lg text-biomech-muted hover:text-white hover:bg-biomech-card transition-all"
            title="+5 Fotogramas"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Working Zone Loop [In / Out] Kinovea-style toggle */}
          <button
            onClick={onToggleLoopRoi}
            className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              isLoopingRoi
                ? 'text-[#00FF88] bg-[#00FF88]/15 border border-[#00FF88]/40 font-bold shadow'
                : 'text-biomech-muted hover:text-white bg-biomech-card border border-biomech-border'
            }`}
            title="Bucle Kinovea [In / Out]: Restringe la reproducción estrictamente dentro de la zona de trabajo"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop [In/Out]</span>
          </button>

          {/* Speed Selector */}
          <select
            value={playbackSpeed}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            className="bg-biomech-card border border-biomech-border text-xs text-biomech-secondary rounded-lg px-2 py-1 font-mono outline-none cursor-pointer hover:border-biomech-muted"
          >
            <option value="0.1">0.1x</option>
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="1.5">1.5x</option>
          </select>
        </div>

        {/* Add Keyframe Action */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onAddKeyframeClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-biomech-card hover:bg-biomech-border border border-biomech-border text-xs font-semibold text-white transition-all shadow-sm"
          >
            <BookmarkPlus className="w-4 h-4 text-biomech-accent" />
            <span>+ Fotograma Clave</span>
          </button>
        </div>
      </div>
    </div>
  );
}
