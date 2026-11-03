@echo off
title KinePipe MMA (Markless Motion Analyser) - Modo Escritorio
cd /d "%~dp0"

set "PATH=%USERPROFILE%\.local\bin;%USERPROFILE%\.cargo\bin;%LOCALAPPDATA%\uv\bin;%PATH%"

echo =========================================================
echo    KINEPIPE MMA (Markless Motion Analyser)
echo    Modo Ventana de Escritorio (Desktop Native App)
echo    Direccion y Desarrollo: Klgo. Felipe Vargas Rios (@kinepipe)
echo =========================================================
echo.

REM 1. Auto-bootstrap if environment is missing
if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Entorno virtual no detectado. Ejecutando instalacion inicial...
    call install.bat --no-pause
    if errorlevel 1 (
        echo [ERROR] Hubo un problema durante la instalacion.
        pause
        exit /b 1
    )
)

REM 2. Verify and auto-repair all required libraries and H.264 video codecs
.venv\Scripts\python.exe verify_env.py --auto-fix
if errorlevel 1 (
    echo [ADVERTENCIA] Ejecutando instalador completo para reparar dependencias...
    call install.bat --no-pause
)

REM 3. Run desktop native window
echo.
echo [INFO] Abriendo KinePipe MMA en ventana nativa de escritorio...
.venv\Scripts\python.exe desktop_app.py
if errorlevel 1 (
    echo [AVISO] La ventana nativa no pudo abrirse; iniciando en navegador web local...
    call run_app.bat %1
)
if not "%1"=="--no-pause" pause
