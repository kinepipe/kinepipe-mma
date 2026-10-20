import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Sliders,
  Activity,
  TrendingUp,
  RefreshCw,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Check,
  LayoutGrid,
  Plus,
  Trash2,
  Layers,
  Columns
} from 'lucide-react';

const AVAILABLE_ANGLES = [
  { id: 'knee_r', name: 'Rodilla R', color: '#00E5FF', defaultOn: true },
  { id: 'knee_l', name: 'Rodilla L', color: '#FF5722', defaultOn: true },
  { id: 'hip_r', name: 'Cadera R', color: '#00B0FF', defaultOn: true },
  { id: 'hip_l', name: 'Cadera L', color: '#FF9100', defaultOn: false },
  { id: 'ankle_r', name: 'Tobillo R', color: '#18FFFF', defaultOn: true },
  { id: 'ankle_l', name: 'Tobillo L', color: '#FF3D00', defaultOn: false },
  { id: 'elbow_r', name: 'Codo R', color: '#2979FF', defaultOn: false },
  { id: 'trunk', name: 'Tronco', color: '#00FF88', defaultOn: true },
];

const AVAILABLE_VELOCITIES = [
  { id: 'com_vel', name: 'COM (Todo el Cuerpo)', color: '#00FF88', key: 'com_vel_m_s' },
  { id: 'knee_r_vel', name: 'Rodilla R', color: '#00E5FF', key: 'knee_r_vel_m_s' },
  { id: 'knee_l_vel', name: 'Rodilla L', color: '#FF5722', key: 'knee_l_vel_m_s' },
  { id: 'ankle_r_vel', name: 'Tobillo/Pie R', color: '#18FFFF', key: 'ankle_r_vel_m_s' },
  { id: 'ankle_l_vel', name: 'Tobillo/Pie L', color: '#FF3D00', key: 'ankle_l_vel_m_s' },
  { id: 'wrist_r_vel', name: 'Mano/Muñeca R', color: '#7C4DFF', key: 'wrist_r_vel_m_s' },
];

// Definitions for the independent clinical report subplots
export const CLINICAL_SUBPLOT_CATALOG = [
  {
    id: 'knee_sagittal',
    title: 'Rodilla Sagital (Flexión / Extensión)',
    series: [
      { key: 'knee_r', name: 'Rodilla R', color: '#00E5FF' },
      { key: 'knee_l', name: 'Rodilla L', color: '#FF5722' },
    ],
    unit: '°',
    domain: [0, 80],
    category: 'Ángulos',
  },
  {
    id: 'hip_sagittal',
    title: 'Cadera Sagital (Flexión / Extensión)',
    series: [
      { key: 'hip_r', name: 'Cadera R', color: '#00B0FF' },
      { key: 'hip_l', name: 'Cadera L', color: '#FF9100' },
    ],
    unit: '°',
    domain: [-30, 60],
    category: 'Ángulos',
  },
  {
    id: 'ankle_sagittal',
    title: 'Tobillo Sagital (Dorsi / Plantiflexión)',
    series: [
      { key: 'ankle_r', name: 'Tobillo R', color: '#18FFFF' },
      { key: 'ankle_l', name: 'Tobillo L', color: '#FF3D00' },
    ],
    unit: '°',
    domain: [-30, 40],
    category: 'Ángulos',
  },
  {
    id: 'trunk_sagittal',
    title: 'Inclinación de Tronco',
    series: [
      { key: 'trunk', name: 'Tronco', color: '#00FF88' },
    ],
    unit: '°',
    domain: [-15, 30],
    category: 'Ángulos',
  },
  {
    id: 'com_stature',
    title: 'Altura COM (% de Estatura Normalizada)',
    series: [
      { key: 'com_height_pct', name: 'COM % Talla', color: '#00FF88' },
    ],
    unit: '%',
    domain: [40, 70],
    category: 'COM',
  },
  {
    id: 'body_velocity',
    title: 'Velocidad Lineal COM (Todo el Cuerpo)',
    series: [
      { key: 'com_vel', name: 'Velocidad COM', color: '#00FF88' },
    ],
    unit: 'm/s',
    domain: [0, 3.5],
    category: 'Velocidades',
  },
  {
    id: 'segment_velocities',
    title: 'Velocidades Segmentarias (Rodilla y Tobillo)',
    series: [
      { key: 'knee_r_vel', name: 'Rodilla R', color: '#00E5FF' },
      { key: 'ankle_r_vel', name: 'Tobillo R', color: '#18FFFF' },
      { key: 'knee_l_vel', name: 'Rodilla L', color: '#FF5722' },
    ],
    unit: 'm/s',
    domain: [0, 4.0],
    category: 'Velocidades',
  },
];

