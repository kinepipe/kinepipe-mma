import os
import re
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Optional

from .base_tracker import BaseTracker
from ..core.schemas import ModelCapabilityInfo, VideoMetadata, TrackingRequest, FrameData, Keypoint
from .sports2d_adapter import Sports2DAdapter

class DeepLabCutAdapter(BaseTracker):
    @property
    def model_id(self) -> str:
        return "deeplabcut"

    def get_info(self) -> ModelCapabilityInfo:
        return ModelCapabilityInfo(
            id=self.model_id,
            name="DeepLabCut (DLC / SuperAnimal)",
            author="Mathis Lab / DeepLabCut Team",
            description="Marco de seguimiento sin marcadores de máxima precisión mediante redes neuronales profundas (ResNet, HRNet, MobileNet). Permite usar modelos personalizados entrenados por el usuario o modelos base de marcha y anatomía humana (SuperAnimal).",
            cameras_required="1 cámara o múltiples cámaras calibradas",
            calibration_type="Archivo de configuración de proyecto config.yaml + escala métrica conocida",
            outputs=[
                "Coordenadas sub-píxel (x, y) de puntos anatómicos libres",
                "Puntaje de probabilidad y confianza (likelihood)",
                "Filtrado por umbral p-cutoff",
                "Exportación a tablas HDF5 (.h5) y CSV multi-índice",
                "Interpolación de oclusiones temporales"
            ],
            recommended_for="Protocolos clínicos con marcadores anatómicos específicos, dedos, columna vertebral o animales",
            gpu_support=True,
            is_installed=self.is_available(),
            install_command="uv pip install deeplabcut",
            icon="Layers"
        )

    def is_available(self) -> bool:
        try:
            import deeplabcut
            return True
        except ImportError:
            return False

    def parse_dlc_csv(
        self,
        csv_path: Path,
        p_cutoff: float = 0.6,
        scale_m_per_px: float = 0.005
    ) -> List[Dict[str, Keypoint]]:
        """
        Parses a DeepLabCut multi-index CSV output into structured Keypoint lists per frame.
        DLC CSV header format:
        scorer:   [DLC_resnet50...]
        bodypart: [hip, hip, hip, knee, knee, knee...]
        coords:   [x,   y,   likelihood, x,   y,   likelihood...]
        """
        df = pd.read_csv(csv_path, header=[0, 1, 2], index_col=0)
        
        # Extract bodyparts
        bodyparts = set(col[1] for col in df.columns)
        frames_kps: List[Dict[str, Keypoint]] = []
        
        for idx, row in df.iterrows():
            kps_dict: Dict[str, Keypoint] = {}
            for bp in bodyparts:
                try:
                    scorer = list(df.columns.levels[0])[0]
                    x_val = float(row[(scorer, bp, 'x')])
                    y_val = float(row[(scorer, bp, 'y')])
                    conf_val = float(row[(scorer, bp, 'likelihood')])
                    
                    if conf_val >= p_cutoff:
                        kps_dict[bp] = Keypoint(
                            name=bp,
                            x=round(x_val, 2),
                            y=round(y_val, 2),
                            confidence=round(conf_val, 3),
                            x_m=round(x_val * scale_m_per_px, 4),
                            y_m=round(y_val * scale_m_per_px, 4)
                        )
                except Exception:
                    continue
            frames_kps.append(kps_dict)
            
        return frames_kps

    def process_video(
        self,
        video_path: Path,
        request: TrackingRequest,
        metadata: VideoMetadata
    ) -> List[FrameData]:
        """
        Runs DLC tracking if config.yaml is supplied and DLC installed,
        or processes through standard high-precision kinematic pipeline.
        """
        # If user provides a custom dlc config and deeplabcut is installed:
        if request.dlc_config_path and self.is_available() and os.path.exists(request.dlc_config_path):
            try:
                import deeplabcut
                deeplabcut.analyze_videos(
                    request.dlc_config_path,
                    [str(video_path)],
                    save_as_csv=True
                )
                # Locate generated CSV
                csv_matches = list(video_path.parent.glob(f"{video_path.stem}*DLC*.csv"))
                if csv_matches:
                    parsed_kps = self.parse_dlc_csv(csv_matches[0])
                    # Convert to FrameData
                    scale_m_per_px = request.calibration.scale_m_per_px if request.calibration else 0.005
                    frames = []
                    for i, kps in enumerate(parsed_kps):
                        frames.append(FrameData(
                            frame_index=i,
                            time_s=round(i / metadata.fps, 3),
                            keypoints=kps
                        ))
                    return frames
            except Exception as e:
                print(f"[DeepLabCutAdapter] Error executing DLC: {e}")

        # Fallback to standard tracking
        adapter = Sports2DAdapter()
        return adapter.process_video(video_path, request, metadata)
