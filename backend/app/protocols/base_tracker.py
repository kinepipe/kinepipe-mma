from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Any, Optional
from ..core.schemas import ModelCapabilityInfo, VideoMetadata, TrackingRequest, FrameData

class BaseTracker(ABC):
    @property
    @abstractmethod
    def model_id(self) -> str:
        pass

    @abstractmethod
    def get_info(self) -> ModelCapabilityInfo:
        """
        Returns capability, requirements, and calibration documentation for this model.
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Checks whether the backend engine/dependencies for this model are installed.
        """
        pass

    @abstractmethod
    def process_video(
        self,
        video_path: Path,
        request: TrackingRequest,
        metadata: VideoMetadata
    ) -> List[FrameData]:
        """
        Runs tracking across video frames and returns standardized FrameData list.
        """
        pass
