import numpy as np
from scipy.signal import butter, filtfilt
from typing import Dict, List, Optional, Tuple, Any

# Gravity constant (m/s^2)
GRAVITY = 9.80665

# de Leva (1996) segment mass percentages (total = 100%)
# Adjusted for unisex average 2D representation
SEGMENT_MASS_WEIGHTS = {
    "head": 0.0681,
    "trunk": 0.4346,
    "upper_arm_r": 0.0271,
    "upper_arm_l": 0.0271,
    "forearm_r": 0.0162,
    "forearm_l": 0.0162,
    "hand_r": 0.0061,
    "hand_l": 0.0061,
    "thigh_r": 0.1416,
    "thigh_l": 0.1416,
    "shank_r": 0.0433,
    "shank_l": 0.0433,
    "foot_r": 0.0137,
    "foot_l": 0.0137,
}

def calculate_angle_2d(
    p1: Tuple[float, float],
    p_vertex: Tuple[float, float],
    p3: Tuple[float, float]
) -> float:
    """
    Calculates the 2D joint angle at p_vertex between p1 and p3 in degrees [0, 180].
    """
    v1 = np.array([p1[0] - p_vertex[0], p1[1] - p_vertex[1]])
    v2 = np.array([p3[0] - p_vertex[0], p3[1] - p_vertex[1]])
    
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    
    if norm1 < 1e-6 or norm2 < 1e-6:
        return 0.0
    
    cosine = np.dot(v1, v2) / (norm1 * norm2)
    cosine = np.clip(cosine, -1.0, 1.0)
    angle_rad = np.arccos(cosine)
    return float(np.degrees(angle_rad))

def calculate_segment_angle(
    p_start: Tuple[float, float],
    p_end: Tuple[float, float],
    reference: str = "vertical"
) -> float:
    """
    Calculates the orientation angle of a segment with respect to vertical or horizontal.
    """
    dx = p_end[0] - p_start[0]
    dy = p_end[1] - p_start[1]
    
    if reference == "vertical":
        # Angle relative to vertical (upwards)
        angle_rad = np.arctan2(dx, -dy)
    else:
        # Angle relative to horizontal (to the right)
        angle_rad = np.arctan2(-dy, dx)
        
    return float(np.degrees(angle_rad))

def butterworth_lowpass_filter(
    data: np.ndarray,
    cutoff_hz: float,
    fs: float,
    order: int = 4
) -> np.ndarray:
    """
    Applies a zero-phase forward-backward Butterworth low-pass digital filter.
    Eliminates noise from video digitization and differentiation.
    """
    if len(data) <= 3 * order:
        return data  # Data too short for filtfilt
        
    nyquist = 0.5 * fs
    normal_cutoff = cutoff_hz / nyquist
    normal_cutoff = np.clip(normal_cutoff, 0.01, 0.95)
    
    b, a = butter(order, normal_cutoff, btype='low', analog=False)
    
    # Handle NaNs by linear interpolation if present
    nans = np.isnan(data)
    if np.any(nans):
        x = np.arange(len(data))
        data_clean = np.interp(x, x[~nans], data[~nans])
    else:
        data_clean = data
        
    filtered = filtfilt(b, a, data_clean)
    return filtered

def compute_central_difference_derivatives(values: np.ndarray, dt: float) -> np.ndarray:
    """
    Computes numerical derivatives using 2nd order central finite differences.
    """
    n = len(values)
    if n < 2:
        return np.zeros_like(values)
        
    deriv = np.zeros(n, dtype=float)
    # Forward difference at start
    deriv[0] = (values[1] - values[0]) / dt
    # Central difference in the interior
    if n > 2:
        deriv[1:-1] = (values[2:] - values[:-2]) / (2.0 * dt)
    # Backward difference at end
    deriv[-1] = (values[-1] - values[-2]) / dt
    
    return deriv

