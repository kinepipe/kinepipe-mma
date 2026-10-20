from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any

class ModelCapabilityInfo(BaseModel):
    id: str
    name: str
    author: str
    description: str
    cameras_required: str
    calibration_type: str
    outputs: List[str]
    recommended_for: str
    gpu_support: bool = True
    is_installed: bool = True
    install_command: Optional[str] = None
    icon: Optional[str] = "Activity"

class VideoMetadata(BaseModel):
    video_id: str
    filename: str
    filepath: str
    width: int
    height: int
    fps: float
    total_frames: int
    duration_s: float
    aspect_ratio: str

class CalibrationData(BaseModel):
    pixel_distance: float = 100.0
    real_distance_m: float = 1.0
    scale_m_per_px: float = 0.01  # real / pixel
    calibration_mode: Optional[str] = "object"  # "stature" | "object"
    subject_height_m: Optional[float] = None
    point_a: Optional[List[float]] = None
    point_b: Optional[List[float]] = None
    origin_px: Optional[List[float]] = Field(default_factory=lambda: [0.0, 0.0])
    axis_y_up: bool = True

class Keypoint(BaseModel):
    name: str
    x: float
    y: float
    confidence: float
    x_m: Optional[float] = None
    y_m: Optional[float] = None

class FrameData(BaseModel):
    frame_index: int
    time_s: float
    keypoints: Dict[str, Keypoint]
    angles: Dict[str, float] = Field(default_factory=dict)
    velocities: Dict[str, float] = Field(default_factory=dict)
    accelerations: Dict[str, float] = Field(default_factory=dict)
    com: Optional[Dict[str, float]] = None  # {x, y, x_m, y_m}

class Keyframe(BaseModel):
    id: str
    frame_index: int
    time_s: float
    title: str
    event_type: str = "custom"  # "heel_strike", "toe_off", "takeoff", "apex", "landing", "squat_bottom", "custom"
    notes: str = ""
    thumbnail_url: Optional[str] = None
    angles_snapshot: Optional[Dict[str, float]] = None

class JumpAnalysisResult(BaseModel):
    jump_type: str = "CMJ"
    flight_time_s: float = 0.0
    flight_height_cm: float = 0.0
    takeoff_velocity_m_s: float = 0.0
    takeoff_height_cm: float = 0.0
    countermovement_depth_cm: float = 0.0
    contact_time_s: Optional[float] = None
    rsi: Optional[float] = None
    takeoff_frame: int = 0
    apex_frame: int = 0
    landing_frame: int = 0
    lowest_frame: Optional[int] = None
    max_knee_flexion_deg: float = 0.0

class GaitAnalysisResult(BaseModel):
    cadence_spm: float = 0.0       # Steps per minute
    avg_stride_time_s: float = 0.0 # Time between consecutive heel strikes
    stance_phase_percent: float = 60.0
    swing_phase_percent: float = 40.0
    heel_strikes: List[int] = Field(default_factory=list) # Frame indices
    toe_offs: List[int] = Field(default_factory=list)     # Frame indices
    max_knee_flexion_swing: float = 0.0
    knee_flexion_at_contact: float = 0.0
    max_hip_extension: float = 0.0
    trunk_forward_lean_deg: float = 0.0

class SquatAnalysisResult(BaseModel):
    max_depth_frame: int = 0
    min_knee_angle_deg: float = 0.0
    min_hip_angle_deg: float = 0.0
    max_trunk_lean_deg: float = 0.0
    eccentric_duration_s: float = 0.0
    concentric_duration_s: float = 0.0
    squat_depth_category: str = "Paralela"  # "Profunda", "Paralela", "Media", "Cuarto"

class TrackingRequest(BaseModel):
    video_id: str
    model_id: str = "sports2d"  # "sports2d", "pose2sim", "deeplabcut", "fast_pose"
    roi_start_frame: Optional[int] = 0
    roi_end_frame: Optional[int] = None
    roi_start_time_s: Optional[float] = None
    roi_end_time_s: Optional[float] = None
    subject_height_m: Optional[float] = 1.75
    butterworth_cutoff_hz: float = 6.0
    calibration: Optional[CalibrationData] = None
    dlc_config_path: Optional[str] = None
    interpretation: Optional[str] = "general" # "general", "gait", "jump", "squat"

class KinematicsRecalcRequest(BaseModel):
    video_id: str
    butterworth_cutoff_hz: float = 6.0
    butterworth_order: int = 4
    calibration: Optional[CalibrationData] = None
    interpretation: Optional[str] = "general"

class AnalysisSessionData(BaseModel):
    video_id: str
    metadata: VideoMetadata
    calibration: CalibrationData
    model_used: str
    movement_interpretation: str = "general" # "general", "gait", "jump", "squat"
    frames: List[FrameData]
    keyframes: List[Keyframe]
    jump_analysis: Optional[JumpAnalysisResult] = None
    gait_analysis: Optional[GaitAnalysisResult] = None
    squat_analysis: Optional[SquatAnalysisResult] = None
    notes: str = ""
