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

REM 5. Verify offline YOLOv8-pose weights
if exist "yolov8n-pose.pt" (
    echo [INFO] Modelo de estimacion de pose YOLOv8-pose detectado (modo offline listo).
) else (
    echo [AVISO] Modelo yolov8n-pose.pt no detectado; se descargara en el primer analisis.
)

REM 6. Create Desktop shortcut
echo [INFO] Generando acceso directo en el Escritorio...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'KinePipe MMA.lnk')); $s.TargetPath = '%~dp0KinePipe-MMA.vbs'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'KinePipe MMA - Markless Motion Analyser'; $s.Save()" >nul 2>nul
if exist "%USERPROFILE%\Desktop\KinePipe MMA.lnk" (
    echo [INFO] Acceso directo 'KinePipe MMA' creado en el Escritorio con exito.
)

echo.
echo =========================================================
echo    INSTALACION DE KINEPIPE MMA COMPLETADA CON EXITO!
echo    Acceso directo: 'KinePipe MMA' en tu Escritorio
echo    O ejecuta directamente: KinePipe-MMA.vbs o run_app.bat
echo =========================================================
pause