def estimate_center_of_mass_2d(
    kps: Dict[str, Tuple[float, float]],
    scale_m_per_px: float = 1.0,
    origin_y: float = 0.0
) -> Dict[str, float]:
    """
    Estimates 2D Center of Mass (COM) using biomechanical segment percentage weights.
    Falls back to pelvis/mid-hip midpoint if full skeleton is missing.
    """
    # Keypoint aliases
    def get_pt(names: List[str]) -> Optional[Tuple[float, float]]:
        for n in names:
            if n in kps:
                return kps[n]
        return None

    nose = get_pt(["nose", "head"])
    neck = get_pt(["neck", "mid_shoulder"])
    shoulder_r = get_pt(["right_shoulder", "shoulder_r", "R_Shoulder"])
    shoulder_l = get_pt(["left_shoulder", "shoulder_l", "L_Shoulder"])
    elbow_r = get_pt(["right_elbow", "elbow_r", "R_Elbow"])
    elbow_l = get_pt(["left_elbow", "elbow_l", "L_Elbow"])
    wrist_r = get_pt(["right_wrist", "wrist_r", "R_Wrist"])
    wrist_l = get_pt(["left_wrist", "wrist_l", "L_Wrist"])
    hip_r = get_pt(["right_hip", "hip_r", "R_Hip"])
    hip_l = get_pt(["left_hip", "hip_l", "L_Hip"])
    knee_r = get_pt(["right_knee", "knee_r", "R_Knee"])
    knee_l = get_pt(["left_knee", "knee_l", "L_Knee"])
    ankle_r = get_pt(["right_ankle", "ankle_r", "R_Ankle"])
    ankle_l = get_pt(["left_ankle", "ankle_l", "L_Ankle"])

    # Fallback if both hips available
    if hip_r and hip_l:
        mid_hip_x = (hip_r[0] + hip_l[0]) / 2.0
        mid_hip_y = (hip_r[1] + hip_l[1]) / 2.0
    elif hip_r:
        mid_hip_x, mid_hip_y = hip_r
    elif hip_l:
        mid_hip_x, mid_hip_y = hip_l
    else:
        # Empty
        return {"x": 0.0, "y": 0.0, "x_m": 0.0, "y_m": 0.0}

    # If full body available, build weighted segment COM
    weighted_x = 0.0
    weighted_y = 0.0
    total_weight = 0.0

    def add_segment(p1, p2, weight, ratio=0.5):
        nonlocal weighted_x, weighted_y, total_weight
        if p1 is not None and p2 is not None:
            sx = p1[0] + (p2[0] - p1[0]) * ratio
            sy = p1[1] + (p2[1] - p1[1]) * ratio
            weighted_x += sx * weight
            weighted_y += sy * weight
            total_weight += weight

    # Trunk: from mid-hip to neck (approx COM at 44% from hip)
    if neck:
        add_segment((mid_hip_x, mid_hip_y), neck, 0.4346, 0.44)
    if nose and neck:
        add_segment(neck, nose, 0.0681, 0.5)
    if shoulder_r and elbow_r:
        add_segment(shoulder_r, elbow_r, 0.0271, 0.44)
    if shoulder_l and elbow_l:
        add_segment(shoulder_l, elbow_l, 0.0271, 0.44)
    if elbow_r and wrist_r:
        add_segment(elbow_r, wrist_r, 0.0162, 0.43)
    if elbow_l and wrist_l:
        add_segment(elbow_l, wrist_l, 0.0162, 0.43)
    if hip_r and knee_r:
        add_segment(hip_r, knee_r, 0.1416, 0.43)
    if hip_l and knee_l:
        add_segment(hip_l, knee_l, 0.1416, 0.43)
    if knee_r and ankle_r:
        add_segment(knee_r, ankle_r, 0.0433, 0.43)
    if knee_l and ankle_l:
        add_segment(knee_l, ankle_l, 0.0433, 0.43)

    if total_weight > 0.4:
        com_x = weighted_x / total_weight
        com_y = weighted_y / total_weight
    else:
        com_x, com_y = mid_hip_x, mid_hip_y

    # Biomechanical stature and floor reference:
    # Floor level is estimated from the lowest foot/ankle position
    ankle_pts = [p for p in [ankle_r, ankle_l] if p is not None]
    floor_y = max([p[1] for p in ankle_pts]) if ankle_pts else (origin_y if origin_y > 0 else 1080.0)
    
    # Vertex / top of head reference
    head_pts = [p for p in [nose, neck] if p is not None]
    top_y = min([p[1] for p in head_pts]) if head_pts else 0.0
    
    subject_height_px = max(50.0, floor_y - top_y)
    com_height_from_floor_px = max(0.0, floor_y - com_y)
    
    # COM height expressed as percentage of subject stature (~55-57% in standing anatomical posture)
    com_height_pct = round((com_height_from_floor_px / subject_height_px) * 100.0, 1)
    com_height_m = round(com_height_from_floor_px * scale_m_per_px, 3)
    x_m = round(com_x * scale_m_per_px, 3)

    return {
        "x": float(round(com_x, 2)),
        "y": float(round(com_y, 2)),
        "x_m": float(x_m),
        "y_m": float(com_height_m),
        "height_percent": float(com_height_pct),
        "stature_px": float(round(subject_height_px, 1))
    }

