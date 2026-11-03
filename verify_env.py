"""
KinePipe MMA - Verificador de Entorno, Librerías y Códecs de Video
Dirección y Desarrollo: Klgo. Felipe Vargas Ríos (@kinepipe)
"""

import sys
import os
import ctypes
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

REQUIRED_MODULES = [
    ("fastapi", "FastAPI (Servidor Web y API REST)", "fastapi>=0.110.0"),
    ("uvicorn", "Uvicorn (Servidor ASGI de alto rendimiento)", "uvicorn[standard]>=0.28.0"),
    ("cv2", "OpenCV (Motor de lectura y escritura de video)", "opencv-python>=4.8.0"),
    ("imageio_ffmpeg", "FFmpeg H.264 (Códecs universales MP4/MOV/HEVC/AVI)", "imageio-ffmpeg>=0.5.1"),
    ("numpy", "NumPy (Cálculo matricial y álgebra lineal)", "numpy>=1.24.0"),
    ("scipy", "SciPy (Filtro digital Butterworth y cinemática)", "scipy>=1.11.0"),
    ("pandas", "Pandas (Exportación de tablas biomecánicas CSV/Excel)", "pandas>=2.0.0"),
    ("openpyxl", "OpenPyXL (Soporte de planillas Excel)", "openpyxl>=3.1.0"),
    ("torch", "PyTorch (Motor de Redes Neuronales Profundas)", "torch>=2.1.0"),
    ("torchvision", "TorchVision (Visión por Computador para IA)", "torchvision>=0.16.0"),
    ("ultralytics", "Ultralytics YOLOv8-Pose (Estimación de postura 2D)", "ultralytics>=8.1.0"),
    ("webview", "PyWebView (Ventana nativa de escritorio WebView2)", "pywebview>=5.0.0"),
]

def check_vc_redist() -> bool:
    if sys.platform != "win32":
        return True
    try:
        ctypes.WinDLL("vcruntime140.dll")
        ctypes.WinDLL("msvcp140.dll")
        return True
    except OSError:
        return False

def main():
    print("=========================================================")
    print("   DIAGNÓSTICO DE COMPONENTES Y CÓDECS - KINEPIPE MMA")
    print("=========================================================")
    print(f"Python activo : {sys.executable}")
    print(f"Versión Python: {sys.version.split()[0]}")
    print("---------------------------------------------------------")

    vc_ok = check_vc_redist()
    if vc_ok:
        print("  [OK] Microsoft Visual C++ Redistributable (DLLs nativas)")
    else:
        print("  [FALTA] Microsoft Visual C++ Redistributable (vcruntime140.dll)")

    missing_packages = []
    for mod_name, desc, pkg_spec in REQUIRED_MODULES:
        try:
            __import__(mod_name)
            print(f"  [OK] {desc}")
        except Exception as e:
            print(f"  [FALTA] {desc} -> ({e.__class__.__name__}: {e})")
            missing_packages.append(pkg_spec)

    # Check FFmpeg binary execution
    ffmpeg_ok = False
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        if ffmpeg_exe and Path(ffmpeg_exe).exists():
            print(f"  [OK] Binario FFmpeg H.264 integrado: {Path(ffmpeg_exe).name}")
            ffmpeg_ok = True
        else:
            print("  [FALTA] Binario ejecutable FFmpeg no encontrado")
    except Exception as e:
        print(f"  [FALTA] Motor FFmpeg H.264 no disponible: {e}")

    # Check YOLOv8 weights
    weights_path = PROJECT_ROOT / "yolov8n-pose.pt"
    if weights_path.exists() and weights_path.stat().st_size > 1_000_000:
        size_mb = weights_path.stat().st_size / (1024 * 1024)
        print(f"  [OK] Pesos neuronales YOLOv8-Pose (yolov8n-pose.pt - {size_mb:.1f} MB)")
    else:
        print("  [AVISO] yolov8n-pose.pt no encontrado localmente; se descargará automáticamente.")

    # Verify and normalize sample video to H.264
    if not missing_packages and ffmpeg_ok:
        try:
            from backend.app.core.config import SAMPLE_DIR
            from backend.app.core.video_engine import (
                generate_sample_biomechanical_video,
                ensure_browser_compatible_video,
                get_video_codec_name
            )
            sample_vid = SAMPLE_DIR / "sample_cmj_jump.mp4"
            if not sample_vid.exists():
                print("  [INFO] Generando video de demostración CMJ en H.264...")
                generate_sample_biomechanical_video(sample_vid, duration_s=3.0, fps=30.0)
            else:
                sample_vid = ensure_browser_compatible_video(sample_vid)
            codec = get_video_codec_name(sample_vid)
            print(f"  [OK] Video de muestra verificado ({sample_vid.name} | códec: {codec.upper()})")
        except Exception as e:
            print(f"  [AVISO] No se pudo verificar el video de muestra: {e}")

    print("=========================================================")
    if missing_packages:
        print(f"[RESULTADO] Faltan {len(missing_packages)} librerías por instalar:")
        print("  " + " ".join(missing_packages))
        if "--auto-fix" in sys.argv:
            import subprocess
            import shutil
            print("\n[AUTO-REPARACIÓN] Instalando automáticamente las librerías faltantes...")
            uv_bin = shutil.which("uv")
            if not uv_bin:
                for candidate in [
                    Path.home() / ".local" / "bin" / "uv.exe",
                    Path.home() / ".cargo" / "bin" / "uv.exe",
                ]:
                    if candidate.exists():
                        uv_bin = str(candidate)
                        break
            if uv_bin:
                cmd = [uv_bin, "pip", "install", "--python", sys.executable] + missing_packages
            else:
                cmd = [sys.executable, "-m", "pip", "install"] + missing_packages
            res = subprocess.run(cmd)
            if res.returncode == 0:
                print("[OK] Librerías instaladas correctamente.")
                sys.exit(0)
        sys.exit(2)
    else:
        print("[RESULTADO] ¡Todas las librerías, extensiones y códecs de video están operativos!")
        sys.exit(0)

if __name__ == "__main__":
    main()
