# KinePipe MMA (Markless Motion Analyser)

> **Dirección y Desarrollo:** Klgo. Felipe Vargas Ríos (`@kinepipe`)  
> Suite de análisis biomecánico, cinemática clínica 2D y visión artificial sin marcadores para kinesiología, medicina deportiva y ciencias de la actividad física.

Plataforma moderna de análisis cinemático y biomecánico con Computer Vision e Inteligencia Artificial, inspirada en la ergonomía y herramientas de **Kinovea**, enriquecida con modelos automáticos de seguimiento anatómico:
- **Sports2D** (David Pagnon / PerfAnalytics): Cinemática 2D monocular, ángulos articulares anatómicos, velocidades, aceleraciones, escala en metros y filtrado Butterworth.
- **Pose2Sim** (David Pagnon / PerfAnalytics): Preparación y cinemática 2D/3D con compatibilidad nativa con **OpenSim** (`.trc`, `.mot` y `.osim`).
- **DeepLabCut** (DLC): Inferencia con proyectos y modelos personalizados (`config.yaml`), SuperAnimal y filtrado por probabilidad (*likelihood*).
- **Fast Real-Time Pose**: Seguimiento ultrarrápido a 60 FPS sin dependencias pesadas para demostraciones en clase y vista previa instantánea.
- **Interoperabilidad Kinovea (.kva v2.1)**: Exportación e importación directa de archivos XML `.kva` para visualización y edición en Kinovea oficial 2025.2.

---

## Características Principales

### 1. Reproductor de Video Sub-Frame & Canvas Biomecánico
- Reproducción fluida fotograma a fotograma ($\pm 1$ f, $\pm 5$ f) con aceleración por hardware.
- Superposición interactiva a 60 FPS:
  - Esqueleto anatómico completo con código de colores.
  - Goniómetros dinámicos: arcos articulares con lectura numérica en grados en tiempo real.
  - Centro de Masa (COM) estimado según coeficientes antropométricos de de Leva (1996).
  - Estelas de trayectoria del movimiento con gradiente de color según velocidad.
  - Herramientas manuales de medición: Goniómetro de 3 puntos y Regla de distancia en metros.
  - Controles de zoom (hasta 4x) y paneo.

### 2. Módulo Especializado de Saltos (CMJ, SJ, Drop Jump)
- Detección automática de fases clave:
  1. *Inicio de contramovimiento* ($v_y < -0.05 \text{ m/s}$).
  2. *Punto más bajo / Dip* (máxima flexión de rodilla y cadera).
  3. *Despegue / Takeoff* ($v_{takeoff}$).
  4. *Vértice / Apex* (altura máxima).
  5. *Aterrizaje / Landing* (contacto inicial con el suelo).
- Cálculo automatizado de métricas de salto:
  - Altura de vuelo ($h = \frac{g \cdot t^2}{8}$) en centímetros.
  - Velocidad de despegue ($v_{takeoff}$) en m/s.
  - Profundidad de contramovimiento (desplazamiento vertical del dip) en cm.
  - Ángulo de flexión máxima de rodilla en el dip.
  - Atajos de un clic para saltar directamente al fotograma de cada fase.

### 3. Asistente / Wizard de Modelos
- Menú claro y explicativo que orienta sobre las posibilidades de cada modelo:
  - Número de cámaras requeridas (1 cámara monocular vs multicámara 3D sincronizada).
  - Requerimientos de calibración (altura del deportista, barra de 2 puntos, damero Charuco, wand 3D o `config.yaml`).
  - Formatos y salidas generadas (ángulos 2D, OpenSim TRC, Kinovea KVA, CSV).
  - Control en vivo de la frecuencia de corte Butterworth ($f_c$: 2 a 15 Hz).

### 4. Línea de Tiempo, Fotogramas Clave & Notas Clínicas
- Pines visuales de eventos biomecánicos en la línea de tiempo.
- Registro de fotogramas clave con instantánea de ángulos, miniatura y observaciones técnicas.
- Panel de notas clínicas y conclusiones con auto-guardado.

### 5. Suite de Exportación Multiformato
- **Kinovea XML (.KVA)**: Abre tu análisis directamente en Kinovea.
- **OpenSim (.TRC)**: Archivo de trayectorias de marcadores para cinemática inversa.
- **Tabla de Datos (.CSV)**: Todas las coordenadas ($px$ y $m$), ángulos y velocidades para Excel, Python o R.
- **Informe Biomecánico Oficial (HTML / PDF)**: Reporte imprimible con rangos de movimiento (ROM), métricas de salto y observaciones.
- **Video Anotado con HUD (.MP4)**: Video renderizado con el esqueleto, arcos de goniómetro y telemetría incrustada.

