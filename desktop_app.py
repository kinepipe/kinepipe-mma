"""
KinePipe MMA - Markless Motion Analyser (Self-Contained Portable Edition)
Desktop Native Window Launcher with automatic port binding and Institutional Fallback.
Author: Klgo. Felipe Vargas Ríos (@kinepipe)
"""

import os
import sys
import time
import socket
import subprocess
import threading
import webbrowser
from functools import wraps
from pathlib import Path
import urllib.request

PORTABLE_ROOT = Path(__file__).resolve().parent
if str(PORTABLE_ROOT) not in sys.path:
    sys.path.insert(0, str(PORTABLE_ROOT))

def configurar_parche_asyncio_windows():
    """
    Silencia el error inofensivo [WinError 10054] en Python 3.10 bajo Windows
    provocado cuando el reproductor de video HTML5 cancela peticiones 206 Partial Content.
    """
    if sys.platform == "win32":
        try:
            from asyncio.proactor_events import _ProactorBasePipeTransport
            def _silenciar_reset_conexion(func):
                @wraps(func)
                def wrapper(self, *args, **kwargs):
                    try:
                        return func(self, *args, **kwargs)
                    except (ConnectionResetError, RuntimeError, OSError):
                        pass
                return wrapper

            _ProactorBasePipeTransport._call_connection_lost = _silenciar_reset_conexion(
                _ProactorBasePipeTransport._call_connection_lost
            )
        except Exception:
            pass

configurar_parche_asyncio_windows()

def find_free_port(preferred_port: int = 8000) -> int:
    """Finds an available localhost TCP port starting at preferred_port."""
    for port in range(preferred_port, preferred_port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return preferred_port

HOST = "127.0.0.1"
PORT = find_free_port(int(os.environ.get("PORT", "8000")))
os.environ["PORT"] = str(PORT)
SERVER_URL = f"http://{HOST}:{PORT}"

def start_backend():
    """Starts the FastAPI backend using uvicorn in a background thread."""
    import uvicorn
    configurar_parche_asyncio_windows()
    uvicorn.run("backend.app.main:app", host=HOST, port=PORT, log_level="warning")

def wait_for_server(timeout=25.0):
    """Waits until the backend server responds to HTTP requests."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(f"{SERVER_URL}/openapi.json", timeout=1) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.25)
    return False

def open_fallback_window(url: str):
    """Opens Edge in standalone App Mode (--app) or default browser if WebView2 is restricted."""
    edge_candidates = [
        Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
    ]
    for edge_exe in edge_candidates:
        if edge_exe.exists():
            try:
                subprocess.Popen([str(edge_exe), f"--app={url}", "--window-size=1540,940"])
                return
            except Exception:
                pass
    webbrowser.open(url)

def main():
    force_browser = "--browser" in sys.argv

    # 1. Start backend server in a daemon thread
    server_thread = threading.Thread(target=start_backend, daemon=True)
    server_thread.start()

    # 2. Wait for server readiness
    if not wait_for_server():
        print("[ERROR] El servidor backend de KinePipe MMA tardó demasiado en iniciar.")
        sys.exit(1)

    if force_browser:
        open_fallback_window(SERVER_URL)
        try:
            while server_thread.is_alive():
                time.sleep(1.0)
        except KeyboardInterrupt:
            pass
        return

    # 3. Try native desktop window via pywebview, fallback to Edge App Mode if restricted
    try:
        import webview
        window = webview.create_window(
            title="KinePipe MMA v1.5.2 (Portable Edition) • Klgo. Felipe Vargas Ríos (@kinepipe)",
            url=SERVER_URL,
            width=1540,
            height=940,
            min_size=(1024, 720),
            resizable=True,
            fullscreen=False,
            background_color="#0B0E14"
        )
        webview.start(private_mode=False)
    except Exception as exc:
        print(f"[INFO] Usando modo navegador institucional ({exc})")
        open_fallback_window(SERVER_URL)
        try:
            while server_thread.is_alive():
                time.sleep(1.0)
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    main()

