"""
KinePipe MMA - Markless Motion Analyser
Desktop Native Window Launcher using pywebview & Edge WebView2.
Author: Klgo. Felipe Vargas Ríos (@kinepipe)
"""

import sys
import time
import threading
import uvicorn
import webview
import urllib.request

HOST = "127.0.0.1"
PORT = 8000
SERVER_URL = f"http://{HOST}:{PORT}"

def start_backend():
    """Starts the FastAPI backend using uvicorn in a background thread."""
    uvicorn.run("backend.app.main:app", host=HOST, port=PORT, log_level="warning")

def wait_for_server(timeout=15.0):
    """Waits until the backend server responds to HTTP requests."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(f"{SERVER_URL}/openapi.json", timeout=1) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.3)
    return False

def main():
    # 1. Start backend server in a daemon thread
    server_thread = threading.Thread(target=start_backend, daemon=True)
    server_thread.start()

    # 2. Wait for server readiness
    if not wait_for_server():
        print("[ERROR] El servidor backend de KinePipe MMA tardó demasiado en iniciar.")
        sys.exit(1)

    # 3. Create native desktop window
    window = webview.create_window(
        title="KinePipe MMA (Markless Motion Analyser) • Klgo. Felipe Vargas Ríos (@kinepipe)",
        url=SERVER_URL,
        width=1540,
        height=940,
        min_size=(1024, 720),
        resizable=True,
        fullscreen=False,
        background_color="#0B0E14"
    )

    # 4. Start webview GUI event loop (blocks until window is closed)
    webview.start(private_mode=False)

if __name__ == "__main__":
    main()
