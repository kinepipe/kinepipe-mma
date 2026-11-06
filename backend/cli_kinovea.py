"""
KinePipe MMA - Headless Biomechanical CLI Bridge for Kinovea 2025.2.0 Integration
Executes markerless pose tracking (Sports2D/YOLOv8-Pose, Pose2Sim/OpenSim, DeepLabCut, FastPose),
zero-phase 4th-order Butterworth filtering, clinical event segmentation (Gait, Running, Vertical Jump, Squat),
and exports .KVA, .TRC, .MOT, .OSIM, .CSV, interactive multi-subplot .HTML, and _summary.json.
Author: Klgo. Felipe Vargas Ríos (@kinepipe)
"""

import os
import sys
import json
import math
import shutil
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional

# Ensure project root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.app.core.schemas import (
    TrackingRequest,
    CalibrationData,
    AnalysisSessionData,
)
from backend.app.core.video_engine import get_video_metadata
from backend.app.core.kva_engine import export_to_kva
from backend.app.api.routes_tracking import get_trackers, apply_movement_interpretation
from backend.app.protocols.pose2sim_adapter import Pose2SimAdapter


def emit_progress(pct: int, msg: str):
    print(f"PROGRESS:{pct}:{msg}", flush=True)


def build_svg_polyline(values: List[float], width: int = 860, height: int = 170, color: str = "#00ff88", label: str = "", unit: str = "") -> str:
    if not values:
        return ""
    vmin = min(values)
    vmax = max(values)
    span = max(1e-5, vmax - vmin)
    n = len(values)
    pts = []
    for i, v in enumerate(values):
        x = 45 + (i / max(1, n - 1)) * (width - 65)
        y = (height - 25) - ((v - vmin) / span) * (height - 50)
        pts.append(f"{x:.1f},{y:.1f}")
    pts_str = " ".join(pts)
    return f"""
    <div style="background:#131924;border:1px solid #243044;border-radius:8px;padding:12px 16px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:600;color:#e2e8f0;">{label}</span>
            <span style="font-size:12px;color:#94a3b8;font-family:monospace;">Mín: {vmin:.1f}{unit} | Máx: {vmax:.1f}{unit} | ROM/Δ: {(vmax-vmin):.1f}{unit}</span>
        </div>
        <svg viewBox="0 0 {width} {height}" style="width:100%;height:{height}px;overflow:visible;">
            <line x1="45" y1="20" x2="{width-20}" y2="20" stroke="#1e293b" stroke-dasharray="4 4" stroke-width="1"/>
            <line x1="45" y1="{height//2}" x2="{width-20}" y2="{height//2}" stroke="#1e293b" stroke-dasharray="4 4" stroke-width="1"/>
            <line x1="45" y1="{height-25}" x2="{width-20}" y2="{height-25}" stroke="#334155" stroke-width="1"/>
            <text x="5" y="24" fill="#64748b" font-size="10" font-family="monospace">{vmax:.1f}</text>
            <text x="5" y="{height//2 + 4}" fill="#64748b" font-size="10" font-family="monospace">{((vmax+vmin)/2):.1f}</text>
            <text x="5" y="{height-22}" fill="#64748b" font-size="10" font-family="monospace">{vmin:.1f}</text>
            <polyline fill="none" stroke="{color}" stroke-width="2.4" points="{pts_str}"/>
        </svg>
    </div>
    """


