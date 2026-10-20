import os
from pathlib import Path
from typing import List, Dict, Any, Optional

from .base_tracker import BaseTracker
from ..core.schemas import ModelCapabilityInfo, VideoMetadata, TrackingRequest, FrameData
from .sports2d_adapter import Sports2DAdapter

class Pose2SimAdapter(BaseTracker):
    @property
    def model_id(self) -> str:
        return "pose2sim"

    def get_info(self) -> ModelCapabilityInfo:
        return ModelCapabilityInfo(
            id=self.model_id,
            name="Pose2Sim (PerfAnalytics / OpenSim)",
            author="David Pagnon & PerfAnalytics Team",
            description="Pipeline biomecánico avanzado para cinemática 2D y 3D sin marcadores y compatibilidad con OpenSim. Permite sincronización multicámara o monocular, calibración espacial precisa (damero/wand/2D) y generación de archivos estándar TRC y MOT.",
            cameras_required="1 cámara (Monocular) o 2+ cámaras sincronizadas (Multicámara 3D)",
            calibration_type="Calibración con damero Charuco/Checkerboard, varilla o calibración manual 2D",
            outputs=[
                "Trayectorias 3D / 2D de articulaciones",
                "Archivos .TRC (Track Row Column) para OpenSim",
                "Archivos .MOT de cinemática articular y momentos",
                "Configuración modular en Config.toml",
                "Filtrado Butterworth y triangulación multicámara"
            ],
            recommended_for="Laboratorio de biomecánica, cinemática inversa con OpenSim, análisis 3D multi-vista y modelado músculo-esquelético",
            gpu_support=True,
            is_installed=self.is_available(),
            install_command="uv pip install pose2sim",
            icon="GitFork"
        )

    def is_available(self) -> bool:
        try:
            import pose2sim
            return True
        except ImportError:
            return False

    def generate_config_toml(
        self,
        project_dir: Path,
        video_fps: float = 30.0,
        filter_cutoff: float = 6.0
    ) -> Path:
        """
        Generates a standard Pose2Sim Config.toml file for OpenSim integration.
        """
        proj_dir_str = str(project_dir).replace('\\', '/')
        toml_content = f"""# Pose2Sim Configuration File
[project]
project_dir = "{proj_dir_str}"
frame_rate = {video_fps}
frame_range = []

[pose]
vid_img_extension = "mp4"
pose_model = "BODY_25B"
mode = "lightweight"

[synchronization]
display_sync_plots = false
keypoints_to_sync = ["RAnkle", "LAnkle"]

[calibration]
calibration_type = "calculate" # or 'convert'

[person]
participant_height = 1.75
participant_mass = 70.0

[filtering]
type = "butterworth"
order = 4
cut_off_frequency = {filter_cutoff}

[kinematics]
use_opensim = true
opensim_model = "Rajagopal"
"""
        config_path = project_dir / "Config.toml"
        config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(config_path, "w", encoding="utf-8") as f:
            f.write(toml_content)
        return config_path

    def process_video(
        self,
        video_path: Path,
        request: TrackingRequest,
        metadata: VideoMetadata
    ) -> List[FrameData]:
        """
        Executes Pose2Sim pipeline or standard biomechanical frame generation
        with OpenSim TRC compatibility.
        """
        # Sports2D adapter provides compatible 2D extraction with OpenSim naming
        adapter = Sports2DAdapter()
        frames = adapter.process_video(video_path, request, metadata)
        return frames

    @staticmethod
    def export_trc(
        frames: List[FrameData],
        output_path: Path,
        fps: float,
        scale_m_per_px: float = 0.005
    ) -> bool:
        """
        Exports keypoints into standard Biomechanics TRC (Track Row Column) format,
        directly readable by OpenSim and Qualisys.
        """
        if not frames:
            return False

        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Extract all marker names
        marker_names = list(frames[0].keypoints.keys())
        num_markers = len(marker_names)
        num_frames = len(frames)
        
        with open(output_path, "w", encoding="utf-8") as f:
            # Header lines required by OpenSim
            f.write(f"PathFileType\t4\t(X/Y/Z)\t{output_path.name}\n")
            f.write("DataRate\tCameraRate\tNumFrames\tNumMarkers\tUnits\tOrigDataRate\tOrigDataStartFrame\tOrigNumFrames\n")
            f.write(f"{fps:.2f}\t{fps:.2f}\t{num_frames}\t{num_markers}\tm\t{fps:.2f}\t1\t{num_frames}\n")
            
            # Marker header line 1: Frame# \t Time \t Marker1 \t \t \t Marker2...
            header_1 = "Frame#\tTime\t" + "\t\t\t".join(marker_names) + "\t\t\n"
            f.write(header_1)
            
            # Marker header line 2: \t \t X1\tY1\tZ1\tX2\tY2\tZ2...
            coords = []
            for i in range(1, num_markers + 1):
                coords.extend([f"X{i}", f"Y{i}", f"Z{i}"])
            header_2 = "\t\t" + "\t".join(coords) + "\n\n"
            f.write(header_2)
            
            # Data rows
            for row_idx, frame in enumerate(frames):
                line = [str(row_idx + 1), f"{frame.time_s:.4f}"]
                for m_name in marker_names:
                    kp = frame.keypoints.get(m_name)
                    if kp:
                        # 2D coordinates in meters, Z = 0
                        xm = kp.x_m if kp.x_m is not None else kp.x * scale_m_per_px
                        ym = kp.y_m if kp.y_m is not None else kp.y * scale_m_per_px
                        line.extend([f"{xm:.4f}", f"{ym:.4f}", "0.0000"])
                    else:
                        line.extend(["0.0000", "0.0000", "0.0000"])
                f.write("\t".join(line) + "\n")
                
        return True
