@echo off
title Instalador - KinePipe MMA (Markless Motion Analyser)
cd /d "%~dp0"

set "PATH=%USERPROFILE%\.local\bin;%USERPROFILE%\.cargo\bin;%LOCALAPPDATA%\uv\bin;%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"

echo =========================================================
echo    INSTALADOR: KINEPIPE MMA (Markless Motion Analyser)
echo    Direccion y Desarrollo: Klgo. Felipe Vargas Rios (@kinepipe)
echo =========================================================
echo.

REM 1. Check Microsoft Visual C++ Redistributable (required by OpenCV and PyTorch on clean PCs)
if not exist "%SystemRoot%\System32\vcruntime140_1.dll" (
    echo [1/6] Instalando Microsoft Visual C++ Redistributable 2015-2022...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile '$env:TEMP\vc_redist.x64.exe'; Start-Process -FilePath '$env:TEMP\vc_redist.x64.exe' -ArgumentList '/install', '/passive', '/norestart' -Wait"
) else (
    echo [1/6] Microsoft Visual C++ Redistributable detectado [OK].
)

REM 2. Verify UV (Astral package and Python manager)
where uv >nul 2>nul
if errorlevel 1 (
    echo [2/6] Descargando e instalando gestor de paquetes y Python (uv)...
    powershell -NoProfile -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    set "PATH=%USERPROFILE%\.local\bin;%USERPROFILE%\.cargo\bin;%LOCALAPPDATA%\uv\bin;%PATH%"
) else (
    echo [2/6] Gestor uv detectado en el sistema [OK].
)

where uv >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se pudo instalar o localizar uv. Verifique su conexion a Internet.
    if not "%1"=="--no-pause" pause
    exit /b 1
)

REM 3. Ensure Python 3.10 is available and create .venv with pip (--seed)
echo [3/6] Configurando interprete Python 3.10 aislado (.venv)...
uv python install 3.10
uv venv .venv --python 3.10 --seed
if errorlevel 1 (
    echo [ADVERTENCIA] Intentando crear entorno virtual con Python gestionado...
    uv venv .venv --managed-python --seed
)

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] No se pudo crear el entorno virtual en .venv\Scripts\python.exe
    if not "%1"=="--no-pause" pause
    exit /b 1
)

REM 4. Install Python dependencies explicitly into .venv
echo [4/6] Instalando librerias de Vision, IA y Codecs H.264 (FastAPI, OpenCV, FFmpeg, SciPy, PyTorch, YOLOv8)...
uv pip install --python .venv\Scripts\python.exe -r backend\requirements.txt
if errorlevel 1 (
    echo [ADVERTENCIA] Reintentando instalacion mediante pip estandar dentro de .venv...
    .venv\Scripts\python.exe -m pip install --upgrade pip
    .venv\Scripts\python.exe -m pip install -r backend\requirements.txt
)

REM 5. Check Frontend build
if exist "frontend\dist\index.html" (
    echo [5/6] Interfaz grafica React precompilada detectada en frontend\dist [OK].
) else (
    where npm >nul 2>nul
    if not errorlevel 1 (
        echo [5/6] Compilando interfaz grafica React...
        cd frontend
        call npm install
        call npm run build
        cd ..
    ) else (
        echo [ADVERTENCIA] No se encontro frontend\dist\index.html ni Node.js (npm).
    )
)

REM 6. Run full environment and video codec diagnostic
echo.
echo [6/6] Verificando librerias, pesos YOLOv8-pose y codecs de video H.264...
.venv\Scripts\python.exe verify_env.py --auto-fix
if errorlevel 1 (
    echo.
    echo [ERROR] Algunos componentes no pudieron verificarse. Revise el listado superior.
    if not "%1"=="--no-pause" pause
    exit /b 1
)

REM 7. Create Desktop shortcut
echo.
echo [INFO] Generando acceso directo en el Escritorio...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'KinePipe MMA.lnk')); $s.TargetPath = '%~dp0KinePipe-MMA.vbs'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'KinePipe MMA - Markless Motion Analyser'; $s.Save()" >nul 2>nul
if exist "%USERPROFILE%\Desktop\KinePipe MMA.lnk" (
    echo [OK] Acceso directo 'KinePipe MMA' creado en el Escritorio.
)

echo.
echo =========================================================
echo    INSTALACION DE KINEPIPE MMA COMPLETADA CON EXITO!
echo    Acceso directo: 'KinePipe MMA' en tu Escritorio
echo    O ejecuta directamente: run_desktop.bat o run_app.bat
echo =========================================================
if not "%1"=="--no-pause" pause
