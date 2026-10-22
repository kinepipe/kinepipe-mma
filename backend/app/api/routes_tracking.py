from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Set
import numpy as np

from ..core.config import UPLOADS_DIR, SAMPLE_DIR, DATA_DIR
from ..core.schemas import (
    ModelCapabilityInfo,
    TrackingRequest,
    AnalysisSessionData,
    VideoMetadata,
    CalibrationData,
    Keyframe,
    JumpAnalysisResult,
    GaitAnalysisResult,
    SquatAnalysisResult
)
from ..core.video_engine import get_video_metadata, find_video_path
from ..core.kinematics_math import analyze_vertical_jump, analyze_gait, analyze_squat
from ..protocols.sports2d_adapter import Sports2DAdapter
from ..protocols.pose2sim_adapter import Pose2SimAdapter
from ..protocols.dlc_adapter import DeepLabCutAdapter
from ..protocols.fast_pose_adapter import FastPoseAdapter

router = APIRouter(prefix="/api/tracking", tags=["tracking"])

# In-memory storage for active sessions
SESSIONS: Dict[str, AnalysisSessionData] = {}
CANCEL_REQUESTS: Set[str] = set()

def get_trackers() -> Dict[str, Any]:
    return {
        "sports2d": Sports2DAdapter(),
        "pose2sim": Pose2SimAdapter(),
        "deeplabcut": DeepLabCutAdapter(),
        "fast_pose": FastPoseAdapter()
    }

def apply_movement_interpretation(
    frames: List[Any],
    metadata: VideoMetadata,
    interpretation: str = "general"
) -> Tuple[Optional[JumpAnalysisResult], Optional[GaitAnalysisResult], Optional[SquatAnalysisResult], List[Keyframe]]:
    jump_result = None
    gait_result = None
    squat_result = None
    keyframes: List[Keyframe] = []

    if not frames:
        return jump_result, gait_result, squat_result, keyframes

    fps = metadata.fps or 30.0
    dt = 1.0 / fps
    n = len(frames)
    timestamps = np.array([f.time_s for f in frames], dtype=float)
    knee_angles = np.array([f.angles.get("knee_flexion_r", 170.0) for f in frames], dtype=float)
    hip_angles = np.array([f.angles.get("hip_flexion_r", 170.0) for f in frames], dtype=float)
    trunk_angles = np.array([f.angles.get("trunk_inclination", 0.0) for f in frames], dtype=float)

    if interpretation == "jump":
        com_y_meters = np.array([
            (f.com.get("y_m", 0.0) if isinstance(f.com, dict) else getattr(f.com, "y_m", 0.0)) if f.com else 0.0
            for f in frames
        ], dtype=float)
        com_vy = np.gradient(com_y_meters, dt)
        
        jump_dict = analyze_vertical_jump(
            com_y_meters=com_y_meters,
            com_vy_meters_s=com_vy,
            knee_angles_deg=knee_angles,
            timestamps_s=timestamps,
            fps=fps,
            jump_type="CMJ"
        )
        jump_result = JumpAnalysisResult(**jump_dict)

        if jump_result.takeoff_frame > 0:
            if jump_result.lowest_frame is not None and jump_result.lowest_frame > 0:
                keyframes.append(Keyframe(
                    id="kf_lowest",
                    frame_index=jump_result.lowest_frame,
                    time_s=round(jump_result.lowest_frame / fps, 3),
                    title="Máxima Flexión (Dip)",
                    event_type="lowest_dip",
                    notes=f"Flexión rodilla: {jump_result.max_knee_flexion_deg}°",
                    thumbnail_url=f"/api/video/{metadata.video_id}/frame/{jump_result.lowest_frame}",
                    angles_snapshot=frames[jump_result.lowest_frame].angles
                ))
            keyframes.append(Keyframe(
                id="kf_takeoff",
                frame_index=jump_result.takeoff_frame,
                time_s=round(jump_result.takeoff_frame / fps, 3),
                title="Despegue (Takeoff)",
                event_type="takeoff",
                notes=f"Velocidad: {jump_result.takeoff_velocity_m_s} m/s",
                thumbnail_url=f"/api/video/{metadata.video_id}/frame/{jump_result.takeoff_frame}",
                angles_snapshot=frames[jump_result.takeoff_frame].angles
            ))
            keyframes.append(Keyframe(
                id="kf_apex",
                frame_index=jump_result.apex_frame,
                time_s=round(jump_result.apex_frame / fps, 3),
                title="Vértice (Apex)",
                event_type="apex",
                notes=f"Altura: {jump_result.flight_height_cm} cm",
                thumbnail_url=f"/api/video/{metadata.video_id}/frame/{jump_result.apex_frame}",
                angles_snapshot=frames[jump_result.apex_frame].angles
            ))
            keyframes.append(Keyframe(
                id="kf_landing",
                frame_index=jump_result.landing_frame,
                time_s=round(jump_result.landing_frame / fps, 3),
                title="Aterrizaje (Landing)",
                event_type="landing",
                notes="Contacto con suelo",
                thumbnail_url=f"/api/video/{metadata.video_id}/frame/{jump_result.landing_frame}",
                angles_snapshot=frames[jump_result.landing_frame].angles
            ))

    elif interpretation == "gait":
        # Gait analysis: track ankle displacement with safe attribute lookup
        ank_x = np.array([
            f.keypoints["right_ankle"].x_m if ("right_ankle" in f.keypoints and f.keypoints["right_ankle"] is not None and getattr(f.keypoints["right_ankle"], "x_m", None) is not None)
            else (f.keypoints["right_ankle"].x * 0.005 if ("right_ankle" in f.keypoints and f.keypoints["right_ankle"] is not None) else 0.0)
            for f in frames
        ], dtype=float)
        ank_y = np.array([
            f.keypoints["right_ankle"].y_m if ("right_ankle" in f.keypoints and f.keypoints["right_ankle"] is not None and getattr(f.keypoints["right_ankle"], "y_m", None) is not None)
            else (f.keypoints["right_ankle"].y * 0.005 if ("right_ankle" in f.keypoints and f.keypoints["right_ankle"] is not None) else 0.0)
            for f in frames
        ], dtype=float)
        
        gait_dict = analyze_gait(
            ankle_x_meters=ank_x,
            ankle_y_meters=ank_y,
            knee_angles_deg=knee_angles,
            hip_angles_deg=hip_angles,
            trunk_angles_deg=trunk_angles,
            timestamps_s=timestamps,
            fps=fps
        )
        gait_result = GaitAnalysisResult(**gait_dict)

        # Create keyframes for heel strikes and toe offs
        for idx, hs in enumerate(gait_result.heel_strikes):
            if hs < n:
                keyframes.append(Keyframe(
                    id=f"kf_hs_{idx}",
                    frame_index=hs,
                    time_s=round(hs / fps, 3),
                    title=f"Contacto Inicial #{idx + 1}",
                    event_type="heel_strike",
                    notes="Heel strike / Contacto de talón",
                    thumbnail_url=f"/api/video/{metadata.video_id}/frame/{hs}",
                    angles_snapshot=frames[hs].angles
                ))
        for idx, to in enumerate(gait_result.toe_offs):
            if to < n:
                keyframes.append(Keyframe(
                    id=f"kf_to_{idx}",
                    frame_index=to,
                    time_s=round(to / fps, 3),
                    title=f"Despegue #{idx + 1}",
                    event_type="toe_off",
                    notes="Toe off / Despegue de antepié",
                    thumbnail_url=f"/api/video/{metadata.video_id}/frame/{to}",
                    angles_snapshot=frames[to].angles
                ))

    elif interpretation == "squat":
        squat_dict = analyze_squat(
            knee_angles_deg=knee_angles,
            hip_angles_deg=hip_angles,
            trunk_angles_deg=trunk_angles,
            timestamps_s=timestamps,
            fps=fps
        )
        squat_result = SquatAnalysisResult(**squat_dict)
        bottom = squat_result.max_depth_frame
        if bottom < n:
            keyframes.append(Keyframe(
                id="kf_squat_bottom",
                frame_index=bottom,
                time_s=round(bottom / fps, 3),
                title="Punto Más Profundo",
                event_type="squat_bottom",
                notes=f"Ángulo rodilla: {squat_result.min_knee_angle_deg}° ({squat_result.squat_depth_category})",
                thumbnail_url=f"/api/video/{metadata.video_id}/frame/{bottom}",
                angles_snapshot=frames[bottom].angles
            ))

    keyframes.sort(key=lambda x: x.frame_index)
    return jump_result, gait_result, squat_result, keyframes

