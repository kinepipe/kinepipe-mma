from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import uuid
import numpy as np

from ..core.schemas import (
    KinematicsRecalcRequest,
    AnalysisSessionData,
    Keyframe,
    JumpAnalysisResult,
    CalibrationData
)
from ..core.kinematics_math import (
    butterworth_lowpass_filter,
    compute_central_difference_derivatives,
    analyze_vertical_jump
)
from .routes_tracking import SESSIONS

router = APIRouter(prefix="/api/kinematics", tags=["kinematics"])

@router.post("/recalculate", response_model=AnalysisSessionData)
def recalculate_kinematics(req: KinematicsRecalcRequest):
    """
    Recalculates kinematics with updated Butterworth filter cutoff frequency or calibration scaling.
    Provides instant live adjustment for sliders in the UI.
    """
    session = SESSIONS.get(req.video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if req.calibration:
        session.calibration = req.calibration

    scale = session.calibration.scale_m_per_px if session.calibration else 0.005
    fps = session.metadata.fps or 30.0
    dt = 1.0 / fps
    fc = req.butterworth_cutoff_hz

    # Collect all unique keypoint names across all frames
    all_kp_names = set()
    for f in session.frames:
        all_kp_names.update(f.keypoints.keys())

    for kp_name in all_kp_names:
        raw_xs = []
        raw_ys = []
        for f in session.frames:
            kp = f.keypoints.get(kp_name)
            if kp is not None:
                x_val = getattr(kp, 'x', None) or (kp.get('x') if isinstance(kp, dict) else None)
                y_val = getattr(kp, 'y', None) or (kp.get('y') if isinstance(kp, dict) else None)
                raw_xs.append(x_val if x_val is not None else np.nan)
                raw_ys.append(y_val if y_val is not None else np.nan)
            else:
                raw_xs.append(np.nan)
                raw_ys.append(np.nan)

        xs = np.array(raw_xs, dtype=float)
        ys = np.array(raw_ys, dtype=float)

        if np.all(np.isnan(xs)) or np.all(np.isnan(ys)):
            continue

        filt_xs = butterworth_lowpass_filter(xs, cutoff_hz=fc, fs=fps, order=req.butterworth_order)
        filt_ys = butterworth_lowpass_filter(ys, cutoff_hz=fc, fs=fps, order=req.butterworth_order)

        vx = compute_central_difference_derivatives(filt_xs * scale, dt)
        vy = compute_central_difference_derivatives(filt_ys * scale, dt)
        v_mag = np.sqrt(vx**2 + vy**2)

        for i, f in enumerate(session.frames):
            if kp_name in f.keypoints:
                kp_obj = f.keypoints[kp_name]
                if isinstance(kp_obj, dict):
                    kp_obj['x'] = round(float(filt_xs[i]), 2)
                    kp_obj['y'] = round(float(filt_ys[i]), 2)
                    kp_obj['x_m'] = round(float(filt_xs[i]) * scale, 4)
                    kp_obj['y_m'] = round(float(filt_ys[i]) * scale, 4)
                else:
                    kp_obj.x = round(float(filt_xs[i]), 2)
                    kp_obj.y = round(float(filt_ys[i]), 2)
                    kp_obj.x_m = round(float(filt_xs[i]) * scale, 4)
                    kp_obj.y_m = round(float(filt_ys[i]) * scale, 4)

            if kp_name == "right_knee":
                f.velocities["knee_r_vel_m_s"] = round(float(v_mag[i]), 3)
            elif kp_name == "left_knee":
                f.velocities["knee_l_vel_m_s"] = round(float(v_mag[i]), 3)
            elif kp_name == "right_ankle":
                f.velocities["ankle_r_vel_m_s"] = round(float(v_mag[i]), 3)
            elif kp_name == "left_ankle":
                f.velocities["ankle_l_vel_m_s"] = round(float(v_mag[i]), 3)
            elif kp_name == "right_wrist":
                f.velocities["wrist_r_vel_m_s"] = round(float(v_mag[i]), 3)

    # Recalculate Center of Mass (COM) for each frame with updated scale
    from ..core.kinematics_math import estimate_center_of_mass_2d
    for f in session.frames:
        kps_tuple = {}
        for k, v in f.keypoints.items():
            kx = getattr(v, 'x', None) or (v.get('x') if isinstance(v, dict) else None)
            ky = getattr(v, 'y', None) or (v.get('y') if isinstance(v, dict) else None)
            if kx is not None and ky is not None:
                kps_tuple[k] = (kx, ky)
        com_dict = estimate_center_of_mass_2d(kps_tuple, scale_m_per_px=scale, origin_y=0.0)
        f.com = com_dict

    com_ys = np.array([f.com.get("y_m", 0.0) if f.com else 0.0 for f in session.frames], dtype=float)
    com_xs = np.array([f.com.get("x_m", 0.0) if f.com else 0.0 for f in session.frames], dtype=float)
    com_vx = compute_central_difference_derivatives(com_xs, dt)
    com_vy = compute_central_difference_derivatives(com_ys, dt)
    com_vel = np.sqrt(com_vx**2 + com_vy**2)
    for i, f in enumerate(session.frames):
        f.velocities["com_vel_m_s"] = round(float(com_vel[i]), 3)

    # Recalculate interpretation metrics (gait, jump, squat or general)
    if session.frames:
        from .routes_tracking import apply_movement_interpretation
        interp = req.interpretation or session.movement_interpretation
        jump_res, gait_res, squat_res, kfs = apply_movement_interpretation(
            session.frames,
            session.metadata,
            interp
        )
        session.movement_interpretation = interp
        session.jump_analysis = jump_res
        session.gait_analysis = gait_res
        session.squat_analysis = squat_res

        # Preserve custom keyframes, update autogenerated ones
        custom_kfs = [k for k in (session.keyframes or []) if k.event_type == "custom"]
        new_auto_kfs = [k for k in (kfs or []) if k.event_type != "custom"]
        session.keyframes = sorted(custom_kfs + new_auto_kfs, key=lambda x: x.frame_index)

    return session

@router.post("/keyframe/add", response_model=Keyframe)
def add_keyframe(video_id: str, frame_index: int, title: str = "Punto Clave", notes: str = "", event_type: str = "custom"):
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if frame_index < 0 or frame_index >= len(session.frames):
        raise HTTPException(status_code=400, detail="Índice de fotograma fuera de rango")

    target_frame = session.frames[frame_index]
    kf = Keyframe(
        id=str(uuid.uuid4())[:8],
        frame_index=frame_index,
        time_s=target_frame.time_s,
        title=title,
        event_type=event_type,
        notes=notes,
        thumbnail_url=f"/api/video/{video_id}/frame/{frame_index}",
        angles_snapshot=target_frame.angles
    )
    
    # Insert maintaining chronological order
    session.keyframes.append(kf)
    session.keyframes.sort(key=lambda x: x.frame_index)
    return kf

@router.delete("/keyframe/{video_id}/{keyframe_id}")
def delete_keyframe(video_id: str, keyframe_id: str):
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session.keyframes = [k for k in session.keyframes if k.id != keyframe_id]
    return {"status": "ok", "deleted_id": keyframe_id}

@router.put("/notes/{video_id}")
def update_notes(video_id: str, payload: Dict[str, str]):
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    session.notes = payload.get("notes", "")
    return {"status": "ok", "notes": session.notes}
