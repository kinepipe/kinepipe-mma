import os
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

from .base_tracker import BaseTracker
from ..core.schemas import ModelCapabilityInfo, VideoMetadata, TrackingRequest, FrameData, Keypoint
from ..core.kinematics_math import (
    calculate_angle_2d,
    calculate_segment_angle,
    butterworth_lowpass_filter,
    compute_central_difference_derivatives,
    estimate_center_of_mass_2d
)

class Sports2DAdapter(BaseTracker):
    _yolo_model = None

    @classmethod
    def get_yolo(cls):
        if cls._yolo_model is None:
            try:
                from ultralytics import YOLO
                cls._yolo_model = YOLO("yolov8n-pose.pt")
            except Exception as e:
                print(f"[Sports2DAdapter] Error loading YOLOv8-pose: {e}")
        return cls._yolo_model

    @property
    def model_id(self) -> str:
        return "sports2d"

    def get_info(self) -> ModelCapabilityInfo:
        return ModelCapabilityInfo(
            id=self.model_id,
            name="Sports2D / YOLOv8-Pose (David Pagnon)",
            author="David Pagnon / Ultralytics",
            description="Estimación y cinemática 2D de alta precisión para personas reales en video. Detecta automáticamente las 17 articulaciones COCO, calcula ángulos de marcha/salto, velocidades y aceleraciones con filtro Butterworth.",
            cameras_required="1 cámara (Monocular en plano sagital o frontal)",
            calibration_type="Altura conocida del deportista (m) o barra de calibración (2 puntos)",
            outputs=[
                "Detección real de personas y articulaciones (COCO 17 puntos)",
                "Ángulos articulares anatómicos (rodilla, cadera, tobillo, codo, tronco)",
                "Velocidades lineales (m/s) y angulares (°/s)",
                "Filtrado digital Butterworth paso-bajo fase cero",
                "Exportación a OpenSim TRC, Kinovea KVA y CSV"
            ],
            recommended_for="Evaluación de marcha, carrera, saltos y clínica del movimiento en cualquier entorno",
            gpu_support=True,
            is_installed=True,
            install_command="uv pip install ultralytics",
            icon="Activity"
        )

    def is_available(self) -> bool:
        try:
            from ultralytics import YOLO
            return True
        except ImportError:
            return False

    def process_video(
        self,
        video_path: Path,
        request: TrackingRequest,
        metadata: VideoMetadata
    ) -> List[FrameData]:
        """
        Runs real YOLOv8-Pose neural tracking over video frames.
        Tracks anatomical joints with sub-pixel precision and filters via Butterworth.
        """
        scale_m_per_px = request.calibration.scale_m_per_px if request.calibration else 0.005
        cutoff_hz = request.butterworth_cutoff_hz or 6.0
        fps = metadata.fps or 30.0
        dt = 1.0 / fps

        model = self.get_yolo()
        cap = cv2.VideoCapture(str(video_path))
        
        if request.roi_start_time_s is not None and request.roi_start_time_s >= 0:
            start_frame = max(0, int(request.roi_start_time_s * fps))
        else:
            start_frame = max(0, request.roi_start_frame or 0)

        if request.roi_end_time_s is not None and request.roi_end_time_s > 0:
            end_frame = min(metadata.total_frames, int(request.roi_end_time_s * fps))
        elif request.roi_end_frame is not None and request.roi_end_frame > 0:
            end_frame = min(metadata.total_frames, request.roi_end_frame)
        else:
            end_frame = metadata.total_frames

        if end_frame <= start_frame:
            end_frame = metadata.total_frames
        
        # Raw trajectories for 14 standard keypoints
        raw_trajectories: Dict[str, List[Tuple[float, float, float]]] = {
            "nose": [],
            "neck": [],
            "right_shoulder": [],
            "left_shoulder": [],
            "right_elbow": [],
            "left_elbow": [],
            "right_wrist": [],
            "left_wrist": [],
            "right_hip": [],
            "left_hip": [],
            "right_knee": [],
            "left_knee": [],
            "right_ankle": [],
            "left_ankle": [],
        }

        # Track previous person box to ensure consistent person identity across frames
        prev_box = None
        
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        curr_frame = start_frame

        from ..api.routes_tracking import CANCEL_REQUESTS

        while curr_frame < end_frame:
            # Check for interactive cancellation
            if request.video_id in CANCEL_REQUESTS:
                CANCEL_REQUESTS.discard(request.video_id)
                break

            ret, frame = cap.read()
            if not ret:
                break
                
            h, w = frame.shape[:2]
            
            # Run YOLO Pose model
            detected_kps = None
            if model is not None:
                try:
                    results = model(frame, verbose=False)
                    for r in results:
                        if r.keypoints is not None and len(r.keypoints.data) > 0:
                            all_kpts = r.keypoints.data.cpu().numpy() # [num_persons, 17, 3]
                            boxes = r.boxes.xyxy.cpu().numpy() if r.boxes is not None else None
                            
                            # Select person: if prev_box exists, pick closest; else pick largest box
                            best_idx = 0
                            if len(all_kpts) > 1 and boxes is not None:
                                if prev_box is not None:
                                    # Distance between centers
                                    prev_center = ((prev_box[0] + prev_box[2]) / 2, (prev_box[1] + prev_box[3]) / 2)
                                    min_dist = float('inf')
                                    for i, b in enumerate(boxes):
                                        center = ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)
                                        dist = (center[0] - prev_center[0])**2 + (center[1] - prev_center[1])**2
                                        if dist < min_dist:
                                            min_dist = dist
                                            best_idx = i
                                else:
                                    # Pick largest bounding box
                                    areas = [(b[2] - b[0]) * (b[3] - b[1]) for b in boxes]
                                    best_idx = int(np.argmax(areas))

                            if boxes is not None and len(boxes) > best_idx:
                                prev_box = boxes[best_idx]
                                
                            detected_kps = all_kpts[best_idx]
                            break
                except Exception as e:
                    print(f"[Sports2DAdapter] Inference error on frame {curr_frame}: {e}")

            # Map COCO 17 keypoints to standard names:
            # 0: nose, 5: l_sh, 6: r_sh, 7: l_el, 8: r_el, 9: l_wr, 10: r_wr,
            # 11: l_hip, 12: r_hip, 13: l_knee, 14: r_knee, 15: l_ank, 16: r_ank
            if detected_kps is not None and len(detected_kps) >= 17:
                def get_kp(idx):
                    x, y, conf = detected_kps[idx]
                    return float(x), float(y), float(conf)

                nose = get_kp(0)
                l_sh = get_kp(5)
                r_sh = get_kp(6)
                l_el = get_kp(7)
                r_el = get_kp(8)
                l_wr = get_kp(9)
                r_wr = get_kp(10)
                l_hip = get_kp(11)
                r_hip = get_kp(12)
                l_knee = get_kp(13)
                r_knee = get_kp(14)
                l_ank = get_kp(15)
                r_ank = get_kp(16)

                # Neck as midpoint between shoulders
                neck_x = (l_sh[0] + r_sh[0]) / 2.0
                neck_y = (l_sh[1] + r_sh[1]) / 2.0
                neck_conf = (l_sh[2] + r_sh[2]) / 2.0

                frame_kps = {
                    "nose": nose,
                    "neck": (neck_x, neck_y, neck_conf),
                    "right_shoulder": r_sh,
                    "left_shoulder": l_sh,
                    "right_elbow": r_el,
                    "left_elbow": l_el,
                    "right_wrist": r_wr,
                    "left_wrist": l_wr,
                    "right_hip": r_hip,
                    "left_hip": l_hip,
                    "right_knee": r_knee,
                    "left_knee": l_knee,
                    "right_ankle": r_ank,
                    "left_ankle": l_ank,
                }
            else:
                # If frame not detected, repeat previous point or fill default
                frame_kps = {}
                for k in raw_trajectories.keys():
                    if len(raw_trajectories[k]) > 0:
                        frame_kps[k] = raw_trajectories[k][-1]
                    else:
                        frame_kps[k] = (w / 2.0, h / 2.0, 0.0)

            for k, val in frame_kps.items():
                raw_trajectories[k].append(val)

            curr_frame += 1

        cap.release()

        # Apply zero-phase Butterworth filter on all coordinates
        filtered_trajectories: Dict[str, Dict[str, np.ndarray]] = {}
        n_frames = len(raw_trajectories["nose"])
        if n_frames == 0:
            return []

        for name, pts in raw_trajectories.items():
            xs = np.array([p[0] for p in pts], dtype=float)
            ys = np.array([p[1] for p in pts], dtype=float)
            confs = np.array([p[2] for p in pts], dtype=float)
            
            filt_xs = butterworth_lowpass_filter(xs, cutoff_hz=cutoff_hz, fs=fps)
            filt_ys = butterworth_lowpass_filter(ys, cutoff_hz=cutoff_hz, fs=fps)
            
            vx = compute_central_difference_derivatives(filt_xs * scale_m_per_px, dt)
            vy = compute_central_difference_derivatives(filt_ys * scale_m_per_px, dt)
            v_mag = np.sqrt(vx**2 + vy**2)
            
            filtered_trajectories[name] = {
                "x": filt_xs,
                "y": filt_ys,
                "conf": confs,
                "vx": vx,
                "vy": vy,
                "v_mag": v_mag
            }

        # Build FrameData structures
        analyzed_frames: List[FrameData] = []
        for i in range(n_frames):
            f_idx = start_frame + i
            t_s = round(f_idx / fps, 3)
            
            kps_out: Dict[str, Keypoint] = {}
            kps_tuples: Dict[str, Tuple[float, float]] = {}
            
            for name, d in filtered_trajectories.items():
                px_x = float(d["x"][i])
                px_y = float(d["y"][i])
                kps_tuples[name] = (px_x, px_y)
                kps_out[name] = Keypoint(
                    name=name,
                    x=round(px_x, 2),
                    y=round(px_y, 2),
                    confidence=round(float(d["conf"][i]), 3),
                    x_m=round(px_x * scale_m_per_px, 4),
                    y_m=round(px_y * scale_m_per_px, 4)
                )

            # Compute standard anatomical joint angles
            angles: Dict[str, float] = {}
            if "right_hip" in kps_tuples and "right_knee" in kps_tuples and "right_ankle" in kps_tuples:
                angles["knee_flexion_r"] = round(calculate_angle_2d(kps_tuples["right_hip"], kps_tuples["right_knee"], kps_tuples["right_ankle"]), 1)
            if "left_hip" in kps_tuples and "left_knee" in kps_tuples and "left_ankle" in kps_tuples:
                angles["knee_flexion_l"] = round(calculate_angle_2d(kps_tuples["left_hip"], kps_tuples["left_knee"], kps_tuples["left_ankle"]), 1)
            if "right_shoulder" in kps_tuples and "right_hip" in kps_tuples and "right_knee" in kps_tuples:
                angles["hip_flexion_r"] = round(calculate_angle_2d(kps_tuples["right_shoulder"], kps_tuples["right_hip"], kps_tuples["right_knee"]), 1)
            if "left_shoulder" in kps_tuples and "left_hip" in kps_tuples and "left_knee" in kps_tuples:
                angles["hip_flexion_l"] = round(calculate_angle_2d(kps_tuples["left_shoulder"], kps_tuples["left_hip"], kps_tuples["left_knee"]), 1)
            if "right_shoulder" in kps_tuples and "right_elbow" in kps_tuples and "right_wrist" in kps_tuples:
                angles["elbow_angle_r"] = round(calculate_angle_2d(kps_tuples["right_shoulder"], kps_tuples["right_elbow"], kps_tuples["right_wrist"]), 1)
            if "left_shoulder" in kps_tuples and "left_elbow" in kps_tuples and "left_wrist" in kps_tuples:
                angles["elbow_angle_l"] = round(calculate_angle_2d(kps_tuples["left_shoulder"], kps_tuples["left_elbow"], kps_tuples["left_wrist"]), 1)
            if "neck" in kps_tuples and "right_hip" in kps_tuples:
                angles["trunk_inclination"] = round(calculate_segment_angle(kps_tuples["right_hip"], kps_tuples["neck"], "vertical"), 1)

            # Estimate COM
            com = estimate_center_of_mass_2d(kps_tuples, scale_m_per_px=scale_m_per_px, origin_y=float(metadata.height))

            # Velocities summary
            vels: Dict[str, float] = {}
            if "right_knee" in filtered_trajectories:
                vels["knee_r_vel_m_s"] = round(float(filtered_trajectories["right_knee"]["v_mag"][i]), 3)
            if "left_knee" in filtered_trajectories:
                vels["knee_l_vel_m_s"] = round(float(filtered_trajectories["left_knee"]["v_mag"][i]), 3)
            if "right_ankle" in filtered_trajectories:
                vels["ankle_r_vel_m_s"] = round(float(filtered_trajectories["right_ankle"]["v_mag"][i]), 3)
            if "left_ankle" in filtered_trajectories:
                vels["ankle_l_vel_m_s"] = round(float(filtered_trajectories["left_ankle"]["v_mag"][i]), 3)
            if "right_wrist" in filtered_trajectories:
                vels["wrist_r_vel_m_s"] = round(float(filtered_trajectories["right_wrist"]["v_mag"][i]), 3)
            if "left_wrist" in filtered_trajectories:
                vels["wrist_l_vel_m_s"] = round(float(filtered_trajectories["left_wrist"]["v_mag"][i]), 3)

            analyzed_frames.append(FrameData(
                frame_index=f_idx,
                time_s=t_s,
                keypoints=kps_out,
                angles=angles,
                velocities=vels,
                accelerations={},
                com=com
            ))

        # Whole-body COM linear velocity
        if len(analyzed_frames) > 1:
            com_xs = np.array([f.com["x_m"] if f.com else 0.0 for f in analyzed_frames], dtype=float)
            com_ys = np.array([f.com["y_m"] if f.com else 0.0 for f in analyzed_frames], dtype=float)
            com_vx = compute_central_difference_derivatives(com_xs, dt)
            com_vy = compute_central_difference_derivatives(com_ys, dt)
            com_v_mag = np.sqrt(com_vx**2 + com_vy**2)
            for i, f in enumerate(analyzed_frames):
                f.velocities["com_vel_m_s"] = round(float(com_v_mag[i]), 3)

        # Pad to full video length so framesData[frame_index] is always a direct 1:1 lookup
        full_frames: List[FrameData] = []
        analyzed_dict = {f.frame_index: f for f in analyzed_frames}
        for f_idx in range(metadata.total_frames):
            if f_idx in analyzed_dict:
                full_frames.append(analyzed_dict[f_idx])
            else:
                full_frames.append(FrameData(
                    frame_index=f_idx,
                    time_s=round(f_idx / fps, 3),
                    keypoints={},
                    angles={},
                    velocities={},
                    accelerations={},
                    com=None
                ))

        return full_frames

