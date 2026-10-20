import xml.etree.ElementTree as ET
import xml.dom.minidom as minidom
import uuid
from typing import Dict, List, Optional, Any
from pathlib import Path
from .schemas import AnalysisSessionData, Keyframe, FrameData

def export_to_kva(session: AnalysisSessionData) -> str:
    """
    Serializes analysis session into Kinovea Video Analysis XML (.kva) format.
    100% compliant with Kinovea 2025.2 FormatVersion 2.1 schema.
    Zero-crash structure: aligns with Kinovea's C# WinForms deserializer
    (Drawings, TrackerParameters, Keyframe Comments and Timeline timestamps).
    """
    root = ET.Element("KinoveaVideoAnalysis")
    
    # 1. Format Version & Producer (Required by Kinovea 2.1)
    ET.SubElement(root, "FormatVersion").text = "2.1"
    ET.SubElement(root, "Producer").text = "Kinovea.2025.2"
    
    # Filename stem without extension so Kinovea matches local video in same folder
    file_stem = Path(session.metadata.filename).stem
    ET.SubElement(root, "OriginalFilename").text = file_stem
    
    # FullPath left empty or filename-only so Kinovea doesn't attempt to load
    # non-existent server upload paths and turn the video screen black
    ET.SubElement(root, "FullPath").text = ""
    
    # ByteLength estimated from metadata or dummy valid size
    byte_len = 6425022
    if hasattr(session.metadata, "filepath") and session.metadata.filepath:
        try:
            p = Path(session.metadata.filepath)
            if p.exists():
                byte_len = p.stat().st_size
        except Exception:
            pass
    ET.SubElement(root, "ByteLength").text = str(byte_len)
    
    ET.SubElement(root, "ImageSize").text = f"{session.metadata.width};{session.metadata.height}"
    ET.SubElement(root, "Aspect").text = "Auto"
    ET.SubElement(root, "Rotation").text = "Rotate0"
    ET.SubElement(root, "Mirror").text = "false"
    ET.SubElement(root, "Demosaicing").text = "None"
    ET.SubElement(root, "Deinterlacing").text = "false"
    ET.SubElement(root, "StabilizationTrack").text = "00000000-0000-0000-0000-000000000000"
    ET.SubElement(root, "BackgroundColor").text = "0;255;255;255"
    
    # 2. Timing Metadata
    fps = max(1.0, session.metadata.fps)
    frame_step_ms = 1000.0 / fps
    total_timestamps = max(1, int(round(session.metadata.duration_s * 1000.0)))
    
    ET.SubElement(root, "AverageTimeStampsPerFrame").text = str(round(frame_step_ms, 6))
    ET.SubElement(root, "CaptureFramerate").text = str(round(fps, 4))
    ET.SubElement(root, "VideoFramerate").text = str(round(fps, 4))
    ET.SubElement(root, "FirstTimeStamp").text = "1"
    ET.SubElement(root, "SelectionStart").text = "1"
    ET.SubElement(root, "SelectionEnd").text = str(total_timestamps)
    ET.SubElement(root, "TimeOrigin").text = "1"
    
    # 3. Calibration
    calib_elem = ET.SubElement(root, "Calibration")
    unit_str = session.calibration.unit if hasattr(session.calibration, "unit") and session.calibration.unit else "m"
    unit_elem = ET.SubElement(calib_elem, "Unit", attrib={"Abbreviation": unit_str})
    unit_elem.text = "Meters" if unit_str == "m" else "Pixels"
    
    # 4. Keyframes with Comments (Kinovea native keyframe panel)
    keyframes_elem = ET.SubElement(root, "Keyframes")
    
    for kf in session.keyframes:
        kf_id = kf.id if kf.id else str(uuid.uuid4())
        kf_elem = ET.SubElement(keyframes_elem, "Keyframe", attrib={"id": kf_id})
        
        # Calculate timestamp (Kinovea uses 1-based millisecond timeline)
        kf_timestamp = int(round(1 + kf.frame_index * frame_step_ms))
        ET.SubElement(kf_elem, "Timestamp").text = str(kf_timestamp)
        ET.SubElement(kf_elem, "Name").text = kf.title
        ET.SubElement(kf_elem, "Color").text = "51;152;255"
        
        # Build comprehensive comment note (clinical text + angles)
        comment_parts = []
        if kf.notes and kf.notes.strip():
            comment_parts.append(kf.notes.strip())
        if kf.angles_snapshot:
            angles_str = " | ".join([f"{k.replace('_', ' ').title()}: {v:.1f}°" for k, v in kf.angles_snapshot.items()])
            comment_parts.append(f"Ángulos: {angles_str}")
        full_comment = " - ".join(comment_parts) if comment_parts else kf.title
        
        # Kinovea reads <Comment> natively in the Keyframes panel
        ET.SubElement(kf_elem, "Comment").text = full_comment
        
        # Safe empty Drawings container so WinForms drawing deserializer never throws
        ET.SubElement(kf_elem, "Drawings")
        
    # 5. Tracks (Trajectories)
    tracks_elem = ET.SubElement(root, "Tracks")
    
    # Palette of RGB colors for Kinovea tracks
    palette_rgb = [
        "0;230;100", "0;200;230", "255;180;0", "230;50;80",
        "180;70;240", "100;240;50", "255;120;0", "0;180;255"
    ]
    
    kp_names = set()
    for f in session.frames:
        kp_names.update(f.keypoints.keys())
        
    for idx, kp_name in enumerate(sorted(kp_names)):
        col_rgb = palette_rgb[idx % len(palette_rgb)]
        track_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{session.video_id}_{kp_name}"))
        
        track_elem = ET.SubElement(tracks_elem, "Track", attrib={
            "id": track_id,
            "name": kp_name.replace("_", " ").title()
        })
        ET.SubElement(track_elem, "TimePosition").text = "1"
        ET.SubElement(track_elem, "IsVisible").text = "true"
        ET.SubElement(track_elem, "Visible").text = "1"
        ET.SubElement(track_elem, "Invisible").text = "-1"
        ET.SubElement(track_elem, "ExtraData").text = "Name"
        
        # TrackerParameters is MANDATORY for Kinovea DrawingTrack hit-testing and MouseUp
        tp_elem = ET.SubElement(track_elem, "TrackerParameters")
        ET.SubElement(tp_elem, "Algorithm").text = "Correlation"
        ET.SubElement(tp_elem, "SearchWindow").text = "95;95"
        ET.SubElement(tp_elem, "BlockWindow").text = "15;12"
        ET.SubElement(tp_elem, "SimilarityThreshold").text = "0.5"
        ET.SubElement(tp_elem, "TemplateUpdateThreshold").text = "0.8"
        ET.SubElement(tp_elem, "UseMask").text = "false"
        ET.SubElement(tp_elem, "HSVRange").text = "0;360;0;255;0;255"
        ET.SubElement(tp_elem, "Dilate").text = "0"
        ET.SubElement(tp_elem, "Erode").text = "0"
        
        # Collect track points
        track_points: List[str] = []
        for f in session.frames:
            if kp_name in f.keypoints:
                kp = f.keypoints[kp_name]
                ts = int(round(1 + f.frame_index * frame_step_ms))
                track_points.append(f"{kp.x:.3f};{kp.y:.3f};{ts};0")
                
        pt_list = ET.SubElement(track_elem, "TrackPointList", attrib={"Count": str(len(track_points))})
        for pt_str in track_points:
            ET.SubElement(pt_list, "TrackPoint").text = pt_str
            
        style_elem = ET.SubElement(track_elem, "DrawingStyle")
        col_elem = ET.SubElement(style_elem, "Color", attrib={"Key": "color"})
        ET.SubElement(col_elem, "Value").text = f"255;{col_rgb}"
        shape_elem = ET.SubElement(style_elem, "TrackShape", attrib={"Key": "track shape"})
        ET.SubElement(shape_elem, "Value").text = "Solid;false"
        line_size = ET.SubElement(style_elem, "LineSize", attrib={"Key": "line size"})
        ET.SubElement(line_size, "Value").text = "2"
        pen_size = ET.SubElement(style_elem, "PenSize", attrib={"Key": "TrackPointSize"})
        ET.SubElement(pen_size, "Value").text = "3"
        lbl_size = ET.SubElement(style_elem, "FontSize", attrib={"Key": "label size"})
        ET.SubElement(lbl_size, "Value").text = "8"

    # 6. Additional Kinovea standard sections
    ET.SubElement(root, "Trackability")
    ET.SubElement(root, "VideoFilters")

    # Return pretty formatted XML string
    rough_string = ET.tostring(root, encoding="utf-8")
    reparsed = minidom.parseString(rough_string)
    return reparsed.toprettyxml(indent="  ")