def export_mot_file(session: AnalysisSessionData, output_path: Path):
    columns = [
        "time", "pelvis_tilt", "pelvis_list", "pelvis_rotation",
        "pelvis_tx", "pelvis_ty", "pelvis_tz",
        "hip_flexion_r", "hip_adduction_r", "hip_rotation_r",
        "knee_angle_r", "ankle_angle_r", "subtalar_angle_r",
        "hip_flexion_l", "hip_adduction_l", "hip_rotation_l",
        "knee_angle_l", "ankle_angle_l", "subtalar_angle_l",
        "lumbar_extension", "lumbar_bending", "lumbar_rotation",
        "arm_flex_r", "arm_flex_l"
    ]
    lines = [
        "Coordinates",
        "version=1",
        f"nRows={len(session.frames)}",
        f"nColumns={len(columns)}",
        "inDegrees=yes",
        "",
        "Units are S.I. units (second, meters, deg)",
        "KinePipe MMA - OpenSim Motion Export for Kinovea 2025.2",
        "endheader",
        "\t".join(columns)
    ]
    first_com_x = session.frames[0].com.get("x_m", 0.0) if (session.frames and session.frames[0].com) else 0.0
    for f in session.frames:
        t = f.time_s
        angles = f.angles or {}
        com = f.com or {}
        cur_x = com.get("x_m", 0.0)
        pelvis_tx = round(cur_x - first_com_x, 4) if cur_x else 0.0
        pelvis_ty = round(com.get("y_m", 0.92), 4)
        trunk_lean = angles.get("trunk_inclination", 7.0)
        pelvis_tilt = round(max(-20.0, min(30.0, trunk_lean)), 2)
        lumbar_ext = round(-trunk_lean * 0.5, 2)
        hip_r = round(max(-30.0, min(80.0, 180.0 - angles.get("hip_flexion_r", 170.0))), 2)
        knee_r = round(max(-120.0, min(10.0, -(180.0 - angles.get("knee_flexion_r", 175.0)))), 2)
        ankle_r = round(max(-50.0, min(40.0, angles.get("ankle_angle_r", 90.0) - 90.0)), 2)
        hip_l = round(max(-30.0, min(80.0, 180.0 - angles.get("hip_flexion_l", 170.0))), 2)
        knee_l = round(max(-120.0, min(10.0, -(180.0 - angles.get("knee_flexion_l", 175.0)))), 2)
        ankle_l = round(max(-50.0, min(40.0, angles.get("ankle_angle_l", 90.0) - 90.0)), 2)
        arm_r = round(-hip_r * 0.6, 2)
        arm_l = round(-hip_l * 0.6, 2)
        row = [
            f"{t:.4f}", f"{pelvis_tilt:.2f}", "0.00", "0.00",
            f"{pelvis_tx:.4f}", f"{pelvis_ty:.4f}", "0.0000",
            f"{hip_r:.2f}", "0.00", "0.00", f"{knee_r:.2f}", f"{ankle_r:.2f}", "0.00",
            f"{hip_l:.2f}", "0.00", "0.00", f"{knee_l:.2f}", f"{ankle_l:.2f}", "0.00",
            f"{lumbar_ext:.2f}", "0.00", "0.00", f"{arm_r:.2f}", f"{arm_l:.2f}"
        ]
        lines.append("\t".join(row))
    output_path.write_text("\n".join(lines), encoding="utf-8")