---

## Inicio Rápido (En 1 Clic)

### Requisitos Previos
- Windows 10/11 x64
- Python 3.10 o superior (se detecta automáticamente mediante `py.exe` o `uv`).
- Node.js (solo para desarrollo o modificación del frontend; no requerido para estudiantes si se distribuye el build).

### Iniciar la Aplicación
Haz doble clic en:
```bat
run_app.bat
```
El script levantará el servidor backend FastAPI en `http://127.0.0.1:8000` y abrirá automáticamente tu navegador.

---

## Estructura del Proyecto

```text
e:\DEVELOPER\HUMAN POSE\
├── backend\
│   ├── app\
│   │   ├── api\
│   │   │   ├── routes_video.py       # Carga, streaming y video de muestra CMJ
│   │   │   ├── routes_tracking.py    # Catálogo wizard y ejecución de modelos
│   │   │   ├── routes_kinematics.py  # Filtros Butterworth y fotogramas clave
│   │   │   ├── routes_kinovea.py     # Generador y parser .kva de Kinovea
│   │   │   └── routes_export.py      # Exportación CSV, TRC, MP4 y reporte HTML
│   │   ├── core\
│   │   │   ├── config.py             # Configuración central de directorios
│   │   │   ├── kinematics_math.py    # Filtro Butterworth, derivadas, ángulos y saltos
│   │   │   ├── kva_engine.py         # Serializador XML Kinovea .kva
│   │   │   ├── schemas.py            # Modelos Pydantic
│   │   │   └── video_engine.py       # OpenCV: extracción de frames, HUD y video CMJ
│   │   ├── protocols\
│   │   │   ├── base_tracker.py       # Clase abstracta unificada
│   │   │   ├── sports2d_adapter.py   # Adaptador Sports2D
│   │   │   ├── pose2sim_adapter.py   # Adaptador Pose2Sim y exportador TRC
│   │   │   ├── dlc_adapter.py        # Adaptador DeepLabCut
│   │   │   └── fast_pose_adapter.py  # Adaptador ultrarrápido en tiempo real
│   │   └── main.py                   # FastAPI + montaje de frontend estático
│   ├── tests\                        # Tests automatizados (pytest)
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend\
│   ├── dist\                         # Build compilado listo para distribución
│   ├── src\
│   │   ├── components\
│   │   │   ├── Header.jsx            # Barra superior
│   │   │   ├── VideoStage.jsx        # Canvas interactivo 60fps
│   │   │   ├── Timeline.jsx          # Línea de tiempo con scrubber y keyframes
│   │   │   ├── KinematicsDashboard.jsx # Gráficos interactivos síncronos
│   │   │   ├── JumpMetricsCard.jsx   # Telemetría de saltos
│   │   │   ├── KeyframeNotesPanel.jsx # Tarjetas de fotogramas clave y notas
│   │   │   ├── ModelWizardModal.jsx  # Asistente de modelos y requerimientos
│   │   │   ├── CalibrationModal.jsx  # Calibración espacial en metros
│   │   │   └── ExportModal.jsx       # Modal de exportación multiformato
│   │   ├── services\api.js           # Cliente API REST
│   │   ├── App.jsx                   # Sincronización general
│   │   └── index.css                 # Estilos dark biomecánicos
│   ├── package.json
│   └── vite.config.js
├── data\                             # Videos subidos, exportaciones y muestras
├── install.bat                       # Instalador automático en 1 clic
├── run_app.bat                       # Lanzador directo
└── README.md
```

---

## Ejecutar Pruebas Automatizadas

Para validar el motor matemático, los filtros Butterworth y la compatibilidad con Kinovea `.kva`:
```powershell
.venv\Scripts\python -m pytest backend/tests
```

---

## Distribución a Estudiantes o GitHub

Dado que el backend FastAPI sirve directamente la carpeta `frontend/dist/`:
1. Puedes comprimir toda la carpeta del proyecto en un archivo `.zip` o subirlo a GitHub.
2. Los estudiantes solo necesitan ejecutar `run_app.bat`.
3. No es necesario que los estudiantes instalen Node.js ni configuren servidores web separados.
