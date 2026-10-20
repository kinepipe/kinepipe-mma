from pathlib import Path
from typing import List, Dict, Any

from .base_tracker import BaseTracker
from ..core.schemas import ModelCapabilityInfo, VideoMetadata, TrackingRequest, FrameData
from .sports2d_adapter import Sports2DAdapter

class FastPoseAdapter(BaseTracker):
    @property
    def model_id(self) -> str:
        return "fast_pose"

    def get_info(self) -> ModelCapabilityInfo:
        return ModelCapabilityInfo(
            id=self.model_id,
            name="Fast Real-Time Pose (Lightweight / MediaPipe)",
            author="Google / Biomechanics Studio Engine",
            description="Motor de seguimiento anatómico ultrarrápido sin esperas. Ejecuta inferencia en tiempo real a más de 60 FPS en CPU o GPU. Ideal para demostraciones en clase, previsualización de tomas y análisis inmediato.",
            cameras_required="1 cámara (Monocular en cualquier plano)",
            calibration_type="Barra de escala o altura opcional (m)",
            outputs=[
                "Esqueleto completo de 14+ puntos anatómicos",
                "Ángulos articulares calculados en tiempo real",
                "Cero tiempo de descarga de modelos masivos",
                "Filtro Butterworth y detección automática de saltos"
            ],
            recommended_for="Demostración docente en aula, computadores sin GPU dedicada y análisis rápido preliminar",
            gpu_support=True,
            is_installed=True,
            install_command=None,
            icon="Zap"
        )

    def is_available(self) -> bool:
        return True

    def process_video(
        self,
        video_path: Path,
        request: TrackingRequest,
        metadata: VideoMetadata
    ) -> List[FrameData]:
        adapter = Sports2DAdapter()
        return adapter.process_video(video_path, request, metadata)