def generate_clinical_html_report(session: AnalysisSessionData, output_path: Path, cutoff_hz: float, subject_height_m: float):
    angle_stats = {}
    if session.frames:
        for angle_name in ["knee_flexion_r", "knee_flexion_l", "hip_flexion_r", "hip_flexion_l", "elbow_angle_r", "elbow_angle_l", "trunk_inclination"]:
            vals = [f.angles[angle_name] for f in session.frames if angle_name in f.angles]
            if vals:
                min_v = min(vals)
                max_v = max(vals)
                angle_stats[angle_name.replace("_", " ").title()] = {
                    "min": round(min_v, 1),
                    "max": round(max_v, 1),
                    "rom": round(max_v - min_v, 1)
                }

    protocol_cards = ""
    if session.gait_analysis:
        ga = session.gait_analysis
        protocol_cards += f"""
        <h3>Protocolo Clínico: Marcha Humana y Carrera (Gait &amp; Running)</h3>
        <div class="metrics-grid">
            <div class="card"><span class="label">Cadencia</span><span class="value highlight">{ga.cadence_spm} pas/min</span><span class="sub">Tiempo zancada: {ga.avg_stride_time_s} s</span></div>
            <div class="card"><span class="label">Distribución Ciclo</span><span class="value">{ga.stance_phase_percent:.0f}% / {ga.swing_phase_percent:.0f}%</span><span class="sub">Apoyo / Oscilación</span></div>
            <div class="card"><span class="label">Rodilla en Contacto Inicial</span><span class="value">{ga.knee_flexion_at_contact}°</span><span class="sub">Pico Oscilación: {ga.max_knee_flexion_swing}°</span></div>
            <div class="card"><span class="label">Inclinación Tronco / Ext. Cadera</span><span class="value">{ga.trunk_forward_lean_deg}°</span><span class="sub">Extensión máx cadera: {ga.max_hip_extension}°</span></div>
        </div>
        """
    if session.jump_analysis:
        ja = session.jump_analysis
        protocol_cards += f"""
        <h3>Protocolo Clínico: Salto Vertical ({ja.jump_type})</h3>
        <div class="metrics-grid">
            <div class="card"><span class="label">Altura de Vuelo (g·t²/8)</span><span class="value highlight">{ja.flight_height_cm} cm</span><span class="sub">Tiempo de vuelo: {ja.flight_time_s} s</span></div>
            <div class="card"><span class="label">Velocidad de Despegue</span><span class="value">{ja.takeoff_velocity_m_s} m/s</span><span class="sub">Altura por impulso: {ja.takeoff_height_cm} cm</span></div>
            <div class="card"><span class="label">Profundidad Contramovimiento (Dip)</span><span class="value">{ja.countermovement_depth_cm} cm</span><span class="sub">Flexión rodilla máx: {ja.max_knee_flexion_deg}°</span></div>
            <div class="card"><span class="label">Eventos de Fase</span><span class="value">F#{ja.takeoff_frame} → F#{ja.apex_frame}</span><span class="sub">Aterrizaje: Frame #{ja.landing_frame}</span></div>
        </div>
        """
    if session.squat_analysis:
        sa = session.squat_analysis
        protocol_cards += f"""
        <h3>Protocolo Clínico: Sentadilla Funcional (Squat)</h3>
        <div class="metrics-grid">
            <div class="card"><span class="label">Clasificación Profundidad</span><span class="value highlight" style="font-size:18px;">{sa.squat_depth_category}</span><span class="sub">Frame más profundo: #{sa.max_depth_frame}</span></div>
            <div class="card"><span class="label">Ángulo Mínimo Rodilla</span><span class="value">{sa.min_knee_angle_deg}°</span><span class="sub">Ángulo mín cadera: {sa.min_hip_angle_deg}°</span></div>
            <div class="card"><span class="label">Inclinación Máx. Tronco</span><span class="value">{sa.max_trunk_lean_deg}°</span><span class="sub">Respecto a la vertical</span></div>
            <div class="card"><span class="label">Tempo Excéntrico / Concéntrico</span><span class="value">{sa.eccentric_duration_s}s / {sa.concentric_duration_s}s</span><span class="sub">Control neuromuscular</span></div>
        </div>
        """

    # Build multi-subplot SVG curves
    knee_r_series = [f.angles.get("knee_flexion_r", 170.0) for f in session.frames if f.angles]
    hip_r_series = [f.angles.get("hip_flexion_r", 170.0) for f in session.frames if f.angles]
    com_y_series = [(f.com.get("y_m", 0.0) * 100.0) for f in session.frames if f.com]
    com_vel_series = [f.velocities.get("com_vel_m_s", 0.0) for f in session.frames if f.velocities]

    charts_html = (
        build_svg_polyline(knee_r_series, color="#00E5FF", label="Cinemática Angular: Flexión/Extensión Rodilla Derecha (°)", unit="°")
        + build_svg_polyline(hip_r_series, color="#FF9100", label="Cinemática Angular: Flexión/Extensión Cadera Derecha (°)", unit="°")
        + build_svg_polyline(com_y_series, color="#00ff88", label="Trayectoria Vertical del Centro de Masa - CoM de Leva 1996 (cm)", unit=" cm")
        + build_svg_polyline(com_vel_series, color="#c084fc", label="Velocidad Lineal del Centro de Masa (m/s)", unit=" m/s")
    )

    rom_rows = "".join([
        f"<tr><td><strong>{k}</strong></td><td>{v['min']}°</td><td>{v['max']}°</td><td class='highlight'><strong>{v['rom']}°</strong></td></tr>"
        for k, v in angle_stats.items()
    ])

    kf_rows = "".join([
        f"<tr><td><strong>#{kf.frame_index}</strong></td><td>{kf.time_s:.3f} s</td><td><span class='tag'>{kf.title}</span></td><td>{kf.notes}</td></tr>"
        for kf in session.keyframes
    ])

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte Clínico KinePipe MMA + Kinovea • {session.metadata.filename}</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f17; color: #e2e8f0; margin: 0; padding: 28px; }}
.container {{ max-width: 1060px; margin: 0 auto; background: #151c28; padding: 36px; border-radius: 14px; border: 1px solid #26334d; }}
header {{ border-bottom: 2px solid #00ff88; padding-bottom: 18px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }}
h1 {{ color: #00ff88; margin: 0; font-size: 24px; }}
h2 {{ color: #38bdf8; font-size: 17px; border-bottom: 1px solid #26334d; padding-bottom: 8px; margin-top: 30px; }}
h3 {{ color: #f8fafc; font-size: 15px; margin-top: 16px; }}
.badge {{ background: #1e293b; padding: 5px 10px; border-radius: 6px; font-size: 12px; color: #94a3b8; display: inline-block; margin-left: 6px; }}
.metrics-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin: 14px 0 22px; }}
.card {{ background: #1a2333; padding: 18px; border-radius: 10px; border: 1px solid #2b3954; text-align: center; }}
.label {{ display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; }}
.value {{ display: block; font-size: 22px; font-weight: 700; color: #f1f5f9; }}
.highlight {{ color: #00ff88 !important; }}
.sub {{ font-size: 11px; color: #64748b; margin-top: 6px; display: block; }}
table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }}
th, td {{ padding: 10px 12px; text-align: left; border-bottom: 1px solid #232d3d; }}
th {{ background: #1e293b; color: #94a3b8; font-weight: 600; }}
.tag {{ padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #0284c7; color: white; }}
.btn-print {{ background: #00ff88; color: #0b0f17; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; }}
@media print {{
  body {{ background: white; color: black; padding: 0; }}
  .container {{ border: none; background: white; padding: 10px; }}
  .card {{ background: #f8fafc; border: 1px solid #cbd5e1; }}
  .value {{ color: #0f172a; }}
  .highlight {{ color: #047857 !important; }}
  .btn-print {{ display: none; }}
}}
</style>
</head>
<body>
<div class="container">
  <header>
    <div>
      <h1>KINEPIPE MMA v1.5.2 • KINOVEA 2025.2 BIOMECHANICS SUITE</h1>
      <p style="margin:5px 0 0;color:#94a3b8;font-size:13px;">Archivo: <strong>{session.metadata.filename}</strong> | Estatura Sujeto: <strong>{subject_height_m:.2f} m</strong> | Filtro Butterworth 4° Orden: <strong>{cutoff_hz:.1f} Hz</strong></p>
    </div>
    <div>
      <button class="btn-print" onclick="window.print()">Imprimir / Guardar PDF</button>
      <div style="margin-top:8px;text-align:right;">
        <span class="badge">Motor: {session.model_used.upper()}</span>
        <span class="badge">{session.metadata.fps:.1f} FPS • {session.metadata.total_frames} frames</span>
      </div>
    </div>
  </header>
  <h2>1. Evaluación Biomecánica Automatizada</h2>
  {protocol_cards if protocol_cards else "<p>Seguimiento cinemático general completado.</p>"}
  <h2>2. Curvas Biomecánicas Sincronizadas (Multi-Subplot)</h2>
  {charts_html}
  <h2>3. Rangos de Movimiento Articular (ROM)</h2>
  <table>
    <thead><tr><th>Articulación / Segmento</th><th>Mínimo (°)</th><th>Máximo (°)</th><th>Rango Total (ROM)</th></tr></thead>
    <tbody>{rom_rows}</tbody>
  </table>
  <h2>4. Eventos Biomecánicos y Fotogramas Clave</h2>
  <table>
    <thead><tr><th>Fotograma</th><th>Tiempo (s)</th><th>Evento Detectado</th><th>Observación Clínica y Ángulos</th></tr></thead>
    <tbody>{kf_rows if kf_rows else "<tr><td colspan='4'>Sin eventos específicos.</td></tr>"}</tbody>
  </table>
</div>
</body>
</html>"""
    output_path.write_text(html, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="KinePipe MMA Headless CLI Bridge for Kinovea 2025.2")
    parser.add_argument("--video", required=True, help="Full path to the input video file")
    parser.add_argument("--model", default="sports2d", choices=["sports2d", "pose2sim", "deeplabcut", "fast_pose"])
    parser.add_argument("--protocol", default="gait", choices=["gait", "jump", "squat", "general"])
    parser.add_argument("--height", type=float, default=1.72, help="Subject stature in meters (default: 1.72)")
    parser.add_argument("--cutoff", type=float, default=6.0, help="Butterworth 4th-order low-pass filter cutoff Hz")
    parser.add_argument("--start-ms", type=float, default=-1.0, help="Selection start time in ms")
    parser.add_argument("--end-ms", type=float, default=-1.0, help="Selection end time in ms")
    parser.add_argument("--out-dir", default="", help="Output directory (defaults to video directory)")
    args = parser.parse_args()

    video_path = Path(args.video).resolve()
    if not video_path.exists():
        print(f"ERROR: Video file not found: {video_path}", file=sys.stderr)
        sys.exit(2)

    out_dir = Path(args.out_dir).resolve() if args.out_dir else video_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = video_path.stem

    emit_progress(5, "Inspeccionando metadatos de video y calibración antropométrica...")
    metadata = get_video_metadata(video_path)

    # Estimate scale_m_per_px from subject height (~72% of video height by default, refined after tracking)
    est_scale = round(args.height / max(150.0, metadata.height * 0.72), 6)
    calibration = CalibrationData(
        scale_m_per_px=est_scale,
        reference_length_m=args.height,
        unit="m"
    )

    roi_start_s = (args.start_ms / 1000.0) if args.start_ms > 0 else None
    roi_end_s = (args.end_ms / 1000.0) if args.end_ms > 0 else None

    req = TrackingRequest(
        video_id=stem,
        model_id=args.model,
        butterworth_cutoff_hz=args.cutoff,
        calibration=calibration,
        roi_start_time_s=roi_start_s,
        roi_end_time_s=roi_end_s,
        interpretation=args.protocol
    )

    emit_progress(15, f"Ejecutando inferencia neuronal Markerless ({args.model.upper()})...")
    trackers = get_trackers()
    tracker = trackers.get(args.model, trackers["sports2d"])
    frames = tracker.process_video(video_path, req, metadata)

    # Refine scale_m_per_px using measured stature_px from tracked subject
    statures_px = [f.com.get("stature_px", 0.0) for f in frames if f.com and f.com.get("stature_px", 0.0) > 60.0]
    if statures_px:
        median_stature_px = sorted(statures_px)[len(statures_px) // 2]
        # Nose-to-ankle is ~88% of full vertex-to-sole stature
        full_body_px = median_stature_px / 0.88
        refined_scale = round(args.height / max(80.0, full_body_px), 6)
        calibration.scale_m_per_px = refined_scale
        for f in frames:
            for kp in f.keypoints.values():
                kp.x_m = round(kp.x * refined_scale, 4)
                kp.y_m = round(kp.y * refined_scale, 4)
            if f.com:
                f.com["x_m"] = round(f.com.get("x", 0.0) * refined_scale, 4)
                # y_m is height above floor
                floor_pts = [f.keypoints[k].y for k in ("right_ankle", "left_ankle") if k in f.keypoints]
                floor_y = max(floor_pts) if floor_pts else float(metadata.height)
                f.com["y_m"] = round(max(0.0, floor_y - f.com.get("y", 0.0)) * refined_scale, 4)

    emit_progress(65, f"Calculando cinemática articular, CoM (de Leva 1996) y protocolo '{args.protocol.upper()}'...")
    # In case protocol='general', also compute gait, jump, and squat summaries so the user has all telemetry ready
    jump_res, gait_res, squat_res, kfs = apply_movement_interpretation(frames, metadata, args.protocol)
    if args.protocol == "general":
        j_all, _, _, _ = apply_movement_interpretation(frames, metadata, "jump")
        _, g_all, _, _ = apply_movement_interpretation(frames, metadata, "gait")
        _, _, s_all, _ = apply_movement_interpretation(frames, metadata, "squat")
        jump_res = j_all
        gait_res = g_all
        squat_res = s_all

    session = AnalysisSessionData(
        video_id=stem,
        metadata=metadata,
        calibration=calibration,
        model_used=args.model,
        movement_interpretation=args.protocol,
        frames=frames,
        keyframes=kfs,
        jump_analysis=jump_res,
        gait_analysis=gait_res,
        squat_analysis=squat_res,
        notes=f"Análisis KinePipe MMA v1.5.2 ({args.model.upper()}) | Estatura: {args.height:.2f} m | Filtro Butterworth: {args.cutoff:.1f} Hz"
    )

    emit_progress(80, "Exportando archivos nativos para Kinovea (.KVA) y OpenSim (.TRC / .MOT / .OSIM)...")
    kva_path = out_dir / f"{stem}.kva"
    kva_xml = export_to_kva(session)
    kva_path.write_text(kva_xml, encoding="utf-8")

    trc_path = out_dir / f"{stem}_kinepipe.trc"
    Pose2SimAdapter.export_trc(frames, trc_path, metadata.fps, calibration.scale_m_per_px)

    mot_path = out_dir / f"{stem}_opensim.mot"
    export_mot_file(session, mot_path)

    osim_src = BACKEND_DIR / "app" / "models" / "gait_model.osim"
    osim_dst = out_dir / f"{stem}_gait_model.osim"
    if osim_src.exists():
        shutil.copy2(str(osim_src), str(osim_dst))

    report_path = out_dir / f"{stem}_report.html"
    generate_clinical_html_report(session, report_path, args.cutoff, args.height)

    # Export CSV
    csv_path = out_dir / f"{stem}_kinematics.csv"
    csv_lines = ["frame,time_s,knee_flexion_r,knee_flexion_l,hip_flexion_r,hip_flexion_l,elbow_angle_r,elbow_angle_l,trunk_inclination,com_x_px,com_y_px,com_x_m,com_y_m,com_vel_m_s"]
    for f in frames:
        a = f.angles or {}
        c = f.com or {}
        v = f.velocities or {}
        csv_lines.append(
            f"{f.frame_index},{f.time_s:.4f},"
            f"{a.get('knee_flexion_r', 0.0):.2f},{a.get('knee_flexion_l', 0.0):.2f},"
            f"{a.get('hip_flexion_r', 0.0):.2f},{a.get('hip_flexion_l', 0.0):.2f},"
            f"{a.get('elbow_angle_r', 0.0):.2f},{a.get('elbow_angle_l', 0.0):.2f},"
            f"{a.get('trunk_inclination', 0.0):.2f},"
            f"{c.get('x', 0.0):.2f},{c.get('y', 0.0):.2f},{c.get('x_m', 0.0):.4f},{c.get('y_m', 0.0):.4f},"
            f"{v.get('com_vel_m_s', 0.0):.4f}"
        )
    csv_path.write_text("\n".join(csv_lines), encoding="utf-8")

    emit_progress(92, "Serializando telemetría biomecánica para interfaz nativa de Kinovea...")
    summary_path = out_dir / f"{stem}_summary.json"
    summary_payload = {
        "video_path": str(video_path),
        "kva_path": str(kva_path),
        "trc_path": str(trc_path),
        "mot_path": str(mot_path),
        "osim_path": str(osim_dst),
        "csv_path": str(csv_path),
        "report_path": str(report_path),
        "model_used": args.model,
        "protocol": args.protocol,
        "subject_height_m": args.height,
        "butterworth_cutoff_hz": args.cutoff,
        "scale_m_per_px": calibration.scale_m_per_px,
        "fps": metadata.fps,
        "width": metadata.width,
        "height": metadata.height,
        "total_frames": metadata.total_frames,
        "duration_s": metadata.duration_s,
        "gait_analysis": gait_res.model_dump() if hasattr(gait_res, "model_dump") and gait_res else (gait_res.dict() if gait_res else None),
        "jump_analysis": jump_res.model_dump() if hasattr(jump_res, "model_dump") and jump_res else (jump_res.dict() if jump_res else None),
        "squat_analysis": squat_res.model_dump() if hasattr(squat_res, "model_dump") and squat_res else (squat_res.dict() if squat_res else None),
        "keyframes": [
            {
                "id": kf.id,
                "frame_index": kf.frame_index,
                "time_s": kf.time_s,
                "timestamp_ms": int(round((kf.frame_index / max(1.0, metadata.fps)) * 1000.0)),
                "title": kf.title,
                "event_type": kf.event_type,
                "notes": kf.notes,
                "angles": kf.angles_snapshot or {}
            }
            for kf in kfs
        ],
        "frames": [
            {
                "f": f.frame_index,
                "t": f.time_s,
                "kps": {
                    k: [round(v.x, 2), round(v.y, 2)]
                    for k, v in f.keypoints.items()
                },
                "com": [round(f.com.get("x", 0.0), 2), round(f.com.get("y", 0.0), 2)] if f.com else None,
                "angles": f.angles or {}
            }
            for f in frames if f.keypoints
        ]
    }
    summary_path.write_text(json.dumps(summary_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    emit_progress(100, "Análisis biomecánico completado exitosamente.")
    print(f"RESULT_JSON:{summary_path}", flush=True)


if __name__ == "__main__":
    main()

