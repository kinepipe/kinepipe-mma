from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from pathlib import Path
import pandas as pd
import io
import shutil

from ..core.config import EXPORTS_DIR, UPLOADS_DIR
from ..core.schemas import AnalysisSessionData
from ..core.video_engine import render_annotated_video
from ..protocols.pose2sim_adapter import Pose2SimAdapter
from .routes_tracking import SESSIONS

router = APIRouter(prefix="/api/export", tags=["export"])

@router.get("/csv/{video_id}")
def export_csv(video_id: str):
    """
    Exports all kinematic data (time, frame, keypoints, angles, velocities) to CSV.
    """
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    rows = []
    for f in session.frames:
        row = {
            "frame": f.frame_index,
            "time_s": f.time_s,
        }
        # Add keypoints (x, y, x_m, y_m, conf)
        for kp_name, kp in f.keypoints.items():
            row[f"{kp_name}_x_px"] = kp.x
            row[f"{kp_name}_y_px"] = kp.y
            row[f"{kp_name}_x_m"] = kp.x_m
            row[f"{kp_name}_y_m"] = kp.y_m
            row[f"{kp_name}_conf"] = kp.confidence
            
        # Add angles
        for angle_name, angle_val in f.angles.items():
            row[f"angle_{angle_name}_deg"] = angle_val
            
        # Add velocities
        for vel_name, vel_val in f.velocities.items():
            row[f"vel_{vel_name}"] = vel_val
            
        rows.append(row)

    df = pd.DataFrame(rows)
    csv_filename = f"{Path(session.metadata.filename).stem}_kinematics.csv"
    output_path = EXPORTS_DIR / csv_filename
    df.to_csv(output_path, index=False)

    return FileResponse(
        str(output_path),
        media_type="text/csv",
        filename=csv_filename
    )

@router.get("/trc/{video_id}")
def export_trc(video_id: str):
    """
    Exports OpenSim compatible .trc marker trajectory file.
    """
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    trc_filename = f"{Path(session.metadata.filename).stem}_opensim.trc"
    output_path = EXPORTS_DIR / trc_filename
    
    success = Pose2SimAdapter.export_trc(
        frames=session.frames,
        output_path=output_path,
        fps=session.metadata.fps,
        scale_m_per_px=session.calibration.scale_m_per_px
    )
    if not success:
        raise HTTPException(status_code=500, detail="Error al generar archivo TRC")

    return FileResponse(
        str(output_path),
        media_type="text/plain",
        filename=trc_filename
    )

