@echo off
title KinePipe MMA (Markless Motion Analyser) - Modo Escritorio
cd /d "%~dp0"

echo =========================================================
echo    KINEPIPE MMA (Markless Motion Analyser)
echo    Modo Ventana de Escritorio (Desktop Native App)
echo    Direccion y Desarrollo: Klgo. Felipe Vargas Rios (@kinepipe)
echo =========================================================
echo.

REM 1. Auto-bootstrap if environment is missing
if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Entorno virtual no detectado. Ejecutando instalacion inicial...
    call install.bat
    if errorlevel 1 (
        echo [ERROR] Hubo un problema durante la instalacion.
        pause
        exit /b 1
    )
)

REM 2. Check if pywebview is installed
.venv\Scripts\python.exe -c "import webview" 2>nul
if errorlevel 1 (
    echo [INFO] Instalando componente de ventana nativa de escritorio...
    where uv >nul 2>nul
    if not errorlevel 1 (
        uv pip install pywebview --python .venv\Scripts\python.exe
    ) else (
        .venv\Scripts\python -m pip install pywebview
    )
)

REM 3. Check if ultralytics is installed
.venv\Scripts\python.exe -c "import ultralytics" 2>nul
if errorlevel 1 (
    echo [INFO] Instalando motor de vision neuronal YOLOv8-pose ultralytics...
    where uv >nul 2>nul
    if not errorlevel 1 (
        uv pip install ultralytics --python .venv\Scripts\python.exe
    ) else (
        .venv\Scripts\python.exe -m pip install ultralytics
    )
)

REM 4. Run desktop native window
echo [INFO] Abriendo KinePipe MMA en ventana nativa de escritorio...
.venv\Scripts\python.exe desktop_app.py
pause