export default function KinematicsDashboard({
  framesData,
  currentFrame,
  onSeekFrame,
  cutoffHz,
  onRecalculateFilter,
  isRecalculating,
  visibleAnglesConfig,
  onChangeVisibleAngles
}) {
  const [activeTab, setActiveTab] = useState('angles'); // 'angles' | 'com' | 'velocities' | 'multi_panel'
  const [localCutoff, setLocalCutoff] = useState(cutoffHz || 6.0);
  const [isolatedAngle, setIsolatedAngle] = useState(null); // id of angle or null

  // Pinned subplots for the independent clinical panel
  const [pinnedPanels, setPinnedPanels] = useState([
    'knee_sagittal',
    'hip_sagittal',
    'ankle_sagittal',
    'trunk_sagittal',
  ]);

  // Local angle toggles
  const [visibleAngles, setVisibleAngles] = useState(
    visibleAnglesConfig || {
      knee_r: true,
      knee_l: true,
      hip_r: true,
      hip_l: false,
      ankle_r: true,
      ankle_l: false,
      elbow_r: false,
      trunk: true,
    }
  );

  // Selected velocities to display
  const [selectedVels, setSelectedVels] = useState({
    com_vel: true,
    knee_r_vel: true,
    ankle_r_vel: true,
    knee_l_vel: false,
    ankle_l_vel: false,
    wrist_r_vel: false,
  });

  const toggleAngle = (id) => {
    const updated = { ...visibleAngles, [id]: !visibleAngles[id] };
    setVisibleAngles(updated);
    if (onChangeVisibleAngles) {
      onChangeVisibleAngles(updated);
    }
  };

  const toggleVel = (id) => {
    setSelectedVels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePinnedPanel = (panelId) => {
    setPinnedPanels((prev) =>
      prev.includes(panelId) ? prev.filter((id) => id !== panelId) : [...prev, panelId]
    );
  };

  if (!framesData || framesData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-biomech-muted">
        <Activity className="w-10 h-10 mb-2 opacity-30 animate-pulse text-biomech-primary" />
        <p className="text-xs">Carga un video y ejecuta el modelo de IA para ver las curvas cinemáticas en tiempo real.</p>
      </div>
    );
  }

  // Prepare chart dataset
  const chartData = framesData.map((f) => {
    const rawAnkleR = f.angles?.ankle_angle_r;
    const rawAnkleL = f.angles?.ankle_angle_l;
    const rawKneeR = f.angles?.knee_flexion_r;
    const rawKneeL = f.angles?.knee_flexion_l;
    const rawHipR = f.angles?.hip_flexion_r;
    const rawHipL = f.angles?.hip_flexion_l;

    return {
      frame: f.frame_index,
      time: f.time_s,
      // Sagittal Angles in degrees (Clinical convention: flexion > 0, ankle dorsi > 0)
      knee_r: rawKneeR !== undefined ? Math.round((180.0 - rawKneeR) * 10) / 10 : null,
      knee_l: rawKneeL !== undefined ? Math.round((180.0 - rawKneeL) * 10) / 10 : null,
      hip_r: rawHipR !== undefined ? Math.round((180.0 - rawHipR) * 10) / 10 : null,
      hip_l: rawHipL !== undefined ? Math.round((180.0 - rawHipL) * 10) / 10 : null,
      ankle_r: rawAnkleR !== undefined ? Math.round((rawAnkleR - 90.0) * 10) / 10 : null,
      ankle_l: rawAnkleL !== undefined ? Math.round((rawAnkleL - 90.0) * 10) / 10 : null,
      elbow_r: f.angles?.elbow_angle_r !== undefined ? f.angles.elbow_angle_r : null,
      trunk: f.angles?.trunk_inclination !== undefined ? f.angles.trunk_inclination : null,
      // COM Trajectory & Stature Percentage
      com_y_m: f.com?.y_m !== undefined ? f.com.y_m : null,
      com_height_pct: f.com?.height_percent !== undefined ? f.com.height_percent : null,
      // Segmental & Whole-body Velocities
      com_vel: f.velocities?.com_vel_m_s !== undefined ? f.velocities.com_vel_m_s : null,
      knee_r_vel: f.velocities?.knee_r_vel_m_s !== undefined ? f.velocities.knee_r_vel_m_s : null,
      knee_l_vel: f.velocities?.knee_l_vel_m_s !== undefined ? f.velocities.knee_l_vel_m_s : null,
      ankle_r_vel: f.velocities?.ankle_r_vel_m_s !== undefined ? f.velocities.ankle_r_vel_m_s : null,
      ankle_l_vel: f.velocities?.ankle_l_vel_m_s !== undefined ? f.velocities.ankle_l_vel_m_s : null,
      wrist_r_vel: f.velocities?.wrist_r_vel_m_s !== undefined ? f.velocities.wrist_r_vel_m_s : null,
    };
  });

  const currentPoint = chartData[Math.min(chartData.length - 1, Math.max(0, currentFrame))] || {};

  const handleChartClick = (e) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const clickedFrame = e.activePayload[0].payload.frame;
      onSeekFrame(clickedFrame);
    }
  };

  // Stats for isolated angle
  const isolatedObj = AVAILABLE_ANGLES.find((a) => a.id === isolatedAngle);
  let isolatedStats = null;
  if (isolatedObj) {
    const vals = chartData.map((d) => d[isolatedObj.id]).filter((v) => v !== null && !isNaN(v));
    if (vals.length > 0) {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const rom = max - min;
      const current = currentPoint[isolatedObj.id];
      isolatedStats = { min, max, rom, current };
    }
  }

  // Helper to compute stats for any series in subplots
  const getSubplotStats = (seriesKey) => {
    const vals = chartData.map((d) => d[seriesKey]).filter((v) => v !== null && !isNaN(v));
    if (!vals || vals.length === 0) return { min: 0, max: 0, rom: 0, current: 0 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return {
      min,
      max,
      rom: max - min,
      current: currentPoint[seriesKey] || 0,
    };
  };

  return (
    <div className="h-full flex flex-col glass-card rounded-xl border border-biomech-border overflow-hidden">
      {/* Top Header & Tab Switcher */}
      <div className="p-2.5 border-b border-biomech-border flex items-center justify-between bg-biomech-surface/80 flex-wrap gap-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => { setActiveTab('angles'); setIsolatedAngle(null); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'angles'
                ? 'bg-biomech-primary text-biomech-bg font-bold shadow'
                : 'text-biomech-muted hover:text-white'
            }`}
            title="Curvas angulares articulares superpuestas"
          >
            Ángulos (θ)
          </button>
          <button
            onClick={() => { setActiveTab('com'); setIsolatedAngle(null); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'com'
                ? 'bg-biomech-secondary text-biomech-bg font-bold shadow'
                : 'text-biomech-muted hover:text-white'
            }`}
            title="Trayectoria del Centro de Masas"
          >
            COM (% Talla)
          </button>
          <button
            onClick={() => { setActiveTab('velocities'); setIsolatedAngle(null); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'velocities'
                ? 'bg-biomech-accent text-biomech-bg font-bold shadow'
                : 'text-biomech-muted hover:text-white'
            }`}
            title="Velocidades lineales de COM y segmentos"
          >
            Velocidades (v)
          </button>
          <button
            onClick={() => { setActiveTab('multi_panel'); setIsolatedAngle(null); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'multi_panel'
                ? 'bg-gradient-to-r from-[#00FF88] to-[#00E5FF] text-biomech-bg font-bold shadow-lg shadow-[#00FF88]/20'
                : 'text-biomech-primary hover:text-white bg-biomech-card border border-biomech-border'
            }`}
            title="Panel de gráficos independientes como en informes cinemáticos clínicos"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Panel Gráficos Clínico</span>
          </button>
        </div>

        {/* Butterworth Cutoff live slider */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-biomech-muted font-mono">Filtro:</span>
          <input
            type="range"
            min="2"
            max="15"
            step="0.5"
            value={localCutoff}
            onChange={(e) => setLocalCutoff(parseFloat(e.target.value))}
            className="w-16 h-1.5 bg-biomech-card rounded-lg appearance-none cursor-pointer accent-biomech-primary"
            title={`Frecuencia de corte: ${localCutoff} Hz`}
          />
          <span className="font-mono text-xs text-biomech-primary font-bold">{localCutoff}Hz</span>
          <button
            onClick={() => onRecalculateFilter(localCutoff)}
            disabled={isRecalculating}
            className="p-1 rounded bg-biomech-card hover:bg-biomech-border text-biomech-text transition-all"
            title="Recalcular filtro Butterworth"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Subpanel for Angles Tab: Visibility chips & Add to Panel */}
      {activeTab === 'angles' && !isolatedAngle && (
        <div className="px-3 py-1.5 border-b border-biomech-border/60 bg-biomech-surface/40 flex items-center justify-between overflow-x-auto text-xs">
          <div className="flex items-center space-x-1.5 flex-nowrap">
            <span className="text-[10px] text-biomech-muted uppercase font-mono mr-1">Visibles:</span>
            {AVAILABLE_ANGLES.map((a) => {
              const isOn = visibleAngles[a.id];
              return (
                <div
                  key={a.id}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg border text-[11px] transition-all ${
                    isOn
                      ? 'bg-biomech-card border-biomech-border text-white shadow-sm'
                      : 'bg-biomech-surface/40 border-transparent text-biomech-muted opacity-60 hover:opacity-100'
                  }`}
                >
                  <button
                    onClick={() => toggleAngle(a.id)}
                    className="flex items-center space-x-1 outline-none"
                    title={`Alternar ${a.name}`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                    <span className="font-medium">{a.name}</span>
                  </button>
                  <button
                    onClick={() => setIsolatedAngle(a.id)}
                    className="ml-1 text-biomech-muted hover:text-biomech-primary p-0.5 rounded"
                    title={`Aislar ${a.name} a pantalla completa`}
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subpanel for Isolated Angle */}
      {activeTab === 'angles' && isolatedAngle && (
        <div className="px-3 py-2 border-b border-biomech-border bg-biomech-card/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: isolatedObj?.color }} />
              <strong className="text-white text-sm">{isolatedObj?.name}</strong>
              <span className="text-[10px] text-biomech-muted font-mono">(Panel Aislado)</span>
            </div>
            {isolatedStats && (
              <div className="flex items-center space-x-3 text-xs font-mono">
                <div>Actual: <strong className="text-biomech-primary">{isolatedStats.current?.toFixed(1) || '-'}°</strong></div>
                <div className="text-biomech-muted">Mín: <strong>{isolatedStats.min?.toFixed(1)}°</strong></div>
                <div className="text-biomech-muted">Máx: <strong>{isolatedStats.max?.toFixed(1)}°</strong></div>
                <div className="text-biomech-secondary">ROM: <strong>{isolatedStats.rom?.toFixed(1)}°</strong></div>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsolatedAngle(null)}
            className="px-2.5 py-1 rounded-lg bg-biomech-surface hover:bg-biomech-border text-xs text-biomech-text flex items-center gap-1 transition-all"
            title="Volver a vista conjunta"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Ver Todos</span>
          </button>
        </div>
      )}

      {/* Subpanel for Velocities */}
      {activeTab === 'velocities' && (
        <div className="px-3 py-1.5 border-b border-biomech-border/60 bg-biomech-surface/40 flex items-center space-x-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] text-biomech-muted uppercase font-mono mr-1">Parámetros:</span>
          {AVAILABLE_VELOCITIES.map((v) => {
            const isOn = selectedVels[v.id];
            return (
              <button
                key={v.id}
                onClick={() => toggleVel(v.id)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg border text-[11px] transition-all ${
                  isOn
                    ? 'bg-biomech-card border-biomech-border text-white shadow-sm font-semibold'
                    : 'bg-biomech-surface/40 border-transparent text-biomech-muted opacity-60 hover:opacity-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
                <span>{v.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Subpanel for Multi-Panel Clinical Mode: Add/Remove buttons & Presets */}
      {activeTab === 'multi_panel' && (
        <div className="px-3 py-2 border-b border-biomech-border/60 bg-biomech-surface/60 flex items-center justify-between text-xs overflow-x-auto gap-2">
          <div className="flex items-center space-x-1.5 flex-nowrap">
            <span className="text-[10px] text-biomech-muted font-mono uppercase">Subpaneles en Informe:</span>
            {CLINICAL_SUBPLOT_CATALOG.map((panel) => {
              const isPinned = pinnedPanels.includes(panel.id);
              return (
                <button
                  key={panel.id}
                  onClick={() => togglePinnedPanel(panel.id)}
                  className={`px-2 py-0.5 rounded-lg border text-[11px] transition-all flex items-center gap-1 ${
                    isPinned
                      ? 'bg-biomech-card border-biomech-primary text-white font-semibold shadow-sm'
                      : 'bg-biomech-surface border-biomech-border text-biomech-muted hover:text-white'
                  }`}
                  title={`${isPinned ? 'Quitar del' : 'Agregar al'} panel independiente`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isPinned ? 'bg-biomech-primary' : 'bg-biomech-muted'}`} />
                  <span>{panel.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPinnedPanels(['knee_sagittal', 'hip_sagittal', 'ankle_sagittal', 'trunk_sagittal'])}
              className="px-2 py-0.5 rounded bg-biomech-card hover:bg-biomech-border text-[10px] text-biomech-secondary font-mono"
              title="Preset Informe de Marcha Sagital estándar"
            >
              Marcha Sagital
            </button>
            <button
              onClick={() => setPinnedPanels(CLINICAL_SUBPLOT_CATALOG.map((p) => p.id))}
              className="px-2 py-0.5 rounded bg-biomech-card hover:bg-biomech-border text-[10px] text-biomech-primary font-mono"
              title="Agregar todos los gráficos al panel"
            >
              Todos ({CLINICAL_SUBPLOT_CATALOG.length})
            </button>
          </div>
        </div>
      )}

      {/* Main View Area: Either Combined Chart or Clinical Multi-Panel Grid */}
      {activeTab !== 'multi_panel' ? (
        <div className="flex-1 w-full p-2 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              onClick={handleChartClick}
              margin={{ top: 8, right: 16, left: -20, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#6B7280"
                fontSize={10}
                tickFormatter={(t) => `${t.toFixed(1)}s`}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={10}
                domain={
                  activeTab === 'com'
                    ? [0, 'auto']
                    : activeTab === 'velocities'
                    ? [0, 'auto']
                    : [-30, 90]
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#121722',
                  borderColor: '#1F2937',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
                formatter={(val, name) => {
                  if (activeTab === 'com') {
                    return name === 'com_height_pct' ? [`${val}% de talla`, 'Altura COM'] : [`${val} m`, 'Altura Suelo'];
                  }
                  if (activeTab === 'velocities') {
                    return [`${val} m/s`, name];
                  }
                  return [`${val}°`, name];
                }}
                labelFormatter={(label) => `Tiempo: ${parseFloat(label).toFixed(3)}s`}
              />
              {/* Scrub Cursor Line */}
              <ReferenceLine
                x={currentPoint.time}
                stroke="#00FF88"
                strokeDasharray="4 4"
                strokeWidth={2}
              />

              {/* Tab 1: Joint Angles */}
              {activeTab === 'angles' && !isolatedAngle && (
                <>
                  {visibleAngles.knee_r && (
                    <Line type="monotone" dataKey="knee_r" name="Flexión Rodilla R" stroke="#00E5FF" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  )}
                  {visibleAngles.knee_l && (
                    <Line type="monotone" dataKey="knee_l" name="Flexión Rodilla L" stroke="#FF5722" strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                  )}
                  {visibleAngles.hip_r && (
                    <Line type="monotone" dataKey="hip_r" name="Flexión Cadera R" stroke="#00B0FF" strokeWidth={2} dot={false} isAnimationActive={false} />
                  )}
                  {visibleAngles.hip_l && (
                    <Line type="monotone" dataKey="hip_l" name="Flexión Cadera L" stroke="#FF9100" strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                  )}
                  {visibleAngles.ankle_r && (
                    <Line type="monotone" dataKey="ankle_r" name="Dorsi/Planti Tobillo R" stroke="#18FFFF" strokeWidth={2} dot={false} isAnimationActive={false} />
                  )}
                  {visibleAngles.ankle_l && (
                    <Line type="monotone" dataKey="ankle_l" name="Dorsi/Planti Tobillo L" stroke="#FF3D00" strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                  )}
                  {visibleAngles.elbow_r && (
                    <Line type="monotone" dataKey="elbow_r" name="Codo R" stroke="#2979FF" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  )}
                  {visibleAngles.trunk && (
                    <Line type="monotone" dataKey="trunk" name="Tronco" stroke="#00FF88" strokeWidth={2} dot={false} isAnimationActive={false} />
                  )}
                </>
              )}

              {/* Tab 1b: Isolated Angle View */}
              {activeTab === 'angles' && isolatedAngle && (
                <Line
                  type="monotone"
                  dataKey={isolatedAngle}
                  name={isolatedObj?.name || 'Ángulo'}
                  stroke={isolatedObj?.color || '#00E5FF'}
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Tab 2: COM Trajectory (Meters & Stature Percentage) */}
              {activeTab === 'com' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="com_height_pct"
                    name="% Estatura (Normal: ~56%)"
                    stroke="#FF9100"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <ReferenceLine y={56.0} stroke="#FFD600" strokeDasharray="3 3" label={{ value: 'Ref: 56% Talla', fill: '#FFD600', fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="com_y_m"
                    name="Altura COM desde Suelo (m)"
                    stroke="#00E5FF"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}

              {/* Tab 3: Segmental & Whole-body Velocities */}
              {activeTab === 'velocities' && (
                <>
                  {selectedVels.com_vel && (
                    <Line type="monotone" dataKey="com_vel" name="COM (Todo el Cuerpo)" stroke="#00FF88" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  )}
                  {selectedVels.knee_r_vel && (
                    <Line type="monotone" dataKey="knee_r_vel" name="Rodilla R (m/s)" stroke="#00E5FF" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  )}
                  {selectedVels.knee_l_vel && (
                    <Line type="monotone" dataKey="knee_l_vel" name="Rodilla L (m/s)" stroke="#FF5722" strokeWidth={1.8} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                  )}
                  {selectedVels.ankle_r_vel && (
                    <Line type="monotone" dataKey="ankle_r_vel" name="Pie/Tobillo R (m/s)" stroke="#18FFFF" strokeWidth={2} dot={false} isAnimationActive={false} />
                  )}
                  {selectedVels.ankle_l_vel && (
                    <Line type="monotone" dataKey="ankle_l_vel" name="Pie/Tobillo L (m/s)" stroke="#FF3D00" strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                  )}
                  {selectedVels.wrist_r_vel && (
                    <Line type="monotone" dataKey="wrist_r_vel" name="Muñeca/Mano R (m/s)" stroke="#7C4DFF" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  )}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* Multi-Panel Clinical Mode: Independent Subplots Grid */
        <div className="flex-1 w-full p-2.5 overflow-y-auto space-y-3">
          {pinnedPanels.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-biomech-muted">
              <LayoutGrid className="w-8 h-8 mb-2 opacity-40 text-biomech-primary" />
              <p className="text-xs">No hay gráficos en el panel independiente. Selecciona subpaneles arriba para agregarlos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pinnedPanels.map((panelId) => {
                const panelDef = CLINICAL_SUBPLOT_CATALOG.find((p) => p.id === panelId);
                if (!panelDef) return null;

                // Primary series stats
                const primarySeries = panelDef.series[0];
                const stats = getSubplotStats(primarySeries.key);

                return (
                  <div
                    key={panelDef.id}
                    className="p-2.5 rounded-xl bg-biomech-surface border border-biomech-border flex flex-col shadow-sm hover:border-biomech-primary/40 transition-all"
                  >
                    {/* Subplot Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-biomech-border/50 mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primarySeries.color }} />
                        <h4 className="text-xs font-bold text-white truncate">{panelDef.title}</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-mono text-biomech-primary font-bold">
                          {stats.current?.toFixed(1) || '-'}{panelDef.unit}
                        </span>
                        <button
                          onClick={() => togglePinnedPanel(panelDef.id)}
                          className="text-biomech-muted hover:text-red-400 p-0.5 rounded"
                          title="Quitar este gráfico del panel"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Stats strip */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-biomech-muted px-1 mb-1">
                      <div>Mín: <span className="text-white font-bold">{stats.min?.toFixed(1)}{panelDef.unit}</span></div>
                      <div>Máx: <span className="text-white font-bold">{stats.max?.toFixed(1)}{panelDef.unit}</span></div>
                      <div>ROM: <span className="text-biomech-secondary font-bold">{stats.rom?.toFixed(1)}{panelDef.unit}</span></div>
                    </div>

                    {/* Subplot Chart */}
                    <div className="h-36 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          onClick={handleChartClick}
                          margin={{ top: 4, right: 10, left: -24, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="2 2" stroke="#1F2937" vertical={false} />
                          <XAxis
                            dataKey="time"
                            stroke="#6B7280"
                            fontSize={9}
                            tickFormatter={(t) => `${t.toFixed(1)}s`}
                          />
                          <YAxis
                            stroke="#6B7280"
                            fontSize={9}
                            domain={panelDef.domain || ['auto', 'auto']}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#121722',
                              borderColor: '#1F2937',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontFamily: 'monospace',
                            }}
                            formatter={(val, name) => [`${val}${panelDef.unit}`, name]}
                            labelFormatter={(label) => `T: ${parseFloat(label).toFixed(2)}s`}
                          />
                          <ReferenceLine
                            x={currentPoint.time}
                            stroke="#00FF88"
                            strokeDasharray="3 3"
                            strokeWidth={1.5}
                          />

                          {panelDef.series.map((s, idx) => (
                            <Line
                              key={s.key}
                              type="monotone"
                              dataKey={s.key}
                              name={s.name}
                              stroke={s.color}
                              strokeWidth={idx === 0 ? 2 : 1.5}
                              strokeDasharray={idx > 0 ? '3 2' : undefined}
                              dot={false}
                              isAnimationActive={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