@router.get("/mot/{video_id}")
def export_mot(video_id: str):
    """
    Exports OpenSim compatible .mot (Motion Coordinates) file.
    Formatted to load directly onto standard OpenSim musculoskeletal models (gait2392 / marcha_humana_perry.osim).
    """
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    mot_filename = f"{Path(session.metadata.filename).stem}_opensim.mot"
    output_path = EXPORTS_DIR / mot_filename

    # Standard OpenSim Gait Coordinates (24 columns matching gait2392 & clinical models)
    columns = [
        "time",
        "pelvis_tilt",
        "pelvis_list",
        "pelvis_rotation",
        "pelvis_tx",
        "pelvis_ty",
        "pelvis_tz",
        "hip_flexion_r",
        "hip_adduction_r",
        "hip_rotation_r",
        "knee_angle_r",
        "ankle_angle_r",
        "subtalar_angle_r",
        "hip_flexion_l",
        "hip_adduction_l",
        "hip_rotation_l",
        "knee_angle_l",
        "ankle_angle_l",
        "subtalar_angle_l",
        "lumbar_extension",
        "lumbar_bending",
        "lumbar_rotation",
        "arm_flex_r",
        "arm_flex_l"
    ]

    num_rows = len(session.frames)
    num_cols = len(columns)

    lines = [
        "Coordinates",
        "version=1",
        f"nRows={num_rows}",
        f"nColumns={num_cols}",
        "inDegrees=yes",
        "",
        "Units are S.I. units (second, meters, deg)",
        "KinePipe MMA (Markless Motion Analyser) - OpenSim Motion Export by Klgo. Felipe Vargas Rios (@kinepipe)",
        "Compatible with OpenSim gait models (e.g. gait2392, marcha_humana_perry.osim)",
        "endheader",
        "\t".join(columns)
    ]

    # Calculate initial position offset for smooth progression
    first_com_x = session.frames[0].com.get("x_m", 0.0) if (session.frames and session.frames[0].com) else 0.0

    for f in session.frames:
        t = f.time_s
        angles = f.angles or {}
        com = f.com or {}

        # Coordinate mappings conforming to OpenSim biomechanical definitions:
        # 1. Pelvis position (meters)
        cur_x = com.get("x_m", 0.0)
        pelvis_tx = round(cur_x - first_com_x, 4) if cur_x else 0.0
        pelvis_ty = round(com.get("y_m", 0.92), 4)
        pelvis_tz = 0.0

        # 2. Pelvis & Trunk orientation (degrees)
        trunk_lean = angles.get("trunk_inclination", 7.0)
        pelvis_tilt = round(max(-20.0, min(30.0, trunk_lean)), 2)
        lumbar_ext = round(-trunk_lean * 0.5, 2)

        # 3. Right Leg (degrees)
        # OpenSim: 0 = neutral, flexion > 0. 2D vertex is ~170 standing.
        hip_r_raw = angles.get("hip_flexion_r", 170.0)
        hip_r = round(max(-30.0, min(80.0, 180.0 - hip_r_raw)), 2)

        # OpenSim: 0 = straight, flexion < 0 in gait2392 coordinates.
        knee_r_raw = angles.get("knee_flexion_r", 175.0)
        knee_r = round(max(-120.0, min(10.0, -(180.0 - knee_r_raw))), 2)

        # OpenSim: 0 = 90 deg neutral, dorsiflexion > 0, plantarflexion < 0.
        ankle_r_raw = angles.get("ankle_angle_r", 90.0)
        ankle_r = round(max(-50.0, min(40.0, ankle_r_raw - 90.0)), 2)

        # 4. Left Leg (degrees)
        hip_l_raw = angles.get("hip_flexion_l", 170.0)
        hip_l = round(max(-30.0, min(80.0, 180.0 - hip_l_raw)), 2)

        knee_l_raw = angles.get("knee_flexion_l", 175.0)
        knee_l = round(max(-120.0, min(10.0, -(180.0 - knee_l_raw))), 2)

        ankle_l_raw = angles.get("ankle_angle_l", 90.0)
        ankle_l = round(max(-50.0, min(40.0, ankle_l_raw - 90.0)), 2)

        # Arm swing (counter-oscillation based on hip motion)
        arm_r = round(-hip_r * 0.6, 2)
        arm_l = round(-hip_l * 0.6, 2)

        row = [
            f"{t:.4f}",
            f"{pelvis_tilt:.2f}",
            "0.00",
            "0.00",
            f"{pelvis_tx:.4f}",
            f"{pelvis_ty:.4f}",
            f"{pelvis_tz:.4f}",
            f"{hip_r:.2f}",
            "0.00",
            "0.00",
            f"{knee_r:.2f}",
            f"{ankle_r:.2f}",
            "0.00",
            f"{hip_l:.2f}",
            "0.00",
            "0.00",
            f"{knee_l:.2f}",
            f"{ankle_l:.2f}",
            "0.00",
            f"{lumbar_ext:.2f}",
            "0.00",
            "0.00",
            f"{arm_r:.2f}",
            f"{arm_l:.2f}"
        ]
        lines.append("\t".join(row))

    with open(output_path, "w", encoding="utf-8") as file_out:
        file_out.write("\n".join(lines))

    return FileResponse(
        str(output_path),
        media_type="text/plain",
        filename=mot_filename
    )

@router.get("/osim/{video_id}")
def export_osim_model(video_id: str):
    """
    Downloads the matching OpenSim musculoskeletal model (.osim)
    ready to open in OpenSim to load the generated .mot or .trc files.
    """
    bundled_model = Path(__file__).resolve().parent.parent / "models" / "gait_model.osim"
    if not bundled_model.exists():
        raise HTTPException(status_code=404, detail="Modelo OpenSim .osim no encontrado en el servidor")

    session = SESSIONS.get(video_id)
    video_stem = Path(session.metadata.filename).stem if session else video_id
    osim_filename = f"{video_stem}_gait_model.osim"

    return FileResponse(
        str(bundled_model),
        media_type="application/xml",
        filename=osim_filename
    )

