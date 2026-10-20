import cv2
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
import uuid
from .schemas import VideoMetadata, FrameData

# Standard 2D biomechanical skeleton connections
SKELETON_BONES = [
    ("nose", "neck"),
    ("neck", "right_shoulder"),
    ("right_shoulder", "right_elbow"),
    ("right_elbow", "right_wrist"),
    ("neck", "left_shoulder"),
    ("left_shoulder", "left_elbow"),
    ("left_elbow", "left_wrist"),
    ("neck", "mid_hip"),
    ("mid_hip", "right_hip"),
    ("right_hip", "right_knee"),
    ("right_knee", "right_ankle"),
    ("mid_hip", "left_hip"),
    ("left_hip", "left_knee"),
    ("left_knee", "left_ankle"),
]

def get_video_metadata(filepath: Path) -> VideoMetadata:
    """
    Extracts precise video resolution, FPS, total frames and duration using OpenCV.
    """
    cap = cv2.VideoCapture(str(filepath))
    if not cap.isOpened():
        raise ValueError(f"No se pudo abrir el video en {filepath}")
        
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = float(cap.get(cv2.CAP_PROP_FPS))
    if fps <= 0 or np.isnan(fps):
        fps = 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_s = total_frames / fps if fps > 0 else 0.0
    
    # Calculate aspect ratio
    gcd = np.gcd(width, height) if width > 0 and height > 0 else 1
    ar_w = width // gcd
    ar_h = height // gcd
    aspect_ratio = f"{ar_w}:{ar_h}"
    
    cap.release()
    
    video_id = filepath.stem
    return VideoMetadata(
        video_id=video_id,
        filename=filepath.name,
        filepath=str(filepath),
        width=width,
        height=height,
        fps=round(fps, 3),
        total_frames=total_frames,
        duration_s=round(duration_s, 3),
        aspect_ratio=aspect_ratio
    )

def extract_frame_image(filepath: Path, frame_index: int) -> Optional[np.ndarray]:
    """
    Extracts a specific frame image as BGR numpy array.
    """
    cap = cv2.VideoCapture(str(filepath))
    if not cap.isOpened():
        return None
        
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    ret, frame = cap.read()
    cap.release()
    
    return frame if ret else None

def save_frame_thumbnail(filepath: Path, frame_index: int, output_path: Path, max_width: int = 320) -> bool:
    """
    Saves a downscaled JPG thumbnail of a video frame.
    """
    frame = extract_frame_image(filepath, frame_index)
    if frame is None:
        return False
        
    h, w = frame.shape[:2]
    if w > max_width:
        scale = max_width / float(w)
        new_w = max_width
        new_h = int(h * scale)
        frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
    output_path.parent.mkdir(parents=True, exist_ok=True)
    return cv2.imwrite(str(output_path), frame)