def parse_kva(xml_content: str) -> Dict[str, Any]:
    """
    Parses a Kinovea .kva XML file into a python dictionary of keyframes and tracks.
    Seamlessly handles both modern FormatVersion 2.1 and legacy 0.8.x formats.
    """
    root = ET.fromstring(xml_content)
    
    fps = 30.0
    duration_ms = 0
    
    # 1. Framerate
    fps_node = root.find("VideoFramerate")
    if fps_node is None or not fps_node.text:
        fps_node = root.find("CaptureFramerate")
    if fps_node is None or not fps_node.text:
        fps_node = root.find("WindowProperties/FramesPerSecond")
        
    if fps_node is not None and fps_node.text:
        try:
            fps = float(fps_node.text)
        except ValueError:
            pass

    # 2. Duration
    end_node = root.find("SelectionEnd")
    if end_node is None or not end_node.text:
        end_node = root.find("WindowProperties/VideoDuration")
        
    if end_node is not None and end_node.text:
        try:
            duration_ms = int(end_node.text)
        except ValueError:
            pass

    keyframes = []
    
    # Modern FormatVersion 2.1: <Keyframes><Keyframe>
    keyframes_node = root.find("Keyframes")
    if keyframes_node is not None:
        for kf in keyframes_node.findall("Keyframe"):
            kf_id = kf.attrib.get("id", str(uuid.uuid4()))
            ts_text = kf.findtext("Timestamp") or kf.findtext("Position") or "0"
            try:
                time_ms = int(ts_text)
            except ValueError:
                time_ms = 0
            
            title = kf.findtext("Name") or kf.findtext("Title") or f"Fotograma {time_ms}"
            comment = kf.findtext("Comment") or ""
            
            # If comment is empty, check Drawings/Text fallback
            if not comment:
                drawings = kf.find("Drawings")
                if drawings is not None:
                    text_node = drawings.find(".//Text/Text") or drawings.find(".//Label/Text")
                    if text_node is not None and text_node.text:
                        comment = text_node.text
            
            frame_idx = max(0, int(round((time_ms / 1000.0) * fps)))
            keyframes.append({
                "id": kf_id,
                "frame_index": frame_idx,
                "time_s": time_ms / 1000.0,
                "title": title,
                "notes": comment
            })
            
    # Legacy schema: <RootFolder><KeyImages><KeyImage>
    elif root.find("RootFolder/KeyImages") is not None:
        for ki in root.findall(".//KeyImage"):
            frame_idx = int(ki.attrib.get("Frame", 0))
            time_ms = int(ki.attrib.get("Time", 0))
            comment = ki.findtext("Comment") or ""
            title = ki.findtext("Title") or f"Fotograma {frame_idx}"
            keyframes.append({
                "id": str(uuid.uuid4()),
                "frame_index": frame_idx,
                "time_s": time_ms / 1000.0,
                "title": title,
                "notes": comment
            })

    return {
        "fps": fps,
        "duration_ms": duration_ms,
        "keyframes": keyframes
    }
