@echo off
title Instalador - KinePipe MMA (Markless Motion Analyser)
cd /d "%~dp0"

echo =========================================================
echo    INSTALADOR: KINEPIPE MMA (Markless Motion Analyser)
echo    Direccion y Desarrollo: Klgo. Felipe Vargas Rios (@kinepipe)
echo =========================================================
echo.

REM 1. Verify UV (Astral package installer - ultra fast)
where uv >nul 2>nul
if errorlevel 1 (
    echo [INFO] Descargando e instalando uv...
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)

REM 2. Create Python 3.10 virtualenv
echo [INFO] Creando entorno virtual Python 3.10 con uv...
uv venv .venv --python 3.10
if errorlevel 1 (
    echo [ADVERTENCIA] Python 3.10 no encontrado directamente, usando interprete por defecto...
    uv venv .venv
)

REM 3. Install Python dependencies
echo [INFO] Instalando librerias de Vision e IA (FastAPI, OpenCV, SciPy, Pandas, PyTorch)...
uv pip install -r backend\requirements.txt

REM 4. Check Frontend build
if exist "frontend\dist\index.html" (
    echo [INFO] Frontend React ya se encuentra compilado en dist\ listo para usar.
) else (
    where npm >nul 2>nul
    if not errorlevel 1 (
        echo [INFO] Instalando dependencias de Node y compilando frontend...
        cd frontend
        call npm install
        call npm run build
        cd ..
    ) else (
        echo [ADVERTENCIA] Node.js no detectado en PATH.
    )
)

echo.
echo =========================================================
echo    INSTALACION DE KINEPIPE MMA COMPLETADA CON EXITO!
echo    Para iniciar la aplicacion, ejecuta: run_app.bat
echo =========================================================
pause