@router.get("/models", response_model=List[ModelCapabilityInfo])
def list_available_models():
    trackers = get_trackers()
    return [t.get_info() for t in trackers.values()]

@router.post("/run", response_model=AnalysisSessionData)
def run_tracking(request: TrackingRequest):
    trackers = get_trackers()
    model = trackers.get(request.model_id)
    if not model:
        raise HTTPException(status_code=400, detail=f"Modelo no reconocido: {request.model_id}")

    video_id = request.video_id
    target_video = find_video_path(video_id)
    
    if not target_video or not target_video.exists():
        if video_id in ["sample", "sample_cmj_jump"]:
            sample_path = SAMPLE_DIR / "sample_cmj_jump.mp4"
            if sample_path.exists():
                target_video = sample_path
            else:
                raise HTTPException(status_code=404, detail="Archivo de video no encontrado")
        else:
            raise HTTPException(status_code=404, detail=f"Archivo de video no encontrado: {video_id}")

    metadata = get_video_metadata(target_video)
    calibration = request.calibration or CalibrationData()

    # Run neural tracking
    frames = model.process_video(target_video, request, metadata)

    # Apply selected movement interpretation
    interp = request.interpretation or "general"
    jump_res, gait_res, squat_res, kfs = apply_movement_interpretation(frames, metadata, interp)

    session_data = AnalysisSessionData(
        video_id=video_id,
        metadata=metadata,
        calibration=calibration,
        model_used=request.model_id,
        movement_interpretation=interp,
        frames=frames,
        keyframes=kfs,
        jump_analysis=jump_res,
        gait_analysis=gait_res,
        squat_analysis=squat_res,
        notes=""
    )

    SESSIONS[video_id] = session_data
    return session_data

@router.post("/interpret/{video_id}", response_model=AnalysisSessionData)
def change_interpretation(video_id: str, interpretation: str):
    """
    Switches the interpretation of the tracked movement ('general', 'gait', 'jump', 'squat')
    instantly without having to re-run neural inference.
    """
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    jump_res, gait_res, squat_res, kfs = apply_movement_interpretation(
        session.frames,
        session.metadata,
        interpretation
    )

    session.movement_interpretation = interpretation
    session.jump_analysis = jump_res
    session.gait_analysis = gait_res
    session.squat_analysis = squat_res
    session.keyframes = kfs

    return session

@router.get("/session/{video_id}", response_model=AnalysisSessionData)
def get_session(video_id: str):
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return session

@router.post("/cancel/{video_id}")
def cancel_tracking(video_id: str):
    """
    Flags the active tracking execution for video_id to terminate immediately.
    """
    CANCEL_REQUESTS.add(video_id)
    return {"status": "cancelling", "video_id": video_id}

