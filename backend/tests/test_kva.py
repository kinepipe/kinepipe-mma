import pytest
from backend.app.core.schemas import (
    AnalysisSessionData,
    VideoMetadata,
    CalibrationData,
    Keyframe,
    FrameData,
    Keypoint
)
from backend.app.core.kva_engine import export_to_kva, parse_kva

def test_kva_export_and_import():
    meta = VideoMetadata(
        video_id="test_vid",
        filename="athlete_jump.mp4",
        filepath="data/uploads/athlete_jump.mp4",
        width=1920,
        height=1080,
        fps=60.0,
        total_frames=120,
        duration_s=2.0,
        aspect_ratio="16:9"
    )
    calib = CalibrationData(
        pixel_distance=240.0,
        real_distance_m=1.0,
        scale_m_per_px=1.0/240.0,
        point_a=[100.0, 500.0],
        point_b=[100.0, 740.0]
    )
    kfs = [
        Keyframe(
            id="kf1",
            frame_index=35,
            time_s=35/60.0,
            title="Despegue",
            event_type="takeoff",
            notes="Despegue potente a 2.9 m/s"
        ),
        Keyframe(
            id="kf2",
            frame_index=55,
            time_s=55/60.0,
            title="Vértice",
            event_type="apex",
            notes="Altura máxima 48 cm"
        )
    ]
    frames = [
        FrameData(
            frame_index=0,
            time_s=0.0,
            keypoints={
                "right_knee": Keypoint(name="right_knee", x=450.0, y=600.0, confidence=0.98),
                "right_ankle": Keypoint(name="right_ankle", x=460.0, y=750.0, confidence=0.97)
            }
        ),
        FrameData(
            frame_index=1,
            time_s=1/60.0,
            keypoints={
                "right_knee": Keypoint(name="right_knee", x=451.0, y=599.0, confidence=0.98),
                "right_ankle": Keypoint(name="right_ankle", x=461.0, y=749.0, confidence=0.97)
            }
        )
    ]
    session = AnalysisSessionData(
        video_id="test_vid",
        metadata=meta,
        calibration=calib,
        model_used="sports2d",
        frames=frames,
        keyframes=kfs,
        notes="Evaluación de pretemporada"
    )

    kva_xml = export_to_kva(session)
    assert "<KinoveaVideoAnalysis" in kva_xml
    assert "<KeyImage" in kva_xml
    assert "Despegue" in kva_xml
    assert 'Type="TrackablePath"' in kva_xml

    parsed = parse_kva(kva_xml)
    assert parsed["fps"] == 60.0
    assert len(parsed["keyframes"]) == 2
    assert parsed["keyframes"][0]["frame_index"] == 35
    assert "Despegue" in parsed["keyframes"][0]["title"]
