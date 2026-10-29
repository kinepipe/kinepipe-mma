@echo off
title Empaquetador de Release - KinePipe MMA
cd /d "%~dp0"

set "VERSION=v1.5.1"

echo =========================================================
echo    EMPAQUETADOR DE RELEASE: KINEPIPE MMA %VERSION%
echo    Generando paquete portable para GitHub Releases
echo    Direccion y Desarrollo: Klgo. Felipe Vargas Rios (@kinepipe)
echo =========================================================
echo.

REM 1. Ensure frontend is compiled
echo [1/4] Compilando frontend React para produccion...
cd frontend
call npm run build
if errorlevel 1 (
    echo [ERROR] Fallo la compilacion del frontend.
    cd ..
    pause
    exit /b 1
)
cd ..

REM 2. Prepare staging directory
echo [2/4] Preparando carpeta limpia de distribucion...
if exist "release" rmdir /s /q "release"
mkdir "release\KinePipe-MMA-%VERSION%"
set "STAGING=release\KinePipe-MMA-%VERSION%"

REM 3. Copy required clean assets
echo [3/4] Copiando codigo fuente, frontend compilado y scripts...
xcopy /E /I /Q /Y "backend" "%STAGING%\backend"
xcopy /E /I /Q /Y "frontend\dist" "%STAGING%\frontend\dist"
xcopy /E /I /Q /Y "data\sample" "%STAGING%\data\sample"
mkdir "%STAGING%\data\uploads"
copy "data\uploads\.gitkeep" "%STAGING%\data\uploads\" >nul 2>nul
mkdir "%STAGING%\data\exports"
copy "data\exports\.gitkeep" "%STAGING%\data\exports\" >nul 2>nul

REM Clean bytecode and caches from staging
for /d /r "%STAGING%\backend" %%d in (__pycache__ .pytest_cache) do @if exist "%%d" rd /s /q "%%d"

copy "install.bat" "%STAGING%\" >nul
copy "run_app.bat" "%STAGING%\" >nul
copy "run_desktop.bat" "%STAGING%\" >nul
copy "KinePipe-MMA.vbs" "%STAGING%\" >nul
copy "desktop_app.py" "%STAGING%\" >nul
if exist "yolov8n-pose.pt" copy "yolov8n-pose.pt" "%STAGING%\" >nul
copy "README.md" "%STAGING%\" >nul
copy "LICENSE" "%STAGING%\" >nul
copy "CHANGELOG.md" "%STAGING%\" >nul

REM 4. Compress to portable ZIP
echo [4/4] Comprimiendo paquete ZIP para GitHub Releases...
powershell -Command "Compress-Archive -Path '%STAGING%\*' -DestinationPath 'release\KinePipe-MMA-%VERSION%-Windows.zip' -Force"

echo.
echo =========================================================
echo    PAQUETE DE RELEASE GENERADO CON EXITO!
echo    Archivo: release\KinePipe-MMA-%VERSION%-Windows.zip
echo =========================================================
echo.
echo Este archivo ZIP es el que subes directamente a GitHub Releases
echo para que cualquier persona lo descargue y ejecute con 1 clic.
if not "%1"=="--no-pause" pause