def render_annotated_video(
    source_video_path: Path,
    output_video_path: Path,
    frames_data: List[FrameData],
    show_skeleton: bool = True,
    show_angles: bool = True,
    show_com: bool = True,
    show_trajectories: bool = True,
    layout: str = "bottom_bar"  # "bottom_bar", "transparent_overlay", "clean"
) -> bool:
    """
    Renders an annotated MP4 video with skeleton, angle readouts, and COM trajectories.
    Layout options:
      - 'bottom_bar' (default): Dedicated telemetry dashboard beneath the video. The video frame itself is 100% clean and unobstructed.
      - 'transparent_overlay': Semi-transparent floating HUD overlay with 45% alpha transparency.
      - 'clean': Only skeleton and COM markers, zero HUD boxes.
    """
    cap = cv2.VideoCapture(str(source_video_path))
    if not cap.isOpened():
        return False
        
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = float(cap.get(cv2.CAP_PROP_FPS))
    if fps <= 0:
        fps = 30.0

    output_video_path.parent.mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')

    # If bottom_bar layout is selected, expand canvas downwards so the video remains completely unobstructed!
    if layout == "bottom_bar" and show_angles:
        footer_h = max(86, int(height * 0.12))
        out_w = width
        out_h = height + footer_h
    else:
        footer_h = 0
        out_w = width
        out_h = height

    out = cv2.VideoWriter(str(output_video_path), fourcc, fps, (out_w, out_h))

    frame_dict = {f.frame_index: f for f in frames_data}
    history_com: List[Tuple[int, int]] = []
    
    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        data = frame_dict.get(frame_idx)
        if data:
            kps = data.keypoints
            
            # 1. Trajectory trail (COM)
            if show_com and data.com and data.com.get("x") and data.com.get("y"):
                com_pt = (int(data.com["x"]), int(data.com["y"]))
                history_com.append(com_pt)
                if len(history_com) > 40:
                    history_com.pop(0)
                    
                if show_trajectories and len(history_com) > 1:
                    for i in range(1, len(history_com)):
                        alpha = i / len(history_com)
                        thickness = max(1, int(3 * alpha))
                        cv2.line(frame, history_com[i-1], history_com[i], (0, 215, 255), thickness)
                        
                # Draw COM symbol
                cv2.circle(frame, com_pt, 8, (0, 165, 255), -1)
                cv2.circle(frame, com_pt, 12, (255, 255, 255), 2)
                cv2.line(frame, (com_pt[0] - 16, com_pt[1]), (com_pt[0] + 16, com_pt[1]), (255, 255, 255), 1)
                cv2.line(frame, (com_pt[0], com_pt[1] - 16), (com_pt[0], com_pt[1] + 16), (255, 255, 255), 1)

            # 2. Skeleton bones
            if show_skeleton:
                pts = {}
                for name, kp in kps.items():
                    if kp.confidence > 0.3:
                        pts[name] = (int(kp.x), int(kp.y))
                if "right_hip" in pts and "left_hip" in pts:
                    pts["mid_hip"] = (
                        (pts["right_hip"][0] + pts["left_hip"][0]) // 2,
                        (pts["right_hip"][1] + pts["left_hip"][1]) // 2
                    )

                for p1_name, p2_name in SKELETON_BONES:
                    if p1_name in pts and p2_name in pts:
                        cv2.line(frame, pts[p1_name], pts[p2_name], (0, 255, 128), 3)

                # Draw joint keypoints
                for name, pt in pts.items():
                    cv2.circle(frame, pt, 5, (0, 255, 255), -1)
                    cv2.circle(frame, pt, 6, (0, 0, 0), 1)

            # 3. Telemetry Layout Presentation
            if layout == "bottom_bar" and show_angles:
                # Composite the clean video on top, with dedicated biomechanical bar underneath
                canvas = np.full((out_h, out_w, 3), (18, 22, 28), dtype=np.uint8)
                canvas[0:height, 0:width] = frame

                # Accent divider line separating video and telemetry
                cv2.line(canvas, (0, height), (out_w, height), (0, 255, 136), 2)

                # Left side: Timecode and frame rate
                font_scale = 0.52 if width >= 1280 else 0.42
                cv2.putText(
                    canvas,
                    f"TIEMPO: {data.time_s:.2f}s  |  FOTOGRAMA: {frame_idx:04d}  |  {fps:.1f} FPS",
                    (20, height + int(footer_h * 0.42)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    font_scale,
                    (0, 255, 200),
                    1
                )
                cv2.putText(
                    canvas,
                    "KINOVEA-AI BIOMECHANICS TELEMETRY",
                    (20, height + int(footer_h * 0.78)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    font_scale * 0.85,
                    (140, 160, 180),
                    1
                )

                # Middle/Right: Horizontal Biomechanical Badges
                if data.angles:
                    badge_start_x = max(int(width * 0.38), 380)
                    badge_w = min(170, max(120, int((width - badge_start_x - 40) / max(1, len(data.angles)))))
                    x_pos = badge_start_x
                    
                    for angle_name, angle_val in data.angles.items():
                        if x_pos + badge_w <= out_w - 15:
                            # Badge background and subtle border
                            cv2.rectangle(
                                canvas,
                                (x_pos, height + 8),
                                (x_pos + badge_w, height + footer_h - 8),
                                (28, 34, 46),
                                -1
                            )
                            cv2.rectangle(
                                canvas,
                                (x_pos, height + 8),
                                (x_pos + badge_w, height + footer_h - 8),
                                (55, 70, 92),
                                1
                            )
                            clean_name = angle_name.replace("_", " ").title()
                            cv2.putText(
                                canvas,
                                clean_name,
                                (x_pos + 8, height + int(footer_h * 0.38)),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                font_scale * 0.75,
                                (180, 200, 225),
                                1
                            )
                            cv2.putText(
                                canvas,
                                f"{angle_val:.1f} deg",
                                (x_pos + 8, height + int(footer_h * 0.76)),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                font_scale * 0.95,
                                (0, 255, 136),
                                2
                            )
                            x_pos += badge_w + 10

                final_output_frame = canvas

            elif layout == "transparent_overlay" and show_angles and data.angles:
                # Semi-transparent overlay box in top-left
                overlay = frame.copy()
                box_h = 30 + len(data.angles) * 25
                cv2.rectangle(overlay, (10, 10), (310, box_h), (20, 24, 30), -1)
                cv2.rectangle(overlay, (10, 10), (310, box_h), (0, 255, 128), 1)
                cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)

                cv2.putText(frame, "BIOMECHANICS KINEMATICS", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 128), 2)
                y_offset = 70
                for angle_name, angle_val in data.angles.items():
                    clean_name = angle_name.replace("_", " ").title()
                    text = f"{clean_name}: {angle_val:.1f} deg"
                    cv2.putText(frame, text, (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1)
                    y_offset += 24

                # HUD Banner
                hud_text = f"Frame: {frame_idx:04d} | Time: {data.time_s:.3f}s | FPS: {fps:.1f}"
                cv2.putText(frame, hud_text, (width - 380, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2)
                final_output_frame = frame
            else:
                # Clean mode or no angles
                final_output_frame = frame

        else:
            final_output_frame = frame

        out.write(final_output_frame)
        frame_idx += 1

    cap.release()
    out.release()
    return True

def generate_sample_biomechanical_video(output_path: Path, duration_s: float = 3.0, fps: float = 30.0) -> bool:
    """
    Synthesizes a realistic Countermovement Jump (CMJ) demonstration video with
    ground level, a 1-meter calibration stick, and an animated biomechanical stick figure.
    Allows instant out-of-the-box testing without needing external files!
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 1280, 720
    total_frames = int(duration_s * fps)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
    
    # Ground at y = 620
    ground_y = 620
    base_x = 640
    
    # Jump timeline parameters
    # 0.0 - 0.5s: Standing quiet (frames 0 to 15)
    # 0.5 - 1.2s: Countermovement dip down (frames 15 to 36)
    # 1.2 - 1.4s: Explosive extension to takeoff (frames 36 to 42)
    # 1.4 - 2.1s: Flight in the air, apex at ~1.75s (frames 42 to 63)
    # 2.1 - 2.5s: Landing and absorption (frames 63 to 75)
    # 2.5 - 3.0s: Return to standing (frames 75 to 90)

    for i in range(total_frames):
        t = i / fps
        frame = np.full((height, width, 3), (25, 28, 36), dtype=np.uint8)
        
        # Draw Laboratory Grid
        for gx in range(0, width, 100):
            cv2.line(frame, (gx, 0), (gx, height), (35, 40, 52), 1)
        for gy in range(0, height, 100):
            cv2.line(frame, (0, gy), (width, gy), (35, 40, 52), 1)
            
        # Draw Ground Line
        cv2.line(frame, (0, ground_y), (width, ground_y), (80, 95, 120), 4)
        cv2.putText(frame, "GROUND LEVEL (Y = 0.00 m)", (40, ground_y + 35), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (120, 140, 170), 1)
        
        # Draw 1-Meter Calibration Bar
        calib_x = 220
        calib_y2 = ground_y
        calib_len_px = 240  # 240 px = 1.0 m -> 0.004167 m/px
        calib_y1 = calib_y2 - calib_len_px
        cv2.line(frame, (calib_x, calib_y1), (calib_x, calib_y2), (0, 220, 255), 4)
        cv2.line(frame, (calib_x - 15, calib_y1), (calib_x + 15, calib_y1), (0, 220, 255), 3)
        cv2.line(frame, (calib_x - 15, calib_y2), (calib_x + 15, calib_y2), (0, 220, 255), 3)
        cv2.putText(frame, "1.00 m CALIBRATION BAR", (calib_x - 30, calib_y1 - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 220, 255), 1)

        # Compute vertical trajectory of pelvis/hips
        standing_hip_y = ground_y - 230  # approx 390
        
        if t < 0.5:
            hip_y = standing_hip_y
            phase_text = "Fase 1: Bipedestacion Estable"
        elif t < 1.1:
            # Dip down: countermovement dip of 90px (~38cm)
            dip_progress = (t - 0.5) / 0.6
            dip_amount = np.sin(dip_progress * np.pi / 2.0) * 85
            hip_y = standing_hip_y + dip_amount
            phase_text = "Fase 2: Contramovimiento (Flexion de Rodillas/Caderas)"
        elif t < 1.35:
            # Push-off / concentric extension
            push_progress = (t - 1.1) / 0.25
            hip_y = (standing_hip_y + 85) - push_progress * 95
            phase_text = "Fase 3: Propulsion Concentrica (Despegue)"
        elif t < 2.05:
            # Flight parabolic: apex at 1.70s
            t_flight = t - 1.35
            flight_duration = 0.70
            # Parabolic equation: y = -4 * h_max / T^2 * (t - T/2)^2 + h_max
            h_jump_px = 120.0  # ~50 cm jump height
            rel_t = t_flight - (flight_duration / 2.0)
            y_disp = h_jump_px * (1.0 - (2.0 * rel_t / flight_duration) ** 2)
            hip_y = (standing_hip_y - 10) - y_disp
            phase_text = "Fase 4: Vuelo Libre (Tiempo en el Aire)"
        elif t < 2.45:
            # Landing absorption
            land_progress = (t - 2.05) / 0.4
            land_dip = np.sin(land_progress * np.pi) * 70
            hip_y = standing_hip_y + land_dip
            phase_text = "Fase 5: Aterrizaje y Amortiguacion"
        else:
            hip_y = standing_hip_y
            phase_text = "Fase 6: Recuperacion Post-Salto"

        # Kinematic stick figure coordinates
        feet_y = ground_y if t <= 1.35 or t >= 2.05 else hip_y + 210
        knee_y = (hip_y + feet_y) / 2.0 + (30 if hip_y > standing_hip_y else 0)
        knee_x_r = base_x + 35
        knee_x_l = base_x - 35
        
        pelvis = (base_x, int(hip_y))
        r_hip = (base_x + 20, int(hip_y))
        l_hip = (base_x - 20, int(hip_y))
        
        r_knee = (knee_x_r, int(knee_y))
        l_knee = (knee_x_l, int(knee_y))
        
        r_ankle = (base_x + 25, int(feet_y))
        l_ankle = (base_x - 25, int(feet_y))
        
        trunk_len = 140
        neck = (base_x, int(hip_y - trunk_len))
        head = (base_x, int(hip_y - trunk_len - 35))
        
        r_shoulder = (base_x + 35, int(neck[1] + 15))
        l_shoulder = (base_x - 35, int(neck[1] + 15))
        
        arm_swing = -50 if 1.1 <= t <= 1.8 else 30
        r_elbow = (base_x + 50, int(r_shoulder[1] + arm_swing))
        l_elbow = (base_x - 50, int(l_shoulder[1] + arm_swing))
        r_wrist = (base_x + 60, int(r_elbow[1] + arm_swing * 0.8))
        l_wrist = (base_x - 60, int(l_elbow[1] + arm_swing * 0.8))

        # Render Figure
        cv2.circle(frame, head, 24, (220, 230, 245), -1)
        cv2.circle(frame, head, 25, (0, 255, 128), 2)
        cv2.line(frame, neck, pelvis, (220, 230, 245), 6)
        
        # Lower limbs
        cv2.line(frame, r_hip, r_knee, (0, 255, 128), 5)
        cv2.line(frame, r_knee, r_ankle, (0, 255, 128), 5)
        cv2.line(frame, l_hip, l_knee, (0, 215, 255), 5)
        cv2.line(frame, l_knee, l_ankle, (0, 215, 255), 5)
        
        # Upper limbs
        cv2.line(frame, r_shoulder, r_elbow, (255, 180, 0), 4)
        cv2.line(frame, r_elbow, r_wrist, (255, 180, 0), 4)
        cv2.line(frame, l_shoulder, l_elbow, (255, 180, 0), 4)
        cv2.line(frame, l_elbow, l_wrist, (255, 180, 0), 4)
        
        # Markers
        for pt in [head, neck, r_shoulder, l_shoulder, r_hip, l_hip, r_knee, l_knee, r_ankle, l_ankle]:
            cv2.circle(frame, pt, 6, (255, 255, 255), -1)
            cv2.circle(frame, pt, 8, (0, 0, 0), 2)

        # Overlay text
        cv2.putText(frame, "BIOMECHANICS STUDIO AI - MUESTRA SINTETICA CMJ", (40, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 128), 2)
        cv2.putText(frame, phase_text, (40, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 215, 255), 2)
        cv2.putText(frame, f"t = {t:.2f} s | Frame {i+1}/{total_frames}", (width - 320, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 1)

        out.write(frame)

    out.release()
    return True