@router.post("/video/{video_id}")
def export_annotated_video(video_id: str, layout: str = "bottom_bar"):
    """
    Renders an annotated MP4 video with skeleton, HUD/telemetry, and angle arcs.
    Supported layouts:
      - 'bottom_bar' (default): Sleek telemetry bar beneath video. Video frame is 100% uncovered.
      - 'transparent_overlay': Floating translucent HUD overlay.
      - 'clean': Only skeleton and COM markers.
    """
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    source_path = Path(session.metadata.filepath)
    annotated_filename = f"{Path(session.metadata.filename).stem}_annotated.mp4"
    output_path = EXPORTS_DIR / annotated_filename

    success = render_annotated_video(
        source_video_path=source_path,
        output_video_path=output_path,
        frames_data=session.frames,
        show_skeleton=True,
        show_angles=True,
        show_com=True,
        show_trajectories=True,
        layout=layout
    )
    if not success:
        raise HTTPException(status_code=500, detail="Error al renderizar el video con HUD")

    # Persist as a new copy in UPLOADS_DIR so it appears in the video dropdown
    copy_name = f"{Path(session.metadata.filename).stem}_con_analisis.mp4"
    uploads_copy_path = UPLOADS_DIR / f"{video_id}_con_analisis.mp4"
    try:
        shutil.copy2(str(output_path), str(uploads_copy_path))
    except Exception as e:
        print(f"Warning copying to uploads: {e}")

    return {
        "status": "ok",
        "download_url": f"/api/export/video/{video_id}/download",
        "filename": annotated_filename,
        "copy_filename": copy_name,
        "copy_video_id": f"{video_id}_con_analisis"
    }

@router.get("/video/{video_id}/download")
def download_annotated_video(video_id: str):
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    annotated_filename = f"{Path(session.metadata.filename).stem}_annotated.mp4"
    output_path = EXPORTS_DIR / annotated_filename
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Video anotado aún no renderizado")

    return FileResponse(
        str(output_path),
        media_type="video/mp4",
        filename=annotated_filename
    )

