from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from pathlib import Path

from ..core.schemas import AnalysisSessionData
from ..core.kva_engine import export_to_kva, parse_kva
from .routes_tracking import SESSIONS

router = APIRouter(prefix="/api/kinovea", tags=["kinovea"])

@router.get("/export/{video_id}")
def export_kinovea_kva(video_id: str):
    """
    Generates and returns Kinovea .kva XML file for download.
    Can be placed next to video to automatically open inside Kinovea.
    """
    session = SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    kva_xml = export_to_kva(session)
    filename = f"{Path(session.metadata.filename).stem}.kva"
    
    return Response(
        content=kva_xml,
        media_type="application/xml",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

@router.post("/import")
async def import_kinovea_kva(file: UploadFile = File(...)):
    """
    Imports and parses an existing Kinovea .kva file to extract keyframes,
    timestamps, and annotations.
    """
    content = await file.read()
    xml_str = content.decode("utf-8")
    parsed_data = parse_kva(xml_str)
    return parsed_data
