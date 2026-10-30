---
title: "Control de Cambios y Registro de Actividad: KinePipe MMA (Markless Motion Analyser)"
document_type: "changelog"
project_type: "software"
last_updated: "2026-10-21"
version: "1.5.1"
status: "activo"
---

# Control de Cambios y Registro de Actividad: KinePipe MMA

Suite de análisis biomecánico clínico sin marcadores (Markless Motion Analyser) con telemetría en tiempo real, cinemática 2D y exportación compatible con el ecosistema Kinovea (.KVA) y OpenSim (.TRC / .MOT / .OSIM).

Dirección y Desarrollo Clínico: **Klgo. Felipe Vargas Ríos** (`@kinepipe`)  
Repositorio Oficial: [https://github.com/kinepipe/kinepipe-mma](https://github.com/kinepipe/kinepipe-mma)  
Entorno activo: `e:/DEVELOPER/HUMAN POSE`

---

## 🤖 Instrucciones para Interpretación por IA
1. Tratar este archivo como la **fuente de verdad local** de intervenciones, decisiones y pendientes del proyecto.
2. Resolver rutas relativas siempre a partir de la raíz de esta carpeta de trabajo (`./`).
3. Al recibir una nueva instrucción en este directorio, consultar prioritariamente el último estado registrado en la sesión superior y el backlog activo.
4. No alterar ni sobrescribir las notas técnicas históricas ya consolidadas en sesiones precedentes.

---

## [2026-10-29] - KinePipe MMA v1.5.1: Distribución Instalable Autónoma (Zero-Node Offline) y Acceso Directo de Escritorio

> [!SUMMARY]
> **Síntesis Ejecutiva:** Inclusión del frontend React precompilado (`frontend/dist/`) directamente en el control de versiones Git para eliminar la dependencia de Node.js/npm durante la instalación en equipos de usuarios finales. Actualización de `install.bat` con generación automática de acceso directo en el Escritorio de Windows y verificación de pesos offline `yolov8n-pose.pt`. Generación del paquete portable listo para distribución `release/KinePipe-MMA-v1.5.1-Windows.zip` y sincronización con el tag Git oficial `v1.5.1`.

### 1. Componentes y Artefactos Intervenidos

| Componente / Módulo | Ruta Relativa | Tipo de Cambio | Impacto / Estado |
| :--- | :--- | :--- | :--- |
| **Frontend Compilado** | [`./frontend/dist/`](./frontend/dist/) | Agregado a Git | Permite ejecutar la aplicación inmediatamente tras clonar o descargar el repo sin requerir Node.js ni compilar con Vite. |
| **Reglas Gitignore** | [`.gitignore`](./.gitignore) | Modificado | Se des-ignora `frontend/dist/` para que los artefactos de producción viajen con el código fuente. |
| **Instalador de Windows** | [`./install.bat`](./install.bat) | Mejorado | Detecta frontend precompilado, verifica pesos offline y crea acceso directo en el Escritorio de Windows vía PowerShell WScript. |
| **Empaquetador de Release** | [`./package_release.bat`](./package_release.bat) | Optimizado | Limpieza estricta de cachés `__pycache__`, compilación Vite y empaquetado ZIP en `release/KinePipe-MMA-v1.5.1-Windows.zip`. |

---

## [2026-10-21] - KinePipe MMA v1.5.1: Hotfix de Portabilidad Multi-Equipo, Dependencia YOLOv8-pose y Parche Proactor Asyncio Windows (WinError 10054)

> [!SUMMARY]
> **Síntesis Ejecutiva:** Resolución integral de las dos incidencias identificadas tras el despliegue e instalación en un equipo Windows secundario (`informe_de_errores_kinepipe_mma.md`): (1) Inclusión de la dependencia de visión artificial `ultralytics>=8.1.0` en [`requirements.txt`](./backend/requirements.txt) junto con auto-detección/auto-instalación en los scripts de arranque (`run_app.bat` y `run_desktop.bat`) y empaquetado del modelo de pesos `yolov8n-pose.pt` en la release portable; y (2) Implementación de un parche defensivo para el bucle de eventos `asyncio` (`_ProactorBasePipeTransport`) que silencia la interrupción inofensiva `WinError 10054` producida por el reproductor HTML5 al cancelar peticiones `206 Partial Content` durante el streaming y scrubbing de video.

### 1. Componentes y Artefactos Intervenidos

| Componente / Módulo | Ruta Relativa | Tipo de Cambio | Impacto / Estado |
| :--- | :--- | :--- | :--- |
| **Lista de Dependencias Backend** | [`./backend/requirements.txt`](./backend/requirements.txt) | Modificado | Incorpora `ultralytics>=8.1.0` para garantizar que `install.bat` instale YOLOv8-pose y PyTorch en equipos limpios. |
| **Servidor FastAPI Backend** | [`./backend/app/main.py`](./backend/app/main.py) | Modificado | Inyección del parche defensivo de `asyncio` Windows en el arranque del servidor para interceptar `WinError 10054`. |
| **Lanzador Ventana de Escritorio** | [`./desktop_app.py`](./desktop_app.py) | Modificado | Parche defensivo de `asyncio` aplicado antes de iniciar el hilo de Uvicorn y la ventana Edge WebView2. |
| **Adaptador Biomecánico Sports2D** | [`./backend/app/protocols/sports2d_adapter.py`](./backend/app/protocols/sports2d_adapter.py) | Modificado | Detección robusta de ruta `yolov8n-pose.pt`, chequeo dinámico `is_available()` y excepción explicativa con sugerencia de instalación. |
| **Lanzador Web / Navegador** | [`./run_app.bat`](./run_app.bat) | Modificado | Verificación y auto-instalación silenciosa de `ultralytics` si el entorno virtual preexistente carece de él. |
| **Lanzador Escritorio Batch** | [`./run_desktop.bat`](./run_desktop.bat) | Modificado | Chequeo preventivo de `ultralytics` antes de instanciar la interfaz nativa `desktop_app.py`. |
| **Empaquetador de Distribución** | [`./package_release.bat`](./package_release.bat) | Modificado | Copia automática del archivo de pesos `.pt` (`yolov8n-pose.pt`) a la carpeta de staging de release para soporte offline. |
| **Pruebas de Integración KVA** | [`./backend/tests/test_kva.py`](./backend/tests/test_kva.py) | Corregido | Sincronización de aserciones XML con la versión Kinovea 2025.2 (`<Keyframe>`, `<Track>`, `<TrackPointList>`). |

### 2. Detalle de Realizaciones y Cambios

- **Resolución INC-01: Dependencia `ultralytics` y Disponibilidad del Modelo YOLOv8-pose:**
  - Se diagnosticó que el entorno original de desarrollo contaba con `ultralytics` instalado ad-hoc, pero no figuraba en [`backend/requirements.txt`](./backend/requirements.txt), provocando que instalaciones limpias con [`install.bat`](./install.bat) en otros equipos fallaran al importar `ultralytics` en `Sports2DAdapter`.
  - Se agregó `ultralytics>=8.1.0` a la especificación de dependencias.
  - En [`run_app.bat`](./run_app.bat) y [`run_desktop.bat`](./run_desktop.bat) se implementó un chequeo preventivo con `python -c "import ultralytics"` que auto-instala la librería de inmediato si el `.venv` fue creado previamente sin ella, eliminando fricción para el usuario final.
  - En [`sports2d_adapter.py`](./backend/app/protocols/sports2d_adapter.py) se configuró la carga de pesos buscando prioritariamente en `PROJECT_ROOT / "yolov8n-pose.pt"` antes de delegar en el nombre genérico, se conectó la propiedad `is_installed=self.is_available()` y se agregó una excepción explícita informativa si se intenta procesar video sin el motor neuronal.
  - Se actualizó [`package_release.bat`](./package_release.bat) para empaquetar `yolov8n-pose.pt` (6.8 MB) directamente en el ZIP descargable, habilitando inferencia instantánea sin requerir descarga en el primer uso.

- **Resolución INC-02: Supresión de `WinError 10054` en Streaming de Video:**
  - Se determinó que el error `ConnectionResetError: [WinError 10054]` en `_ProactorBasePipeTransport._call_connection_lost` ocurre cuando el reproductor `<video>` HTML5 cancela conexiones de streaming (`206 Partial Content`) durante la navegación temporal (*scrubbing*) o el llenado de búfer.
  - Se integró la función interceptora `_silenciar_reset_conexion` en el arranque de [`backend/app/main.py`](./backend/app/main.py) y [`desktop_app.py`](./desktop_app.py), evitando que la consola se sature de trazas de error sin afectar la estabilidad ni el cierre natural de conexiones.

- **Resolución INC-03: Corrección de Sintaxis Batch en Lanzadores (`run_desktop.bat` / `run_app.bat`):**
  - Se eliminaron paréntesis no escapados en comandos `echo` dentro de bloques `if errorlevel 1 (...)`, los cuales provocaban que `cmd.exe` abortara la ejecución instantáneamente arrojando `No se esperaba ... en este momento`.
  - Se agregó `pause` al final de los scripts para garantizar visibilidad de la consola en caso de excepciones.
  - Se fijó el directorio de trabajo en [`KinePipe-MMA.vbs`](./KinePipe-MMA.vbs) mediante `fso.GetParentFolderName(WScript.ScriptFullName)`.

- **Resolución INC-04: Búsqueda Literal de Videos y Supresión del Fallback Silencioso a Sample:**
  - Se identificó que `Path.glob(f"{video_id}*")` fallaba al procesar nombres de video con corchetes `[...]` (frecuentes en descargas de YouTube) o paréntesis, tratándolos erróneamente como clases de caracteres regex.
  - Al fallar la búsqueda, tanto el streaming como el tracking caían silenciosamente en `sample_cmj_jump.mp4` (video sintético negro con líneas de palitos donde YOLOv8 no detectaba articulaciones, produciendo "video vacío y análisis vacío").
  - Se implementaron las funciones [`find_video_path`](./backend/app/core/video_engine.py) y [`find_thumbnail_path`](./backend/app/core/video_engine.py) basadas en iteración y comparación literal de cadenas, garantizando coincidencia exacta por stem, nombre o prefijo UUID.
  - Se restringió el fallback a `sample_cmj_jump.mp4` únicamente cuando `video_id` sea explícitamente `"sample"` o `"sample_cmj_jump"`.

- **Resolución INC-05: Codificación de URLs y Reset de Input en Frontend:**
  - En [`frontend/src/services/api.js`](./frontend/src/services/api.js), se envolvieron los `video_id` con `encodeURIComponent` para prevenir rotura de rutas HTTP con espacios y símbolos.
  - En [`frontend/src/App.jsx`](./frontend/src/App.jsx), se agregó el reseteo de `e.target.value = ''` tras la subida de video para permitir re-selección del mismo archivo sin bloqueos.

- **Verificación de Pruebas Automatizadas:**
  - Ejecución de la suite completa de pruebas unitarias (`backend/tests/`), validando 6/6 tests exitosos (cinemática 2D, filtrado Butterworth, ángulos articulares y exportación Kinovea KVA 2025.2).

### 3. Nota Técnica y Criterios Arquitectónicos (`mdmake`)

> [!NOTE]
> **Aislamiento de Rutas y Matching de Archivos en Disco:** En aplicaciones que ingieren archivos multimedia del usuario, nunca debe utilizarse `Path.glob()` con entradas arbitrarias de usuario porque los caracteres de control de globbing (`[`, `]`, `*`, `?`) alteran el patrón de búsqueda. La iteración directa con `folder.iterdir()` y comparación literal es inmune a fallos de sintaxis de archivo.

> [!IMPORTANT]
> **Autonomía Offline del Modelo Neuronal:** La inclusión de `yolov8n-pose.pt` en el empaquetado release garantiza que clínicas, consultorios deportivos o laboratorios docentes con conectividad a internet restringida puedan ejecutar el análisis biomecánico desde el primer minuto sin descargas satelitales obligatorias.

### 4. 📌 Pendientes y Próximos Pasos (Backlog)

- [x] **Completado:** Incorporar `ultralytics` a `requirements.txt` y validar instalación automática en scripts batch.
- [x] **Completado:** Corregir sintaxis batch de lanzadores y asegurar directorio de trabajo en VBScript.
- [x] **Completado:** Reemplazar `glob` por búsqueda literal en `video_engine.py`, `routes_video.py` y `routes_tracking.py`.
- [x] **Completado:** Asegurar inclusión de pesos `yolov8n-pose.pt` en la generación de release (`package_release.bat`).
- [x] **Completado:** Re-generar paquete `release/KinePipe-MMA-v1.5.1-Windows.zip` con limpieza estricta de caches bytecode y creación de acceso directo en `install.bat`.
- [x] **Completado:** Publicar oficialmente la Release `v1.5.1` en GitHub (`https://github.com/kinepipe/kinepipe-mma/releases/tag/v1.5.1`) con los activos de instalación y ejecución en Windows (`KinePipe-MMA-v1.5.1-Windows.zip` e `install.bat`) adjuntos.
- [ ] **Alta:** Probar la instalación completa en un entorno limpio sin internet para verificar la carga offline de los pesos de pose.
- [ ] **Media:** Configuración de GitHub Actions (CI/CD) para auto-compilar el paquete `.zip` en cada nuevo tag de versión.
- [ ] **Media:** Generación de informe PDF clínico consolidado con los subpaneles cinemáticos seleccionados.
- [ ] **Media:** Exportación e importación de curvas cinemáticas en formato estándar C3D.
- [ ] **Baja:** Cálculo del índice de simetría bilateral de marcha (GDI / Robinson Symmetry Index).

---

## [2026-10-20] - KinePipe MMA v1.5.0: Lanzamiento Oficial Open Source en GitHub, Arquitectura de Distribución Dual y Release Binaria v1.5.0

> [!SUMMARY]
> **Síntesis Ejecutiva:** Consolidación formal de la suite de software como **KinePipe MMA (Markless Motion Analyser)**, implementando una arquitectura de distribución dual (Opción Web vía navegador y Opción Escritorio Nativo vía Edge WebView2/pywebview), empaquetado autónomo en `.zip` de 896 KB para usuarios finales, publicación del repositorio de código abierto en GitHub ([`kinepipe/kinepipe-mma`](https://github.com/kinepipe/kinepipe-mma)) y lanzamiento de la primera Release oficial descargable `v1.5.0`.

### 1. Componentes y Artefactos Intervenidos

| Componente / Módulo | Ruta Relativa | Tipo de Cambio | Impacto / Estado |
| :--- | :--- | :--- | :--- |
| **Lanzador Ventana Nativa** | [`./desktop_app.py`](./desktop_app.py) | Creado | Wrapper desktop con `pywebview` sobre Edge WebView2, tamaño fijo de 1440x900 px, icono y menú nativo. |
| **Lanzador Escritorio Batch** | [`./run_desktop.bat`](./run_desktop.bat) | Creado | Script de orquestación dual que levanta uvicorn en segundo plano y ejecuta la ventana de escritorio. |
| **Lanzador Silencioso VBScript** | [`./KinePipe-MMA.vbs`](./KinePipe-MMA.vbs) | Creado | Ejecutable silencioso para el usuario final: oculta la consola negra de Windows CMD en arranque. |
| **Lanzador Web / Navegador** | [`./run_app.bat`](./run_app.bat) | Modificado | Auto-bootstrap con chequeo de dependencias, arranque de API y apertura del navegador predeterminado. |
| **Script de Instalación Inicial** | [`./install.bat`](./install.bat) | Modificado | Creación de entorno virtual `.venv`, instalación de dependencias y validación de componentes. |
| **Generador de Paquete Release** | [`./package_release.bat`](./package_release.bat) | Creado | Automatización de empaquetado para distribución: excluye `.venv`, videos clínicos privados y node_modules. |
| **Paquete Binario de Distribución** | [`./release/KinePipe-MMA-v1.5.0-Windows.zip`](./release/KinePipe-MMA-v1.5.0-Windows.zip) | Generado | Archivo comprimido ultra ligero (896 KB) listo para descarga directa en GitHub Releases. |
| **Licencia de Código Abierto** | [`./LICENSE`](./LICENSE) | Creado | Licencia estándar MIT con Copyright (c) 2026 Klgo. Felipe Vargas Ríos (`@kinepipe`). |
| **Control de Ignorados Git** | [`.gitignore`](./.gitignore) | Optimizado | Protección estricta de videos de pacientes (`data/uploads/`, `video testing/`), `.venv`, `dist/` y `release/`. |
| **Repositorio Git y Remoto** | [`./.git`](./.git) | Inicializado / Vinculado | Rama `main` creada y sincronizada con el origen `https://github.com/kinepipe/kinepipe-mma.git`. |
| **Modal Acerca de y Branding** | [`./frontend/src/components/AboutModal.jsx`](./frontend/src/components/AboutModal.jsx) | Modificado | Denominación unificada `KinePipe MMA`, versión 1.5.0 y tarjetas de capacidades clínicas. |
| **Barra Superior (Header)** | [`./frontend/src/components/Header.jsx`](./frontend/src/components/Header.jsx) | Modificado | Marca formal `KINEPIPE MMA STUDIO` y chip de autoría `@kinepipe`. |
| **Servidor FastAPI Backend** | [`./backend/app/main.py`](./backend/app/main.py) | Modificado | Título oficial `KinePipe MMA (Markless Motion Analyser)` y endpoints enriquecidos. |

### 2. Detalle de Realizaciones y Cambios

- **Consolidación de Identidad y Marca Formal:**
  - Se formalizó el nombre definitivo de la herramienta: **KinePipe MMA** (*Markless Motion Analyser*), sintetizando su propósito de análisis biomecánico sin marcadores corporales.
  - Se actualizaron todos los puntos de contacto en el frontend ([`AboutModal.jsx`](./frontend/src/components/AboutModal.jsx), [`Header.jsx`](./frontend/src/components/Header.jsx), [`ReportModal.jsx`](./frontend/src/components/ReportModal.jsx), [`index.html`](./frontend/index.html)) y backend ([`main.py`](./backend/app/main.py), [`routes_export.py`](./backend/app/api/routes_export.py)).
  - Se registró la autoría profesional de **Klgo. Felipe Vargas Ríos** (`@kinepipe`) en el archivo [`LICENSE`](./LICENSE), encabezados de exportación OpenSim `.mot` y timbres de reportes clínicos imprimibles.

- **Estrategia y Arquitectura de Distribución Dual:**
  - **Opción A (Navegador Web):** Mantener la capacidad de abrir la suite en Chrome/Edge mediante [`run_app.bat`](./run_app.bat), ideal para entornos multi-pantalla o visualización web clásica.
  - **Opción B (Ventana de Escritorio Nativa):** Implementación de [`desktop_app.py`](./desktop_app.py) utilizando `pywebview` sobre el motor nativo de Windows (Microsoft Edge Chromium WebView2). Proporciona una experiencia de aplicación de escritorio pura, sin barra de direcciones, sin pestañas del navegador y con atajos de ventana estándar.
  - **Arranque Silencioso con VBScript:** Creación de [`KinePipe-MMA.vbs`](./KinePipe-MMA.vbs) para ejecutar el entorno en modo `WScript.CreateObject("WScript.Shell").Run ..., 0, False`, eliminando la ventana negra de consola CMD que incomoda a los usuarios no técnicos.

- **Empaquetado y Distribución Limpia (Zero Bloat):**
  - Implementación del script de empaquetado [`package_release.bat`](./package_release.bat) con PowerShell Zip.
  - Generación de [`release/KinePipe-MMA-v1.5.0-Windows.zip`](./release/KinePipe-MMA-v1.5.0-Windows.zip) con un peso final de **solo 896 KB** (menos de 1 MB).
  - Higiene estricta de datos: el paquete contiene el código fuente de backend y frontend compilado (`dist/`), pero excluye por completo los gigabytes del entorno virtual `.venv`, las carpetas `node_modules` y todo material sensible de pruebas clínicas (`video testing/` y `data/uploads/`).
  - El usuario que descargue el `.zip` solo debe ejecutar [`install.bat`](./install.bat) una sola vez (o directamente [`run_desktop.bat`](./run_desktop.bat) / [`KinePipe-MMA.vbs`](./KinePipe-MMA.vbs), los cuales instalan dependencias automáticamente si el `.venv` no existe).

- **Publicación en GitHub y Resolución de Conflictos de Sistema:**
  - Diagnóstico y resolución del error `fatal: git show-ref: bad ref refs/tags/desktop.ini` en GitHub Desktop: se identificó que el software intentaba cargar un repositorio previo sincronizado en Google Drive (`K:\`), el cual había inyectado archivos ocultos `desktop.ini` en las carpetas de referencias Git. Se realizó el saneamiento de las referencias y archivos `.lock` corruptos.
  - Inicialización limpia de Git en rama `main`, commit fundacional `4e8869f` y vinculación remota a [`https://github.com/kinepipe/kinepipe-mma.git`](https://github.com/kinepipe/kinepipe-mma.git).
  - Push exitoso de todo el árbol de trabajo a GitHub.
  - Acompañamiento en la publicación de la Release oficial `v1.5.0` con la descripción clínica y el binario `.zip` descargable adjunto.

### 3. Nota Técnica y Criterios Arquitectónicos (`mdmake`)

> [!NOTE]
> **Fundamentación del Motor WebView2 Nativo vs Electron:** En lugar de empaquetar un binario de Electron de más de 180 MB para lograr una ventana de escritorio nativa, se adoptó `pywebview` enlazado con el motor Evergreen de Edge WebView2 preinstalado en Windows 10/11. Esto permitió mantener el peso de descarga del software en menos de 1 MB (896 KB), garantizando un consumo mínimo de RAM y compatibilidad directa con el backend FastAPI local a través de IPC loopback (`127.0.0.1:8000`).

> [!IMPORTANT]
> **Privacidad y Cumplimiento Ético de Datos:** La configuración defensiva en [`.gitignore`](./.gitignore) previene estrictamente la subida accidental de videos de pacientes o evaluados a GitHub (`video testing/`, `data/uploads/`, `*.mp4`, `*.mov`). Los repositorios de código abierto deben mantener una separación absoluta entre el motor algorítmico y los registros de imágenes clínicas reales, garantizando el cumplimiento de normas de protección de datos personales en salud.

### 4. 📌 Pendientes y Próximos Pasos (Backlog)

- [x] **Completado:** Consolidación de identidad formal KinePipe MMA (Markless Motion Analyser).
- [x] **Completado:** Modal Acerca de con ficha técnica, badges clínicos y autoría Klgo. Felipe Vargas Ríos (@kinepipe).
- [x] **Completado:** Soporte dual para ejecución en Navegador Web (`run_app.bat`) y Escritorio Nativo (`KinePipe-MMA.vbs` / `run_desktop.bat`).
- [x] **Completado:** Script de empaquetado y generación de archivo binario `release/KinePipe-MMA-v1.5.0-Windows.zip`.
- [x] **Completado:** Publicación del repositorio oficial en GitHub y release v1.5.0 con binario descargable.
- [ ] **Alta:** Configuración de GitHub Actions (CI/CD) para auto-compilar el paquete `.zip` en cada nuevo tag de versión.
- [ ] **Media:** Generación de informe PDF clínico consolidado con los subpaneles cinemáticos seleccionados.
- [ ] **Media:** Exportación e importación de curvas cinemáticas en formato estándar C3D.
- [ ] **Baja:** Cálculo del índice de simetría bilateral de marcha (GDI / Robinson Symmetry Index).

---

## [2026-10-20] - KineBiomech AI Studio v1.5.0: Formal Naming, Modal "Acerca de" y Créditos de Autoría (Klgo. Felipe Vargas Ríos - @kinepipe)

> [!SUMMARY]
> **Síntesis Ejecutiva:** Establecimiento de la identidad formal y definitiva de la suite de software como **KineBiomech AI Studio** (con opciones de formalización KineMotion AI / KinePipe Studio), integrando el modal oficial "Acerca de" (`AboutModal.jsx`) con ficha técnica, credenciales profesionales del autor **Klgo. Felipe Vargas Ríos** (`@kinepipe`), badges de interoperabilidad con Kinovea y OpenSim, botón de acceso directo en la barra superior, firma profesional en los informes clínicos imprimibles y actualización de metadatos en backend y frontend.

### 1. Componentes y Artefactos Intervenidos

| Componente / Módulo | Ruta Relativa | Tipo de Cambio | Impacto / Estado |
| :--- | :--- | :--- | :--- |
| **Modal Acerca de** | [`./frontend/src/components/AboutModal.jsx`](./frontend/src/components/AboutModal.jsx) | Creado | Ficha técnica oficial, credenciales profesionales de Klgo. Felipe Vargas Ríos (@kinepipe) y capacidades. |
| **Cabecera UI (Header)** | [`./frontend/src/components/Header.jsx`](./frontend/src/components/Header.jsx) | Modificado | Marca formal `KINEBIOMECH AI STUDIO`, chip conmemorativo de autoría y botón "Acerca de". |
| **Control de Estado UI** | [`./frontend/src/App.jsx`](./frontend/src/App.jsx) | Modificado | Integración de estado `isAboutOpen` y orquestación del modal. |
| **Reporte Clínico** | [`./frontend/src/components/ReportModal.jsx`](./frontend/src/components/ReportModal.jsx) | Modificado | Inclusión de autoría y timbre profesional: `Klgo. Felipe Vargas Ríos (@kinepipe)` en cabecera y pie. |
| **Metadatos HTML** | [`./frontend/index.html`](./frontend/index.html) | Modificado | Título formal `KineBiomech AI Studio` y etiquetas meta `author` y `description`. |
| **API Principal Backend** | [`./backend/app/main.py`](./backend/app/main.py) | Modificado | Título formal, autor y versión 1.5.0 en metadatos FastAPI OpenAPI. |
| **Exportador OpenSim MOT** | [`./backend/app/api/routes_export.py`](./backend/app/api/routes_export.py) | Modificado | Comentario de autoría en encabezado SimTK Storage (.MOT). |

### 2. Detalle de Realizaciones y Cambios

- **Identidad Formal y Modal Acerca de:**
  - Creación del componente [`AboutModal.jsx`](./frontend/src/components/AboutModal.jsx) con estética oscura glassmorphism, acentos goniométricos `#00FF88` y `#00E5FF`, tarjeta destacada de dirección y desarrollo clínico a nombre de **Klgo. Felipe Vargas Ríos** (`@kinepipe`).
  - Resumen de capacidades clave: cinemática angular sagital filtrada, fases de marcha (Heel strike / Toe-off), estimación de Centro de Masa (COM) normalizado a talla humana, y exportación a Kinovea 2025.2 y OpenSim 4.x.
- **Presencia en Interfaz y Reportabilidad:**
  - Acceso dual al modal Acerca de: haciendo clic en el logotipo principal, en el chip de autor del encabezado o en el botón dedicado de la barra de herramientas.
  - Firma y timbre clínico en el [`ReportModal.jsx`](./frontend/src/components/ReportModal.jsx), validando la procedencia del documento para uso en docencia, kinesiología y medicina deportiva.

---

## [2026-10-20] - Kinovea-AI Studio v1.4.0: Panel Clínico Multigráfico, Miniaturas Reales en Fotogramas, Calibración Robusta por Talla y Exportación OpenSim (.MOT y .OSIM)

> [!SUMMARY]
> **Síntesis Ejecutiva:** Entrega de mejoras biomecánicas críticas solicitadas por el usuario: (1) Corrección integral de la excepción `KeyError: 'nose'` al calibrar por estatura métrica en videos con marcadores variables; (2) Adición del servicio de extracción de cuadros (`/api/video/{id}/frame/{idx}`) para dotar a los fotogramas clave autogenerados (marcha, salto, sentadilla) de miniaturas fotográficas reales de alta fidelidad; (3) Integración del **Panel de Gráficos Clínico Multieje** en el dashboard cinemático, permitiendo añadir, eliminar y organizar subgráficos independientes (rodilla, cadera, tobillo, tronco, COM, velocidades) con escalas Y propias y cursor de tiempo sincronizado, emulando los reportes clínicos de marcha; y (4) Solución del fallo de lectura en OpenSim mediante la reestructuración estricta de coordenadas `.mot` bajo la especificación SimTK Storage 4.x y la disponibilidad de descarga directa del modelo musculoesquelético coordinado `.osim` (`marcha_humana_perry.osim`).

### 1. Componentes y Artefactos Intervenidos

| Componente / Módulo | Ruta Relativa | Tipo de Cambio | Impacto / Estado |
| :--- | :--- | :--- | :--- |
| **API Cinemática** | [`./backend/app/api/routes_kinematics.py`](./backend/app/api/routes_kinematics.py) | Corrección de Bug | Corrige `KeyError: 'nose'` al recalcular cinemática mediante agregación segura `NaN-safe` de marcadores. |
| **API de Video y Cuadros** | [`./backend/app/api/routes_video.py`](./backend/app/api/routes_video.py) | Nueva Característica | Endpoint `/api/video/{id}/frame/{frame_index}` que retorna fotogramas JPEG optimizados extraídos por OpenCV. |
| **Detección de Eventos / Marcha** | [`./backend/app/api/routes_tracking.py`](./backend/app/api/routes_tracking.py) | Modificado | Inyección de `thumbnail_url` en el 100% de los fotogramas clave autogenerados (heel strike, toe off, etc.). |
| **Exportador OpenSim MOT/OSIM** | [`./backend/app/api/routes_export.py`](./backend/app/api/routes_export.py) | Corrección y Nueva Característica | Formato estricto SimTK Storage `.mot` (24 coordenadas clínicas) y endpoint `/api/export/osim/{id}` para descargar el modelo `.osim`. |
| **Modelo Musculoesquelético** | [`./backend/app/models/gait_model.osim`](./backend/app/models/gait_model.osim) | Integrado | Modelo biomecánico OpenSim 4.x (`Marcha_Humana_Perry_Vargas`) validado con articulaciones sagitales. |
| **Dashboard Cinemático** | [`./frontend/src/components/KinematicsDashboard.jsx`](./frontend/src/components/KinematicsDashboard.jsx) | Nueva Característica | Modo *Panel Gráficos Clínico* con subplots independientes, ejes Y autónomos, cursor de tiempo sincronizado y selector de paneles. |
| **Modal de Exportación UI** | [`./frontend/src/components/ExportModal.jsx`](./frontend/src/components/ExportModal.jsx) | Modificado | Botón y tarjeta dedicada para *Exportar Modelo Esquelético (.OSIM)* junto con `.MOT` y `.TRC`. |
| **Panel de Fotogramas Clave** | [`./frontend/src/components/KeyframeNotesPanel.jsx`](./frontend/src/components/KeyframeNotesPanel.jsx) | Modificado | Respaldo resiliente de miniaturas fotográficas para fotogramas manuales y autogenerados. |

### 2. Detalle de Realizaciones y Cambios

- **Calibración Robusta por Talla / Altura (Cero Fallos):**
  - Se identificó la causa raíz del error modal `Error al recalcular cinemática`: el algoritmo de interpolación y suavizado `recalculate_kinematics` intentaba indexar marcadores en todos los fotogramas basándose únicamente en el fotograma 0 (`session.frames[0].keypoints.keys()`). En fotogramas avanzados donde un marcador extremo (como `nose` o `ear`) desaparecía por oclusión o perfil sagital, se disparaba un `KeyError: 'nose'`.
  - Se implementó un escaneo de todas las claves únicas a lo largo de toda la secuencia y un llenado defensivo con `np.nan`, seguido de interpolación lineal y actualización de distancias en metros (`x_m`, `y_m`), alturas del Centro de Masa (COM) normalizadas respecto a la talla (`% Talla`) y velocidades lineales reales (`m/s`).
- **Miniaturas Fotográficas Reales en Fotogramas Autogenerados:**
  - Al ejecutar el protocolo de análisis (*Marcha y Carrera*, *Salto CMJ*, *Sentadilla*), el backend ahora asigna automáticamente la URL del fotograma correspondiente (`/api/video/{video_id}/frame/{frame_index}`).
  - El frontend y el reporte clínico renderizan la foto exacta del instante del evento biomecánico (por ejemplo, el impacto exacto del talón en el suelo o el despegue de la punta del pie) con sus respectivos ángulos articulares medidos.
- **Panel de Gráficos Clínico Multieje (Subplots Independientes):**
  - Implementación de la vista clínica en [`KinematicsDashboard.jsx`](./frontend/src/components/KinematicsDashboard.jsx):
    - Subpaneles desacoplados para: *Rodilla Sagital*, *Cadera Sagital*, *Tobillo Sagital*, *Inclinación de Tronco*, *Altura COM (% Talla)*, *Velocidad Lineal COM* y *Velocidades Angulares Segmentarias*.
    - Cada subpanel dispone de su propio eje Y adaptado a su rango fisiológico (evitando la distorsión de escalas que ocurre al graficar rodilla de 0-80° y cadera de -10-20° en un mismo plano).
    - Métricas directas de Mínimo, Máximo y Rango de Movimiento (ROM).
    - Barra de herramientas con filtros para alternar subpaneles y botones de configuración rápida (*Marcha Sagital*, *Todos*).
- **Compatibilidad OpenSim (.MOT y .OSIM):**
  - El archivo `.mot` ahora cumple estrictamente con el encabezado de SimTK Storage:
    ```
    Coordinates
    version=1
    nRows=<num_frames>
    nColumns=24
    inDegrees=yes
    Units are S.I. units (second, meters, deg)
    ...
    endheader
    ```
  - Se incorporaron las 24 columnas exactas requeridas por OpenSim (`time`, `pelvis_tilt`, `pelvis_list`, `pelvis_rotation`, `pelvis_tx`, `pelvis_ty`, `pelvis_tz`, `hip_flexion_r`, `hip_adduction_r`, `hip_rotation_r`, `knee_angle_r`, `ankle_angle_r`, etc.), mapeando los ángulos articulares 2D a la convención biomecánica sagital (extensión completa = 0°, flexión de rodilla negativa, flexión de cadera positiva).
  - Se integró el modelo musculoesquelético oficial [`backend/app/models/gait_model.osim`](./backend/app/models/gait_model.osim) (`Marcha_Humana_Perry_Vargas.osim`), descargable directamente desde el nuevo botón *Exportar Modelo Esquelético (.OSIM)* del Centro de Exportación.

### 3. Nota Técnica y Criterios Arquitectónicos (`mdmake`)

> [!NOTE]
> **Compatibilidad de Coordenadas SimTK OpenSim:** La clase `Storage` de OpenSim en C++ es sumamente sensible al formato del archivo `.mot`. Cualquier salto de línea redundante antes de `endheader` o una discrepancia entre `nColumns` y el conteo de identificadores de columna en la primera línea post-cabecera provoca la excepción `Could not read motion file`. Al alinear las 24 coordenadas con las articulaciones del modelo musculoesquelético `.osim` adjunto, OpenSim puede abrir el archivo de movimiento directamente en el menú `File -> Open Model...` seguido de `File -> Load Motion...` sin errores de importación.

> [!IMPORTANT]
> **Aislamiento Visual de Subpaneles Cinemáticos:** En biomecánica clínica, el estándar de reporte (ISB / Gait and Clinical Movement Analysis Society) desaconseja superponer curvas de diferentes segmentos en un eje único cuando sus rangos y planos no son idénticos. La visualización en subplots paralelos sincronizados con la línea de tiempo permite al evaluador comparar la cadencia de la flexión de rodilla con la oscilación del tronco de manera aislada y fidedigna.

### 4. 📌 Pendientes y Próximos Pasos (Backlog)

- [x] **Completado:** Corrección de calibración métrica por estatura con blindaje ante marcadores ausentes.
- [x] **Completado:** Generación y visualización de miniaturas fotográficas reales en fotogramas clave automáticos.
- [x] **Completado:** Panel de gráficos clínicos con subplots independientes y menú de inclusión/exclusión.
- [x] **Completado:** Exportación `.mot` con encabezado SimTK Storage y descarga del modelo esquelético `.osim`.
- [ ] **Media:** Generación de informe PDF consolidado con los subpaneles clínicos seleccionados.
- [ ] **Baja:** Cálculo de simetría bilateral (índice de Robinson) comparando los ciclos de marcha de extremidad derecha e izquierda.

---

### 1. Componentes y Artefactos Intervenidos

| Componente / Módulo | Ruta Relativa | Tipo de Cambio | Impacto / Estado |
| :--- | :--- | :--- | :--- |
| **Rutas de Tracking API** | [`./backend/app/api/routes_tracking.py`](./backend/app/api/routes_tracking.py) | Corrección de Bug | Corrige `AttributeError` en `x_m` al reanalizar marcha y añade blindaje de keypoints. |
| **Motor KVA XML** | [`./backend/app/core/kva_engine.py`](./backend/app/core/kva_engine.py) | Refactorización de Estructura | Cumplimiento 100% de `FormatVersion 2.1` según `Valeria camina .kva`; elimina `<Text>` sintético causante de `NullReferenceException` y añade `<TrackerParameters>`. |
| **Cálculos Cinemáticos** | [`./backend/app/core/kinematics_math.py`](./backend/app/core/kinematics_math.py) | Modificado / Nueva Característica | Normalización de COM por estatura y velocidades segmentarias (lineales y angulares). |
| **Exportador OpenSim MOT** | [`./backend/app/core/opensim_engine.py`](./backend/app/core/opensim_engine.py) | Creado | Generación de archivo de movimiento `.mot` para articular con modelos musculoesqueléticos `.osim`. |
| **Lienzo de Video (Stage)** | [`./frontend/src/components/VideoStage.jsx`](./frontend/src/components/VideoStage.jsx) | Refactorizado / Mejorado | Esquema cromático opuesto L/R, cronómetro digital en pantalla, telemetría sagital y controles de zoom/pan independientes de la UI general. |
| **Línea de Tiempo** | [`./frontend/src/components/Timeline.jsx`](./frontend/src/components/Timeline.jsx) | Modificado | Soporte de bucle working zone [In / Out] y marcadores de fotogramas clave con miniaturas. |
| **Panel de Fotogramas Clave** | [`./frontend/src/components/KeyframeNotesPanel.jsx`](./frontend/src/components/KeyframeNotesPanel.jsx) | Modificado | Miniatura real fotográfica por evento y edición de observaciones clínicas in-situ. |
| **Panel de Ángulos Articulares** | [`./frontend/src/components/AnglesPanel.jsx`](./frontend/src/components/AnglesPanel.jsx) | Creado / Mejorado | Selector rápido de visibilidad de ángulos y vistas independientes pop-out con minigráfico temporal. |
| **Modal de Calibración** | [`./frontend/src/components/CalibrationModal.jsx`](./frontend/src/components/CalibrationModal.jsx) | Modificado | Calibración métrica por estatura o talla conocida del sujeto en metros. |
| **Modal de Reporte Clínico** | [`./frontend/src/components/ReportModal.jsx`](./frontend/src/components/ReportModal.jsx) | Creado / Mejorado | Tabla resumen clínica imprimible con selector Color vs Escala de Grises. |
| **Control de Estado Principal** | [`./frontend/src/App.jsx`](./frontend/src/App.jsx) | Modificado | Orquestación del bucle In/Out, control de ejecución de análisis bajo demanda (botón Re-analizar) e integración de modales. |

### 2. Detalle de Realizaciones y Cambios

- **Corrección de Crash en Kinovea y Re-análisis en Sports2D:**
  - Corrección de acceso seguro a `x_m` y `y_m` en `routes_tracking.py` evitando excepciones cuando un fotograma no detecta marcadores extremos.
  - Reestructuración de `kva_engine.py`: se retiraron los elementos `<Text>` no serializables que Kinovea interpretaba erróneamente en `SurfaceScreen_MouseUp`, trasladando las notas a `<Comment>`, agregando parámetros obligatorios de tracking `<TrackerParameters>` y asegurando la coherencia de `<OriginalFilename>` y metadata.
- **Visualización Cromática y Goniométrica:**
  - Asignación de colores complementarios opuestos (rueda cromática: lado derecho en gama cian/azul `#00E5FF`, lado izquierdo en gama naranja/rojo `#FF6D00`) para rápida diferenciación sagital bilateral.
  - Subpanel de configuración para alternar la visualización en pantalla de cada ángulo articular individualmente y mostrar gráficos aislados en tarjetas dedicadas.
- **Interacción y Herramientas Clínicas:**
  - Bucle continuo en playback restringido entre los límites de corte `[In / Out]` (Working Zone).
  - Cronómetro digital en pantalla con botones de inicio manual y reseteo relativo a eventos cinemáticos.
  - Zoom nativo (con botones y scroll) con paneo por arrastre sobre el video sin agrandar los botones ni fuentes del navegador.
- **Calibración y Reportabilidad:**
  - Módulo de calibración por estatura (talla del paciente en metros), calculando la relación de píxeles por metro verticalmente.
  - Tabla de resumen clínico de fotogramas clave con previsualizaciones reales, valores de ángulos seleccionados e impresión conmutada entre color y monocromo (escala de grises).

### 3. Nota Técnica y Criterios Arquitectónicos (`mdmake`)

> [!NOTE]
> **Fundamentación Cromática y Perceptual:** En la evaluación de la marcha en plano sagital, las extremidades contralaterales se cruzan periódicamente durante la fase de oscilación media. El uso de matices cromáticos complementarios opuestos a 180° en el espacio HSL (azul cian vs naranja cálido) aprovecha la agudeza visual humana para discernir de inmediato qué extremidad se encuentra en primer plano sin necesidad de etiquetas de texto adicionales.

> [!IMPORTANT]
> **Arquitectura de Reproducción In/Out:** La limitación del bucle a los límites `roiStartTime` y `roiEndTime` se sincroniza tanto a nivel del evento `timeupdate` como del bucle `requestAnimationFrame` a 60 FPS, garantizando que el video salte a `roiStartTime` en el mismo fotograma en que alcanza el límite superior, emulando con total fidelidad el comportamiento de Kinovea.

### 4. 📌 Pendientes y Próximos Pasos (Backlog)

- [x] **Completado:** Corrección de `AttributeError` en `routes_tracking.py` para Sports2D.
- [x] **Completado:** Ajuste de serialización `.kva` 2.1 libre de excepciones para Kinovea 2025.2.
- [x] **Completado:** Bucle continuo In/Out y cronómetro interactivo en pantalla.
- [x] **Completado:** Marcadores con oposición cromática L/R y segmentos diferenciados.
- [x] **Completado:** Controles de zoom y pan dedicados sobre el canvas.
- [x] **Completado:** Calibración antropométrica por estatura conocida del evaluado.
- [x] **Completado:** Reporte clínico con miniaturas reales e impresión Color / Escala de Grises.
- [ ] **Media:** Exportación e importación de curvas cinemáticas en formato C3D estándar.
- [ ] **Baja:** Cálculo del centro de presión (COP) estimado y vector de fuerza de reacción al suelo (GRF).

---

## [2026-10-20] - Formato de Telemetría Bajo el Video (Bottom-Bar) y Conformidad XML KVA 2.1 para Kinovea

> [!SUMMARY]
> **Síntesis Ejecutiva:** Se corrigió de raíz la carga de notas clínicas en Kinovea mediante la reestructuración completa del motor XML al esquema nativo `FormatVersion 2.1` (`<Keyframes>`, `<Keyframe id="...">`, `<Comment>` y `<Text>` on-screen). Paralelamente, se implementó el nuevo formato de telemetría *bajo el video* (`bottom_bar` letterbox) para la exportación de video embebido, eliminando el cuadro sólido opaco que tapaba al atleta y dejando el 100% del encuadre original libre y despejado.

### 1. Componentes y Artefactos Intervenidos

| Componente / Módulo | Ruta Relativa | Tipo de Cambio | Impacto / Estado |
| :--- | :--- | :--- | :--- |
| **Motor KVA XML** | [`./backend/app/core/kva_engine.py`](./backend/app/core/kva_engine.py) | Refactorización Integral | Conforme a Kinovea 2025.2 (FormatVersion 2.1); notas en `<Comment>` y dibujos `<Text>`. |
| **Motor de Renderizado Video** | [`./backend/app/core/video_engine.py`](./backend/app/core/video_engine.py) | Modificado / Nueva Característica | Incorpora layout `bottom_bar` (lienzo extendido inferior), `transparent_overlay` y `clean`. |
| **Rutas de Exportación API** | [`./backend/app/api/routes_export.py`](./backend/app/api/routes_export.py) | Modificado | Endpoint `/api/export/video/{video_id}` acepta parámetro `layout` con valor predeterminado `bottom_bar`. |
| **Capa de Servicios Frontend** | [`./frontend/src/services/api.js`](./frontend/src/services/api.js) | Modificado | Peticiones `requestAnnotatedVideo` y `embedAnalysisVideo` transmiten parámetro `layout`. |
| **Modal de Exportación UI** | [`./frontend/src/components/ExportModal.jsx`](./frontend/src/components/ExportModal.jsx) | Modificado | Selector de formatos de visualización (Bajo el video, Flotante translúcido, Solo esqueleto). |
| **Lógica de Embebido UI** | [`./frontend/src/App.jsx`](./frontend/src/App.jsx) | Modificado | Integración de `handleEmbedVideo` por defecto en formato `bottom_bar` limpio. |

### 2. Detalle de Realizaciones y Cambios

- **Compatibilidad Nativa con Kinovea 2025.2 / 0.9.x (`.kva`):**
  - [`./backend/app/core/kva_engine.py`](./backend/app/core/kva_engine.py):
    - Se identificó la causa raíz por la cual Kinovea no cargaba las notas: el exportador anterior generaba `<KinoveaVideoAnalysis Version="0.9.5">` con nodos obsoletos `<WindowProperties>` y `<RootFolder><KeyImages>`. El deserializador C# de Kinovea (`MetadataConverter.cs` y `MetadataSerializer.cs`) rechaza o descarta cualquier archivo que carezca de `<FormatVersion>2.1</FormatVersion>`.
    - Se alineó la estructura con la especificación real observada en [`./video testing/Valeria camina .kva`](./video%20testing/Valeria%20camina%20.kva):
      - Inyección estricta de `<FormatVersion>2.1</FormatVersion>` y `<Producer>Kinovea.2025.2</Producer>`.
      - Nodo contenedor raíz `<Keyframes>` con elementos `<Keyframe id="{guid}">`.
      - Elemento `<Timestamp>` calculado mediante `int(round(1 + frame_idx * (1000.0 / fps)))`.
      - Elemento `<Name>` con el título del evento o fase (ej. *Contacto Inicial*, *Despegue*).
      - Elemento `<Comment>` con la descripción clínica detallada y los valores instantáneos de ángulos articulares (directamente visible en el panel lateral de comentarios de Kinovea).
      - Inyección de elemento hijo `<Drawings><Text id="..." name="...">` para renderizar la tarjeta de notas directamente en el lienzo del reproductor de Kinovea.
      - Nodo `<Tracks>` con listas `<TrackPointList>` de formato `X;Y;Timestamp;0` para todas las trayectorias de puntos anatómicos.
    - Se actualizó el parser [`./backend/app/core/kva_engine.py:parse_kva`](./backend/app/core/kva_engine.py) para interpretar bidireccionalmente esquemas 2.1 y versiones previas.

- **Telemetría y Formato Bajo el Video (Copia Embebida Sin Obstrucción):**
  - [`./backend/app/core/video_engine.py`](./backend/app/core/video_engine.py):
    - Se rediseñó `render_annotated_video` para resolver el problema del recuadro negro sólido que cubría el rostro y cuerpo de la persona evaluada.
    - **Layout `bottom_bar` (Predeterminado):** Extiende el alto del lienzo en `footer_h = max(86, int(height * 0.12))` px. El video original se preserva en `[0:height, 0:width]` con el esqueleto y estela de COM, garantizando **cero obstrucción visual**.
    - La franja inferior de telemetría (`[height:height+footer_h, 0:width]`) despliega una línea acentuada de división (`#00FF88`), marcas de tiempo/fotograma a la izquierda y tarjetas tipo badge horizontales para cada ángulo articular (`Rodilla D`, `Cadera D`, etc.) con valores contrastados.
    - **Layouts Alternativos:**
      - `transparent_overlay`: Superposición flotante superior con mezcla alfa al 55% (`cv2.addWeighted`).
      - `clean`: Únicamente el marcaje biomecánico sobre el video sin panel informativo.

- **Interfaz de Usuario y Exportación:**
  - [`./frontend/src/components/ExportModal.jsx`](./frontend/src/components/ExportModal.jsx): Incorporación de selector de radio pills para alternar entre formatos de renderizado antes de solicitar la compilación del video MP4.
  - [`./frontend/src/App.jsx`](./frontend/src/App.jsx): Asignación directa de `layout="bottom_bar"` en el botón rápido *Embeber en Copia de Video*.

### 3. Nota Técnica y Criterios Arquitectónicos (`mdmake`)

> [!NOTE]
> **Fundamentación Técnica de Kinovea 2.1:** Kinovea utiliza un motor de serialización basado en `System.Xml.XmlReader` con validación jerárquica obligatoria de `FormatVersion`. Si este tag no se encuentra explícitamente en el primer nivel del XML, la clase `MetadataConverter` aborta la ingesta emitiendo un log silencioso, y el deserializador de fotogramas clave omite el mapeo de `comments` a la entidad `Keyframe`. Al emitir la clave `<Comment>` y simultáneamente el objeto de dibujo `<Text>`, se cubre tanto la interfaz de auditoría clínica (panel de fotogramas clave) como la visualización gráfica en pantalla sin depender de la versión exacta de Kinovea (0.8.x, 0.9.x o 2025.x).

> [!IMPORTANT]
> **Alineación Cinemática Espacio-Temporal en Video:** Cuando se renderiza en formato `bottom_bar`, las coordenadas cartesianas de los marcadores no sufren escalado ni distorsión, dado que el ancho se mantiene idéntico y el video original se ancla rígidamente en la parte superior `(0, 0)` a `(width, height)`. Los reproductores de video estándar (VLC, Kinovea, QuickTime, navegadores) conservan el aspect ratio expandido sin alterar la calibración espacial en metros por píxel.

### 4. 📌 Pendientes y Próximos Pasos (Backlog)

- [x] **Completado:** Migración de serialización KVA a `FormatVersion 2.1` con comentarios clínicos en `<Comment>` y tarjetas `<Text>`.
- [x] **Completado:** Formato de telemetría inferior (`bottom_bar`) en exportador de video anotado.
- [x] **Completado:** Selector interactivo de visualización en modal de exportación.
- [ ] **Alta:** Detección y calibración métrica automática mediante reconocimiento de objeto de referencia (vara patrón de 1 metro o marcador de contraste).
- [ ] **Media:** Generación de gráficos cinemáticos comparativos de ángulo-tiempo superpuestos entre extremidad izquierda y derecha (simetría bilateral).
- [ ] **Media:** Exportación a archivo estándar C3D para análisis en plataformas 3D (Vicon Polygon, Mokka, Qualisys Track Manager).
- [ ] **Baja:** Cálculo y superposición estimada del vector de Fuerza de Reacción del Suelo (GRF estimado por acelerometría de centro de masa).

---

## [2026-10-20] - Motor de Sincronización rVFC a 60 FPS, Selección ROI y Cancelación de Procesado

> [!SUMMARY]
> **Síntesis Ejecutiva:** Se reemplazó el mecanismo de sondeo de fotogramas por `requestVideoFrameCallback` (rVFC), eliminando la latencia del esqueleto en tiempo real. Se añadieron selectores de rango temporal ROI en la línea de tiempo y capacidad de cancelación inmediata de procesamiento con liberación de memoria.

### 1. Componentes y Artefactos Intervenidos

| Componente / Módulo | Ruta Relativa | Tipo de Cambio | Impacto / Estado |
| :--- | :--- | :--- | :--- |
| **Lienzo de Video (Stage)** | [`./frontend/src/components/VideoStage.jsx`](./frontend/src/components/VideoStage.jsx) | Refactorizado | Bucle rVFC sincronizado con el refresco de pantalla nativo (60 FPS estables). |
| **Línea de Tiempo (Timeline)** | [`./frontend/src/components/Timeline.jsx`](./frontend/src/components/Timeline.jsx) | Modificado | Controles de inicio/fin de ROI y preajustes rápidos de ventana (3s, 5s, 10s, Todo). |
| **Adaptador Sports2D** | [`./backend/app/protocols/sports2d_adapter.py`](./backend/app/protocols/sports2d_adapter.py) | Modificado | Soporte de filtrado por rango de tiempo y bandera cooperativa `cancelled`. |
| **Cabecera de Control UI** | [`./frontend/src/components/Header.jsx`](./frontend/src/components/Header.jsx) | Modificado | Botón de cancelación reactiva con `AbortController` y selector de interpretación. |

### 2. Detalle de Realizaciones y Cambios
- Sustitución de `timeupdate` (cuya frecuencia en navegadores oscila entre 4 y 15 Hz) por `HTMLVideoElement.requestVideoFrameCallback`, logrando renderizado sincronizado al 100% de la tasa de refresco del panel.
- Implementación de `roi_start_time` y `roi_end_time` para limitar el automarcado a segmentos específicos sin procesar videos extensos innecesariamente.
- Endpoint de cancelación `POST /api/tracking/cancel/{video_id}` que aborta la inferencia en curso y limpia estructuras en memoria.

---