@router.get("/report/{video_id}", response_class=HTMLResponse)
def get_html_report(video_id: str):
    """
    Generates a full, responsive HTML Biomechanical Report with jump metrics,
    angle ranges of motion (ROM), keyframes list and notes.
    """
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    # Calculate Angle Min / Max / ROM
    angle_stats = {}
    if session.frames:
        for angle_name in session.frames[0].angles.keys():
            vals = [f.angles[angle_name] for f in session.frames if angle_name in f.angles]
            if vals:
                min_v = min(vals)
                max_v = max(vals)
                rom = max_v - min_v
                angle_stats[angle_name.replace('_', ' ').title()] = {
                    "min": round(min_v, 1),
                    "max": round(max_v, 1),
                    "rom": round(rom, 1)
                }

    jump_section = ""
    if session.jump_analysis:
        ja = session.jump_analysis
        jump_section = f"""
        <div class="metrics-grid">
            <div class="card">
                <span class="label">Altura de Salto (Vuelo)</span>
                <span class="value highlight">{ja.flight_height_cm} cm</span>
                <span class="sub">Tiempo: {ja.flight_time_s} s</span>
            </div>
            <div class="card">
                <span class="label">Velocidad de Despegue</span>
                <span class="value">{ja.takeoff_velocity_m_s} m/s</span>
                <span class="sub">Cuadratura cinética: {ja.takeoff_height_cm} cm</span>
            </div>
            <div class="card">
                <span class="label">Profundidad Contramovimiento</span>
                <span class="value">{ja.countermovement_depth_cm} cm</span>
                <span class="sub">Flexión rodilla máx: {ja.max_knee_flexion_deg}°</span>
            </div>
            <div class="card">
                <span class="label">Tipo de Protocolo</span>
                <span class="value">{ja.jump_type}</span>
                <span class="sub">Frames: Despegue #{ja.takeoff_frame} / Vértice #{ja.apex_frame}</span>
            </div>
        </div>
        """

    keyframes_rows = ""
    for kf in session.keyframes:
        angles_badge = ""
        if kf.angles_snapshot:
            angles_badge = " | ".join([f"{k}: {v}°" for k, v in kf.angles_snapshot.items()])
        keyframes_rows += f"""
        <tr>
            <td><strong>#{kf.frame_index}</strong></td>
            <td>{kf.time_s:.3f} s</td>
            <td><span class="tag tag-{kf.event_type}">{kf.title}</span></td>
            <td>{kf.notes}</td>
            <td class="mono">{angles_badge}</td>
        </tr>
        """

    rom_rows = ""
    for name, s in angle_stats.items():
        rom_rows += f"""
        <tr>
            <td><strong>{name}</strong></td>
            <td>{s['min']}°</td>
            <td>{s['max']}°</td>
            <td class="highlight"><strong>{s['rom']}°</strong></td>
        </tr>
        """

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Biomecánico - {session.metadata.filename}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f1218; color: #e2e8f0; margin: 0; padding: 30px; }}
        .container {{ max-width: 1000px; margin: 0 auto; background: #161b24; padding: 40px; border-radius: 12px; border: 1px solid #232d3d; }}
        header {{ border-bottom: 2px solid #00ff88; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }}
        h1 {{ color: #00ff88; margin: 0; font-size: 26px; }}
        h2 {{ color: #38bdf8; font-size: 18px; border-bottom: 1px solid #232d3d; padding-bottom: 8px; margin-top: 35px; }}
        .badge {{ background: #232d3d; padding: 4px 10px; border-radius: 6px; font-size: 13px; color: #94a3b8; }}
        .metrics-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 20px 0; }}
        .card {{ background: #1a2230; padding: 20px; border-radius: 10px; border: 1px solid #2a374c; text-align: center; }}
        .label {{ display: block; font-size: 13px; color: #94a3b8; margin-bottom: 8px; }}
        .value {{ display: block; font-size: 24px; font-weight: bold; color: #f1f5f9; }}
        .highlight {{ color: #00ff88 !important; }}
        .sub {{ font-size: 12px; color: #64748b; margin-top: 6px; display: block; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #232d3d; }}
        th {{ background: #1e2636; color: #94a3b8; font-weight: 600; }}
        .mono {{ font-family: monospace; font-size: 12px; color: #38bdf8; }}
        .tag {{ padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; background: #232d3d; }}
        .tag-takeoff {{ background: #ea580c; color: white; }}
        .tag-apex {{ background: #0284c7; color: white; }}
        .tag-landing {{ background: #16a34a; color: white; }}
        .notes-box {{ background: #1e2636; border-left: 4px solid #38bdf8; padding: 16px; border-radius: 4px; line-height: 1.6; margin-top: 15px; }}
        @media print {{ body {{ background: white; color: black; }} .container {{ border: none; padding: 0; background: white; }} th {{ background: #eee; color: black; }} }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>KINOVEA-AI BIOMECHANICS STUDIO</h1>
                <p style="margin: 5px 0 0; color: #94a3b8;">Reporte Oficial de Cinemática y Análisis del Movimiento</p>
            </div>
            <div style="text-align: right;">
                <span class="badge">Modelo: {session.model_used.upper()}</span><br>
                <span class="badge" style="margin-top: 5px; display: inline-block;">FPS: {session.metadata.fps} | Frames: {session.metadata.total_frames}</span>
            </div>
        </header>

        <h2>1. Métricas Principales de Evaluación</h2>
        {jump_section}

        <h2>2. Rangos de Movimiento Articular (ROM)</h2>
        <table>
            <thead>
                <tr>
                    <th>Articulación / Ángulo</th>
                    <th>Mínimo (Máx Flexión)</th>
                    <th>Máximo (Máx Extensión)</th>
                    <th>Rango Total (ROM)</th>
                </tr>
            </thead>
            <tbody>
                {rom_rows if rom_rows else "<tr><td colspan='4'>Sin datos articulares disponibles</td></tr>"}
            </tbody>
        </table>

        <h2>3. Fotogramas Clave & Eventos Biomecánicos</h2>
        <table>
            <thead>
                <tr>
                    <th>Frame</th>
                    <th>Tiempo</th>
                    <th>Evento</th>
                    <th>Observación Técnica</th>
                    <th>Instantánea Angular</th>
                </tr>
            </thead>
            <tbody>
                {keyframes_rows if keyframes_rows else "<tr><td colspan='5'>No se registraron fotogramas clave</td></tr>"}
            </tbody>
        </table>

        <h2>4. Conclusiones y Notas del Evaluador</h2>
        <div class="notes-box">
            {session.notes if session.notes else "No se ingresaron notas adicionales para esta sesión clínica/deportiva."}
        </div>
    </div>
</body>
</html>
"""
    return HTMLResponse(content=html)