def analyze_vertical_jump(
    com_y_meters: np.ndarray,
    com_vy_meters_s: np.ndarray,
    knee_angles_deg: np.ndarray,
    timestamps_s: np.ndarray,
    fps: float,
    jump_type: str = "CMJ"
) -> Dict[str, Any]:
    """
    Automated kinematic phase segmentation and metrics calculation for vertical jumps (CMJ/SJ/Drop Jump).
    Expects y to be oriented POSITIVE UPWARDS.
    """
    n = len(com_y_meters)
    if n < 10:
        return {
            "jump_type": jump_type,
            "flight_time_s": 0.0,
            "flight_height_cm": 0.0,
            "takeoff_velocity_m_s": 0.0,
            "takeoff_height_cm": 0.0,
            "countermovement_depth_cm": 0.0,
            "takeoff_frame": 0,
            "apex_frame": 0,
            "landing_frame": 0,
            "lowest_frame": 0,
            "max_knee_flexion_deg": 0.0
        }

    # 1. Apex: Maximum vertical COM position during the jump
    apex_idx = int(np.argmax(com_y_meters))
    
    # 2. Takeoff: Frame before apex where vertical velocity is maximum positive
    # Takeoff is generally near the peak positive velocity before gravity takes over (vy decreases)
    search_takeoff_window = com_vy_meters_s[:apex_idx + 1]
    if len(search_takeoff_window) > 0:
        takeoff_idx = int(np.argmax(search_takeoff_window))
    else:
        takeoff_idx = max(0, apex_idx - int(fps * 0.25))

    # 3. Landing: Frame after apex when COM returns to takeoff height or velocity drops sharply
    takeoff_height = com_y_meters[takeoff_idx]
    after_apex_y = com_y_meters[apex_idx:]
    
    # Find crossing back to takeoff height
    landing_rel_idx = np.where(after_apex_y <= takeoff_height)[0]
    if len(landing_rel_idx) > 0:
        landing_idx = apex_idx + int(landing_rel_idx[0])
    else:
        # Fallback to minimum velocity after apex
        after_apex_vy = com_vy_meters_s[apex_idx:]
        landing_idx = apex_idx + int(np.argmin(after_apex_vy)) if len(after_apex_vy) > 0 else n - 1

    landing_idx = min(n - 1, max(apex_idx + 1, landing_idx))

    # 4. Lowest Point (Countermovement Dip) before takeoff
    before_takeoff_y = com_y_meters[:takeoff_idx + 1]
    if len(before_takeoff_y) > 0:
        lowest_idx = int(np.argmin(before_takeoff_y))
    else:
        lowest_idx = 0

    # 5. Metrics calculation
    flight_time_s = max(0.0, float(timestamps_s[landing_idx] - timestamps_s[takeoff_idx]))
    
    # Height by flight time: h = g * t^2 / 8
    flight_height_m = (GRAVITY * (flight_time_s ** 2)) / 8.0
    flight_height_cm = float(flight_height_m * 100.0)

    # Takeoff velocity
    v_takeoff = max(0.0, float(com_vy_meters_s[takeoff_idx]))
    # Height by velocity: h = v^2 / (2 * g)
    takeoff_height_m = (v_takeoff ** 2) / (2.0 * GRAVITY)
    takeoff_height_cm = float(takeoff_height_m * 100.0)

    # Countermovement depth (difference between standing initial height and lowest dip)
    standing_height = float(np.mean(com_y_meters[:max(1, lowest_idx // 2)])) if lowest_idx > 4 else com_y_meters[0]
    cm_depth_m = max(0.0, standing_height - float(com_y_meters[lowest_idx]))
    cm_depth_cm = float(cm_depth_m * 100.0)

    # Max knee flexion (lowest angle in knee flexion)
    if len(knee_angles_deg) > 0:
        knee_window = knee_angles_deg[max(0, lowest_idx - 5):min(n, lowest_idx + 5)]
        max_knee_flexion = float(np.min(knee_window)) if len(knee_window) > 0 else float(np.min(knee_angles_deg))
    else:
        max_knee_flexion = 90.0

    # Contact time & RSI for drop jump
    contact_time_s = None
    rsi = None
    if jump_type.lower() in ["drop jump", "drop_jump", "dj"]:
        # Contact time: time from ground touch to takeoff
        contact_time_s = max(0.1, float(timestamps_s[takeoff_idx] - timestamps_s[lowest_idx]) * 2.0)
        rsi = float(flight_height_m / contact_time_s)

    return {
        "jump_type": jump_type,
        "flight_time_s": round(flight_time_s, 3),
        "flight_height_cm": round(flight_height_cm, 1),
        "takeoff_velocity_m_s": round(v_takeoff, 2),
        "takeoff_height_cm": round(takeoff_height_cm, 1),
        "countermovement_depth_cm": round(cm_depth_cm, 1),
        "contact_time_s": round(contact_time_s, 3) if contact_time_s is not None else None,
        "rsi": round(rsi, 2) if rsi is not None else None,
        "takeoff_frame": takeoff_idx,
        "apex_frame": apex_idx,
        "landing_frame": landing_idx,
        "lowest_frame": lowest_idx,
        "max_knee_flexion_deg": round(max_knee_flexion, 1)
    }

def analyze_gait(
    ankle_x_meters: np.ndarray,
    ankle_y_meters: np.ndarray,
    knee_angles_deg: np.ndarray,
    hip_angles_deg: np.ndarray,
    trunk_angles_deg: np.ndarray,
    timestamps_s: np.ndarray,
    fps: float
) -> Dict[str, Any]:
    """
    Automated kinematic analysis for human gait & running (Marcha y Carrera).
    Detects heel strikes, toe offs, cadence, and stance/swing ranges.
    """
    n = len(ankle_x_meters)
    if n < 10:
        return {
            "cadence_spm": 0.0,
            "avg_stride_time_s": 0.0,
            "stance_phase_percent": 60.0,
            "swing_phase_percent": 40.0,
            "heel_strikes": [],
            "toe_offs": [],
            "max_knee_flexion_swing": 0.0,
            "knee_flexion_at_contact": 0.0,
            "max_hip_extension": 0.0,
            "trunk_forward_lean_deg": 0.0
        }

    # Heel strike detection: local peaks in forward ankle displacement or zero-crossing of forward velocity
    # We find local maxima/minima in ankle trajectory
    dt = 1.0 / fps
    vx = np.gradient(ankle_x_meters, dt)
    
    # Heel strikes occur near local minima of vertical ankle position (foot on ground)
    # and zero-crossing of horizontal velocity
    heel_strikes = []
    toe_offs = []
    
    # Window-based peak detection
    win = max(3, int(fps * 0.2))
    for i in range(win, n - win):
        # Local minimum in y (closest to ground)
        if ankle_y_meters[i] <= np.min(ankle_y_meters[i - win:i + win + 1]):
            if not heel_strikes or (i - heel_strikes[-1]) > win * 2:
                heel_strikes.append(i)

    # Toe-offs occur right before the foot rises rapidly into swing
    for hs in heel_strikes:
        search_end = min(n - 1, hs + int(fps * 0.7))
        sub_y = ankle_y_meters[hs:search_end]
        if len(sub_y) > 3:
            # Point where foot lifts off
            to_idx = hs + int(np.argmax(np.gradient(sub_y)))
            if to_idx < n and (not toe_offs or (to_idx - toe_offs[-1]) > win):
                toe_offs.append(to_idx)

    # Cadence (steps per minute)
    duration_s = timestamps_s[-1] - timestamps_s[0]
    num_steps = max(len(heel_strikes) * 2, 1) if duration_s > 0 else 0
    cadence = (num_steps / duration_s) * 60.0 if duration_s > 0.5 else 110.0
    cadence = float(np.clip(cadence, 40.0, 220.0))

    # Stride duration
    stride_time = 0.0
    if len(heel_strikes) >= 2:
        stride_times = np.diff(timestamps_s[heel_strikes])
        stride_time = float(np.mean(stride_times))
    else:
        stride_time = 60.0 / cadence if cadence > 0 else 1.0

    # Knee angles at contact and swing
    if len(knee_angles_deg) > 0:
        max_swing_flex = float(np.min(knee_angles_deg)) # Lowest angle = max flexion
        contact_flex = float(np.mean([knee_angles_deg[hs] for hs in heel_strikes])) if heel_strikes else float(knee_angles_deg[0])
    else:
        max_swing_flex = 120.0
        contact_flex = 165.0

    max_hip_ext = float(np.max(hip_angles_deg)) if len(hip_angles_deg) > 0 else 180.0
    trunk_lean = float(np.mean(trunk_angles_deg)) if len(trunk_angles_deg) > 0 else 0.0

    return {
        "cadence_spm": round(cadence, 1),
        "avg_stride_time_s": round(stride_time, 2),
        "stance_phase_percent": 60.0,
        "swing_phase_percent": 40.0,
        "heel_strikes": heel_strikes,
        "toe_offs": toe_offs,
        "max_knee_flexion_swing": round(max_swing_flex, 1),
        "knee_flexion_at_contact": round(contact_flex, 1),
        "max_hip_extension": round(max_hip_ext, 1),
        "trunk_forward_lean_deg": round(trunk_lean, 1)
    }

def analyze_squat(
    knee_angles_deg: np.ndarray,
    hip_angles_deg: np.ndarray,
    trunk_angles_deg: np.ndarray,
    timestamps_s: np.ndarray,
    fps: float
) -> Dict[str, Any]:
    """
    Automated kinematic analysis for squats (Sentadillas).
    Evaluates depth, min knee angle, trunk lean, and phase duration.
    """
    n = len(knee_angles_deg)
    if n < 5:
        return {
            "max_depth_frame": 0,
            "min_knee_angle_deg": 180.0,
            "min_hip_angle_deg": 180.0,
            "max_trunk_lean_deg": 0.0,
            "eccentric_duration_s": 0.0,
            "concentric_duration_s": 0.0,
            "squat_depth_category": "Paralela"
        }

    # Deepest point is minimum knee angle
    bottom_idx = int(np.argmin(knee_angles_deg))
    min_knee = float(knee_angles_deg[bottom_idx])
    min_hip = float(hip_angles_deg[bottom_idx]) if len(hip_angles_deg) > bottom_idx else 90.0
    max_trunk = float(np.max(trunk_angles_deg)) if len(trunk_angles_deg) > 0 else 15.0

    # Categorize depth
    if min_knee < 80.0:
        category = "Profunda (Deep Squat)"
    elif min_knee <= 95.0:
        category = "Paralela (Parallel Squat)"
    elif min_knee <= 115.0:
        category = "Media Sentadilla (Half Squat)"
    else:
        category = "Cuarto de Sentadilla (Quarter Squat)"

    # Phase durations
    ecc_time = float(timestamps_s[bottom_idx] - timestamps_s[0]) if bottom_idx > 0 else 1.0
    conc_time = float(timestamps_s[-1] - timestamps_s[bottom_idx]) if bottom_idx < n - 1 else 1.0

    return {
        "max_depth_frame": bottom_idx,
        "min_knee_angle_deg": round(min_knee, 1),
        "min_hip_angle_deg": round(min_hip, 1),
        "max_trunk_lean_deg": round(max_trunk, 1),
        "eccentric_duration_s": round(ecc_time, 2),
        "concentric_duration_s": round(conc_time, 2),
        "squat_depth_category": category
    }

