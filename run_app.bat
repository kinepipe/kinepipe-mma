@echo off
title KinePipe MMA (Markless Motion Analyser)
cd /d "%~dp0"

set "PATH=%USERPROFILE%\.local\bin;%USERPROFILE%\.cargo\bin;%LOCALAPPDATA%\uv\bin;%PATH%"

echo =========================================================
echo    KINEPIPE MMA (Markless Motion Analyser)
echo    Direccion y Desarrollo: Klgo. Felipe Vargas Rios (@kinepipe)
echo =========================================================
echo.

REM 1. Auto-bootstrap if environment is missing
if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Entorno virtual no detectado. Ejecutando instalacion inicial automatica...
    call install.bat --no-pause
    if errorlevel 1 (
        echo [ERROR] Hubo un problema durante la instalacion inicial.
        pause
        exit /b 1
    )
)

REM 2. Check if frontend is built
if not exist "frontend\dist\index.html" (
    echo [INFO] Compilando frontend React para distribucion portable...
    where npm >nul 2>nul
    if not errorlevel 1 (
        cd frontend
        call npm run build
        cd ..
    ) else (
        echo [ADVERTENCIA] No se encontro frontend/dist ni npm.
    )
)

REM 3. Verify and auto-repair libraries and H.264 video codecs
.venv\Scripts\python.exe verify_env.py --auto-fix
if errorlevel 1 (
    echo [ADVERTENCIA] Ejecutando instalador completo para reparar dependencias...
    call install.bat --no-pause
)

REM 4. Open browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:8000"

REM 5. Start FastAPI server
echo.
echo [INFO] Iniciando KinePipe MMA en http://127.0.0.1:8000 ...
.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
if not "%1"=="--no-pause" pause
